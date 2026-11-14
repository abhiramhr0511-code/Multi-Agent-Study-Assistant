import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from backend.schemas.schemas import (
    DocumentUploadResponse, DocumentQueryRequest,
    DocumentQueryResponse, DocumentInfoResponse
)
from backend.services.ai_bridge import ai_bridge
from backend.utils.auth_utils import get_current_user

router = APIRouter(prefix="/documents", tags=["Document Q&A / RAG"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DocumentUploadResponse)
def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".pdf", ".txt"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a PDF (.pdf) or Text (.txt) file."
        )
    
    safe_filename = f"{current_user['id']}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")
    
    res = ai_bridge.upload_document(
        file_path=file_path,
        filename=file.filename,
        user_id=current_user["id"]
    )
    
    return DocumentUploadResponse(
        filename=res["filename"],
        doc_id=res.get("doc_id"),
        document_id=res.get("document_id") or res.get("doc_id"),
        num_pages=res["num_pages"],
        num_chunks=res["num_chunks"],
        success=res["success"],
        message=res["message"]
    )

@router.post("/query", response_model=DocumentQueryResponse)
def query_document(
    payload: DocumentQueryRequest,
    current_user: dict = Depends(get_current_user)
):
    target_doc_id = payload.doc_id or payload.document_id
    
    if not target_doc_id or target_doc_id == "all" or target_doc_id == "null":
        user_docs = ai_bridge.get_user_documents(user_id=current_user["id"])
        if not user_docs:
            raise HTTPException(
                status_code=400,
                detail="Please select/upload a document before asking a question."
            )
        target_doc_id = user_docs[0]["id"]

    if not target_doc_id:
        raise HTTPException(
            status_code=400,
            detail="Please select/upload a document before asking a question."
        )

    res = ai_bridge.query_documents(
        question=payload.question,
        user_id=current_user["id"],
        doc_id=target_doc_id,
        history=payload.history,
        k=payload.k or 6
    )
    return DocumentQueryResponse(
        answer=res["answer"],
        sources=res.get("sources", [])
    )

@router.get("", response_model=List[DocumentInfoResponse])
def list_documents(current_user: dict = Depends(get_current_user)):
    docs = ai_bridge.get_user_documents(user_id=current_user["id"])
    return [
        DocumentInfoResponse(
            id=d["id"],
            filename=d["filename"],
            file_type=d["file_type"],
            file_size=d["file_size"],
            num_pages=d["num_pages"],
            num_chunks=d["num_chunks"],
            uploaded_at=d["uploaded_at"]
        ) for d in docs
    ]

@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    deleted = ai_bridge.delete_document(doc_id=doc_id, user_id=current_user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found or unauthorized")
    return {"message": "Document removed from library"}
