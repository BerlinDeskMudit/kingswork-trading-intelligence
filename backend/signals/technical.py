import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class TechnicalSignalGenerator:
    def __init__(self):
        self.rsi_period = 14
        self.macd_fast = 12
        self.macd_slow = 26
        self.macd_signal = 9
        self.sma_periods = [20, 50, 200]
        self.bb_period = 20
        self.bb_std = 2

    def compute_rsi(self, prices: pd.Series) -> float:
        if len(prices) < self.rsi_period + 1:
            return 50.0
        delta = prices.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = -delta.where(delta < 0, 0.0)
        avg_gain = gain.rolling(window=self.rsi_period).mean().iloc[-1]
        avg_loss = loss.rolling(window=self.rsi_period).mean().iloc[-1]
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return float(100.0 - (100.0 / (1.0 + rs)))

    def compute_macd(self, prices: pd.Series) -> Dict[str, float]:
        if len(prices) < self.macd_slow + self.macd_signal:
            return {"macd": 0, "signal": 0, "histogram": 0}
        ema_fast = prices.ewm(span=self.macd_fast, adjust=False).mean()
        ema_slow = prices.ewm(span=self.macd_slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=self.macd_signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return {
            "macd": float(macd_line.iloc[-1]),
            "signal": float(signal_line.iloc[-1]),
            "histogram": float(histogram.iloc[-1]),
        }

    def compute_bollinger_bands(self, prices: pd.Series) -> Dict[str, float]:
        if len(prices) < self.bb_period:
            return {"upper": 0, "middle": 0, "lower": 0}
        sma = prices.rolling(window=self.bb_period).mean().iloc[-1]
        std = prices.rolling(window=self.bb_period).std().iloc[-1]
        return {
            "upper": float(sma + self.bb_std * std),
            "middle": float(sma),
            "lower": float(sma - self.bb_std * std),
        }

    def compute_sma(self, prices: pd.Series, period: int) -> float:
        if len(prices) < period:
            return float(prices.iloc[-1])
        return float(prices.rolling(window=period).mean().iloc[-1])

    def compute_atr(self, high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> float:
        if len(close) < period + 1:
            return 0.0
        high_low = high - low
        high_close = (high - close.shift()).abs()
        low_close = (low - close.shift()).abs()
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        return float(tr.rolling(window=period).mean().iloc[-1])

    def compute_volume_profile(self, volume: pd.Series, prices: pd.Series) -> Dict[str, float]:
        if len(volume) < 2:
            return {"avg_volume": 0, "volume_ratio": 1.0}
        avg_vol = float(volume.iloc[-20:].mean())
        current_vol = float(volume.iloc[-1]) if len(volume) > 0 else 0
        ratio = current_vol / avg_vol if avg_vol > 0 else 1.0
        return {"avg_volume": avg_vol, "current_volume": current_vol, "volume_ratio": ratio}

    def generate_signal(self, df: pd.DataFrame) -> Dict[str, Any]:
        if df.empty or "close" not in df.columns:
            return {"signal": "NEUTRAL", "confidence": 0.0, "details": {}}

        prices = df["close"].dropna()
        if len(prices) < 20:
            return {"signal": "NEUTRAL", "confidence": 0.0, "details": {"reason": "insufficient_data"}}

        rsi = self.compute_rsi(prices)
        macd = self.compute_macd(prices)
        bb = self.compute_bollinger_bands(prices)
        sma_20_val = self.compute_sma(prices, 20)
        sma_50_val = self.compute_sma(prices, 50) if len(prices) >= 50 else None

        volume_data = {}
        if "volume" in df.columns:
            volume_data = self.compute_volume_profile(df["volume"].dropna(), prices)

        atr_val = 0.0
        if all(c in df.columns for c in ["high", "low", "close"]):
            atr_val = self.compute_atr(df["high"].dropna(), df["low"].dropna(), prices)

        signals = []
        current_price = float(prices.iloc[-1])

        if rsi < 30:
            signals.append(("RSI_OVERSOLD", 0.7, 1))
        elif rsi > 70:
            signals.append(("RSI_OVERBOUGHT", 0.7, -1))
        elif rsi < 40:
            signals.append(("RSI_BULLISH", 0.4, 0.5))
        elif rsi > 60:
            signals.append(("RSI_BEARISH", 0.4, -0.5))

        if macd["histogram"] > 0 and macd["macd"] > macd["signal"]:
            signals.append(("MACD_BULLISH", 0.6, 1))
        elif macd["histogram"] < 0 and macd["macd"] < macd["signal"]:
            signals.append(("MACD_BEARISH", 0.6, -1))

        if current_price < bb["lower"]:
            signals.append(("BB_OVERSOLD", 0.5, 1))
        elif current_price > bb["upper"]:
            signals.append(("BB_OVERBOUGHT", 0.5, -1))

        if sma_50_val is not None:
            if current_price > sma_50_val > sma_20_val:
                signals.append(("TREND_BULLISH", 0.5, 0.8))
            elif current_price < sma_50_val < sma_20_val:
                signals.append(("TREND_BEARISH", 0.5, -0.8))

        if volume_data.get("volume_ratio", 1.0) > 1.5:
            signals.append(("HIGH_VOLUME", 0.3, 0.3 if signals else 0))

        score = sum(s[2] * s[1] for s in signals)
        confidence = min(abs(score), 1.0)
        n_signals = len(signals)
        if n_signals > 0:
            confidence = min(confidence + 0.1 * n_signals, 0.95)
        else:
            confidence = 0.1

        if score > 0.8:
            signal = "STRONG_BUY"
        elif score > 0.2:
            signal = "BUY"
        elif score < -0.8:
            signal = "STRONG_SELL"
        elif score < -0.2:
            signal = "SELL"
        else:
            signal = "NEUTRAL"

        return {
            "signal": signal,
            "confidence": round(confidence, 2),
            "score": round(float(score), 3),
            "source": "technical",
            "details": {
                "rsi": round(rsi, 2),
                "macd": {k: round(v, 4) for k, v in macd.items()},
                "bollinger_bands": {k: round(v, 2) for k, v in bb.items()},
                "sma_20": round(sma_20_val, 2),
                "sma_50": round(sma_50_val, 2) if sma_50_val else None,
                "atr": round(atr_val, 4),
                "volume": {k: round(v, 2) if isinstance(v, float) else v for k, v in volume_data.items()},
                "signals_triggered": [s[0] for s in signals],
            },
        }
