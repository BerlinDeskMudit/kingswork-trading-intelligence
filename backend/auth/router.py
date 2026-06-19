from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import get_db
from models.user import User
from models.portfolio import Portfolio
from models.engagement import process_streak_on_login, get_or_create_daily_challenges, update_daily_challenge_progress
from auth.deps import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
)


router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    is_active: bool

    class Config:
        from_attributes = True


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters",
        )

    user = User(
        email=req.email,
        name=req.name or req.email.split("@")[0],
        hashed_password=get_password_hash(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    wallet = db.query(Portfolio).filter(Portfolio.name == "KingStop Demo Wallet").first()
    streak, is_new_day = process_streak_on_login(db, user.id, wallet.id if wallet else 1)
    if is_new_day:
        get_or_create_daily_challenges(db, user.id)
        update_daily_challenge_progress(db, user.id, "login")

    token = create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "name": user.name},
        "streak": {
            "current_streak": streak.current_streak,
            "longest_streak": streak.longest_streak,
            "total_logins": streak.total_logins,
            "bonus_claimed_today": streak.bonus_claimed_today,
            "is_new_day": is_new_day,
        },
    }


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    wallet = db.query(Portfolio).filter(Portfolio.name == "KingStop Demo Wallet").first()
    streak, is_new_day = process_streak_on_login(db, user.id, wallet.id if wallet else 1)

    if is_new_day:
        get_or_create_daily_challenges(db, user.id)
        update_daily_challenge_progress(db, user.id, "login")

    streak_data = None
    if streak:
        streak_data = {
            "current_streak": streak.current_streak,
            "longest_streak": streak.longest_streak,
            "total_logins": streak.total_logins,
            "bonus_claimed_today": streak.bonus_claimed_today,
            "is_new_day": is_new_day,
        }

    token = create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "name": user.name},
        "streak": streak_data,
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
