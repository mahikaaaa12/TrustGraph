import os
import json
import time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader

from ml.image_ai.configs.default_config import Config
from ml.image_ai.dataset.validator import DatasetValidator
from ml.image_ai.dataset.deduplicator import DatasetDeduplicator
from ml.image_ai.dataset.splitter import LeakageProofSplitter
from ml.image_ai.preprocessing.transforms import ImageDataset, get_train_transforms, get_val_transforms
from ml.image_ai.models.backbone import AIImageClassifier
from ml.image_ai.models.exporter import ONNXExporter

def train_pipeline():
    print("=" * 70)
    print(" TrustGraph AI Image Detector — Reproducible ML Training Pipeline")
    print("=" * 70)

    # 1. Dataset Ingestion & Validation
    print(f"\n[1/5] Ingesting & Validating Dataset from: '{Config.DATASET_DIR}'...")
    validator = DatasetValidator(Config.DATASET_DIR)
    validation_report = validator.validate_dataset()
    report_path = validator.save_report(validation_report)
    print(f"      Validation Report saved to: '{report_path}'")
    print(f"      Total Images: {validation_report['totalImages']} (REAL: {validation_report['classCounts']['REAL']}, AI: {validation_report['classCounts']['AI_GENERATED']})")

    valid_records = validation_report.get("validImages", [])

    # Check Dataset Sufficiency Guard
    if len(valid_records) < 10 or validation_report["classCounts"]["REAL"] == 0 or validation_report["classCounts"]["AI_GENERATED"] == 0:
        print("\n" + "!" * 70)
        print(" [DATASET SPECIFICATION REQUIRED]")
        print(" Sufficient real/AI image dataset is not present in 'ml/image_ai/dataset_raw/'.")
        print(" Per system constraints, ZERO fake training data will be created.")
        print(" Training pipeline stands READY. Please populate dataset according to spec.")
        print("!" * 70)

        spec = {
            "pipelineStatus": "AWAITING_DATASET",
            "requiredDatasetStructure": {
                "dataset_dir": Config.DATASET_DIR,
                "subfolders": ["REAL", "AI_GENERATED"],
                "recommendedMinimumImagesPerClass": 5000,
                "supportedFormats": ["JPG", "JPEG", "PNG", "WEBP"],
                "recommendedMinResolution": "512x512",
            },
            "validationReport": {
                "status": validation_report["status"],
                "totalFound": validation_report["totalImages"],
                "classCounts": validation_report["classCounts"],
            }
        }
        spec_path = os.path.join(Config.REPORT_DIR, "dataset_specification_required.json")
        os.makedirs(os.path.dirname(spec_path), exist_ok=True)
        with open(spec_path, "w", encoding="utf-8") as f:
            json.dump(spec, f, indent=2)
        print(f" Dataset Specification saved to: '{spec_path}'\n")
        return spec

    # 2. Duplicate Detection & Family Clustering
    print("\n[2/5] Scanning for Exact & Perceptual Duplicates...")
    deduplicator = DatasetDeduplicator()
    dedup_results = deduplicator.find_duplicates(valid_records)
    print(f"      Found {dedup_results['duplicateCount']} duplicate/near-duplicate images across {dedup_results['uniqueFamiliesCount']} unique families.")

    # 3. Leakage-Proof Dataset Splitting
    print("\n[3/5] Performing Family-Aware Stratified Train/Val/Test Splitting...")
    splitter = LeakageProofSplitter(seed=Config.RANDOM_SEED)
    splits = splitter.split_clusters(dedup_results["clusters"])
    summary = splits["summary"]
    print(f"      Train: {summary['trainCount']} images ({summary['trainFamilies']} families)")
    print(f"      Val:   {summary['valCount']} images ({summary['valFamilies']} families)")
    print(f"      Test:  {summary['testCount']} images ({summary['testFamilies']} families)")

    # Data Loaders
    train_dataset = ImageDataset(splits["train"], transform=get_train_transforms())
    val_dataset = ImageDataset(splits["val"], transform=get_val_transforms())

    train_loader = DataLoader(train_dataset, batch_size=Config.BATCH_SIZE, shuffle=True, num_workers=Config.NUM_WORKERS)
    val_loader = DataLoader(val_dataset, batch_size=Config.BATCH_SIZE, shuffle=False, num_workers=Config.NUM_WORKERS)

    # 4. Model Initialization & Training Loop
    print(f"\n[4/5] Initializing {Config.BACKBONE.upper()} Transfer Learning Backbone...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"      Executing on compute device: {device}")

    model = AIImageClassifier(backbone_name=Config.BACKBONE, num_classes=Config.NUM_CLASSES, pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=Config.LEARNING_RATE, weight_decay=Config.WEIGHT_DECAY)

    best_val_loss = float("inf")

    for epoch in range(1, Config.EPOCHS + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for images, labels, _ in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        train_loss = running_loss / max(1, total)
        train_acc = correct / max(1, total)

        # Validation Pass
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels, _ in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                val_correct += (preds == labels).sum().item()
                val_total += labels.size(0)

        val_loss = val_loss / max(1, val_total)
        val_acc = val_correct / max(1, val_total)

        print(f"      Epoch [{epoch:02d}/{Config.EPOCHS:02d}] - Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} | Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss

    # 5. Model Export to ONNX Artifact
    print("\n[5/5] Exporting Model to Production ONNX Artifact...")
    onnx_path = ONNXExporter.export_to_onnx(model, Config.get_onnx_output_path())
    print(f"      ONNX Artifact exported successfully to: '{onnx_path}'")

    metadata = {
        "pipelineStatus": "TRAINING_COMPLETE",
        "modelVersion": Config.MODEL_VERSION,
        "backbone": Config.BACKBONE,
        "epochs": Config.EPOCHS,
        "learningRate": Config.LEARNING_RATE,
        "bestValLoss": best_val_loss,
        "onnxPath": onnx_path,
        "classes": Config.CLASS_NAMES,
    }
    meta_path = os.path.join(Config.OUTPUT_DIR, "model_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("\n" + "=" * 70)
    print(" Training Pipeline Completed Successfully!")
    print("=" * 70 + "\n")
    return metadata

if __name__ == "__main__":
    train_pipeline()
