from datetime import date, datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from database import Base


class StreakMilestone(str, enum.Enum):
    NONE = "NONE"
    THREE_DAY = "3_DAY"
    SEVEN_DAY = "7_DAY"
    FOURTEEN_DAY = "14_DAY"
    THIRTY_DAY = "30_DAY"


STREAK_BONUSES = {
    0: 0,
    1: 500,
    2: 1000,
    3: 1500,
    4: 2000,
    5: 2500,
    6: 3000,
    7: 5000,
    14: 10000,
    21: 15000,
    30: 25000,
}

STREAK_MILESTONES = {
    3: StreakMilestone.THREE_DAY,
    7: StreakMilestone.SEVEN_DAY,
    14: StreakMilestone.FOURTEEN_DAY,
    30: StreakMilestone.THIRTY_DAY,
}


class UserStreak(Base):
    __tablename__ = "user_streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_login_date = Column(Date, nullable=True)
    total_logins = Column(Integer, default=0)
    total_backtests = Column(Integer, default=0, nullable=False)
    bonus_claimed_today = Column(Boolean, default=False)
    total_bonus_earned = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    icon = Column(String(50), default="Trophy")
    category = Column(String(50), default="general")
    requirement_value = Column(Integer, default=1)
    bonus_cash = Column(Float, default=0.0)


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())
    notified = Column(Boolean, default=False)

    user = relationship("User")
    achievement = relationship("Achievement")


class DailyChallenge(Base):
    __tablename__ = "daily_challenges"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    requirement_type = Column(String(50), nullable=False)
    requirement_value = Column(Integer, nullable=False)
    reward_cash = Column(Float, default=1000.0)
    reward_xp = Column(Integer, default=10)
    active = Column(Boolean, default=True)


class UserDailyChallenge(Base):
    __tablename__ = "user_daily_challenges"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "challenge_id",
            "challenge_date",
            name="uq_user_daily_challenge",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("daily_challenges.id"), nullable=False)
    challenge_date = Column(Date, nullable=False)
    progress = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    reward_claimed = Column(Boolean, default=False)

    user = relationship("User")
    challenge = relationship("DailyChallenge")


SEED_ACHIEVEMENTS = [
    {"key": "first_login", "name": "Welcome to KingStop", "description": "Log in for the first time", "icon": "LogIn", "category": "streak", "requirement_value": 1, "bonus_cash": 500},
    {"key": "streak_3", "name": "Hat Trick", "description": "Maintain a 3-day login streak", "icon": "Flame", "category": "streak", "requirement_value": 3, "bonus_cash": 1000},
    {"key": "streak_7", "name": "Week Warrior", "description": "Maintain a 7-day login streak", "icon": "Flame", "category": "streak", "requirement_value": 7, "bonus_cash": 2500},
    {"key": "streak_14", "name": "Fortnight Fanatic", "description": "Maintain a 14-day login streak", "icon": "Flame", "category": "streak", "requirement_value": 14, "bonus_cash": 5000},
    {"key": "streak_30", "name": "Monthly Master", "description": "Maintain a 30-day login streak", "icon": "Crown", "category": "streak", "requirement_value": 30, "bonus_cash": 10000},
    {"key": "first_trade", "name": "First Blood", "description": "Execute your first trade", "icon": "Crosshair", "category": "trading", "requirement_value": 1, "bonus_cash": 1000},
    {"key": "trades_10", "name": "Active Trader", "description": "Execute 10 trades", "icon": "Activity", "category": "trading", "requirement_value": 10, "bonus_cash": 2500},
    {"key": "trades_50", "name": "Market Maker", "description": "Execute 50 trades", "icon": "BarChart3", "category": "trading", "requirement_value": 50, "bonus_cash": 5000},
    {"key": "profit_1k", "name": "First Profit", "description": "Earn $1,000 in paper trading profit", "icon": "TrendingUp", "category": "trading", "requirement_value": 1000, "bonus_cash": 2000},
    {"key": "profit_10k", "name": "Profit Runner", "description": "Earn $10,000 in paper trading profit", "icon": "TrendingUp", "category": "trading", "requirement_value": 10000, "bonus_cash": 5000},
    {"key": "portfolio_1m", "name": "Millionaire Club", "description": "Grow your portfolio to $1,000,000", "icon": "Wallet", "category": "portfolio", "requirement_value": 1_000_000, "bonus_cash": 10000},
    {"key": "backtest_5", "name": "Backtest Analyst", "description": "Run 5 backtests", "icon": "LineChart", "category": "analysis", "requirement_value": 5, "bonus_cash": 1000},
    {"key": "backtest_25", "name": "Quant Mind", "description": "Run 25 backtests", "icon": "BrainCircuit", "category": "analysis", "requirement_value": 25, "bonus_cash": 2500},
    {"key": "hold_7_days", "name": "Diamond Hands", "description": "Hold a position for 7 days", "icon": "ShieldCheck", "category": "trading", "requirement_value": 7, "bonus_cash": 3000},
    {"key": "win_rate_100", "name": "Perfect Day", "description": "Achieve 100% win rate in a day (min 3 trades)", "icon": "Sparkles", "category": "trading", "requirement_value": 100, "bonus_cash": 5000},
]

