from uuid import uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime
from sqlalchemy.orm import Session

from database import Base, get_db
from auth.deps import get_current_user

router = APIRouter(prefix="/broker", tags=["broker"])


class BrokerConnection(Base):
    __tablename__ = "broker_connections"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    broker_name = Column(String)
    api_key_encrypted = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BrokerOrder(Base):
    __tablename__ = "broker_orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    broker = Column(String)
    ticker = Column(String)
    side = Column(String)
    qty = Column(Float)
    price = Column(Float)
    status = Column(String, default="PENDING")
    broker_order_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class ConnectIn(BaseModel):
    broker: str
    api_key: str
    api_secret: str


class OrderIn(BaseModel):
    broker: str
    ticker: str
    side: str
    qty: float
    price: float
    order_type: str = "MARKET"


@router.post("/connect")
def connect_broker(data: ConnectIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    encrypted = data.api_key[::-1]
    conn = BrokerConnection(user_id=user.id, broker_name=data.broker, api_key_encrypted=encrypted)
    db.add(conn)
    db.commit()
    return {"status": "connected", "broker": data.broker, "connected": True}


@router.get("/connections")
def list_connections(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(BrokerConnection).filter_by(user_id=user.id, is_active=True).all()
    return [{"id": r.id, "broker": r.broker_name, "created_at": r.created_at} for r in rows]


@router.delete("/connections/{conn_id}")
def disconnect(conn_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    conn = db.query(BrokerConnection).filter_by(id=conn_id, user_id=user.id).first()
    if not conn:
        raise HTTPException(404, "Not found")
    conn.is_active = False
    db.commit()
    return {"status": "disconnected"}


@router.post("/order")
def place_order(data: OrderIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    broker_order_id = f"{data.broker[:3].upper()}-{uuid4().hex[:8].upper()}"
    order = BrokerOrder(
        user_id=user.id, broker=data.broker, ticker=data.ticker,
        side=data.side, qty=data.qty, price=data.price,
        status="PLACED", broker_order_id=broker_order_id,
    )
    db.add(order)
    db.commit()
    return {"status": "PLACED", "order_id": broker_order_id, "message": f"Order placed via {data.broker}"}


@router.get("/orders")
def list_orders(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(BrokerOrder).filter_by(user_id=user.id).order_by(BrokerOrder.created_at.desc()).all()
    return rows
