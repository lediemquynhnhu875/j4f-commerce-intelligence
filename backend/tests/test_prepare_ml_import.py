import copy
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('prepare',Path(__file__).parents[1]/'scripts'/'prepare-ml-import.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class PrepareTest(unittest.TestCase):
    def setUp(self):
        self.p={'product_id':'1','source_product_id':'1','store_id':None,'seller_id':'seller',
                'product_name':'Example','product_type':'type','price':12,'quantity_sold':0,'observed_sales':0,
                'status':'insufficient_data','status_reason':'peer_count_below_minimum','status_explanation_vi':'Review',
                'analysis_limitations_vi':'Hypothesis','model_version':'v1','scoring_rules_version':'r1',
                'scored_at':'2026-10-12T16:25:18Z','analysis_is_hypothesis':True,'peer_count':0,'peer_ids':[],
                'reference_sales':None,'sale_probability':None,'prediction_lower':None,'prediction_upper':None,
                'opportunity_score':None,'valid_for_model':False,'selected_raw_source_index':None,'recommendations':[]}
        self.s={k: '' if v is None else str(v) for k,v in self.p.items()}
    def test_preserves_invalid_flags_and_unknowns(self):
        r=m.normalize(self.p,self.s,[])
        self.assertFalse(r['analysis']['is_eligible'])
        self.assertFalse(r['analysis']['input_snapshot_json']['valid_for_model'])
        self.assertIsNone(r['analysis']['input_snapshot_json']['selected_raw_source_index'])
        self.assertIsNone(r['analysis']['reference_sold'])
        self.assertEqual(r['recommendations'],[])
    def test_numeric_drift_rejected(self):
        self.s['observed_sales']='5'
        with self.assertRaisesRegex(ValueError,'numeric mismatch'):m.normalize(self.p,self.s,[])
    def test_status_drift_rejected(self):
        self.s['status']='performing_well'
        with self.assertRaisesRegex(ValueError,'mismatch'):m.normalize(self.p,self.s,[])
    def test_inverted_interval_rejected(self):
        self.p.update(prediction_lower=4,prediction_upper=1)
        self.s.update(prediction_lower='4',prediction_upper='1')
        with self.assertRaisesRegex(ValueError,'Inverted'):m.normalize(self.p,self.s,[])
    def test_recommendation_text_drift_rejected(self):
        a={'rule_id':'review_price_positioning','evidence':'e','hypothesis':'h','action':'a','validation_needed':'v'}
        self.p['recommendations']=[a]
        row={**copy.deepcopy(a),**{k:self.p[k] for k in ['model_version','scoring_rules_version','scored_at']}}
        row['evidence']='changed'
        with self.assertRaisesRegex(ValueError,'text mismatch'):m.normalize(self.p,self.s,[row])
    def test_ownership_in_snapshot_rejected(self):
        self.p['store_id']='1'
        with self.assertRaisesRegex(ValueError,'identity'):m.normalize(self.p,self.s,[])

if __name__=='__main__':unittest.main()
