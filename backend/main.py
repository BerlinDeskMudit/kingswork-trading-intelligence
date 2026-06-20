import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from services.data_service import DataService

data_service = DataService()

logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.app_name}")
    init_db()

    for ticker in settings.default_tickers[:3]:
        await data_service.start_streaming(ticker)

    yield

    for ticker in list(data_service._streaming_tasks.keys()):
        await data_service.stop_streaming(ticker)
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.stocks import router as stocks_router
from api.signals import router as signals_router
from api.portfolio import router as portfolio_router
from api.alerts_api import router as alerts_router
from api.websocket import router as ws_router
from api.modes import router as modes_router
from api.trading_models import router as trading_models_router
from api.engagement import router as engagement_router
from api.screener import router as screener_router
from api.news import router as news_router
from api.journal import router as journal_router
from api.leaderboard import router as leaderboard_router
from api.predict import router as predict_router
from api.payments import router as payments_router
from api.analytics import router as analytics_router
from api.trading_tools import router as trading_tools_router
from api.social import router as social_router
from api.data_alerts import router as data_router
from api.broker import router as broker_router
from api.notify import router as notify_router
from auth.router import router as auth_router
from api.watchlist import router as watchlist_router
from api.index_compare import router as index_compare_router
from api.ai_explain import router as ai_explain_router
from api.marketplace import router as marketplace_router
from api.price_targets import router as price_targets_router
from api.referral import router as referral_router
from api.account import router as account_router
from api.llm_chat import router as llm_chat_router

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(account_router, prefix=settings.api_prefix)
app.include_router(trading_models_router, prefix=settings.api_prefix)
app.include_router(stocks_router, prefix=settings.api_prefix)
app.include_router(signals_router, prefix=settings.api_prefix)
app.include_router(portfolio_router, prefix=settings.api_prefix)
app.include_router(alerts_router, prefix=settings.api_prefix)
app.include_router(modes_router, prefix=settings.api_prefix)
app.include_router(engagement_router, prefix=settings.api_prefix)
app.include_router(screener_router, prefix=settings.api_prefix)
app.include_router(news_router, prefix=settings.api_prefix)
app.include_router(journal_router, prefix=settings.api_prefix)
app.include_router(leaderboard_router, prefix=settings.api_prefix)
app.include_router(predict_router, prefix=settings.api_prefix)
app.include_router(payments_router, prefix=settings.api_prefix)
app.include_router(analytics_router, prefix=settings.api_prefix)
app.include_router(trading_tools_router, prefix=settings.api_prefix)
app.include_router(social_router, prefix=settings.api_prefix)
app.include_router(data_router, prefix=settings.api_prefix)
app.include_router(broker_router, prefix=settings.api_prefix)
app.include_router(notify_router, prefix=settings.api_prefix)
app.include_router(watchlist_router, prefix=settings.api_prefix)
app.include_router(index_compare_router, prefix=settings.api_prefix)
app.include_router(ai_explain_router, prefix=settings.api_prefix)
app.include_router(referral_router, prefix=settings.api_prefix)
app.include_router(marketplace_router, prefix=settings.api_prefix)
app.include_router(price_targets_router, prefix=settings.api_prefix)
app.include_router(llm_chat_router, prefix=settings.api_prefix)
app.include_router(ws_router)


@app.get("/")
async def root():
    return {
        "app": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "streaming": list(data_service._streaming_tasks.keys()),
        "endpoints": {
            "docs": "/docs",
            "login": "/api/v1/auth/login",
            "register": "/api/v1/auth/register",
            "profile": "/api/v1/auth/me",
            "realtime": "/api/v1/stocks/realtime/{ticker}",
            "historical": "/api/v1/stocks/historical/{ticker}",
            "overview": "/api/v1/stocks/overview",
            "analysis": "/api/v1/stocks/analysis/{ticker}",
            "signals": "/api/v1/signals/{ticker}",
            "portfolio": "/api/v1/portfolio/portfolios",
            "wallet": "/api/v1/portfolio/wallet",
            "backtest": "/api/v1/portfolio/backtest/{ticker}",
            "modes": "/api/v1/modes",
            "models": "/api/v1/models",
            "alerts": "/api/v1/alerts/rules",
            "websocket": "/ws/{client_id}",
        },
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.ws_host, port=settings.ws_port, reload=settings.debug)
