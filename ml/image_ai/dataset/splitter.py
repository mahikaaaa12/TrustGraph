import random
from ml.image_ai.configs.default_config import Config

class LeakageProofSplitter:
    """
    Family-Aware Leakage-Proof Dataset Splitter
    Splits image clusters across train (70%), val (15%), and test (15%) sets
    without allowing near-duplicate image families to leak across splits.
    """
    def __init__(self, seed=42):
        self.seed = seed

    def split_clusters(self, clusters, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15):
        random.seed(self.seed)

        # Separate family clusters by majority class label to maintain stratification
        real_families = []
        ai_families = []

        for family_id, records in clusters.items():
            labels = [r["label"] for r in records]
            # Majority vote label for cluster
            majority_label = max(set(labels), key=labels.count)
            if majority_label == Config.CLASS_MAP["REAL"]:
                real_families.append((family_id, records))
            else:
                ai_families.append((family_id, records))

        random.shuffle(real_families)
        random.shuffle(ai_families)

        def partition(family_list):
            n = len(family_list)
            train_end = int(n * train_ratio)
            val_end = train_end + int(n * val_ratio)

            train_f = family_list[:train_end]
            val_f = family_list[train_end:val_end]
            test_f = family_list[val_end:]
            return train_f, val_f, test_f

        real_train, real_val, real_test = partition(real_families)
        ai_train, ai_val, ai_test = partition(ai_families)

        train_records = []
        for _, records in real_train + ai_train:
            train_records.extend(records)

        val_records = []
        for _, records in real_val + ai_val:
            val_records.extend(records)

        test_records = []
        for _, records in real_test + ai_test:
            test_records.extend(records)

        # Leakage Verification
        train_families = set(r["familyId"] for r in train_records)
        val_families = set(r["familyId"] for r in val_records)
        test_families = set(r["familyId"] for r in test_records)

        assert train_families.isdisjoint(val_families), "Data Leakage Error: Train and Val splits share family clusters!"
        assert train_families.isdisjoint(test_families), "Data Leakage Error: Train and Test splits share family clusters!"
        assert val_families.isdisjoint(test_families), "Data Leakage Error: Val and Test splits share family clusters!"

        return {
            "train": train_records,
            "val": val_records,
            "test": test_records,
            "summary": {
                "trainCount": len(train_records),
                "valCount": len(val_records),
                "testCount": len(test_records),
                "trainFamilies": len(train_families),
                "valFamilies": len(val_families),
                "testFamilies": len(test_families),
            }
        }
