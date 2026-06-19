from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    app_name: str = "KingStop"
    debug: bool = False
    api_prefix: str = "/api/v1"

    database_url: str = "sqlite:///./kingstop.db"
    secret_key: str = "kingstop-super-secret-key-change-in-production"

    yahoo_refresh_interval: int = 60
    use_live_market_data: bool = False
    market_data_timeout_seconds: float = 2.5
    default_tickers: List[str] = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "JNJ"]
    nse_tickers: List[str] = [
        "RELIANCE.NS",
        "TCS.NS",
        "HDFCBANK.NS",
        "INFY.NS",
        "ICICIBANK.NS",
        "SBIN.NS",
        "BHARTIARTL.NS",
        "ITC.NS",
        "LT.NS",
        "AXISBANK.NS",
    ]
    bse_tickers: List[str] = [
        "RELIANCE.BO",
        "TCS.BO",
        "HDFCBANK.BO",
        "INFY.BO",
        "ICICIBANK.BO",
        "SBIN.BO",
        "BHARTIARTL.BO",
        "ITC.BO",
        "LT.BO",
        "AXISBANK.BO",
    ]
    crypto_tickers: List[str] = [
        "BTC-USD",
        "ETH-USD",
        "BNB-USD",
        "SOL-USD",
        "XRP-USD",
        "DOGE-USD",
    ]
    app_modes: List[str] = ["live", "backtesting"]
    default_mode: str = "live"
    demo_wallet_name: str = "KingStop Demo Wallet"
    demo_wallet_initial_cash: float = 100000.0
    backtest_default_ticker: str = "AAPL"
    backtest_default_period: str = "6mo"
    default_live_model_id: str = "preloaded_ensemble_v1"
    default_backtest_model_id: str = "preloaded_ensemble_v1"
    demo_user_email: str = "demo@kingstop.dev"
    demo_user_password: str = "demo1234"
    test_user_email: str = "test@kingstop.dev"
    test_user_password: str = "KingStop@2026"

    redis_url: str = "redis://localhost:6379/0"
    use_redis: bool = False

    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_enabled: bool = False

    ws_host: str = "0.0.0.0"
    ws_port: int = 8000

    max_position_size_pct: float = 0.02
    max_portfolio_risk_pct: float = 0.25
    stop_loss_pct: float = 0.05

    class Config:
        env_file = ".env"


settings = Settings()
