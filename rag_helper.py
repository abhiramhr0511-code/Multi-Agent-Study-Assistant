import os
import re
import uuid
from typing import List, Optional, Dict, Any, Tuple

import chromadb

from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader
)

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain.schema import Document

from sentence_transformers import SentenceTransformer


# ============================================================
# TEXT CLEANING UTILITY
# ============================================================

def clean_text(text: str) -> str:
    """
    Cleans raw document text while preserving paragraph structure, headers, and lists.
    - Removes null bytes and non-printable control characters
    - Fixes hyphenated line-breaks (e.g. 'differ-\\nent' -> 'different')
    - Replaces smart quotes and dashes with standard ASCII
    - Collapses multiple horizontal spaces
    - Collapses 3+ consecutive newlines into 2 newlines
    """
    if not text:
        return ""
    # Strip null bytes and non-printable control chars (except \n, \t, \r)
    text = "".join(ch for ch in text if ch in ("\n", "\t", "\r") or ord(ch) >= 32)
    
    # Standardize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    
    # Fix hyphenated words broken across line breaks
    text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)
    
    # Normalize unicode quotation marks & dashes
    text = text.replace('“', '"').replace('”', '"').replace('’', "'").replace('‘', "'")
    text = text.replace('–', '-').replace('—', '-')
    
    # Collapse multiple spaces / tabs on the same line
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Collapse 3+ newlines to 2 newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()


# ============================================================
# LOCAL EMBEDDING FUNCTION
# ============================================================

class LocalEmbeddingFunction:
    """
    Local embedding function using Sentence Transformers.
    Model: sentence-transformers/all-MiniLM-L6-v2
    Runs on CPU with L2 normalized vectors for fast cosine similarity.
    """

    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    ):
        print("========================================")
        print("Loading local embedding model...")
        print(f"Model: {model_name}")
        print("========================================")

        self.model = SentenceTransformer(
            model_name,
            device="cpu"
        )

        print("✅ Local embedding model loaded successfully.")

    def embed_documents(
        self,
        texts: List[str]
    ) -> List[List[float]]:
        if not texts:
            return []

        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False
        )
        return embeddings.tolist()

    def embed_query(
        self,
        text: str
    ) -> List[float]:
        if not text:
            return []

        embedding = self.model.encode(
            text,
            normalize_embeddings=True,
            show_progress_bar=False
        )
        return embedding.tolist()


# ============================================================
# RAG HELPER
# ============================================================

