from fastapi import APIRouter, Depends, Query
from typing import Optional
from auth.deps import get_current_user
from models.user import User

router = APIRouter(prefix="/ai-explain", tags=["ai-explain"])


def _build_explanation(indicators: dict) -> tuple[str, list[str]]:
    reasons = []
    signal_votes = {"BUY": 0, "SELL": 0, "NEUTRAL": 0}

    rsi = indicators.get("rsi")
    if rsi is not None:
        if rsi <= 30:
            reasons.append(f"RSI at {rsi:.1f} — oversold territory suggests buying pressure building")
            signal_votes["BUY"] += 2
        elif rsi <= 40:
            reasons.append(f"RSI at {rsi:.1f} — approaching oversold zone, cautious accumulation possible")
            signal_votes["BUY"] += 1
        elif rsi >= 70:
            reasons.append(f"RSI at {rsi:.1f} — overbought territory signals potential pullback ahead")
            signal_votes["SELL"] += 2
        elif rsi >= 60:
            reasons.append(f"RSI at {rsi:.1f} — elevated momentum, watch for exhaustion signals")
            signal_votes["SELL"] += 1
        else:
            reasons.append(f"RSI at {rsi:.1f} — neutral zone, no strong directional bias")
            signal_votes["NEUTRAL"] += 1

    macd = indicators.get("macd")
    macd_signal = indicators.get("macd_signal")
    if macd is not None and macd_signal is not None:
        if macd > macd_signal:
            reasons.append(f"MACD ({macd:.3f}) above signal line ({macd_signal:.3f}) — bullish momentum crossover")
            signal_votes["BUY"] += 1
        elif macd < macd_signal:
            reasons.append(f"MACD ({macd:.3f}) below signal line ({macd_signal:.3f}) — bearish momentum crossover")
            signal_votes["SELL"] += 1

    bb_upper = indicators.get("bb_upper")
    bb_lower = indicators.get("bb_lower")
    bb_mid = indicators.get("bb_mid")
    price = indicators.get("price") or indicators.get("close")
    if price and bb_upper and bb_lower:
        bb_width = bb_upper - bb_lower
        if price >= bb_upper:
            reasons.append(f"Price ({price:.2f}) at upper Bollinger Band — potential mean-reversion sell setup")
            signal_votes["SELL"] += 1
        elif price <= bb_lower:
            reasons.append(f"Price ({price:.2f}) at lower Bollinger Band — potential bounce or oversold reversal")
            signal_votes["BUY"] += 1
        elif bb_width and bb_mid:
            pct_b = (price - bb_lower) / bb_width
            reasons.append(f"Price within Bollinger Bands at {pct_b*100:.0f}% of band width — no extreme reading")

    volume = indicators.get("volume")
    avg_volume = indicators.get("avg_volume")
    if volume and avg_volume and avg_volume > 0:
        vol_ratio = volume / avg_volume
        if vol_ratio >= 1.5:
            reasons.append(f"Volume {vol_ratio:.1f}x above average — strong participation confirms current move")
            signal_votes["BUY"] += 1 if signal_votes["BUY"] >= signal_votes["SELL"] else 0
            signal_votes["SELL"] += 1 if signal_votes["SELL"] > signal_votes["BUY"] else 0
        elif vol_ratio <= 0.5:
            reasons.append(f"Volume {vol_ratio:.1f}x below average — weak conviction, treat signals with caution")
            signal_votes["NEUTRAL"] += 1

    # Determine overall signal
    top_signal = max(signal_votes, key=lambda k: signal_votes[k])
    if signal_votes[top_signal] == 0:
        top_signal = "NEUTRAL"

    explanation_parts = []
    if top_signal == "BUY":
        explanation_parts.append(f"{indicators.get('ticker', 'This asset')} shows bullish indicators.")
    elif top_signal == "SELL":
        explanation_parts.append(f"{indicators.get('ticker', 'This asset')} shows bearish indicators.")
    else:
        explanation_parts.append(f"{indicators.get('ticker', 'This asset')} shows no clear directional bias.")
    explanation_parts.append(f"Key signals: {'; '.join(r.split(' — ')[0] for r in reasons[:3])}.")
    explanation = " ".join(explanation_parts)

    return top_signal, explanation, reasons


@router.get("/{ticker}")
async def ai_explain(
    ticker: str,
    period: str = Query("1mo"),
    model_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    from main import data_service

    analysis = await data_service.get_analysis(ticker.upper(), period=period, model_id=model_id)

    if "error" in analysis:
        return {"status": "error", "ticker": ticker.upper(), "error": analysis["error"]}

    # Extract fused signal and confidence
    fused = analysis.get("fused_signal") or {}
    fused_signal = fused.get("signal", "NEUTRAL")
    confidence = fused.get("confidence", 0.0)

    # Extract technical indicators from the analysis
    individual = analysis.get("individual_signals") or {}
    technical = individual.get("technical") or {}
    details = technical.get("details") or {}

    # Pull historical close/volume for context
    hist = analysis.get("historical_data") or {}
    closes = hist.get("close") or []
    volumes = hist.get("volume") or []
    current_price = closes[-1] if closes else None
    current_volume = volumes[-1] if volumes else None
    avg_volume = sum(volumes[-20:]) / len(volumes[-20:]) if len(volumes) >= 5 else None

    indicators = {
        "ticker": ticker.upper(),
        "price": current_price,
        "rsi": details.get("rsi"),
        "macd": details.get("macd"),
        "macd_signal": details.get("macd_signal"),
        "bb_upper": details.get("bb_upper"),
        "bb_lower": details.get("bb_lower"),
        "bb_mid": details.get("bb_mid"),
        "volume": current_volume,
        "avg_volume": avg_volume,
        "close": current_price,
    }
    # Remove None values for cleanliness in response
    indicators_clean = {k: v for k, v in indicators.items() if v is not None and k != "ticker"}

    derived_signal, explanation, reasons = _build_explanation(indicators)

    # Use fused signal if available, otherwise fall back to derived
    final_signal = fused_signal if fused_signal != "NEUTRAL" else derived_signal

    return {
        "status": "ok",
        "ticker": ticker.upper(),
        "signal": final_signal,
        "confidence": confidence,
        "explanation": explanation,
        "reasons": reasons,
        "indicators": indicators_clean,
        "model": analysis.get("model", {}).get("short_name"),
    }
