import os
import json
import numpy as np
import torch
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
)

from ml.image_ai.configs.default_config import Config
from ml.image_ai.dataset.validator import DatasetValidator
from ml.image_ai.dataset.deduplicator import DatasetDeduplicator
from ml.image_ai.dataset.splitter import LeakageProofSplitter
from ml.image_ai.preprocessing.transforms import ImageDataset, get_val_transforms
from ml.image_ai.models.backbone import AIImageClassifier

def evaluate_pipeline():
    print("=" * 70)
    print(" TrustGraph AI Image Detector — Evaluation & Metrics Tracking")
    print("=" * 70)

    validator = DatasetValidator(Config.DATASET_DIR)
    validation_report = validator.validate_dataset()
    valid_records = validation_report.get("validImages", [])

    if len(valid_records) < 10 or validation_report["classCounts"]["REAL"] == 0 or validation_report["classCounts"]["AI_GENERATED"] == 0:
        print("\n [EVALUATION SKIPPED] No dataset found to evaluate held-out test split.")
        eval_report = {
            "evaluationStatus": "DATASET_NOT_FOUND",
            "message": "Dataset not present in ml/image_ai/dataset_raw/",
            "metrics": None
        }
        out_path = os.path.join(Config.REPORT_DIR, "evaluation_report.json")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(eval_report, f, indent=2)
        return eval_report

    deduplicator = DatasetDeduplicator()
    dedup_results = deduplicator.find_duplicates(valid_records)
    splitter = LeakageProofSplitter(seed=Config.RANDOM_SEED)
    splits = splitter.split_clusters(dedup_results["clusters"])

    test_dataset = ImageDataset(splits["test"], transform=get_val_transforms())
    test_loader = DataLoader(test_dataset, batch_size=Config.BATCH_SIZE, shuffle=False, num_workers=Config.NUM_WORKERS)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = AIImageClassifier(backbone_name=Config.BACKBONE, num_classes=Config.NUM_CLASSES, pretrained=False).to(device)

    # Load weights if available
    weights_path = os.path.join(Config.OUTPUT_DIR, "model_weights.pth")
    if os.path.exists(weights_path):
        model.load_state_dict(torch.load(weights_path, map_location=device))
        print(f" Loaded model weights from: '{weights_path}'")

    model.eval()
    all_targets = []
    all_probs = []

    with torch.no_grad():
        for images, labels, _ in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)[:, 1] # Probability of AI_GENERATED

            all_targets.extend(labels.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())

    all_targets = np.array(all_targets)
    all_probs = np.array(all_probs)
    all_preds = (all_probs >= 0.5).astype(int)

    acc = accuracy_score(all_targets, all_preds)
    prec = precision_score(all_targets, all_preds, zero_division=0)
    rec = recall_score(all_targets, all_preds, zero_division=0)
    f1 = f1_score(all_targets, all_preds, zero_division=0)

    try:
        roc_auc = roc_auc_score(all_targets, all_probs)
    except Exception:
        roc_auc = 0.5

    try:
        pr_auc = average_precision_score(all_targets, all_probs)
    except Exception:
        pr_auc = 0.5

    cm = confusion_matrix(all_targets, all_preds, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0, 0, 0, 0)

    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0

    eval_report = {
        "evaluationStatus": "COMPLETE",
        "testSetCount": len(all_targets),
        "metrics": {
            "accuracy": float(round(acc, 4)),
            "precision": float(round(prec, 4)),
            "recall": float(round(rec, 4)),
            "f1Score": float(round(f1, 4)),
            "rocAuc": float(round(roc_auc, 4)),
            "prAuc": float(round(pr_auc, 4)),
            "falsePositiveRate": float(round(fpr, 4)),
            "falseNegativeRate": float(round(fnr, 4)),
            "confusionMatrix": {
                "trueNegative_RealAsReal": int(tn),
                "falsePositive_RealAsAI": int(fp),
                "falseNegative_AIAsReal": int(fn),
                "truePositive_AIAsAI": int(tp),
            }
        }
    }

    out_path = os.path.join(Config.REPORT_DIR, "evaluation_report.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(eval_report, f, indent=2)

    print("\n Evaluation Metrics:")
    print(f"  - Accuracy:              {acc:.4f}")
    print(f"  - Precision:             {prec:.4f}")
    print(f"  - Recall:                {rec:.4f}")
    print(f"  - F1 Score:              {f1:.4f}")
    print(f"  - ROC-AUC:               {roc_auc:.4f}")
    print(f"  - PR-AUC:                {pr_auc:.4f}")
    print(f"  - False Positive Rate:   {fpr:.4f} (Real flagged as AI)")
    print(f"  - False Negative Rate:   {fnr:.4f} (AI flagged as Real)")
    print(f"\n Report saved to: '{out_path}'\n")

    return eval_report

if __name__ == "__main__":
    evaluate_pipeline()
