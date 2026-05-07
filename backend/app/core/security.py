import re

import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from jose import jwt, JWTError
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings


cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode())

def hash_password(password: str) -> str:
    # bcrypt requires passwords to be encoded as bytes before hashing
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8') # Decode to string for the database

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_bytes)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def encrypt_token(token: str) -> str:
    """Encrypts a plaintext token for secure database storage."""
    if not token:
        return None
    encrypted_bytes = cipher_suite.encrypt(token.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')

def decrypt_token(encrypted_token: str) -> str:
    """Decrypts a stored token for API usage."""
    if not encrypted_token:
        return None
    try:
        decrypted_bytes = cipher_suite.decrypt(encrypted_token.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except InvalidToken:
        raise ValueError("Decryption failed. The encryption key may have changed.")

def validate_password_complexity(password: str):
    """Validates if the password meets security requirements."""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter."
        )
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one symbol."
        )
    return True