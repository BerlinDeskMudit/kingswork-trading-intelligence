import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
import pandas as pd
from datetime import datetime
import logging
import pickle
import os

logger = logging.getLogger(__name__)


class MarketRegimeDetector:
    def __init__(self):
        self.model_path = "models/market_regime.pkl"
        self._model = None
        self.scaler = StandardScaler()

    def _extract_features(self, df: pd.DataFrame) -> np.ndarray:
        prices = df["close"].values
        returns = np.diff(prices) / prices[:-1]
        if len(returns) < 20:
            return np.zeros((1, 5))

        features = np.array([
            np.mean(returns[-20:]),
            np.std(returns[-20:]),
            np.mean(returns[-5:]),
            (prices[-1] - np.mean(prices[-20:])) / np.mean(prices[-20:]),
            np.sum(returns[-20:] > 0) / 20,
        ]).reshape(1, -1)
        return features

    def detect_regime(self, df: pd.DataFrame) -> Dict[str, Any]:
        features = self._extract_features(df)
        features_scaled = self.scaler.fit_transform(features)

        recent_returns = np.diff(df["close"].values) / df["close"].values[:-1]
        volatility = float(np.std(recent_returns[-20:])) if len(recent_returns) >= 20 else 0
        trend = float(np.mean(recent_returns[-20:])) if len(recent_returns) >= 20 else 0

        if volatility > 0.02 and abs(trend) < 0.005:
            regime = "HIGH_VOLATILITY"
            confidence = min(volatility * 50, 0.9)
        elif trend > 0.005:
            regime = "BULLISH"
            confidence = min(abs(trend) * 50, 0.9)
        elif trend < -0.005:
            regime = "BEARISH"
            confidence = min(abs(trend) * 50, 0.9)
        else:
            regime = "NEUTRAL"
            confidence = 0.4

        return {
            "regime": regime,
            "confidence": round(confidence, 2),
            "volatility": round(volatility, 4),
            "trend": round(trend, 4),
        }


class MLSignalGenerator:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=100, max_depth=10, random_state=42
        )
        self.scaler = StandardScaler()
        self._trained = False
        self.regime_detector = MarketRegimeDetector()

    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        features = pd.DataFrame(index=df.index)
        prices = df["close"].values
        volumes = df.get("volume", pd.Series([0] * len(df))).values

        features["returns_1"] = df["close"].pct_change(1)
        features["returns_5"] = df["close"].pct_change(5)
        features["returns_10"] = df["close"].pct_change(10)
        features["returns_20"] = df["close"].pct_change(20)
        features["volatility_5"] = features["returns_1"].rolling(5).std()
        features["volatility_10"] = features["returns_1"].rolling(10).std()
        features["volume_change"] = np.log1p(volumes) - np.log1p(np.roll(volumes, 1))
        if "high" in df.columns and "low" in df.columns:
            features["high_low_ratio"] = df["high"] / df["low"] - 1
        if "open" in df.columns:
            features["gap"] = df["open"] / df["close"].shift(1) - 1
        features["rsi_14"] = self._compute_rsi(prices, 14)
        features["ma_ratio_20_50"] = self._ma_ratio(prices, 20, 50)

        return features.fillna(0).replace([np.inf, -np.inf], 0)

    def _compute_rsi(self, prices: np.ndarray, period: int = 14) -> np.ndarray:
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        avg_gain = np.convolve(gains, np.ones(period) / period, mode="same")
        avg_loss = np.convolve(losses, np.ones(period) / period, mode="same")
        rs = np.divide(avg_gain, avg_loss, out=np.ones_like(avg_gain), where=avg_loss != 0)
        rsi = 100 - (100 / (1 + rs))
        return np.concatenate([np.full(1, 50), rsi])

    def _ma_ratio(self, prices: np.ndarray, fast: int, slow: int) -> float:
        if len(prices) < slow:
            return 0.0
        ma_fast = np.mean(prices[-fast:])
        ma_slow = np.mean(prices[-slow:])
        if ma_slow == 0:
            return 0.0
        return (ma_fast - ma_slow) / ma_slow

    def train(self, df: pd.DataFrame, force: bool = False):
        if self._trained and not force:
            return
        features = self._prepare_features(df)
        prices = df["close"].values
        future_returns = np.diff(prices) / prices[:-1]
        future_returns = np.append(future_returns, 0)

        threshold = 0.005
        y = np.zeros(len(future_returns))
        y[future_returns > threshold] = 1
        y[future_returns < -threshold] = 2

        features = features.iloc[:-1]
        y = y[:-1]

        if len(features) < 50:
            logger.warning("Insufficient data for ML training")
            return

        X_scaled = self.scaler.fit_transform(features.values)
        self.model.fit(X_scaled, y)
        self._trained = True
        logger.info(f"ML model trained on {len(X_scaled)} samples")

    def predict(self, df: pd.DataFrame) -> Dict[str, Any]:
        features = self._prepare_features(df)
        latest_features = features.iloc[-1:].values

        if not self._trained:
            self.train(df)

        X_scaled = self.scaler.transform(latest_features)
        probs = self.model.predict_proba(X_scaled)[0]

        if len(probs) < 3:
            probs = [0.33, 0.34, 0.33]

        regime = self.regime_detector.detect_regime(df)

        sell_prob, hold_prob, buy_prob = probs[0], probs[1] if len(probs) > 1 else 0.33, probs[-1]

        if buy_prob > 0.5 and buy_prob > sell_prob * 1.5:
            signal = "BUY"
            confidence = buy_prob
        elif sell_prob > 0.5 and sell_prob > buy_prob * 1.5:
            signal = "SELL"
            confidence = sell_prob
        else:
            signal = "NEUTRAL"
            confidence = max(hold_prob, 0.3)

        return {
            "signal": signal,
            "confidence": round(float(confidence), 2),
            "source": "ml",
            "probabilities": {
                "sell": round(float(sell_prob), 3),
                "hold": round(float(hold_prob), 3),
                "buy": round(float(buy_prob), 3),
            },
            "regime": regime,
        }
