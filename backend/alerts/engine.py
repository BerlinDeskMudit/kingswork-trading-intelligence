from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from models.alerts import AlertCondition, AlertSeverity, Alert, AlertRule
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)


class AlertEngine:
    def __init__(self, db: Optional[Session] = None):
        self._db = db
        self._handlers: List[Callable] = []

    def set_db(self, db: Session):
        self._db = db

    def register_handler(self, handler: Callable):
        self._handlers.append(handler)

    def evaluate_rule(self, rule: AlertRule, market_data: Dict[str, Any]) -> Optional[Alert]:
        if not rule.enabled:
            return None

        ticker_data = market_data.get(rule.ticker, {})
        if not ticker_data:
            return None

        triggered = False
        message = ""

        cond = rule.condition
        price = ticker_data.get("price", 0)
        volume = ticker_data.get("volume", 0)
        threshold = rule.threshold or 0

        if cond == AlertCondition.PRICE_ABOVE and price > threshold:
            triggered = True
            message = f"{rule.ticker} price ${price:.2f} above ${threshold:.2f}"

        elif cond == AlertCondition.PRICE_BELOW and price < threshold:
            triggered = True
            message = f"{rule.ticker} price ${price:.2f} below ${threshold:.2f}"

        elif cond == AlertCondition.VOLUME_SPIKE:
            avg_vol = ticker_data.get("avg_volume", volume)
            if avg_vol > 0 and volume / avg_vol > (threshold or 2.0):
                triggered = True
                message = f"{rule.ticker} volume spike: {volume:,} vs avg {avg_vol:,}"

        elif cond == AlertCondition.SIGNAL_BUY:
            signal = ticker_data.get("signal", "")
            if signal in ("BUY", "STRONG_BUY"):
                triggered = True
                message = f"{rule.ticker} generated {signal} signal"

        elif cond == AlertCondition.SIGNAL_SELL:
            signal = ticker_data.get("signal", "")
            if signal in ("SELL", "STRONG_SELL"):
                triggered = True
                message = f"{rule.ticker} generated {signal} signal"

        if triggered:
            alert = Alert(
                rule_id=rule.id,
                ticker=rule.ticker,
                message=message,
                severity=rule.severity,
                extra_data={
                    "price": price,
                    "volume": volume,
                    "condition": cond.value,
                    "threshold": threshold,
                },
            )
            if self._db:
                try:
                    self._db.add(alert)
                    self._db.commit()
                    self._db.refresh(alert)
                except Exception as e:
                    logger.error(f"Failed to save alert: {e}")
                    self._db.rollback()

            for handler in self._handlers:
                try:
                    handler(alert)
                except Exception as e:
                    logger.error(f"Alert handler failed: {e}")

            return alert

        return None

    def evaluate_all(self, rules: List[AlertRule], market_data: Dict[str, Any]) -> List[Alert]:
        triggered = []
        for rule in rules:
            alert = self.evaluate_rule(rule, market_data)
            if alert:
                triggered.append(alert)
        return triggered

    def check_technical_alerts(
        self, ticker: str, price: float, indicators: Dict[str, Any]
    ) -> List[str]:
        alerts = []
        rsi = indicators.get("rsi", 50)
        if rsi < 30:
            alerts.append(f"{ticker} RSI oversold ({rsi:.1f})")
        elif rsi > 70:
            alerts.append(f"{ticker} RSI overbought ({rsi:.1f})")
        bb = indicators.get("bollinger_bands", {})
        if bb.get("lower", 0) > 0 and price < bb["lower"]:
            alerts.append(f"{ticker} below lower Bollinger Band")
        elif bb.get("upper", 0) > 0 and price > bb["upper"]:
            alerts.append(f"{ticker} above upper Bollinger Band")
        return alerts
