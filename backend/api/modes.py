from fastapi import APIRouter

from config import settings

router = APIRouter(prefix="/modes", tags=["modes"])


@router.get("")
async def get_modes():
    from main import data_service

    models = data_service.get_trading_models()
    return {
        "status": "ok",
        "active_mode": settings.default_mode,
        "modes": [
            {
                "id": "live",
                "label": "Live",
                "description": "Streams market data and uses the demo wallet for paper trades.",
            },
            {
                "id": "backtesting",
                "label": "Backtesting",
                "description": "Runs the preloaded model against historical candles.",
            },
        ],
        "wallet": {
            "name": settings.demo_wallet_name,
            "initial_cash": settings.demo_wallet_initial_cash,
        },
        "backtest": {
            "default_ticker": settings.backtest_default_ticker,
            "default_period": settings.backtest_default_period,
            "model": data_service.get_backtest_model_status(),
        },
        "models": models,
        "default_models": {
            "live": settings.default_live_model_id,
            "backtesting": settings.default_backtest_model_id,
        },
    }
