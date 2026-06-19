from typing import Dict, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from auth.deps import get_current_user
from config import settings
from database import get_db
from models.user import User
from models.user_preferences import UserModelPreference


router = APIRouter(prefix="/models", tags=["models"])

Mode = Literal["live", "backtesting"]


class ModelPreferenceRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    mode: Mode
    model_id: str


def get_service():
    from main import data_service

    return data_service


def default_preferences() -> Dict[str, str]:
    return {
        "live": settings.default_live_model_id,
        "backtesting": settings.default_backtest_model_id,
    }


def get_user_preferences(db: Session, user: User) -> Dict[str, str]:
    preferences = default_preferences()
    rows = db.query(UserModelPreference).filter(UserModelPreference.user_id == user.id).all()
    for row in rows:
        preferences[row.mode] = row.model_id
    return preferences


def validate_model_for_mode(model_id: str, mode: str):
    service = get_service()
    for model in service.get_trading_models():
        if model["id"] == model_id:
            if mode not in model.get("modes", []):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{model['name']} is not available for {mode}",
                )
            return model

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Trading model not found",
    )


@router.get("")
async def list_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = get_service()
    return {
        "status": "ok",
        "models": service.get_trading_models(),
        "preferences": get_user_preferences(db, current_user),
        "seed_credentials": {
            "demo": {
                "email": settings.demo_user_email,
                "password": settings.demo_user_password,
            },
            "test": {
                "email": settings.test_user_email,
                "password": settings.test_user_password,
            },
        },
    }


@router.put("/preferences")
async def update_model_preference(
    req: ModelPreferenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    model = validate_model_for_mode(req.model_id, req.mode)
    preference = (
        db.query(UserModelPreference)
        .filter(
            UserModelPreference.user_id == current_user.id,
            UserModelPreference.mode == req.mode,
        )
        .first()
    )

    if preference:
        preference.model_id = req.model_id
    else:
        preference = UserModelPreference(
            user_id=current_user.id,
            mode=req.mode,
            model_id=req.model_id,
        )
        db.add(preference)

    db.commit()
    return {
        "status": "ok",
        "model": model,
        "preferences": get_user_preferences(db, current_user),
    }
