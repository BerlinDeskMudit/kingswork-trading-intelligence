import yfinance as yf
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, AsyncGenerator
from datetime import datetime, timedelta
import asyncio
import logging
from collectors.base import DataCollector
from config import settings

logger = logging.getLogger(__name__)


INDIAN_SECURITY_NAMES = {
    "RELIANCE": "Reliance Industries",
    "TCS": "Tata Consultancy Services",
    "HDFCBANK": "HDFC Bank",
    "INFY": "Infosys",
    "ICICIBANK": "ICICI Bank",
    "SBIN": "State Bank of India",
    "BHARTIARTL": "Bharti Airtel",
    "ITC": "ITC",
    "LT": "Larsen & Toubro",
    "AXISBANK": "Axis Bank",
}

INDIAN_SAMPLE_PRICES = {
    "RELIANCE": 2860,
    "TCS": 3890,
    "HDFCBANK": 1680,
    "INFY": 1520,
    "ICICIBANK": 1125,
    "SBIN": 820,
    "BHARTIARTL": 1420,
    "ITC": 430,
    "LT": 3520,
    "AXISBANK": 1190,
}


class YahooFinanceCollector(DataCollector):
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _ticker_seed(self, ticker: str) -> int:
        return sum((idx + 1) * ord(char) for idx, char in enumerate(ticker.upper()))

    def _symbol_root(self, ticker: str) -> str:
        return ticker.upper().split(".")[0].replace("^", "")

    def _market_meta(self, ticker: str) -> Dict[str, str]:
        upper = ticker.upper()
        if upper.endswith(".NS") or upper in {"^NSEI", "^NSEBANK"}:
            return {
                "market": "india",
                "exchange": "NSE",
                "currency": "INR",
                "name": INDIAN_SECURITY_NAMES.get(self._symbol_root(ticker), ticker),
            }
        if upper.endswith(".BO") or upper == "^BSESN":
            return {
                "market": "india",
                "exchange": "BSE",
                "currency": "INR",
                "name": INDIAN_SECURITY_NAMES.get(self._symbol_root(ticker), ticker),
            }
        return {
            "market": "us",
            "exchange": "US",
            "currency": "USD",
            "name": ticker,
        }

    def _fallback_base_price(self, ticker: str) -> float:
        root = self._symbol_root(ticker)
        if ticker.upper() == "^NSEI":
            return 24500
        if ticker.upper() == "^BSESN":
            return 80000
        if root in INDIAN_SAMPLE_PRICES:
            return INDIAN_SAMPLE_PRICES[root]
        seed = self._ticker_seed(ticker)
        return 70 + (seed % 180)

    def _fallback_realtime(self, ticker: str) -> Dict[str, Any]:
        seed = self._ticker_seed(ticker)
        meta = self._market_meta(ticker)
        minute = int(datetime.now().timestamp() // 60)
        base = self._fallback_base_price(ticker)
        movement_scale = max(base * 0.012, 2.8)
        wave = np.sin((minute + seed) / 17) * movement_scale
        open_price = base + np.sin((minute + seed) / 31) * (movement_scale * 0.55)
        price = round(base + wave, 2)
        change = round(price - open_price, 2)
        change_pct = round((change / open_price) * 100, 2) if open_price else 0.0

        return {
            "ticker": ticker,
            "name": meta["name"],
            "market": meta["market"],
            "exchange": meta["exchange"],
            "currency": meta["currency"],
            "timestamp": datetime.now().isoformat(),
            "price": price,
            "open": round(open_price, 2),
            "high": round(max(price, open_price) + movement_scale * 0.45, 2),
            "low": round(min(price, open_price) - movement_scale * 0.4, 2),
            "volume": int(1_000_000 + (seed % 9) * 220_000 + abs(np.sin(minute / 13)) * 500_000),
            "change": change,
            "change_pct": change_pct,
            "market_cap": int((base * 1_000_000_000) + (seed % 25) * 10_000_000_000),
            "pe_ratio": round(14 + (seed % 18) + abs(np.sin(minute / 19)) * 3, 2),
            "dividend_yield": round(((seed % 4) * 0.004), 4),
            "source": "sample_market_data",
        }

    def _fallback_historical(self, ticker: str, period: str = "1mo") -> pd.DataFrame:
        periods = {
            "1d": 2,
            "5d": 5,
            "1mo": 22,
            "3mo": 66,
            "6mo": 126,
            "1y": 252,
            "2y": 504,
            "5y": 1260,
        }
        rows = periods.get(period, 126)
        seed = self._ticker_seed(ticker)
        dates = pd.date_range(end=pd.Timestamp.today().normalize(), periods=rows, freq="B")
        step = np.arange(rows)
        base = self._fallback_base_price(ticker)
        movement_scale = max(base * 0.012, 3.0)
        trend = step * (base * 0.00035 + (seed % 5) * base * 0.00004)
        cycle = np.sin((step + seed) / 8) * movement_scale + np.cos((step + seed) / 19) * (movement_scale * 0.55)
        close = base + trend + cycle
        open_price = close * (1 + np.sin((step + seed) / 7) * 0.004)
        high = np.maximum(open_price, close) * 1.012
        low = np.minimum(open_price, close) * 0.988
        volume = (1_000_000 + (seed % 10) * 180_000 + np.abs(np.sin(step / 9)) * 650_000).astype(int)

        df = pd.DataFrame({
            "Date": dates,
            "Open": open_price.round(2),
            "High": high.round(2),
            "Low": low.round(2),
            "Close": close.round(2),
            "Volume": volume,
            "Ticker": ticker,
        })
        df.attrs["source"] = "sample_market_data"
        df.attrs["currency"] = self._market_meta(ticker)["currency"]
        return df

    async def fetch_realtime(self, ticker: str) -> Dict[str, Any]:
        if not settings.use_live_market_data:
            data = self._fallback_realtime(ticker)
            self._cache[ticker] = data
            return data

        loop = asyncio.get_event_loop()
        ticker_obj = yf.Ticker(ticker)
        try:
            data = await asyncio.wait_for(
                loop.run_in_executor(None, lambda: ticker_obj.info),
                timeout=settings.market_data_timeout_seconds,
            )
            result = {
                "ticker": ticker,
                "name": data.get("shortName") or data.get("longName") or self._market_meta(ticker)["name"],
                "market": self._market_meta(ticker)["market"],
                "exchange": data.get("exchange") or self._market_meta(ticker)["exchange"],
                "currency": data.get("currency") or self._market_meta(ticker)["currency"],
                "timestamp": datetime.now().isoformat(),
                "price": data.get("regularMarketPrice", data.get("currentPrice", 0)),
                "open": data.get("regularMarketOpen", 0),
                "high": data.get("regularMarketDayHigh", 0),
                "low": data.get("regularMarketDayLow", 0),
                "volume": data.get("regularMarketVolume", 0),
                "change": data.get("regularMarketChange", 0),
                "change_pct": data.get("regularMarketChangePercent", 0),
                "market_cap": data.get("marketCap", 0),
                "pe_ratio": data.get("trailingPE", 0),
                "dividend_yield": data.get("dividendYield", 0),
                "source": "yahoo_finance",
            }
            self._cache[ticker] = result
            return result
        except asyncio.TimeoutError:
            logger.warning(f"Timed out fetching {ticker}; using sample market data")
            data = self._fallback_realtime(ticker)
            self._cache[ticker] = data
            return data
        except Exception as e:
            logger.error(f"Error fetching {ticker}: {e}")
            data = self._fallback_realtime(ticker)
            self._cache[ticker] = data
            return data

    async def fetch_historical(
        self, ticker: str, period: str = "1mo", interval: str = "1d"
    ) -> pd.DataFrame:
        if not settings.use_live_market_data:
            return self._fallback_historical(ticker, period=period)

        loop = asyncio.get_event_loop()
        try:
            data = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: yf.download(ticker, period=period, interval=interval, progress=False),
                ),
                timeout=settings.market_data_timeout_seconds,
            )
            if data.empty:
                return self._fallback_historical(ticker, period=period)
            data = data.reset_index()
            data["Ticker"] = ticker
            data.attrs["source"] = "yahoo_finance"
            return data
        except Exception as e:
            logger.error(f"Error fetching historical {ticker}: {e}")
            return self._fallback_historical(ticker, period=period)

    async def fetch_multi(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:
        rows = await asyncio.gather(
            *(self.fetch_realtime(ticker) for ticker in tickers),
            return_exceptions=True,
        )
        results = {}
        for ticker, row in zip(tickers, rows):
            if isinstance(row, Exception):
                logger.warning(f"Failed to fetch {ticker}: {row}")
                results[ticker] = self._fallback_realtime(ticker)
            else:
                results[ticker] = row
        return results

    async def stream_prices(self, ticker: str, interval: int = 60):
        while True:
            try:
                data = await self.fetch_realtime(ticker)
                self._cache[ticker] = data
                yield data
            except Exception as e:
                logger.error(f"Stream error for {ticker}: {e}")
                yield {"ticker": ticker, "error": str(e)}
            await asyncio.sleep(interval)

    def get_cached(self, ticker: str) -> Optional[Dict[str, Any]]:
        return self._cache.get(ticker)
