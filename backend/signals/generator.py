from typing import Dict, Any, Optional, List
import pandas as pd
import logging
from signals.technical import TechnicalSignalGenerator
from signals.ml_model import MLSignalGenerator, MarketRegimeDetector
from fusion.engine import FusionEngine

logger = logging.getLogger(__name__)


class SignalEnsemble:
    def __init__(self):
        self.technical = TechnicalSignalGenerator()
        self.ml = MLSignalGenerator()
        self.fusion = FusionEngine()

    def analyze(self, df: pd.DataFrame, ticker: str) -> Dict[str, Any]:
        results = {}

        tech_signal = self.technical.generate_signal(df)
        results["technical"] = tech_signal

        try:
            ml_signal = self.ml.predict(df)
            results["ml"] = ml_signal
        except Exception as e:
            logger.warning(f"ML signal failed for {ticker}: {e}")
            results["ml"] = {"signal": "NEUTRAL", "confidence": 0.0, "source": "ml"}

        fused = self.fusion.fuse_signals(list(results.values()))

        return {
            "ticker": ticker,
            "timestamp": pd.Timestamp.now().isoformat(),
            "fused_signal": fused,
            "individual_signals": results,
        }

    def analyze_multi(self, data_map: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        return {
            ticker: self.analyze(df, ticker)
            for ticker, df in data_map.items()
            if not df.empty
        }
