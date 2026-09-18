"""Tests for the backtest engine.

The engine turns a price series plus signals into an equity curve and summary
statistics. These cases pin the arithmetic (commission, sizing, P&L) and the
statistics derived from the equity curve, using series short enough that the
expected values can be worked out by hand.
"""

import math

import pandas as pd
import pytest

from backtesting.engine import BacktestEngine

INITIAL_CAPITAL = 100_000.0
COMMISSION = 0.001


def frame(prices, signals=None):
    data = {"close": list(prices)}
    if signals is not None:
        data["signal"] = list(signals)
    return pd.DataFrame(data, index=range(len(prices)))


@pytest.fixture()
def engine() -> BacktestEngine:
    return BacktestEngine(initial_capital=INITIAL_CAPITAL, commission_pct=COMMISSION)


class TestEmptyAndTrivialInput:
    def test_empty_frame_returns_defaults(self, engine):
        result = engine.run(pd.DataFrame())

        assert result.total_return == 0.0
        assert result.total_trades == 0
        assert result.equity_curve == []
        assert result.trades == []

    def test_single_row_frame_never_enters_the_loop(self, engine):
        result = engine.run(frame([100.0], ["BUY"]))

        assert result.final_capital == INITIAL_CAPITAL
        assert result.total_return == 0.0
        assert result.equity_curve == [INITIAL_CAPITAL]
        assert result.total_trades == 0

    def test_without_signals_nothing_trades(self, engine):
        result = engine.run(frame([100.0, 101.0, 102.0]))

        assert result.final_capital == INITIAL_CAPITAL
        assert result.total_return == 0.0
        assert result.total_trades == 0
        assert result.equity_curve == [INITIAL_CAPITAL] * 3
        assert result.max_drawdown == 0.0
        assert result.sharpe_ratio == 0.0
        assert result.annualized_return == 0.0

    def test_neutral_signals_hold_cash(self, engine):
        result = engine.run(frame([100.0, 101.0, 102.0], ["NEUTRAL", "NEUTRAL", "NEUTRAL"]))

        assert result.final_capital == INITIAL_CAPITAL
        assert result.trades == []


class TestWinningRoundTrip:
    def test_buys_with_the_full_allocation_and_pays_commission(self, engine):
        result = engine.run(frame([100.0, 100.0, 110.0], ["NEUTRAL", "BUY", "NEUTRAL"]))

        # 95% of 100k buys 950 shares at 100, costing 95000 * 1.001.
        assert result.trades[0]["shares"] == 950
        assert result.trades[0]["cost"] == pytest.approx(95_095.0)

        # Still holding at the end, so it is marked out at the final price with
        # commission charged on the way out.
        assert result.final_capital == pytest.approx(109_300.5)
        assert result.total_return == pytest.approx(0.093005)

    def test_reports_a_single_winner(self, engine):
        result = engine.run(frame([100.0, 100.0, 110.0], ["NEUTRAL", "BUY", "NEUTRAL"]))

        assert result.total_trades == 1
        assert result.winning_trades == 1
        assert result.losing_trades == 0
        assert result.win_rate == 1.0
        assert result.avg_win == pytest.approx(9_395.5)
        # No losses, so the profit factor is unbounded rather than zero.
        assert math.isinf(result.profit_factor)

    def test_equity_curve_has_one_point_per_price(self, engine):
        result = engine.run(frame([100.0, 100.0, 110.0], ["NEUTRAL", "BUY", "NEUTRAL"]))

        # One point per price, starting at the opening balance: cash plus the
        # position marked at each close. The final point is a mark rather than a
        # liquidation, so it sits slightly above final_capital, which has the
        # exit commission deducted.
        assert len(result.equity_curve) == 3
        assert result.equity_curve == pytest.approx([100_000.0, 99_905.0, 109_405.0])
        assert result.equity_curve[-1] > result.final_capital


class TestLosingRoundTrip:
    def test_realises_the_loss_and_closes_the_position(self, engine):
        result = engine.run(frame([100.0, 100.0, 90.0], ["NEUTRAL", "BUY", "SELL"]))

        assert result.final_capital == pytest.approx(90_319.5)
        assert result.total_return == pytest.approx(-0.096805)

    def test_reports_a_single_loser(self, engine):
        result = engine.run(frame([100.0, 100.0, 90.0], ["NEUTRAL", "BUY", "SELL"]))

        assert result.total_trades == 1
        assert result.winning_trades == 0
        assert result.win_rate == 0.0
        assert result.avg_loss == pytest.approx(-9_585.5)
        # Losses with no profits give a profit factor of zero, not infinity.
        assert result.profit_factor == 0.0

    def test_sell_signal_without_a_position_is_ignored(self, engine):
        result = engine.run(frame([100.0, 90.0], ["NEUTRAL", "SELL"]))

        assert result.trades == []
        assert result.final_capital == INITIAL_CAPITAL


class TestDrawdown:
    def test_measures_the_worst_peak_to_trough_decline(self, engine):
        result = engine.run(
            frame([100.0, 100.0, 80.0, 120.0], ["NEUTRAL", "BUY", "NEUTRAL", "NEUTRAL"]),
        )

        assert result.total_return == pytest.approx(0.18791)
        # Peak equity is the 100k starting point, trough is the 80-price mark.
        assert result.max_drawdown == pytest.approx((80_905.0 - 100_000.0) / 100_000.0)
        assert len(result.equity_curve) == 4


class TestGuards:
    def test_skips_an_entry_that_commission_makes_unaffordable(self):
        expensive = BacktestEngine(initial_capital=INITIAL_CAPITAL, commission_pct=0.5)
        result = expensive.run(frame([100.0, 100.0], ["NEUTRAL", "BUY"]))

        # 95% of capital in shares plus 50% commission exceeds the account, so
        # the trade is skipped rather than overdrawing.
        assert result.trades == []
        assert result.final_capital == INITIAL_CAPITAL
        assert result.total_return == 0.0

    def test_does_not_stack_a_second_entry_while_holding(self, engine):
        result = engine.run(
            frame([100.0, 100.0, 105.0, 110.0], ["NEUTRAL", "BUY", "STRONG_BUY", "BUY"]),
        )

        buys = [trade for trade in result.trades if trade.get("action") == "BUY"]
        assert len(buys) == 1
        assert result.total_trades == 1