class RAGHelper:
    """
    Local RAG helper for Document Q&A.
    Features:
    - Text extraction from PDF / TXT with fallbacks
    - Structural text cleaning and recursive character chunking
    - User and Document metadata isolation in ChromaDB
    - Filtered semantic retrieval with similarity scoring
    - Deletion by doc_id / user_id
    """

    def __init__(
        self,
        collection_name: str = "study_materials",
        persist_directory: str = None
    ):
        self.collection_name = collection_name
        # Default to an absolute path next to rag_helper.py so ChromaDB data
        # is always found regardless of which directory the server is started from.
        if persist_directory is None:
            _here = os.path.dirname(os.path.abspath(__file__))
            persist_directory = os.path.join(_here, "chroma_db")
        self.persist_directory = persist_directory

        # Local embeddings
        self.embeddings = LocalEmbeddingFunction(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

        # Text splitter: ~650 chunk size, ~120 overlap, preserving paragraphs
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=650,
            chunk_overlap=120,
            separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
            length_function=len
        )

        self.vectorstore = None
        self._initialize_vectorstore()

    # ========================================================
    # INITIALIZE VECTOR STORE
    # ========================================================

    def _initialize_vectorstore(self):
        try:
            os.makedirs(self.persist_directory, exist_ok=True)
            self.vectorstore = Chroma(
                collection_name=self.collection_name,
                embedding_function=self.embeddings,
                persist_directory=self.persist_directory
            )
            print("✅ ChromaDB initialized successfully.")
            try:
                count = self.vectorstore._collection.count()
                print(f"📊 Existing chunks in database: {count}")
            except Exception:
                pass
        except Exception as e:
            print(f"❌ Error initializing vector store: {e}")
            self.vectorstore = None

    # ========================================================
    # LOAD PDF
    # ========================================================

    def load_pdf(
        self,
        file_path: str,
        user_id: str = "default_user",
        doc_id: Optional[str] = None,
        filename: Optional[str] = None
    ) -> Tuple[bool, int, int]:
        """
        Loads and indexes a PDF document.
        Returns: (success: bool, num_pages: int, num_chunks: int)
        """
        try:
            if not os.path.exists(file_path):
                print(f"❌ PDF file does not exist: {file_path}")
                return False, 0, 0

            doc_id = doc_id or str(uuid.uuid4())
            filename = filename or os.path.basename(file_path)
            print(f"📄 Loading PDF: {file_path} (user_id={user_id}, doc_id={doc_id})")

            documents = []
            # Primary loader: PyPDFLoader
            try:
                loader = PyPDFLoader(file_path)
                documents = loader.load()
            except Exception as loader_err:
                print(f"⚠️ PyPDFLoader warning ({loader_err}), trying direct pypdf extraction...")

            # Fallback loader: direct pypdf / pypdf.PdfReader
            if not documents:
                try:
                    import pypdf
                    reader = pypdf.PdfReader(file_path)
                    for page_idx, page in enumerate(reader.pages):
                        page_text = page.extract_text() or ""
                        if page_text.strip():
                            documents.append(
                                Document(
                                    page_content=page_text,
                                    metadata={"source": filename, "page": page_idx + 1}
                                )
                            )
                except Exception as pypdf_err:
                    print(f"⚠️ Direct pypdf extraction failed: {pypdf_err}")

            if not documents:
                print("❌ PDF contains no readable pages.")
                return False, 0, 0

            num_pages = len(documents)
            print(f"📑 Loaded {num_pages} pages from PDF.")

            # Clean page contents
            cleaned_docs = []
            for doc in documents:
                cleaned_text = clean_text(doc.page_content)
                if cleaned_text:
                    cleaned_docs.append(
                        Document(
                            page_content=cleaned_text,
                            metadata=doc.metadata or {}
                        )
                    )

            if not cleaned_docs:
                print("❌ PDF text was empty after cleaning.")
                return False, num_pages, 0

            # Split into chunks
            chunks = self.text_splitter.split_documents(cleaned_docs)
            if not chunks:
                print("❌ No text chunks were created.")
                return False, num_pages, 0

            # Assign strict metadata and unique IDs to chunks
            chunk_ids = []
            for idx, chunk in enumerate(chunks):
                page_num = chunk.metadata.get("page", 1)
                chunk.metadata = {
                    "user_id": str(user_id),
                    "doc_id": str(doc_id),
                    "document_id": str(doc_id),
                    "filename": str(filename),
                    "chunk_index": idx,
                    "page": page_num,
                    "source": str(filename)
                }
                chunk_ids.append(f"{doc_id}_{idx}")

            if self.vectorstore is None:
                self._initialize_vectorstore()

            if self.vectorstore is None:
                print("❌ Vector store is not initialized.")
                return False, num_pages, 0

            self.vectorstore.add_documents(chunks, ids=chunk_ids)
            print(f"✅ Successfully added {len(chunks)} PDF chunks to ChromaDB with user_id={user_id}.")
            return True, num_pages, len(chunks)

        except Exception as e:
            print(f"❌ Error loading PDF: {e}")
            return False, 0, 0

    # ========================================================
    # LOAD TEXT FILE
    # ========================================================

    def load_text(
        self,
        file_path: str,
        user_id: str = "default_user",
        doc_id: Optional[str] = None,
        filename: Optional[str] = None
    ) -> Tuple[bool, int, int]:
        """
        Loads and indexes a TXT document.
        Returns: (success: bool, num_pages: int, num_chunks: int)
        """
        try:
            if not os.path.exists(file_path):
                print(f"❌ Text file does not exist: {file_path}")
                return False, 0, 0

            doc_id = doc_id or str(uuid.uuid4())
            filename = filename or os.path.basename(file_path)
            print(f"📄 Loading text file: {file_path} (user_id={user_id}, doc_id={doc_id})")

            content = ""
            for enc in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
                try:
                    with open(file_path, "r", encoding=enc, errors="ignore") as f:
                        content = f.read()
                    if content.strip():
                        break
                except Exception:
                    continue

            if not content.strip():
                print("❌ Text file contains no readable content.")
                return False, 0, 0

            cleaned_content = clean_text(content)
            if not cleaned_content:
                print("❌ Text file was empty after cleaning.")
                return False, 1, 0

            doc = Document(
                page_content=cleaned_content,
                metadata={"source": filename, "page": 1}
            )

            chunks = self.text_splitter.split_documents([doc])
            if not chunks:
                print("❌ No text chunks were created.")
                return False, 1, 0

            chunk_ids = []
            for idx, chunk in enumerate(chunks):
                chunk.metadata = {
                    "user_id": str(user_id),
                    "doc_id": str(doc_id),
                    "document_id": str(doc_id),
                    "filename": str(filename),
                    "chunk_index": idx,
                    "page": 1,
                    "source": str(filename)
                }
                chunk_ids.append(f"{doc_id}_{idx}")

            if self.vectorstore is None:
                self._initialize_vectorstore()

            if self.vectorstore is None:
                print("❌ Vector store is not initialized.")
                return False, 1, 0

            self.vectorstore.add_documents(chunks, ids=chunk_ids)
            print(f"✅ Successfully added {len(chunks)} text chunks to ChromaDB with user_id={user_id}.")
            return True, 1, len(chunks)

        except Exception as e:
            print(f"❌ Error loading text file: {e}")
            return False, 0, 0

    # ========================================================
    # LOAD TEXT CONTENT DIRECTLY
    # ========================================================

    def load_text_content(
        self,
        text: str,
        user_id: str = "default_user",
        doc_id: Optional[str] = None,
        filename: Optional[str] = "direct_input.txt",
        metadata: Optional[dict] = None
    ) -> Tuple[bool, int, int]:
        try:
            if not text or not text.strip():
                print("❌ Empty text cannot be added.")
                return False, 0, 0

            doc_id = doc_id or str(uuid.uuid4())
            cleaned_text = clean_text(text)
            if not cleaned_text:
                return False, 1, 0

            doc = Document(
                page_content=cleaned_text,
                metadata=metadata or {"source": filename, "page": 1}
            )

            chunks = self.text_splitter.split_documents([doc])
            if not chunks:
                return False, 1, 0

            chunk_ids = []
            for idx, chunk in enumerate(chunks):
                chunk.metadata = {
                    "user_id": str(user_id),
                    "doc_id": str(doc_id),
                    "document_id": str(doc_id),
                    "filename": str(filename),
                    "chunk_index": idx,
                    "page": chunk.metadata.get("page", 1),
                    "source": str(filename)
                }
                chunk_ids.append(f"{doc_id}_{idx}")

            if self.vectorstore is None:
                self._initialize_vectorstore()

            if self.vectorstore is None:
                return False, 1, 0

            self.vectorstore.add_documents(chunks, ids=chunk_ids)
            print(f"✅ Added {len(chunks)} text chunks to ChromaDB.")
            return True, 1, len(chunks)

        except Exception as e:
            print(f"❌ Error loading text content: {e}")
            return False, 0, 0

    # ========================================================
    # QUERY / SIMILARITY SEARCH WITH METADATA ISOLATION
    # ========================================================

    def query_with_scores(
        self,
        question: str,
        user_id: Optional[str] = None,
        doc_id: Optional[str] = None,
        k: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Performs semantic similarity search with user_id and doc_id isolation filter.
        Returns a list of structured chunk dictionaries.
        """
        try:
            if self.vectorstore is None:
                self._initialize_vectorstore()

            if self.vectorstore is None or not question or not question.strip():
                return []

            where_filter = None
            if user_id and doc_id:
                where_filter = {"$and": [{"user_id": str(user_id)}, {"doc_id": str(doc_id)}]}
            elif user_id:
                where_filter = {"user_id": str(user_id)}
            elif doc_id:
                where_filter = {"doc_id": str(doc_id)}

            if where_filter:
                raw_results = self.vectorstore.similarity_search_with_score(
                    question,
                    k=k,
                    filter=where_filter
                )
            else:
                raw_results = self.vectorstore.similarity_search_with_score(
                    question,
                    k=k
                )

            retrieved = []
            seen_snippets = set()

            for doc, score in raw_results:
                text = doc.page_content.strip()
                if not text:
                    continue

                # Deduplicate chunks with identical beginnings
                norm_key = " ".join(text.split()[:25]).lower()
                if norm_key in seen_snippets:
                    continue
                seen_snippets.add(norm_key)

                retrieved.append({
                    "text": text,
                    "score": float(score),
                    "distance": float(score),
                    "metadata": doc.metadata or {},
                    "filename": doc.metadata.get("filename", "document"),
                    "doc_id": doc.metadata.get("doc_id", ""),
                    "page": doc.metadata.get("page", 1),
                    "chunk_index": doc.metadata.get("chunk_index", 0)
                })

            return retrieved

        except Exception as e:
            print(f"❌ Error querying knowledge base with scores: {e}")
            return []

    def query(
        self,
        question: str,
        user_id: Optional[str] = None,
        doc_id: Optional[str] = None,
        k: int = 6
    ) -> List[str]:
        """
        Compatibility query returning list of chunk strings.
        """
        results = self.query_with_scores(
            question=question,
            user_id=user_id,
            doc_id=doc_id,
            k=k
        )
        return [r["text"] for r in results]

    # ========================================================
    # DELETE DOCUMENT CHUNKS
    # ========================================================

    def delete_document_chunks(
        self,
        doc_id: str,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Deletes all vector chunks associated with a specific doc_id (and user_id).
        Uses native ChromaDB get+delete for broad version compatibility.
        """
        try:
            if self.vectorstore is None:
                self._initialize_vectorstore()

            if self.vectorstore is None:
                return False

            collection = self.vectorstore._collection

            # Build where filter
            where_filter = {"doc_id": str(doc_id)}
            if user_id:
                where_filter = {"$and": [{"user_id": str(user_id)}, {"doc_id": str(doc_id)}]}

            # Get IDs of all matching chunks, then delete by those IDs
            try:
                result = collection.get(where=where_filter, include=[])
                ids_to_delete = result.get("ids", [])
                if ids_to_delete:
                    collection.delete(ids=ids_to_delete)
                    print(f"🗑️ Deleted {len(ids_to_delete)} chunks for doc_id={doc_id} from ChromaDB.")
                else:
                    print(f"ℹ️ No chunks found for doc_id={doc_id} in ChromaDB (already deleted or never indexed).")
            except Exception as inner_e:
                print(f"⚠️ ChromaDB chunk deletion failed: {inner_e}")
                return False

            return True
        except Exception as e:
            print(f"⚠️ Error deleting document chunks from ChromaDB: {e}")
            return False


    # ========================================================
    # CLEAR DATABASE
    # ========================================================

    def clear_database(self) -> bool:
        try:
            print("🗑️ Clearing ChromaDB...")
            client = chromadb.PersistentClient(path=self.persist_directory)
            try:
                client.delete_collection(name=self.collection_name)
                print("✅ ChromaDB collection deleted.")
            except Exception:
                print("ℹ️ Collection did not exist.")

            self.vectorstore = None
            self._initialize_vectorstore()
            return self.vectorstore is not None
        except Exception as e:
            print(f"❌ Error clearing database: {e}")
            return False

    # ========================================================
    # DOCUMENT COUNT
    # ========================================================

    def get_document_count(self) -> int:
        try:
            if self.vectorstore is None:
                return 0
            collection = self.vectorstore._collection
            return collection.count()
        except Exception as e:
            print(f"❌ Error getting document count: {e}")
            return 0