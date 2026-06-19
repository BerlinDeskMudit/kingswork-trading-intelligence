import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class BacktestResult:
    total_return: float = 0.0
    annualized_return: float = 0.0
    sharpe_ratio: float = 0.0
    max_drawdown: float = 0.0
    win_rate: float = 0.0
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    avg_win: float = 0.0
    avg_loss: float = 0.0
    profit_factor: float = 0.0
    final_capital: float = 0.0
    equity_curve: List[float] = field(default_factory=list)
    trades: List[Dict] = field(default_factory=list)


class BacktestEngine:
    def __init__(self, initial_capital: float = 100000.0, commission_pct: float = 0.001):
        self.initial_capital = initial_capital
        self.commission_pct = commission_pct

    def run(
        self,
        df: pd.DataFrame,
        signal_col: str = "signal",
        price_col: str = "close",
    ) -> BacktestResult:
        if df.empty:
            return BacktestResult()

        result = BacktestResult()
        capital = self.initial_capital
        position = 0
        entry_price = 0.0
        equity_curve = [capital]
        trades = []

        prices = df[price_col].values
        signals = df[signal_col].values if signal_col in df.columns else ["NEUTRAL"] * len(df)

        for i in range(1, len(prices)):
            price = prices[i]
            signal = signals[i] if i < len(signals) else "NEUTRAL"

            if signal in ("STRONG_BUY", "BUY") and position == 0:
                shares = int(capital * 0.95 / price)
                cost = shares * price * (1 + self.commission_pct)
                if cost <= capital:
                    position = shares
                    entry_price = price
                    capital -= cost
                    trades.append({
                        "date": df.index[i] if hasattr(df.index, '__getitem__') else i,
                        "action": "BUY",
                        "price": price,
                        "shares": shares,
                        "cost": cost,
                    })

            elif signal in ("STRONG_SELL", "SELL") and position > 0:
                shares = position
                proceeds = shares * price * (1 - self.commission_pct)
                pnl = proceeds - (position * entry_price)
                capital += proceeds
                trades[-1].update({
                    "exit_date": df.index[i] if hasattr(df.index, '__getitem__') else i,
                    "exit_price": price,
                    "pnl": pnl,
                    "pnl_pct": pnl / (position * entry_price),
                })
                trades.append({
                    "date": df.index[i] if hasattr(df.index, '__getitem__') else i,
                    "action": "SELL",
                    "price": price,
                    "shares": shares,
                    "proceeds": proceeds,
                })
                position = 0
                entry_price = 0.0

            equity = capital + position * price
            equity_curve.append(equity)

        if position > 0:
            price = prices[-1]
            proceeds = position * price * (1 - self.commission_pct)
            capital += proceeds
            if trades:
                trades[-1].update({
                    "exit_date": df.index[-1] if hasattr(df.index, '__getitem__') else len(prices) - 1,
                    "exit_price": price,
                    "pnl": proceeds - (position * entry_price),
                })

        equity_curve = np.array(equity_curve)
        result.final_capital = capital
        result.total_return = (capital - self.initial_capital) / self.initial_capital
        result.equity_curve = equity_curve.tolist()

        buy_trades = [t for t in trades if t.get("action") == "BUY" and "pnl" in t]
        if buy_trades:
            winning = [t for t in buy_trades if t["pnl"] > 0]
            losing = [t for t in buy_trades if t["pnl"] <= 0]
            result.total_trades = len(buy_trades)
            result.winning_trades = len(winning)
            result.losing_trades = len(losing)
            result.win_rate = len(winning) / len(buy_trades) if buy_trades else 0
            result.avg_win = np.mean([t["pnl"] for t in winning]) if winning else 0
            result.avg_loss = np.mean([t["pnl"] for t in losing]) if losing else 0
            gross_profit = sum(t["pnl"] for t in winning) if winning else 0
            gross_loss = abs(sum(t["pnl"] for t in losing)) if losing else 0
            result.profit_factor = gross_profit / gross_loss if gross_loss > 0 else float("inf")
            result.trades = buy_trades

        if len(equity_curve) > 1:
            daily_returns = np.diff(equity_curve) / equity_curve[:-1]
            result.annualized_return = float(np.mean(daily_returns) * 252)
            result.sharpe_ratio = float(
                np.mean(daily_returns) / np.std(daily_returns) * np.sqrt(252)
                if np.std(daily_returns) > 0 else 0
            )
            running_max = np.maximum.accumulate(equity_curve)
            drawdowns = (equity_curve - running_max) / running_max
            result.max_drawdown = float(np.min(drawdowns))

        return result
