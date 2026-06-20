from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    echo=settings.debug,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db():
    import models.user
    import models.portfolio
    import models.user_preferences
    import models.engagement
    import models.journal
    import models.markets
    import models.payments
    import api.watchlist  # registers Watchlist table

    Base.metadata.create_all(bind=engine)
    migrate_sqlite_schema()
    ensure_seed_users()
    ensure_seed_portfolios()
    seed_achievements()
    seed_daily_challenges()
    seed_test_user_data()
    seed_predict_markets()


def migrate_sqlite_schema():
    if "sqlite" not in settings.database_url:
        return

    inspector = inspect(engine)
    if "portfolios" not in inspector.get_table_names():
        return

    portfolio_columns = {column["name"] for column in inspector.get_columns("portfolios")}
    statements = []
    if "user_id" not in portfolio_columns:
        statements.append("ALTER TABLE portfolios ADD COLUMN user_id INTEGER")
        statements.append("CREATE INDEX IF NOT EXISTS ix_portfolios_user_id ON portfolios (user_id)")
    if "is_paper" not in portfolio_columns:
        statements.append("ALTER TABLE portfolios ADD COLUMN is_paper BOOLEAN DEFAULT 1")
    if "is_primary" not in portfolio_columns:
        statements.append("ALTER TABLE portfolios ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT 0")

    if "user_account_preferences" in inspector.get_table_names():
        preference_columns = {
            column["name"] for column in inspector.get_columns("user_account_preferences")
        }
        preference_migrations = {
            "onboarding_completed": "ALTER TABLE user_account_preferences ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT 0",
            "onboarding_dismissed": "ALTER TABLE user_account_preferences ADD COLUMN onboarding_dismissed BOOLEAN NOT NULL DEFAULT 0",
            "onboarding_step": "ALTER TABLE user_account_preferences ADD COLUMN onboarding_step INTEGER NOT NULL DEFAULT 0",
            "first_action_completed": "ALTER TABLE user_account_preferences ADD COLUMN first_action_completed BOOLEAN NOT NULL DEFAULT 0",
            "first_action_source": "ALTER TABLE user_account_preferences ADD COLUMN first_action_source VARCHAR(32)",
            "first_action_completed_at": "ALTER TABLE user_account_preferences ADD COLUMN first_action_completed_at DATETIME",
            "keyboard_shortcuts_enabled": "ALTER TABLE user_account_preferences ADD COLUMN keyboard_shortcuts_enabled BOOLEAN NOT NULL DEFAULT 1",
        }
        statements.extend(
            statement
            for column, statement in preference_migrations.items()
            if column not in preference_columns
        )

    if "user_streaks" in inspector.get_table_names():
        streak_columns = {column["name"] for column in inspector.get_columns("user_streaks")}
        if "total_backtests" not in streak_columns:
            statements.append("ALTER TABLE user_streaks ADD COLUMN total_backtests INTEGER NOT NULL DEFAULT 0")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_demo_wallet():
    from models.portfolio import Portfolio

    db = SessionLocal()
    try:
        wallet = db.query(Portfolio).filter(Portfolio.name == settings.demo_wallet_name).first()
        if wallet:
            return wallet

        wallet = Portfolio(
            name=settings.demo_wallet_name,
            cash=settings.demo_wallet_initial_cash,
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        return wallet
    finally:
        db.close()


def ensure_seed_portfolios():
    from models.portfolio import Portfolio
    from models.user import User
    from services.portfolios import get_or_create_user_wallet

    db = SessionLocal()
    try:
        users = {
            user.email: user
            for user in db.query(User).filter(
                User.email.in_((settings.demo_user_email, settings.test_user_email))
            ).all()
        }
        demo_user = users.get(settings.demo_user_email)
        test_user = users.get(settings.test_user_email)

        demo_wallet = db.query(Portfolio).filter(
            Portfolio.name == settings.demo_wallet_name
        ).first()
        if demo_wallet and demo_user and demo_wallet.user_id is None:
            demo_wallet.user_id = demo_user.id

        if test_user:
            for portfolio in db.query(Portfolio).filter(Portfolio.user_id == None).all():
                portfolio.user_id = test_user.id
        db.commit()

        for user in users.values():
            get_or_create_user_wallet(db, user.id, user.name)
    finally:
        db.close()


def ensure_seed_users():
    from models.user import User
    from auth.deps import get_password_hash

    seed_users = [
        {
            "email": settings.demo_user_email,
            "name": "Demo Trader",
            "password": settings.demo_user_password,
        },
        {
            "email": settings.test_user_email,
            "name": "KingStop Test Trader",
            "password": settings.test_user_password,
        },
    ]

    db = SessionLocal()
    try:
        created = []
        for seed in seed_users:
            user = db.query(User).filter(User.email == seed["email"]).first()
            if user:
                continue

            user = User(
                email=seed["email"],
                name=seed["name"],
                hashed_password=get_password_hash(seed["password"]),
            )
            db.add(user)
            created.append(seed)

        db.commit()
        for seed in created:
            print(f"Created seed user: {seed['email']} / {seed['password']}")
        return created
    finally:
        db.close()


def seed_achievements():
    from models.engagement import Achievement, SEED_ACHIEVEMENTS

    db = SessionLocal()
    try:
        for seed in SEED_ACHIEVEMENTS:
            existing = db.query(Achievement).filter(Achievement.key == seed["key"]).first()
            if existing:
                continue
            ach = Achievement(**seed)
            db.add(ach)
        db.commit()
    finally:
        db.close()


def seed_daily_challenges():
    from models.engagement import DailyChallenge, SEED_DAILY_CHALLENGES

    db = SessionLocal()
    try:
        for seed in SEED_DAILY_CHALLENGES:
            existing = db.query(DailyChallenge).filter(DailyChallenge.key == seed["key"]).first()
            if existing:
                continue
            dc = DailyChallenge(**seed)
            db.add(dc)
        db.commit()
    finally:
        db.close()


def seed_test_user_data():
    from datetime import date

    from api.watchlist import Watchlist
    from models.engagement import (
        Achievement,
        DailyChallenge,
        UserAchievement,
        UserDailyChallenge,
        UserStreak,
    )
    from models.user import User
    from models.user_preferences import UserAccountPreference

    fixture_progress = {
        "daily_login": 1,
        "daily_trade_1": 1,
        "daily_trade_3": 1,
        "daily_trade_5": 1,
        "daily_backtest_1": 1,
        "daily_backtest_3": 1,
        "daily_profit_100": 100,
        "daily_profit_500": 240,
        "daily_win_rate": 1,
    }
    fixture_achievements = ("first_login", "first_trade", "backtest_5")
    fixture_tickers = ("AAPL", "MSFT", "GOOGL")
    today = date.today()

    db = SessionLocal()
    try:
        users = db.query(User).filter(
            User.email.in_((settings.demo_user_email, settings.test_user_email))
        ).all()
        challenges = db.query(DailyChallenge).filter(DailyChallenge.active == True).all()
        achievements = db.query(Achievement).filter(
            Achievement.key.in_(fixture_achievements)
        ).all()

        for user in users:
            preferences = db.query(UserAccountPreference).filter(
                UserAccountPreference.user_id == user.id
            ).first()
            if not preferences:
                preferences = UserAccountPreference(user_id=user.id)
                db.add(preferences)
            preferences.leaderboard_opt_in = True
            preferences.public_profile = True

            streak = db.query(UserStreak).filter(UserStreak.user_id == user.id).first()
            if not streak:
                db.add(UserStreak(
                    user_id=user.id,
                    current_streak=1,
                    longest_streak=1,
                    last_login_date=today,
                    total_logins=1,
                    bonus_claimed_today=False,
                    total_bonus_earned=0,
                ))

            existing_challenge_ids = {
                row.challenge_id
                for row in db.query(UserDailyChallenge).filter(
                    UserDailyChallenge.user_id == user.id,
                    UserDailyChallenge.challenge_date == today,
                ).all()
            }
            for challenge in challenges:
                if challenge.id in existing_challenge_ids:
                    continue
                progress = min(
                    fixture_progress.get(challenge.key, 0),
                    challenge.requirement_value,
                )
                db.add(UserDailyChallenge(
                    user_id=user.id,
                    challenge_id=challenge.id,
                    challenge_date=today,
                    progress=progress,
                    completed=progress >= challenge.requirement_value,
                    reward_claimed=False,
                ))

            existing_achievement_ids = {
                row.achievement_id
                for row in db.query(UserAchievement).filter(
                    UserAchievement.user_id == user.id
                ).all()
            }
            for achievement in achievements:
                if achievement.id not in existing_achievement_ids:
                    db.add(UserAchievement(
                        user_id=user.id,
                        achievement_id=achievement.id,
                    ))

            existing_tickers = {
                row.ticker
                for row in db.query(Watchlist).filter(
                    Watchlist.user_id == user.id
                ).all()
            }
            for ticker in fixture_tickers:
                if ticker not in existing_tickers:
                    db.add(Watchlist(user_id=user.id, ticker=ticker))

        db.commit()
    finally:
        db.close()


def seed_predict_markets():
    from models.markets import Market, SEED_MARKETS

    db = SessionLocal()
    try:
        if db.query(Market).count() > 0:
            return
        for seed in SEED_MARKETS:
            db.add(Market(**seed))
        db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
