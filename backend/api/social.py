from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import Session, relationship
from database import Base, get_db
from auth.deps import get_current_user
from models.user import User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta

# ── Models ────────────────────────────────────────────────────────────────────

class Follow(Base):
    __tablename__ = "follows"
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    followee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TradeIdea(Base):
    __tablename__ = "trade_ideas"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String(10), nullable=False)
    direction = Column(String(10), default="LONG")  # LONG / SHORT
    entry = Column(Float, nullable=True)
    target = Column(Float, nullable=True)
    stop = Column(Float, nullable=True)
    body = Column(Text, nullable=False)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    comments = relationship("IdeaComment", back_populates="idea", cascade="all, delete-orphan")
    author = relationship("User", foreign_keys=[user_id])


class IdeaComment(Base):
    __tablename__ = "idea_comments"
    id = Column(Integer, primary_key=True, index=True)
    idea_id = Column(Integer, ForeignKey("trade_ideas.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    idea = relationship("TradeIdea", back_populates="comments")
    author = relationship("User", foreign_keys=[user_id])


class WeeklyBadge(Base):
    __tablename__ = "weekly_badges"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    week_start = Column(DateTime(timezone=True), nullable=False)
    rank = Column(Integer, nullable=False)
    badge = Column(String(50), nullable=False)  # gold / silver / bronze


# ── Pydantic ──────────────────────────────────────────────────────────────────

class IdeaCreate(BaseModel):
    ticker: str
    direction: str = "LONG"
    entry: Optional[float] = None
    target: Optional[float] = None
    stop: Optional[float] = None
    body: str


class CommentCreate(BaseModel):
    body: str


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/social", tags=["social"])


@router.post("/follow/{user_id}")
def follow_user(user_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    if user_id == me.id:
        raise HTTPException(400, "Cannot follow yourself")
    existing = db.query(Follow).filter(Follow.follower_id == me.id, Follow.followee_id == user_id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "ok", "action": "unfollowed"}
    db.add(Follow(follower_id=me.id, followee_id=user_id))
    db.commit()
    return {"status": "ok", "action": "followed"}


@router.get("/following")
def get_following(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    rows = db.query(Follow).filter(Follow.follower_id == me.id).all()
    ids = [r.followee_id for r in rows]
    users = db.query(User).filter(User.id.in_(ids)).all()
    return {"status": "ok", "following": [{"id": u.id, "name": u.name, "email": u.email} for u in users]}


@router.get("/followers")
def get_followers(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    rows = db.query(Follow).filter(Follow.followee_id == me.id).all()
    ids = [r.follower_id for r in rows]
    users = db.query(User).filter(User.id.in_(ids)).all()
    return {"status": "ok", "followers": [{"id": u.id, "name": u.name, "email": u.email} for u in users]}


@router.get("/ideas")
def list_ideas(ticker: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(TradeIdea).order_by(TradeIdea.created_at.desc())
    if ticker:
        q = q.filter(TradeIdea.ticker == ticker.upper())
    ideas = q.limit(50).all()
    return {"status": "ok", "ideas": [_serialize_idea(i) for i in ideas]}


@router.post("/ideas")
def create_idea(req: IdeaCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    idea = TradeIdea(user_id=me.id, ticker=req.ticker.upper(), direction=req.direction,
                     entry=req.entry, target=req.target, stop=req.stop, body=req.body)
    db.add(idea)
    db.commit()
    db.refresh(idea)
    return {"status": "ok", "idea": _serialize_idea(idea)}


@router.post("/ideas/{idea_id}/like")
def like_idea(idea_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    idea = db.query(TradeIdea).filter(TradeIdea.id == idea_id).first()
    if not idea:
        raise HTTPException(404, "Idea not found")
    idea.likes = (idea.likes or 0) + 1
    db.commit()
    return {"status": "ok", "likes": idea.likes}


@router.post("/ideas/{idea_id}/comments")
def add_comment(idea_id: int, req: CommentCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    idea = db.query(TradeIdea).filter(TradeIdea.id == idea_id).first()
    if not idea:
        raise HTTPException(404, "Idea not found")
    comment = IdeaComment(idea_id=idea_id, user_id=me.id, body=req.body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {"status": "ok", "comment": {"id": comment.id, "body": comment.body, "created_at": comment.created_at.isoformat()}}


@router.get("/ideas/{idea_id}/comments")
def list_comments(idea_id: int, db: Session = Depends(get_db)):
    comments = db.query(IdeaComment).filter(IdeaComment.idea_id == idea_id).order_by(IdeaComment.created_at).all()
    return {"status": "ok", "comments": [{"id": c.id, "body": c.body, "author": c.author.name if c.author else "?", "created_at": c.created_at.isoformat()} for c in comments]}


@router.get("/weekly-badges")
def get_weekly_badges(db: Session = Depends(get_db)):
    """Award and return weekly leaderboard badges."""
    from models.portfolio import Portfolio, Position, Trade
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    portfolios = db.query(Portfolio).all()
    ranked = []
    for p in portfolios:
        positions = db.query(Position).filter(Position.portfolio_id == p.id).all()
        pos_value = sum(pos.quantity * (pos.current_price or pos.avg_entry_price) for pos in positions)
        ranked.append({"portfolio_id": p.id, "name": p.name, "total": p.cash + pos_value})
    ranked.sort(key=lambda x: x["total"], reverse=True)

    badge_map = {1: "gold", 2: "silver", 3: "bronze"}
    badges = []
    for i, row in enumerate(ranked[:3]):
        row["rank"] = i + 1
        row["badge"] = badge_map[i + 1]
        badges.append(row)
    return {"status": "ok", "week_start": week_start.isoformat(), "badges": badges}


def _serialize_idea(i: TradeIdea):
    rr = None
    if i.entry and i.target and i.stop:
        risk = abs(i.entry - i.stop)
        reward = abs(i.target - i.entry)
        rr = round(reward / risk, 2) if risk > 0 else None
    return {
        "id": i.id, "ticker": i.ticker, "direction": i.direction,
        "entry": i.entry, "target": i.target, "stop": i.stop,
        "body": i.body, "likes": i.likes or 0, "risk_reward": rr,
        "author": i.author.name if i.author else "?",
        "author_id": i.user_id,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    }