SEED_DAILY_CHALLENGES = [
    {"key": "daily_login", "title": "Daily Login", "description": "Log in to KingStop today", "requirement_type": "login", "requirement_value": 1, "reward_cash": 500, "reward_xp": 5},
    {"key": "daily_trade_1", "title": "First Trade of the Day", "description": "Execute 1 trade today", "requirement_type": "trade", "requirement_value": 1, "reward_cash": 1000, "reward_xp": 10},
    {"key": "daily_trade_3", "title": "Active Trading Day", "description": "Execute 3 trades today", "requirement_type": "trade", "requirement_value": 3, "reward_cash": 2500, "reward_xp": 20},
    {"key": "daily_trade_5", "title": "Market Flurry", "description": "Execute 5 trades today", "requirement_type": "trade", "requirement_value": 5, "reward_cash": 5000, "reward_xp": 35},
    {"key": "daily_backtest_1", "title": "Backtest Run", "description": "Run 1 backtest today", "requirement_type": "backtest", "requirement_value": 1, "reward_cash": 1000, "reward_xp": 10},
    {"key": "daily_backtest_3", "title": "Backtest Marathon", "description": "Run 3 backtests today", "requirement_type": "backtest", "requirement_value": 3, "reward_cash": 2500, "reward_xp": 20},
    {"key": "daily_profit_100", "title": "Profit Hunter", "description": "Make $100 in paper trading profit today", "requirement_type": "profit", "requirement_value": 100, "reward_cash": 1500, "reward_xp": 15},
    {"key": "daily_profit_500", "title": "Profit Pro", "description": "Make $500 in paper trading profit today", "requirement_type": "profit", "requirement_value": 500, "reward_cash": 4000, "reward_xp": 30},
    {"key": "daily_win_rate", "title": "Perfect Timing", "description": "Win 3 trades in a row today", "requirement_type": "win_streak", "requirement_value": 3, "reward_cash": 3000, "reward_xp": 25},
]


def process_streak_on_login(db_session, user_id: int, portfolio_id: int):
    from models.portfolio import Portfolio
    today = date.today()
    streak = db_session.query(UserStreak).filter(UserStreak.user_id == user_id).first()

    if not streak:
        streak = UserStreak(user_id=user_id, current_streak=1, longest_streak=1, last_login_date=today, total_logins=1, bonus_claimed_today=False)
        db_session.add(streak)
        db_session.commit()
        db_session.refresh(streak)
        check_achievements(db_session, user_id, "login", streak.current_streak, portfolio_id)
        return streak, True

    yesterday = date.fromordinal(today.toordinal() - 1)
    is_new_day = streak.last_login_date is None or streak.last_login_date < today

    if not is_new_day:
        return streak, False

    if streak.last_login_date == yesterday:
        streak.current_streak += 1
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
    elif streak.last_login_date is not None and streak.last_login_date < yesterday:
        streak.current_streak = 1

    streak.last_login_date = today
    streak.total_logins = (streak.total_logins or 0) + 1
    streak.bonus_claimed_today = False
    db_session.commit()
    db_session.refresh(streak)

    check_achievements(db_session, user_id, "login", streak.current_streak, portfolio_id)
    return streak, True


