from __future__ import annotations

import json
import unittest

import numpy as np
import pandas as pd

from ml.src.peers.build import add_peer_action_features


class PeerActionFeaturesTest(unittest.TestCase):
    def fixture(self):
        ids = ["target"] + [str(index) for index in range(8)]
        return pd.DataFrame({
            "product_id": ids, "quantity_sold": [999] + [0, 1, 2, 3, 4, 5, 100, 200],
            "has_video": [False] * 7 + [True, False],
            "peer_ids": [json.dumps(ids[1:])] + ["[]"] * 8,
        })

    def test_good_peer_video_uses_upper_quartile_and_excludes_target(self):
        result = add_peer_action_features(self.fixture()).iloc[0]
        self.assertEqual(result.good_peer_count, 2)
        self.assertEqual(result.good_peer_video_known_count, 2)
        self.assertAlmostEqual(result.good_peer_video_share, 0.5)
        self.assertAlmostEqual(result.good_peer_sales_threshold, 28.75)

    def test_unknown_video_is_not_a_negative_observation(self):
        frame = self.fixture()
        frame["has_video"] = frame.has_video.astype(object)
        frame.loc[8, "has_video"] = None
        result = add_peer_action_features(frame).iloc[0]
        self.assertEqual(result.good_peer_count, 2)
        self.assertEqual(result.good_peer_video_known_count, 1)
        self.assertEqual(result.good_peer_video_share, 1.0)

    def test_all_zero_sales_have_no_good_peer_video_basis(self):
        frame = self.fixture()
        frame["quantity_sold"] = 0
        result = add_peer_action_features(frame).iloc[0]
        self.assertEqual(result.good_peer_count, 0)
        self.assertTrue(np.isnan(result.good_peer_video_share))

    def test_incomplete_or_self_referencing_peer_ids_are_rejected(self):
        for ids in [["target"], ["missing"], ["1", "1"]]:
            with self.subTest(ids=ids):
                frame = self.fixture()
                frame.loc[0, "peer_ids"] = json.dumps(ids)
                with self.assertRaises(ValueError):
                    add_peer_action_features(frame)


if __name__ == "__main__":
    unittest.main()
