import asyncio
import logging
from typing import Dict, Any, Optional, List, AsyncGenerator
from datetime import datetime
import pandas as pd
import numpy as np

from collectors.yahoo_collector import YahooFinanceCollector
from fusion.engine import FusionEngine
from signals.technical import TechnicalSignalGenerator
from signals.ml_model import MLSignalGenerator
from signals.generator import SignalEnsemble
from risk.manager import RiskManager
from alerts.engine import AlertEngine
from backtesting.engine import BacktestEngine
from config import settings

logger = logging.getLogger(__name__)


class DataService:
    def __init__(self):
        self.collector = YahooFinanceCollector()
        self.fusion = FusionEngine()
        self.technical = TechnicalSignalGenerator()
        self.ml = MLSignalGenerator()
        self.ensemble = SignalEnsemble()
        self.risk = RiskManager()
        self.alerts = AlertEngine()
        self.backtest = BacktestEngine()
        self._preloaded_backtest_data = self._build_preloaded_backtest_data()
        self._backtest_model_status = {
            "id": "preloaded_ensemble_v1",
            "name": "Preloaded Ensemble v1",
            "trained": False,
            "training_rows": 0,
            "source": "bundled_sample_market_data",
        }
        self._preload_backtest_model()
        self._model_registry = self._build_model_registry()

        self._streaming_tasks: Dict[str, asyncio.Task] = {}
        self._latest_data: Dict[str, Dict[str, Any]] = {}
        self._ws_clients: List[any] = []

    def _build_model_registry(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "preloaded_ensemble_v1",
                "name": "Preloaded Ensemble v1",
                "short_name": "Ensemble v1",
                "description": "Bundled technical and ML ensemble trained on sample market structure for instant paper-trading demos.",
                "modes": ["live", "backtesting"],
                "risk_profile": "Balanced",
                "latency": "Instant",
                "is_preloaded": True,
                "signal_sources": ["technical", "ml"],
            },
            {
                "id": "realtime_fusion_intelligence_v1",
                "name": "Real-Time Data Fusion & Intelligence Platform",
                "short_name": "Fusion Intelligence",
                "description": "Stock-trading intelligence layer that blends live ticks, multi-timeframe features, technical signals, and ML confidence.",
                "modes": ["live", "backtesting"],
                "risk_profile": "Adaptive",
                "latency": "Streaming",
                "is_preloaded": True,
                "signal_sources": ["technical", "ml", "fusion"],
            },
            {
                "id": "technical_momentum_v1",
                "name": "Technical Momentum Scanner v1",
                "short_name": "Momentum Scanner",
                "description": "Trend-following model that leans on moving averages, breakout continuation, and technical confirmation.",
                "modes": ["live", "backtesting"],
                "risk_profile": "Aggressive",
                "latency": "Instant",
                "is_preloaded": True,
                "signal_sources": ["technical", "momentum"],
            },
            {
                "id": "rsi_mean_reversion_v1",
                "name": "RSI Mean Reversion Lab v1",
                "short_name": "RSI Reversion",
                "description": "Contrarian model for testing oversold bounces, overbought fades, and range-bound Indian or US equities.",
                "modes": ["live", "backtesting"],
                "risk_profile": "Tactical",
                "latency": "Instant",
                "is_preloaded": True,
                "signal_sources": ["technical", "rsi"],
            },
            {
                "id": "volatility_breakout_v1",
                "name": "Volatility Breakout Engine v1",
                "short_name": "Vol Breakout",
                "description": "Breakout model that rewards expanding ranges, larger candles, and high-volume continuation.",
                "modes": ["live", "backtesting"],
                "risk_profile": "High beta",
                "latency": "Instant",
                "is_preloaded": True,
                "signal_sources": ["technical", "volatility"],
            },
            {
                "id": "conservative_risk_guard_v1",
                "name": "Conservative Risk Guard v1",
                "short_name": "Risk Guard",
                "description": "Lower-turnover model that filters low-confidence trades and reduces strong signals to controlled exposure.",
                "modes": ["live", "backtesting"],
                "risk_profile": "Conservative",
                "latency": "Instant",
                "is_preloaded": True,
                "signal_sources": ["risk", "technical", "ml"],
            },
        ]

    def _build_preloaded_backtest_data(self) -> pd.DataFrame:
        periods = 320
        dates = pd.date_range(end=pd.Timestamp.today().normalize(), periods=periods, freq="B")
        step = np.arange(periods)
        trend = 100 + step * 0.11
        cycle = np.sin(step / 9) * 3.2 + np.cos(step / 21) * 2.0
        close = trend + cycle
        open_price = close * (1 + np.sin(step / 5) * 0.003)
        high = np.maximum(open_price, close) * (1.01 + np.sin(step / 17) * 0.002)
        low = np.minimum(open_price, close) * (0.99 - np.cos(step / 15) * 0.002)
        volume = (2_000_000 + np.sin(step / 11) * 420_000 + np.cos(step / 29) * 180_000).astype(int)

        return pd.DataFrame({
            "date": dates,
            "open": open_price.round(2),
            "high": high.round(2),
            "low": low.round(2),
            "close": close.round(2),
            "volume": volume,
        })

    def _preload_backtest_model(self):
        try:
            self.ensemble.ml.train(self._preloaded_backtest_data, force=True)
            self._backtest_model_status.update({
                "trained": bool(self.ensemble.ml._trained),
                "training_rows": len(self._preloaded_backtest_data),
                "trained_at": datetime.now().isoformat(),
            })
        except Exception as e:
            logger.warning(f"Failed to preload backtest model: {e}")
            self._backtest_model_status.update({
                "trained": False,
                "error": str(e),
            })

    def get_backtest_model_status(self) -> Dict[str, Any]:
        return dict(self._backtest_model_status)

    def get_trading_models(self) -> List[Dict[str, Any]]:
        status = self.get_backtest_model_status()
        models = []
        for model in self._model_registry:
            enriched = dict(model)
            enriched["trained"] = bool(status.get("trained", True))
            enriched["training_rows"] = int(status.get("training_rows", 0))
            enriched["status"] = "ready" if enriched["trained"] else "warming"
            enriched["trained_at"] = status.get("trained_at")
            models.append(enriched)
        return models

    def get_trading_model(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        selected_id = model_id or settings.default_live_model_id
        for model in self.get_trading_models():
            if model["id"] == selected_id:
                return model
        return self.get_trading_models()[0]

    def _apply_model_bias(
        self,
        analysis: Dict[str, Any],
        model: Dict[str, Any],
        df: pd.DataFrame,
        ticker: str,
    ) -> Dict[str, Any]:
        biased = dict(analysis)
        fused = dict(biased.get("fused_signal") or {})
        sources = set(fused.get("sources") or [])
        confidence = float(fused.get("confidence", 0.0) or 0.0)
        signal = fused.get("signal", "NEUTRAL")
        model_id = model.get("id")

        if model_id == "realtime_fusion_intelligence_v1":
            confidence = min(1.0, confidence + 0.04)
            sources.add("fusion")
            biased["fusion_context"] = {
                "multi_timeframe": self.fusion.compute_multi_timeframe_features(ticker),
                "data_source": df.attrs.get("source", "yahoo_finance"),
                "fusion_note": "Live tick buffer and historical features are combined when available.",
            }
        elif model_id == "technical_momentum_v1":
            technical = (biased.get("individual_signals") or {}).get("technical") or {}
            if technical.get("signal") in {"BUY", "STRONG_BUY", "SELL", "STRONG_SELL"}:
                signal = technical.get("signal")
            confidence = min(1.0, max(confidence, float(technical.get("confidence", 0.0) or 0.0)) + 0.03)
            sources.add("momentum")
        elif model_id == "rsi_mean_reversion_v1":
            technical = (biased.get("individual_signals") or {}).get("technical") or {}
            details = technical.get("details") or {}
            rsi = float(details.get("rsi", 50) or 50)
            if rsi <= 35:
                signal = "BUY"
                confidence = max(confidence, 0.62)
            elif rsi >= 70:
                signal = "SELL"
                confidence = max(confidence, 0.6)
            else:
                confidence = max(0.0, confidence - 0.04)
            sources.add("rsi")
        elif model_id == "volatility_breakout_v1":
            if "close" in df.columns and len(df) >= 20:
                returns = df["close"].pct_change().dropna()
                volatility = float(returns.tail(20).std() or 0.0)
                if volatility > 0.018 and signal in {"BUY", "STRONG_BUY"}:
                    signal = "STRONG_BUY"
                    confidence = min(1.0, confidence + 0.06)
                elif volatility > 0.018 and signal in {"SELL", "STRONG_SELL"}:
                    signal = "STRONG_SELL"
                    confidence = min(1.0, confidence + 0.06)
                else:
                    confidence = max(0.0, confidence - 0.02)
            sources.add("volatility")
        elif model_id == "conservative_risk_guard_v1":
            if signal == "STRONG_BUY":
                signal = "BUY"
            elif signal == "STRONG_SELL":
                signal = "SELL"
            if confidence < 0.58:
                signal = "NEUTRAL"
            confidence = min(confidence, 0.82)
            sources.add("risk")

        fused.update({
            "signal": signal,
            "confidence": round(confidence, 2),
            "sources": sorted(sources),
            "model_bias": model.get("short_name"),
        })
        biased["fused_signal"] = fused
        return biased

    def _normalize_market_frame(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df

        attrs = dict(df.attrs)
        normalized = df.copy()
        normalized.attrs.update(attrs)
        if isinstance(normalized.columns, pd.MultiIndex):
            normalized.columns = [
                str(next((part for part in col if part not in ("", None)), col[-1]))
                for col in normalized.columns
            ]

        def normalize_col(col):
            return str(col).strip().lower().replace(" ", "_")

        normalized.columns = [normalize_col(col) for col in normalized.columns]

        if "datetime" in normalized.columns and "date" not in normalized.columns:
            normalized = normalized.rename(columns={"datetime": "date"})
        if "adj_close" in normalized.columns and "close" not in normalized.columns:
            normalized["close"] = normalized["adj_close"]
        if "close" in normalized.columns:
            for col in ("open", "high", "low"):
                if col not in normalized.columns:
                    normalized[col] = normalized["close"]
        if "volume" not in normalized.columns:
            normalized["volume"] = 0

        return normalized

    def _serialize_backtest_trades(self, trades: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        rows = []
        for trade in trades:
            row = {}
            for key, value in trade.items():
                if hasattr(value, "isoformat"):
                    row[key] = value.isoformat()
                elif isinstance(value, (np.integer, np.floating)):
                    row[key] = value.item()
                else:
                    row[key] = value
            rows.append(row)
        return rows

    async def start_streaming(self, ticker: str):
        if ticker in self._streaming_tasks:
            return
        task = asyncio.create_task(self._stream_loop(ticker))
        self._streaming_tasks[ticker] = task
        logger.info(f"Started streaming {ticker}")

    async def stop_streaming(self, ticker: str):
        task = self._streaming_tasks.pop(ticker, None)
        if task:
            task.cancel()
            logger.info(f"Stopped streaming {ticker}")

    async def _stream_loop(self, ticker: str):
        try:
            async for data in self.collector.stream_prices(ticker, interval=settings.yahoo_refresh_interval):
                self._latest_data[ticker] = data
                self.fusion.ingest(ticker, data)
                await self._broadcast("price_update", data)

                if ticker in self._latest_data:
                    df = self.fusion.get_timeseries(ticker, minutes=60)
                    if not df.empty and len(df) >= 20:
                        try:
                            analysis = self.ensemble.analyze(df, ticker)
                            fused = analysis.get("fused_signal", {})
                            self._latest_data[ticker]["signal"] = fused.get("signal", "NEUTRAL")
                            self._latest_data[ticker]["signal_confidence"] = fused.get("confidence", 0)
                            await self._broadcast("signal_update", analysis)
                        except Exception as e:
                            logger.error(f"Analysis failed for {ticker}: {e}")
        except asyncio.CancelledError:
            logger.info(f"Stream cancelled for {ticker}")
        except Exception as e:
            logger.error(f"Stream error for {ticker}: {e}")

    async def get_analysis(
        self,
        ticker: str,
        period: str = "1mo",
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        model = self.get_trading_model(model_id)
        df = await self.collector.fetch_historical(ticker, period=period, interval="1d")
        df = self._normalize_market_frame(df)
        if df.empty:
            return {"ticker": ticker, "error": "No data available"}

        analysis = self.ensemble.analyze(df, ticker)
        analysis = self._apply_model_bias(analysis, model, df, ticker)
        analysis["model"] = model
        dates = df["date"].astype(str).tolist() if "date" in df.columns else [str(i) for i in df.index]
        analysis["historical_data"] = {
            "dates": dates,
            "close": df["close"].tolist() if "close" in df.columns else [],
            "volume": df["volume"].tolist() if "volume" in df.columns else [],
        }
        return analysis

    async def run_backtest(
        self,
        ticker: str,
        period: str = "6mo",
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        model = self.get_trading_model(model_id or settings.default_backtest_model_id)
        df = await self.collector.fetch_historical(ticker, period=period, interval="1d")
        df = self._normalize_market_frame(df)
        data_source = df.attrs.get("source", "yahoo_finance")
        warning = None
        if df.empty:
            df = self._preloaded_backtest_data.copy()
            data_source = "bundled_sample_market_data"
            warning = "Live historical data was unavailable, so the bundled sample dataset was used."

        if "close" not in df.columns:
            return {"ticker": ticker, "error": "Backtest data is missing a close price column"}

        price_col = "close"
        signals_df = df.copy()
        signals_list = []
        confidence_list = []
        for i in range(len(signals_df)):
            chunk = signals_df.iloc[:i+1]
            if len(chunk) >= 50:
                analysis = self.ensemble.analyze(chunk, ticker)
                analysis = self._apply_model_bias(analysis, model, chunk, ticker)
                fused = analysis.get("fused_signal", {})
                signals_list.append(fused.get("signal", "NEUTRAL"))
                confidence_list.append(fused.get("confidence", 0.0))
            elif len(chunk) >= 20:
                sig = self.technical.generate_signal(chunk)
                signals_list.append(sig.get("signal", "NEUTRAL"))
                confidence_list.append(sig.get("confidence", 0.0))
            else:
                signals_list.append("NEUTRAL")
                confidence_list.append(0.0)
        signals_df["signal"] = signals_list
        signals_df["confidence"] = confidence_list

        result = self.backtest.run(signals_df, price_col=price_col)
        profit_factor = result.profit_factor if np.isfinite(result.profit_factor) else None
        signal_counts = signals_df["signal"].value_counts().to_dict()
        dates = signals_df["date"].astype(str).tolist() if "date" in signals_df.columns else [str(i) for i in signals_df.index]

        return {
            "ticker": ticker,
            "period": period,
            "mode": "backtesting",
            "data_source": data_source,
            "warning": warning,
            "model": model,
            "latest_signal": {
                "signal": signals_list[-1] if signals_list else "NEUTRAL",
                "confidence": confidence_list[-1] if confidence_list else 0.0,
            },
            "signals_summary": signal_counts,
            "result": {
                "total_return": round(result.total_return * 100, 2),
                "annualized_return": round(result.annualized_return * 100, 2),
                "sharpe_ratio": round(result.sharpe_ratio, 2),
                "max_drawdown": round(result.max_drawdown * 100, 2),
                "win_rate": round(result.win_rate * 100, 2),
                "total_trades": result.total_trades,
                "profit_factor": round(profit_factor, 2) if profit_factor is not None else None,
                "final_capital": round(result.final_capital, 2),
                "initial_capital": self.backtest.initial_capital,
            },
            "equity_curve": [
                {
                    "date": dates[min(i, len(dates) - 1)] if dates else str(i),
                    "value": round(float(value), 2),
                }
                for i, value in enumerate(result.equity_curve)
            ],
            "trades": self._serialize_backtest_trades(result.trades),
        }

    async def get_market_overview(self, tickers: Optional[List[str]] = None) -> Dict[str, Any]:
        if tickers is None:
            tickers = settings.default_tickers
        data = await self.collector.fetch_multi(tickers)
        overview = {}
        for ticker, d in data.items():
            df = self.fusion.get_timeseries(ticker, minutes=30)
            features = self.fusion.compute_multi_timeframe_features(ticker)
            overview[ticker] = {
                "name": d.get("name", ticker),
                "market": d.get("market", "us"),
                "exchange": d.get("exchange", "US"),
                "currency": d.get("currency", "USD"),
                "price": d.get("price", 0),
                "change": d.get("change", 0),
                "change_pct": d.get("change_pct", 0),
                "volume": d.get("volume", 0),
                "market_cap": d.get("market_cap", 0),
                "source": d.get("source", "unknown"),
                "features": features.get("30m", {}),
                "signal": self._latest_data.get(ticker, {}).get("signal", "N/A"),
            }
        return {"timestamp": datetime.now().isoformat(), "data": overview}

    async def _broadcast(self, event_type: str, data: Any):
        for client in self._ws_clients:
            try:
                await client.put((event_type, data))
            except Exception:
                pass

    def register_ws_client(self, client):
        self._ws_clients.append(client)

    def unregister_ws_client(self, client):
        if client in self._ws_clients:
            self._ws_clients.remove(client)

    def get_latest(self, ticker: str) -> Optional[Dict[str, Any]]:
        return self._latest_data.get(ticker)
