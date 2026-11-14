import uuid
import random
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status

from backend.schemas.schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    SendOtpRequest,
    SendRegistrationOtpRequest,
    VerifyOtpRequest,
    VerifyOtpResponse
)
from backend.utils.auth_utils import hash_password, verify_password, create_access_token, get_current_user
from backend.database.connection import get_db_collection
from backend.services.email_service import email_service

router = APIRouter(prefix="/auth", tags=["Authentication & Verification"])


@router.post("/send-registration-otp")
def send_registration_otp(req: SendRegistrationOtpRequest):
    """
    Sends a 6-digit email verification OTP before registration completes.
    Checks if email already exists in the system.
    """
    users_col = get_db_collection("users")
    email = req.email.lower().strip()
    
    existing = users_col.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in instead."
        )

    otp_code = f"{random.randint(100000, 999999)}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=10)

    otps_col = get_db_collection("email_verification_otps")
    otps_col.delete_many({"email": email})
    otps_col.insert_one({
        "_id": str(uuid.uuid4()),
        "email": email,
        "otp": otp_code,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat()
    })

    email_res = email_service.send_otp_email(
        to_email=email,
        user_name=req.name or "Student",
        otp_code=otp_code
    )

    return {
        "success": True,
        "message": f"Verification code sent to {email}. Valid for 10 minutes.",
        "email": email,
        "delivery_status": email_res.get("status", "sent")
    }


@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister):
    users_col = get_db_collection("users")
    email = user_in.email.lower().strip()
    
    # Check if user email already exists
    existing = users_col.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    is_verified = False

    # If OTP is supplied, validate it
    if user_in.otp and user_in.otp.strip():
        otps_col = get_db_collection("email_verification_otps")
        record = otps_col.find_one({"email": email})
        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code not found. Please request a new code."
            )
        
        expires_at_str = record.get("expires_at")
        if expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str)
            if datetime.utcnow() > expires_at:
                otps_col.delete_one({"_id": record["_id"]})
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verification code has expired. Please request a new code."
                )

        if record.get("otp") != user_in.otp.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code. Please check your email and try again."
            )

        is_verified = True
        otps_col.delete_one({"_id": record["_id"]})
    
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(user_in.password)
    now_iso = datetime.utcnow().isoformat()
    
    user_doc = {
        "_id": user_id,
        "name": user_in.name,
        "email": email,
        "hashed_password": hashed_pwd,
        "email_verified": is_verified,
        "created_at": now_iso
    }
    
    users_col.insert_one(user_doc)
    
    access_token = create_access_token(data={"sub": user_id})
    user_resp = UserResponse(
        id=user_id,
        name=user_in.name,
        email=email,
        email_verified=is_verified,
        created_at=now_iso
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin):
    users_col = get_db_collection("users")
    user = users_col.find_one({"email": credentials.email.lower()})
    
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id})
    user_resp = UserResponse(
        id=user_id,
        name=user.get("name", "User"),
        email=user.get("email", ""),
        email_verified=bool(user.get("email_verified", False)),
        created_at=str(user.get("created_at", ""))
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        email_verified=bool(current_user.get("email_verified", False)),
        created_at=current_user["created_at"]
    )


# ============================================================
# OTP & EMAIL VERIFICATION
# ============================================================

@router.post("/send-verification-otp")
def send_verification_otp(
    req: SendOtpRequest,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Generates a 6-digit OTP code, stores it with a 10-minute expiry, and sends via email.
    Can be used by authenticated users or for an unverified email address.
    """
    email = (req.email or (current_user.get("email") if current_user else None))
    if not email:
        raise HTTPException(status_code=400, detail="Target email address is required")
    
    email = email.lower().strip()
    user_name = current_user.get("name", "Student") if current_user else "Student"

    # Generate 6-digit secure numeric OTP
    otp_code = f"{random.randint(100000, 999999)}"
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=10)

    otps_col = get_db_collection("email_verification_otps")
    otps_col.delete_many({"email": email})  # Clear previous codes
    otps_col.insert_one({
        "_id": str(uuid.uuid4()),
        "email": email,
        "otp": otp_code,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat()
    })

    # Dispatch OTP email
    email_res = email_service.send_otp_email(
        to_email=email,
        user_name=user_name,
        otp_code=otp_code
    )

    return {
        "success": True,
        "message": f"Verification OTP sent to {email}. Valid for 10 minutes.",
        "email": email,
        "delivery_status": email_res.get("status", "sent")
    }


@router.post("/verify-email-otp", response_model=VerifyOtpResponse)
def verify_email_otp(
    req: VerifyOtpRequest,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Validates submitted 6-digit OTP.
    Upon successful validation, marks user's email_verified = True in MongoDB.
    """
    email = (req.email or (current_user.get("email") if current_user else None))
    if not email:
        raise HTTPException(status_code=400, detail="Email address is required")

    email = email.lower().strip()
    submitted_otp = req.otp.strip()

    otps_col = get_db_collection("email_verification_otps")
    record = otps_col.find_one({"email": email})

    if not record:
        raise HTTPException(status_code=400, detail="No active verification OTP found for this email. Please request a new code.")

    # Check expiration
    expires_at_str = record.get("expires_at")
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.utcnow() > expires_at:
            otps_col.delete_one({"_id": record["_id"]})
            raise HTTPException(status_code=400, detail="Verification OTP has expired. Please request a new code.")

    if record.get("otp") != submitted_otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please check and try again.")

    # OTP is valid -> Mark user verified in DB
    users_col = get_db_collection("users")
    users_col.update_one(
        {"email": email},
        {"$set": {"email_verified": True, "verified_at": datetime.utcnow().isoformat()}}
    )
    # Remove consumed OTP
    otps_col.delete_one({"_id": record["_id"]})

    return VerifyOtpResponse(
        success=True,
        message="Email successfully verified! Study notifications and reminders are now active.",
        email_verified=True
    )
