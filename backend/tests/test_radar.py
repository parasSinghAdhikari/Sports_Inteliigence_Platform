"""
Percentile calculation tests for radar.py helper functions.
Run: python -m pytest backend/tests/test_radar.py -v
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app.routers.radar import _pct, POSITION_METRICS, MIN_COHORT


class TestPercentile:
    def test_median_value(self):
        # 50th percentile: 5 values below out of 9 → 5/8 * 100 = 62.5 → 62
        cohort = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        assert _pct(5, cohort, False) == 50

    def test_max_value(self):
        cohort = [1, 2, 3, 4, 5]
        assert _pct(5, cohort, False) == 100

    def test_min_value(self):
        cohort = [1, 2, 3, 4, 5]
        assert _pct(1, cohort, False) == 0

    def test_lower_is_better_inversion(self):
        cohort = [1, 2, 3, 4, 5]
        # value=5 is highest → raw pct=100 → inverted → 0
        assert _pct(5, cohort, True) == 0
        # value=1 is lowest → raw pct=0 → inverted → 100
        assert _pct(1, cohort, True) == 100

    def test_none_value_returns_none(self):
        assert _pct(None, [1, 2, 3], False) is None

    def test_empty_cohort_returns_none(self):
        assert _pct(5.0, [], False) is None

    def test_single_element_cohort_returns_none(self):
        # len < 2 → cannot compute
        assert _pct(5.0, [5.0], False) is None

    def test_ties_handled_consistently(self):
        # All same value → 0 below → 0th percentile
        cohort = [5.0, 5.0, 5.0, 5.0]
        assert _pct(5.0, cohort, False) == 0

    def test_value_not_in_cohort(self):
        # value=2.5 falls between 2 and 3 → 2 values below out of 4 → 2/3*100=66
        cohort = [1, 2, 3, 4]
        result = _pct(2.5, cohort, False)
        assert result == 67  # round(66.6)


class TestMetrics:
    def test_all_positions_have_6_metrics(self):
        for pos, metrics in POSITION_METRICS.items():
            assert len(metrics) == 6, f"{pos} should have 6 metrics, got {len(metrics)}"

    def test_no_metric_key_is_empty(self):
        seen = set()
        for pos, metrics in POSITION_METRICS.items():
            for key, label, unit, lib in metrics:
                assert key, f"Empty key in {pos} metrics"
                assert label, f"Empty label for {key} in {pos}"
                seen.add(key)

    def test_yellow_cards_is_lower_is_better(self):
        for pos, metrics in POSITION_METRICS.items():
            yc = [m for m in metrics if m[0] == 'yellow_cards']
            assert yc, f"No yellow_cards in {pos}"
            assert yc[0][3] is True, f"yellow_cards should be lower_is_better in {pos}"

    def test_min_cohort_constant(self):
        assert MIN_COHORT >= 5, "Minimum cohort should be >= 5 for reliable stats"
