import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class FusionEngine:
    def __init__(self):
        self._data_buffer: Dict[str, List[Dict[str, Any]]] = {}

    def ingest(self, ticker: str, data: Dict[str, Any]):
        if ticker not in self._data_buffer:
            self._data_buffer[ticker] = []
        self._data_buffer[ticker].append({
            **data,
            "collected_at": datetime.now().isoformat(),
        })
        if len(self._data_buffer[ticker]) > 1000:
            self._data_buffer[ticker] = self._data_buffer[ticker][-500:]

    def get_timeseries(self, ticker: str, minutes: int = 60) -> pd.DataFrame:
        if ticker not in self._data_buffer:
            return pd.DataFrame()
        cutoff = datetime.now() - timedelta(minutes=minutes)
        records = [
            r for r in self._data_buffer[ticker]
            if datetime.fromisoformat(r["collected_at"]) > cutoff
        ]
        if not records:
            return pd.DataFrame()
        df = pd.DataFrame(records)
        df["collected_at"] = pd.to_datetime(df["collected_at"])
        df = df.set_index("collected_at").sort_index()
        return df

    def compute_multi_timeframe_features(self, ticker: str) -> Dict[str, Any]:
        df_5m = self.get_timeseries(ticker, minutes=5)
        df_30m = self.get_timeseries(ticker, minutes=30)
        df_1h = self.get_timeseries(ticker, minutes=60)

        features = {}
        for label, df in [("5m", df_5m), ("30m", df_30m), ("1h", df_1h)]:
            if df.empty or "price" not in df.columns:
                features[label] = {}
                continue
            prices = df["price"].dropna().values
            if len(prices) < 2:
                features[label] = {"price": prices[-1] if len(prices) > 0 else 0}
                continue
            features[label] = {
                "price": float(prices[-1]),
                "change": float(prices[-1] - prices[0]),
                "change_pct": float((prices[-1] - prices[0]) / prices[0] * 100),
                "high": float(np.max(prices)),
                "low": float(np.min(prices)),
                "volatility": float(np.std(prices)),
                "volume_avg": float(df["volume"].dropna().mean()) if "volume" in df.columns else 0,
                "momentum": float(prices[-1] - prices[-min(5, len(prices))]),
            }
        return features

    def fuse_signals(self, signals: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not signals:
            return {"signal": "NEUTRAL", "confidence": 0.0, "sources": []}

        weights = {"technical": 0.4, "ml": 0.4, "sentiment": 0.2}
        total_confidence = 0.0
        weighted_signal = 0.0
        sources = []

        for sig in signals:
            source_type = sig.get("source", "unknown")
            w = weights.get(source_type, 0.33)
            signal_val = {"STRONG_SELL": -2, "SELL": -1, "NEUTRAL": 0, "BUY": 1, "STRONG_BUY": 2}.get(
                sig.get("signal"), 0
            )
            confidence = sig.get("confidence", 0.5)
            weighted_signal += signal_val * w * confidence
            total_confidence += w * confidence
            sources.append(sig.get("source", "unknown"))

        if total_confidence == 0:
            return {"signal": "NEUTRAL", "confidence": 0.0, "sources": sources}

        avg_signal = weighted_signal / total_confidence
        avg_confidence = total_confidence / len(signals)

        if avg_signal > 1.2:
            final_signal = "STRONG_BUY"
        elif avg_signal > 0.3:
            final_signal = "BUY"
        elif avg_signal < -1.2:
            final_signal = "STRONG_SELL"
        elif avg_signal < -0.3:
            final_signal = "SELL"
        else:
            final_signal = "NEUTRAL"

        return {
            "signal": final_signal,
            "confidence": round(avg_confidence, 2),
            "score": round(float(avg_signal), 3),
            "sources": list(set(sources)),
            "timestamp": datetime.now().isoformat(),
        }

    def get_all_buffered_tickers(self) -> List[str]:
        return list(self._data_buffer.keys())
