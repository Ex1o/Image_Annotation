from datetime import datetime, timedelta
from typing import Optional
import secrets
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import User, VerificationToken
from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def create_verification_token(db: Session, user_id: int, token_type: str = "email_verification") -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    db_token = VerificationToken(
        user_id=user_id,
        token=token,
        token_type=token_type,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()
    
    return token


def verify_verification_token(db: Session, token: str, token_type: str = "email_verification") -> Optional[int]:
    db_token = db.query(VerificationToken).filter(
        VerificationToken.token == token,
        VerificationToken.token_type == token_type
    ).first()
    
    if not db_token:
        return None
    
    if datetime.utcnow() > db_token.expires_at:
        db.delete(db_token)
        db.commit()
        return None
    
    user_id = db_token.user_id
    db.delete(db_token)
    db.commit()
    
    return user_id


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, email: str, full_name: str, password: str) -> User:
    hashed_password = get_password_hash(password)
    db_user = User(
        email=email,
        full_name=full_name,
        hashed_password=hashed_password,
        is_verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
