from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import pandas as pd
from datetime import datetime


class DataCollector(ABC):
    @abstractmethod
    async def fetch_realtime(self, ticker: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def fetch_historical(
        self, ticker: str, period: str = "1mo", interval: str = "1d"
    ) -> pd.DataFrame:
        pass

    @abstractmethod
    async def fetch_multi(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:
        pass

    @abstractmethod
    async def stream_prices(self, ticker: str):
        pass
