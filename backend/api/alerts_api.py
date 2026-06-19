from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db
from models.alerts import Alert, AlertRule, AlertCondition, AlertSeverity
from pydantic import BaseModel

router = APIRouter(prefix="/alerts", tags=["alerts"])


class RuleCreate(BaseModel):
    name: str
    ticker: str
    condition: AlertCondition
    threshold: Optional[float] = None
    severity: AlertSeverity = AlertSeverity.MEDIUM
    enabled: bool = True


@router.get("/rules")
async def list_rules(db: Session = Depends(get_db)):
    rules = db.query(AlertRule).all()
    return {"status": "ok", "rules": rules}


@router.post("/rules")
async def create_rule(rule: RuleCreate, db: Session = Depends(get_db)):
    db_rule = AlertRule(
        name=rule.name,
        ticker=rule.ticker.upper(),
        condition=rule.condition,
        threshold=rule.threshold,
        severity=rule.severity,
        enabled=rule.enabled,
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return {"status": "ok", "rule": db_rule}


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"status": "ok", "message": "Rule deleted"}


@router.get("/history")
async def get_alerts(
    ticker: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Alert).order_by(Alert.triggered_at.desc())
    if ticker:
        query = query.filter(Alert.ticker == ticker.upper())
    alerts = query.limit(limit).all()
    return {
        "status": "ok",
        "alerts": [
            {
                "id": a.id,
                "ticker": a.ticker,
                "message": a.message,
                "severity": a.severity.value,
                "triggered_at": a.triggered_at.isoformat() if a.triggered_at else None,
                "acknowledged": a.acknowledged,
            }
            for a in alerts
        ],
    }


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    db.commit()
    return {"status": "ok", "message": "Alert acknowledged"}