def claim_daily_bonus(db_session, user_id: int):
    from models.portfolio import Portfolio
    today = date.today()
    streak = db_session.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    if not streak:
        return None

    if streak.bonus_claimed_today:
        return None

    if streak.last_login_date != today:
        return None

    bonus = STREAK_BONUSES.get(streak.current_streak, 0)
    if streak.current_streak > 30:
        bonus = STREAK_BONUSES[30] + (streak.current_streak - 30) * 500

    wallet = db_session.query(Portfolio).filter(
        Portfolio.user_id == user_id,
        Portfolio.is_primary == True,
    ).first()
    if wallet:
        wallet.cash += bonus

    streak.bonus_claimed_today = True
    streak.total_bonus_earned = (streak.total_bonus_earned or 0) + bonus
    db_session.commit()

    return {"streak": streak.current_streak, "bonus": bonus, "total_bonus_earned": streak.total_bonus_earned}


def get_achievement_progress(db_session, user_id: int, achievement: Achievement) -> float:
    from models.portfolio import OrderSide, Portfolio, Position, Trade

    portfolios = db_session.query(Portfolio).filter(Portfolio.user_id == user_id).all()
    portfolio_ids = [portfolio.id for portfolio in portfolios]
    trades = db_session.query(Trade).filter(Trade.portfolio_id.in_(portfolio_ids)).all() if portfolio_ids else []
    streak = db_session.query(UserStreak).filter(UserStreak.user_id == user_id).first()

    if achievement.key == "first_login":
        return float(streak.total_logins if streak else 0)
    if achievement.key.startswith("streak_"):
        return float(streak.longest_streak if streak else 0)
    if achievement.key in {"first_trade", "trades_10", "trades_50"}:
        return float(len(trades))
    if achievement.key in {"profit_1k", "profit_10k"}:
        return float(sum(
            trade.pnl or 0
            for trade in trades
            if trade.side == OrderSide.SELL
        ))
    if achievement.key in {"backtest_5", "backtest_25"}:
        return float(streak.total_backtests if streak else 0)
    if achievement.key == "portfolio_1m":
        totals = []
        for portfolio in portfolios:
            positions = db_session.query(Position).filter(Position.portfolio_id == portfolio.id).all()
            totals.append(portfolio.cash + sum(
                position.quantity * (position.current_price or position.avg_entry_price)
                for position in positions
            ))
        return float(max(totals, default=0))
    if achievement.key == "hold_7_days":
        longest_hold = 0
        for portfolio in portfolios:
            positions = db_session.query(Position).filter(Position.portfolio_id == portfolio.id).all()
            for position in positions:
                buys = [
                    trade for trade in trades
                    if trade.portfolio_id == portfolio.id
                    and trade.ticker == position.ticker
                    and trade.side == OrderSide.BUY
                    and trade.executed_at
                ]
                if buys:
                    first_buy = min(buy.executed_at for buy in buys)
                    longest_hold = max(longest_hold, (date.today() - first_buy.date()).days)
        return float(longest_hold)
    if achievement.key == "win_rate_100":
        todays_sells = [
            trade for trade in trades
            if trade.side == OrderSide.SELL
            and trade.executed_at
            and trade.executed_at.date() == date.today()
        ]
        if not todays_sells:
            return 0.0
        wins = sum(1 for trade in todays_sells if (trade.pnl or 0) > 0)
        return round(wins / len(todays_sells) * 100, 1)
    return 0.0


