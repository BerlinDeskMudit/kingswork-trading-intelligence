"""Tests for the risk manager's position sizing, scoring, and VaR.

Pure logic: no database, no network, no FastAPI. The manager decides how much
capital a signal may commit, which is the kind of arithmetic that is cheap to
test and expensive to get wrong.
"""

import numpy as np
import pytest

from risk.manager import RiskManager


@pytest.fixture()
def manager() -> RiskManager:
    return RiskManager()


class TestPositionSizing:
    def test_sizes_a_clean_buy_at_the_full_allocation(self, manager):
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=100.0,
            portfolio_value=100_000.0,
            existing_positions={},
        )

        # 2% of 100k = 2000, and no risk penalties, so the whole budget is usable.
        assert assessment.approved is True
        assert assessment.max_position_value == 2_000.0
        assert assessment.max_shares == 20
        assert assessment.risk_score == 0.0
        assert assessment.warnings == []

    def test_shrinks_the_allocation_by_the_risk_score(self, manager):
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=100.0,
            portfolio_value=100_000.0,
            existing_positions={},
            volatility=0.05,  # +0.3
        )

        assert assessment.risk_score == 0.3
        assert assessment.max_position_value == pytest.approx(1_400.0)
        assert assessment.max_shares == 14

    def test_boundary_exactly_at_the_approval_threshold_is_rejected(self, manager):
        # volatility +0.3, exposure breach +0.3, already holding +0.1 == 0.7, and
        # approval requires strictly less than 0.7.
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=100.0,
            portfolio_value=100_000.0,
            existing_positions={"AAPL": {"value": 30_000.0}},
            volatility=0.05,
        )

        assert assessment.risk_score == 0.7
        assert assessment.approved is False

    def test_handles_a_zero_price_without_dividing_by_zero(self, manager):
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=0.0,
            portfolio_value=100_000.0,
            existing_positions={},
        )

        assert assessment.max_shares == 0
        assert assessment.stop_loss_price == 0.0
        assert assessment.take_profit_price == 0.0


class TestRiskScoring:
    def test_rejects_a_non_positive_portfolio(self, manager):
        for portfolio_value in (0.0, -1.0):
            assessment = manager.assess_trade(
                ticker="AAPL",
                current_price=100.0,
                portfolio_value=portfolio_value,
                existing_positions={},
            )

            assert assessment.approved is False
            assert assessment.risk_score == 1.0
            assert assessment.max_shares == 0
            assert assessment.warnings == ["Portfolio value is zero or negative"]

    def test_flags_high_volatility(self, manager):
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=100.0,
            portfolio_value=100_000.0,
            existing_positions={},
            volatility=0.05,
        )

        assert assessment.risk_score == 0.3
        assert any("High volatility" in warning for warning in assessment.warnings)

    def test_ignores_volatility_at_the_threshold(self, manager):
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=100.0,
            portfolio_value=100_000.0,
            existing_positions={},
            volatility=0.04,  # must be strictly greater than 0.04
        )

        assert assessment.risk_score == 0.0

    def test_flags_low_signal_confidence(self, manager):
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=100.0,
            portfolio_value=100_000.0,
            existing_positions={},
            signal_confidence=0.29,
        )

        assert assessment.risk_score == 0.2
        assert "Low signal confidence" in assessment.warnings

    def test_flags_an_exposure_breach(self, manager):
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=100.0,
            portfolio_value=100_000.0,
            existing_positions={"MSFT": {"value": 30_000.0}},
        )

        # (30000 existing + 2000 new) / 100000 = 32% against a 25% ceiling.
        assert assessment.risk_score == 0.3
        assert any("exceeds max" in warning for warning in assessment.warnings)

    def test_flags_an_existing_position_in_the_same_ticker(self, manager):
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=100.0,
            portfolio_value=100_000.0,
            existing_positions={"AAPL": {"value": 100.0}},
        )

        assert assessment.risk_score == 0.1
        assert any("Already holding AAPL" in warning for warning in assessment.warnings)


