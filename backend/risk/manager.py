from typing import Dict, Any, Optional, List, Tuple
import numpy as np
import pandas as pd
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class RiskAssessment:
    approved: bool
    max_shares: int
    max_position_value: float
    stop_loss_price: float
    take_profit_price: float
    risk_score: float
    warnings: List[str]


class RiskManager:
    def __init__(
        self,
        max_position_pct: float = 0.02,
        max_portfolio_risk: float = 0.25,
        stop_loss_pct: float = 0.05,
        take_profit_pct: float = 0.15,
        max_leverage: float = 1.0,
    ):
        self.max_position_pct = max_position_pct
        self.max_portfolio_risk = max_portfolio_risk
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct
        self.max_leverage = max_leverage
        self._portfolio_history: List[float] = []

    def assess_trade(
        self,
        ticker: str,
        current_price: float,
        portfolio_value: float,
        existing_positions: Dict[str, Dict[str, Any]],
        volatility: float = 0.02,
        signal_confidence: float = 0.5,
        side: str = "BUY",
    ) -> RiskAssessment:
        warnings = []

        if portfolio_value <= 0:
            return RiskAssessment(
                approved=False, max_shares=0, max_position_value=0,
                stop_loss_price=0, take_profit_price=0, risk_score=1.0,
                warnings=["Portfolio value is zero or negative"],
            )

        max_position_value = portfolio_value * self.max_position_pct

        current_exposure = sum(
            pos.get("value", 0) for pos in existing_positions.values()
        )
        total_exposure = current_exposure + max_position_value
        exposure_ratio = total_exposure / portfolio_value

        risk_score = 0.0
        if volatility > 0.04:
            risk_score += 0.3
            warnings.append(f"High volatility: {volatility:.2%}")

        if signal_confidence < 0.3:
            risk_score += 0.2
            warnings.append("Low signal confidence")

        if exposure_ratio > self.max_portfolio_risk:
            risk_score += 0.3
            warnings.append(f"Exposure {exposure_ratio:.1%} exceeds max {self.max_portfolio_risk:.1%}")

        if ticker in existing_positions:
            risk_score += 0.1
            warnings.append(f"Already holding {ticker}")

        if side == "BUY":
            stop_loss = current_price * (1 - self.stop_loss_pct)
            take_profit = current_price * (1 + self.take_profit_pct)
        else:
            stop_loss = current_price * (1 + self.stop_loss_pct)
            take_profit = current_price * (1 - self.take_profit_pct)

        risk_adjusted_position = max_position_value * (1 - risk_score)
        max_shares = int(risk_adjusted_position / current_price) if current_price > 0 else 0

        approved = risk_score < 0.7

        return RiskAssessment(
            approved=approved,
            max_shares=max_shares,
            max_position_value=risk_adjusted_position,
            stop_loss_price=round(stop_loss, 2),
            take_profit_price=round(take_profit, 2),
            risk_score=round(risk_score, 2),
            warnings=warnings,
        )

    def calculate_var(self, portfolio_value: float, positions: Dict[str, Dict], confidence: float = 0.95) -> float:
        if not positions:
            return 0.0
        weights = []
        returns = []

        for ticker, pos in positions.items():
            weight = pos.get("value", 0) / portfolio_value if portfolio_value > 0 else 0
            weights.append(weight)
            hist_returns = pos.get("returns", [0] * 100)
            if len(hist_returns) > 1:
                returns.append(hist_returns)

        if not returns:
            return 0.0

        portfolio_returns = np.dot(np.array(returns).T, np.array(weights))
        if len(portfolio_returns) < 2:
            return 0.0

        var = float(np.percentile(portfolio_returns, (1 - confidence) * 100))
        return abs(var) * portfolio_value

    def update_portfolio_history(self, value: float):
        self._portfolio_history.append(value)
        if len(self._portfolio_history) > 500:
            self._portfolio_history = self._portfolio_history[-500:]

    def get_portfolio_stats(self) -> Dict[str, Any]:
        if len(self._portfolio_history) < 2:
            return {}
        values = np.array(self._portfolio_history)
        returns = np.diff(values) / values[:-1]
        return {
            "current_value": float(values[-1]),
            "peak_value": float(np.max(values)),
            "current_drawdown": float((values[-1] - np.max(values)) / np.max(values)),
            "volatility": float(np.std(returns)) if len(returns) > 1 else 0,
            "sharpe": float(
                np.mean(returns) / np.std(returns) * np.sqrt(252)
                if np.std(returns) > 0 else 0
            ),
            "max_drawdown": float(np.min((values - np.maximum.accumulate(values)) / np.maximum.accumulate(values))),
        }
