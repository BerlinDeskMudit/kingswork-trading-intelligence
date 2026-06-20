from fastapi import HTTPException
from sqlalchemy.orm import Session

from config import settings
from models.portfolio import Portfolio


def get_or_create_user_wallet(db: Session, user_id: int, user_name: str | None = None) -> Portfolio:
    wallet = db.query(Portfolio).filter(
        Portfolio.user_id == user_id,
        Portfolio.is_primary == True,
    ).first()
    if wallet:
        return wallet

    wallet = db.query(Portfolio).filter(Portfolio.user_id == user_id).order_by(Portfolio.id).first()
    if wallet:
        wallet.is_primary = True
        db.commit()
        db.refresh(wallet)
        return wallet

    label = f"{user_name or 'Primary'} Paper Wallet"
    wallet = Portfolio(
        user_id=user_id,
        name=label[:100],
        cash=settings.demo_wallet_initial_cash,
        is_paper=True,
        is_primary=True,
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


def require_user_portfolio(db: Session, user_id: int, portfolio_id: int) -> Portfolio:
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == user_id,
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio
