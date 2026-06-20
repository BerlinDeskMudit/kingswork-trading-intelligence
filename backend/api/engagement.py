from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.deps import get_current_user
from database import get_db
from models.engagement import (
    UserStreak,
    Achievement,
    UserAchievement,
    DailyChallenge,
    UserDailyChallenge,
    process_streak_on_login,
    claim_daily_bonus,
    check_achievements,
    get_achievement_progress,
    get_or_create_daily_challenges,
    update_daily_challenge_progress,
    claim_daily_reward,
    STREAK_BONUSES,
)
from models.portfolio import Portfolio
from models.user import User
from services.portfolios import get_or_create_user_wallet

router = APIRouter(prefix="/engagement", tags=["engagement"])


def get_user_wallet_id(db: Session, user: User) -> int:
    return get_or_create_user_wallet(db, user.id, user.name).id


@router.get("/streak")
def get_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    streak = db.query(UserStreak).filter(UserStreak.user_id == current_user.id).first()
    if not streak:
        today = date.today()
        streak = UserStreak(
            user_id=current_user.id,
            current_streak=1,
            longest_streak=1,
            last_login_date=today,
            total_logins=1,
        )
        db.add(streak)
        db.commit()
        db.refresh(streak)

    sorted_bonuses = sorted(STREAK_BONUSES.items())
    next_milestone = None
    milestone_day = None
    for day, bonus in sorted_bonuses:
        if day > streak.current_streak:
            next_milestone = {"day": day, "bonus": bonus}
            milestone_day = day
            break

    return {
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "total_logins": streak.total_logins,
        "bonus_claimed_today": streak.bonus_claimed_today,
        "total_bonus_earned": streak.total_bonus_earned,
        "last_login_date": streak.last_login_date.isoformat() if streak.last_login_date else None,
        "next_milestone": next_milestone,
        "bonus_schedule": [{"day": d, "bonus": b} for d, b in sorted_bonuses if d <= 30],
    }


@router.post("/streak/claim-bonus")
def claim_bonus(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = claim_daily_bonus(db, current_user.id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bonus already claimed today or streak not active",
        )
    return {
        "status": "ok",
        "streak": result["streak"],
        "bonus": result["bonus"],
        "total_bonus_earned": result["total_bonus_earned"],
    }


@router.get("/achievements")
def get_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    all_achievements = db.query(Achievement).all()
    unlocked = {
        ua.achievement_id: ua.unlocked_at.isoformat() if ua.unlocked_at else None
        for ua in db.query(UserAchievement).filter(UserAchievement.user_id == current_user.id).all()
    }

    achievement_rows = []
    for achievement in all_achievements:
        raw_progress = get_achievement_progress(db, current_user.id, achievement)
        progress = min(raw_progress, achievement.requirement_value)
        achievement_rows.append({
            "id": achievement.id,
            "key": achievement.key,
            "name": achievement.name,
            "description": achievement.description,
            "icon": achievement.icon,
            "category": achievement.category,
            "bonus_cash": achievement.bonus_cash,
            "requirement_value": achievement.requirement_value,
            "progress": progress,
            "progress_pct": round(
                min(progress / achievement.requirement_value * 100, 100), 1
            ) if achievement.requirement_value else 100,
            "unlocked": achievement.id in unlocked,
            "unlocked_at": unlocked.get(achievement.id),
        })

    return {
        "achievements": achievement_rows,
        "total_unlocked": len(unlocked),
        "total_achievements": len(all_achievements),
    }


@router.post("/achievements/check")
def check_user_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet_id = get_user_wallet_id(db, current_user)
    streak = db.query(UserStreak).filter(UserStreak.user_id == current_user.id).first()
    streak_val = streak.current_streak if streak else 0
    new_achievements = check_achievements(db, current_user.id, "login", streak_val, wallet_id)
    return {
        "status": "ok",
        "new_achievements": [
            {"key": a.key, "name": a.name, "bonus_cash": a.bonus_cash}
            for a in new_achievements
        ],
    }


@router.post("/backtests/progress")
def record_backtest_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    streak = db.query(UserStreak).filter(UserStreak.user_id == current_user.id).first()
    if not streak:
        streak = UserStreak(user_id=current_user.id)
        db.add(streak)
    streak.total_backtests = (streak.total_backtests or 0) + 1
    db.commit()
    db.refresh(streak)

    wallet_id = get_user_wallet_id(db, current_user)
    unlocked = check_achievements(
        db,
        current_user.id,
        "backtest",
        streak.total_backtests,
        wallet_id,
    )
    return {
        "status": "ok",
        "total_backtests": streak.total_backtests,
        "new_achievements": [
            {"key": achievement.key, "name": achievement.name}
            for achievement in unlocked
        ],
    }


@router.get("/daily-challenges")
def get_daily_challenges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenges = get_or_create_daily_challenges(db, current_user.id)
    return {
        "challenges": [
            {
                "id": udc.id,
                "challenge_id": udc.challenge_id,
                "title": udc.challenge.title,
                "description": udc.challenge.description,
                "progress": udc.progress,
                "requirement_value": udc.challenge.requirement_value,
                "completed": udc.completed,
                "reward_claimed": udc.reward_claimed,
                "reward_cash": udc.challenge.reward_cash,
                "reward_xp": udc.challenge.reward_xp,
            }
            for udc in challenges
        ]
    }


@router.post("/daily-challenges/{challenge_id}/claim")
def claim_challenge_reward(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = claim_daily_reward(db, current_user.id, challenge_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge not completed or reward already claimed",
        )
    return {"status": "ok", "title": result["title"], "reward_cash": result["reward_cash"], "reward_xp": result["reward_xp"]}


@router.post("/daily-challenges/progress")
def progress_daily_challenge(
    requirement_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = update_daily_challenge_progress(db, current_user.id, requirement_type)
    return {
        "status": "ok",
        "updated_challenges": [
            {"id": u.id, "challenge_id": u.challenge_id, "progress": u.progress, "completed": u.completed}
            for u in updated
        ],
    }
