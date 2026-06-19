from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional

router = APIRouter(prefix="/signals", tags=["signals"])


def get_service():
    from main import data_service
    return data_service


@router.get("/{ticker}")
async def get_signals(
    ticker: str,
    period: str = Query("1mo"),
    model_id: Optional[str] = Query(None),
):
    service = get_service()
    try:
        analysis = await service.get_analysis(ticker.upper(), period=period, model_id=model_id)
        return {
            "status": "ok",
            "ticker": ticker.upper(),
            "model": analysis.get("model"),
            "fused_signal": analysis.get("fused_signal"),
            "technical": analysis.get("individual_signals", {}).get("technical"),
            "ml": analysis.get("individual_signals", {}).get("ml"),
            "fusion_context": analysis.get("fusion_context"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all/current")
async def get_current_signals():
    service = get_service()
    signals = {}
    for ticker, data in service._latest_data.items():
        signals[ticker] = {
            "price": data.get("price"),
            "signal": data.get("signal", "N/A"),
            "confidence": data.get("signal_confidence", 0),
        }
    return {"status": "ok", "signals": signals}