class TestStopAndTakeProfit:
    def test_buy_places_the_stop_below_and_the_target_above(self, manager):
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=100.0,
            portfolio_value=100_000.0,
            existing_positions={},
            side="BUY",
        )

        assert assessment.stop_loss_price == 95.0
        assert assessment.take_profit_price == 115.0

    def test_sell_inverts_the_stop_and_target(self, manager):
        assessment = manager.assess_trade(
            ticker="AAPL",
            current_price=100.0,
            portfolio_value=100_000.0,
            existing_positions={},
            side="SELL",
        )

        assert assessment.stop_loss_price == 105.0
        assert assessment.take_profit_price == 85.0


class TestValueAtRisk:
    def test_returns_zero_without_positions(self, manager):
        assert manager.calculate_var(100_000.0, {}) == 0.0

    def test_matches_a_hand_computed_percentile_for_one_position(self, manager):
        # 5% of a 5-point series interpolates to -0.09, so a 100k book risks 9k.
        assessment = manager.calculate_var(
            100_000.0,
            {"AAPL": {"value": 100_000.0, "returns": [-0.10, -0.05, 0.0, 0.05, 0.10]}},
        )

        assert assessment == pytest.approx(9_000.0)

    def test_handles_return_series_of_differing_lengths(self, manager):
        # Regression: weights were appended for every position while only
        # series longer than one sample were appended to the return matrix, so
        # one short series desynchronised the two and the dot product raised a
        # shape error instead of returning a VaR.
        result = manager.calculate_var(
            100_000.0,
            {
                "AAPL": {"value": 50_000.0, "returns": [-0.10, -0.05, 0.0, 0.05, 0.10]},
                "MSFT": {"value": 50_000.0, "returns": [0.02, 0.02, 0.02]},
            },
        )

        assert isinstance(result, float)
        assert result > 0.0

    def test_skips_positions_with_no_usable_history(self, manager):
        assert manager.calculate_var(100_000.0, {"AAPL": {"value": 100_000.0, "returns": []}}) == 0.0
        assert manager.calculate_var(100_000.0, {"AAPL": {"value": 100_000.0, "returns": [0.01]}}) == 0.0

    def test_defaults_missing_history_to_a_flat_series(self, manager):
        # A position with no `returns` key keeps its previous behaviour: a flat
        # 100-sample series, which contributes no variance.
        assert manager.calculate_var(100_000.0, {"AAPL": {"value": 100_000.0}}) == 0.0

    def test_never_returns_a_negative_risk_figure(self, manager):
        result = manager.calculate_var(
            100_000.0,
            {"AAPL": {"value": 100_000.0, "returns": [0.05, 0.06, 0.07, 0.08]}},
        )

        assert result >= 0.0


class TestPortfolioStats:
    def test_returns_nothing_until_there_are_two_points(self, manager):
        assert manager.get_portfolio_stats() == {}

        manager.update_portfolio_history(100_000.0)
        assert manager.get_portfolio_stats() == {}

    def test_reports_value_peak_and_drawdown(self, manager):
        for value in (100_000.0, 110_000.0, 105_000.0):
            manager.update_portfolio_history(value)

        stats = manager.get_portfolio_stats()

        assert stats["current_value"] == 105_000.0
        assert stats["peak_value"] == 110_000.0
        assert stats["current_drawdown"] == pytest.approx((105_000.0 - 110_000.0) / 110_000.0)
        assert stats["max_drawdown"] == pytest.approx((105_000.0 - 110_000.0) / 110_000.0)

    def test_keeps_only_the_most_recent_500_points(self, manager):
        for value in range(600):
            manager.update_portfolio_history(float(value))

        stats = manager.get_portfolio_stats()

        assert stats["current_value"] == 599.0
        assert stats["peak_value"] == 599.0

    def test_volatility_is_zero_for_a_flat_curve(self, manager):
        for _ in range(5):
            manager.update_portfolio_history(100_000.0)

        stats = manager.get_portfolio_stats()

        assert stats["volatility"] == 0.0
        assert stats["sharpe"] == 0.0
        assert stats["max_drawdown"] == 0.0


def test_risk_manager_defaults_are_documented():
    # Guard the defaults themselves: a silent change here would alter sizing for
    # every caller, and nothing else in the suite would notice.
    manager = RiskManager()

    assert manager.max_position_pct == 0.02
    assert manager.max_portfolio_risk == 0.25
    assert manager.stop_loss_pct == 0.05
    assert manager.take_profit_pct == 0.15
    assert np.isclose(manager.max_leverage, 1.0)
