"""
Stripe integration for:
- Buying virtual cash (1:1000 ratio, $10 real = $10,000 paper)
- Subscriptions (PRO/PREMIUM)
- Webhooks
"""
from datetime import datetime, timezone
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.deps import get_current_user
from config import settings
from database import get_db
from models.payments import Payment, PaymentStatus, UserSubscription, SubscriptionTier, TIER_PRICES
from models.portfolio import Portfolio
from models.user import User
from services.portfolios import get_or_create_user_wallet

router = APIRouter(prefix="/payments", tags=["payments"])

if settings.stripe_enabled:
    stripe.api_key = settings.stripe_secret_key


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_wallet(db: Session, user_id: int) -> Portfolio:
    return get_or_create_user_wallet(db, user_id)


# ── Buy Virtual Cash ─────────────────────────────────────────────────────────

class BuyCashRequest(BaseModel):
    amount_usd: float  # real dollars (e.g. 10.00)


@router.post("/buy-cash")
def create_cash_checkout(
    req: BuyCashRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.stripe_enabled:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    if req.amount_usd < 5 or req.amount_usd > 500:
        raise HTTPException(status_code=400, detail="Amount must be between $5 and $500")

    virtual_cash = req.amount_usd * 1000  # $10 → $10,000 paper
    amount_cents = int(req.amount_usd * 100)

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": f"${int(virtual_cash):,} Virtual Cash"},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{settings.app_name or 'http://localhost:5173'}/dashboard?payment=success",
        cancel_url=f"{settings.app_name or 'http://localhost:5173'}/dashboard?payment=cancel",
        metadata={"user_id": str(current_user.id), "virtual_cash": str(virtual_cash)},
    )

    payment = Payment(
        user_id=current_user.id,
        stripe_checkout_session_id=session.id,
        amount=amount_cents,
        currency="usd",
        product_type="virtual_cash",
        virtual_cash_amount=virtual_cash,
    )
    db.add(payment)
    db.commit()

    return {"status": "ok", "checkout_url": session.url, "session_id": session.id}


# ── Subscriptions ────────────────────────────────────────────────────────────

class SubscribeRequest(BaseModel):
    tier: str           # "PRO" or "PREMIUM"
    billing: str        # "monthly" or "yearly"


@router.post("/subscribe")
def create_subscription_checkout(
    req: SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.stripe_enabled:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    if req.tier not in ("PRO", "PREMIUM"):
        raise HTTPException(status_code=400, detail="tier must be PRO or PREMIUM")
    if req.billing not in ("monthly", "yearly"):
        raise HTTPException(status_code=400, detail="billing must be monthly or yearly")

    price_cents = TIER_PRICES[req.tier][req.billing]

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": f"KingStop {req.tier} — {req.billing.capitalize()}"},
                "unit_amount": price_cents,
                "recurring": {"interval": "month" if req.billing == "monthly" else "year"},
            },
            "quantity": 1,
        }],
        mode="subscription",
        success_url=f"{settings.app_name or 'http://localhost:5173'}/dashboard?subscription=success",
        cancel_url=f"{settings.app_name or 'http://localhost:5173'}/dashboard?subscription=cancel",
        metadata={"user_id": str(current_user.id), "tier": req.tier},
    )

    return {"status": "ok", "checkout_url": session.url, "session_id": session.id}


@router.get("/subscription")
def get_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = db.query(UserSubscription).filter(UserSubscription.user_id == current_user.id).first()
    if not sub:
        sub = UserSubscription(user_id=current_user.id, tier=SubscriptionTier.FREE)
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return {
        "status": "ok",
        "tier": sub.tier.value,
        "active": sub.active,
        "cancel_at_period_end": sub.cancel_at_period_end,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
    }


@router.post("/cancel-subscription")
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.stripe_enabled:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    sub = db.query(UserSubscription).filter(UserSubscription.user_id == current_user.id).first()
    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription")

    stripe.Subscription.modify(sub.stripe_subscription_id, cancel_at_period_end=True)
    sub.cancel_at_period_end = True
    db.commit()
    return {"status": "ok", "message": "Subscription will cancel at period end"}


# ── Webhook ──────────────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    if not settings.stripe_enabled or not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhooks not configured")

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Handle checkout.session.completed
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        session_id = session["id"]
        user_id = int(session["metadata"].get("user_id", 0))

        # Virtual cash purchase
        if session["mode"] == "payment":
            payment = db.query(Payment).filter(Payment.stripe_checkout_session_id == session_id).first()
            if payment:
                payment.status = PaymentStatus.COMPLETED
                payment.completed_at = datetime.now(timezone.utc)
                payment.stripe_payment_intent_id = session.get("payment_intent")

                wallet = _get_wallet(db, payment.user_id)
                wallet.cash += payment.virtual_cash_amount or 0
                db.commit()

        # Subscription
        elif session["mode"] == "subscription":
            stripe_sub_id = session.get("subscription")
            tier = session["metadata"].get("tier", "PRO")
            sub = db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()
            if not sub:
                sub = UserSubscription(user_id=user_id)
                db.add(sub)
            sub.stripe_subscription_id = stripe_sub_id
            sub.stripe_customer_id = session.get("customer")
            sub.tier = SubscriptionTier(tier)
            sub.active = True
            db.commit()

    # Handle subscription updated/cancelled
    elif event["type"] in ("customer.subscription.updated", "customer.subscription.deleted"):
        stripe_sub = event["data"]["object"]
        sub = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == stripe_sub["id"]
        ).first()
        if sub:
            sub.active = stripe_sub["status"] == "active"
            sub.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)
            if stripe_sub.get("current_period_start"):
                sub.current_period_start = datetime.fromtimestamp(stripe_sub["current_period_start"], tz=timezone.utc)
            if stripe_sub.get("current_period_end"):
                sub.current_period_end = datetime.fromtimestamp(stripe_sub["current_period_end"], tz=timezone.utc)
            db.commit()

    return {"status": "ok"}


@router.get("/history")
def payment_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payments = db.query(Payment).filter(Payment.user_id == current_user.id).order_by(Payment.created_at.desc()).limit(50).all()
    return {
        "status": "ok",
        "payments": [
            {
                "id": p.id,
                "amount_usd": round(p.amount / 100, 2),
                "virtual_cash": p.virtual_cash_amount,
                "product_type": p.product_type,
                "status": p.status.value,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in payments
        ],
    }