def check_achievements(db_session, user_id: int, trigger_type: str, trigger_value, portfolio_id: int = None):
    from models.portfolio import Portfolio, Trade, OrderSide

    all_achievements = db_session.query(Achievement).all()
    unlocked_ids = {
        row.achievement_id
        for row in db_session.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()
    }
    new_achievements = []

    for achievement in all_achievements:
        if achievement.id in unlocked_ids:
            continue
        progress = get_achievement_progress(db_session, user_id, achievement)
        earned = progress >= achievement.requirement_value
        if achievement.key == "win_rate_100":
            portfolios = db_session.query(Portfolio).filter(Portfolio.user_id == user_id).all()
            portfolio_ids = [portfolio.id for portfolio in portfolios]
            todays_sells = [
                trade
                for trade in db_session.query(Trade).filter(
                    Trade.portfolio_id.in_(portfolio_ids),
                    Trade.side == OrderSide.SELL,
                ).all()
                if trade.executed_at and trade.executed_at.date() == date.today()
            ]
            earned = len(todays_sells) >= 3 and progress >= 100

        if not earned:
            continue

        db_session.add(UserAchievement(user_id=user_id, achievement_id=achievement.id))
        new_achievements.append(achievement)
        wallet = db_session.query(Portfolio).filter(
            Portfolio.user_id == user_id,
            Portfolio.is_primary == True,
        ).first()
        if wallet and achievement.bonus_cash > 0:
            wallet.cash += achievement.bonus_cash

    if new_achievements:
        db_session.commit()
    return new_achievements


def get_or_create_daily_challenges(db_session, user_id: int):
    today = date.today()
    existing = db_session.query(UserDailyChallenge).filter(
        UserDailyChallenge.user_id == user_id,
        UserDailyChallenge.challenge_date == today
    ).all()

    if existing:
        streak = db_session.query(UserStreak).filter(UserStreak.user_id == user_id).first()
        login_updates = [
            item for item in existing
            if (
                item.challenge.requirement_type == "login"
                and not item.completed
                and streak
                and streak.last_login_date == today
            )
        ]
        for item in login_updates:
            item.progress = item.challenge.requirement_value
            item.completed = True
        if login_updates:
            db_session.commit()
        return existing

    all_challenges = db_session.query(DailyChallenge).filter(DailyChallenge.active == True).all()
    streak = db_session.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    created = []
    for challenge in all_challenges:
        login_completed = (
            challenge.requirement_type == "login"
            and streak is not None
            and streak.last_login_date == today
        )
        udc = UserDailyChallenge(
            user_id=user_id,
            challenge_id=challenge.id,
            challenge_date=today,
            progress=challenge.requirement_value if login_completed else 0,
            completed=login_completed,
            reward_claimed=False,
        )
        db_session.add(udc)
        created.append(udc)

    if created:
        db_session.commit()
        for udc in created:
            db_session.refresh(udc)

    return created


def update_daily_challenge_progress(
    db_session,
    user_id: int,
    requirement_type: str,
    progress_delta: int = 1,
    absolute: bool = False,
):
    today = date.today()
    challenges = db_session.query(UserDailyChallenge).join(DailyChallenge).filter(
        UserDailyChallenge.user_id == user_id,
        UserDailyChallenge.challenge_date == today,
        DailyChallenge.requirement_type == requirement_type,
        UserDailyChallenge.completed == False,
    ).all()

    updated = []
    for udc in challenges:
        next_progress = progress_delta if absolute else udc.progress + progress_delta
        udc.progress = max(0, min(next_progress, udc.challenge.requirement_value))
        if udc.progress >= udc.challenge.requirement_value:
            udc.completed = True
        updated.append(udc)

    if updated:
        db_session.commit()

    return updated


def claim_daily_reward(db_session, user_id: int, challenge_id: int):
    from models.portfolio import Portfolio
    today = date.today()
    udc = db_session.query(UserDailyChallenge).filter(
        UserDailyChallenge.user_id == user_id,
        UserDailyChallenge.challenge_id == challenge_id,
        UserDailyChallenge.challenge_date == today,
    ).first()

    if not udc or not udc.completed or udc.reward_claimed:
        return None

    wallet = db_session.query(Portfolio).filter(
        Portfolio.user_id == user_id,
        Portfolio.is_primary == True,
    ).first()
    if wallet:
        wallet.cash += udc.challenge.reward_cash

    udc.reward_claimed = True
    db_session.commit()

    return {"title": udc.challenge.title, "reward_cash": udc.challenge.reward_cash, "reward_xp": udc.challenge.reward_xp}
