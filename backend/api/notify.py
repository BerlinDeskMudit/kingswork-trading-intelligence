from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import Session

from database import Base, get_db
from auth.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String)
    body = Column(String)
    type = Column(String, default="alert")  # alert | signal | news
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def create_notification(db: Session, user_id: int, title: str, body: str, type: str = "alert"):
    n = Notification(user_id=user_id, title=title, body=body, type=type)
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


class TestNotifIn(BaseModel):
    title: str
    body: str


@router.get("")
def list_notifications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = (db.query(Notification)
            .filter_by(user_id=user.id, read=False)
            .order_by(Notification.created_at.desc())
            .limit(50).all())
    return rows


@router.post("/{notif_id}/read")
def mark_read(notif_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    n = db.query(Notification).filter_by(id=notif_id, user_id=user.id).first()
    if not n:
        raise HTTPException(404, "Not found")
    n.read = True
    db.commit()
    return {"status": "ok"}


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), user=Depends(get_current_user)):
    db.query(Notification).filter_by(user_id=user.id, read=False).update({"read": True})
    db.commit()
    return {"status": "ok"}


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), user=Depends(get_current_user)):
    count = db.query(Notification).filter_by(user_id=user.id, read=False).count()
    return {"count": count}


@router.post("/send-test")
def send_test(data: TestNotifIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    n = create_notification(db, user.id, data.title, data.body)
    return {"status": "created", "id": n.id}
