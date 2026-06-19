from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from config import settings
from services.data_service import DataService

router = APIRouter(prefix="/stocks", tags=["stocks"])


def get_service() -> DataService:
    from main import data_service
    return data_service


@router.get("/realtime/{ticker}")
async def get_realtime(ticker: str):
    service = get_service()
    try:
        data = await service.collector.fetch_realtime(ticker.upper())
        return {"status": "ok", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/historical/{ticker}")
async def get_historical(
    ticker: str,
    period: str = Query("1mo", description="Period: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max"),
    interval: str = Query("1d", description="Interval: 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo"),
):
    service = get_service()
    try:
        df = await service.collector.fetch_historical(ticker.upper(), period=period, interval=interval)
        if df.empty:
            return {"status": "ok", "data": []}
        df = df.fillna(0)
        cols = [c.lower() if isinstance(c, str) else c for c in df.columns]
        df.columns = cols
        return {"status": "ok", "data": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overview")
async def get_market_overview(
    tickers: Optional[str] = Query(None),
    market: str = Query("us", description="Market preset: us, nse, bse, india"),
):
    service = get_service()
    market_key = market.lower()
    market_sets = {
        "us": settings.default_tickers,
        "nse": settings.nse_tickers,
        "bse": settings.bse_tickers,
        "india": settings.nse_tickers,
    }
    if tickers:
        ticker_list = [t.strip().upper() for t in tickers.split(",")]
    else:
        ticker_list = market_sets.get(market_key, settings.default_tickers)
    try:
        overview = await service.get_market_overview(ticker_list)
        return {"status": "ok", "market": market_key, **overview}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/{ticker}")
async def get_analysis(
    ticker: str,
    period: str = Query("1mo"),
    model_id: Optional[str] = Query(None),
):
    service = get_service()
    try:
        analysis = await service.get_analysis(ticker.upper(), period=period, model_id=model_id)
        return {"status": "ok", "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
