# TrustGraph AI-Generated Image Detector ML Training Pipeline

This directory contains the standalone machine learning training and evaluation pipeline for the **TrustGraph AI-Generated Image Classifier**.

> **Note**: This pipeline is completely decoupled from the production Express API server. Model training, dataset validation, and ONNX exports occur offline.

---

## Directory Structure

```
ml/
  image_ai/
    configs/
      default_config.py     # Centralized hyperparameters & environment variables
    dataset/
      validator.py          # Image integrity, format extraction, & balance check
      deduplicator.py       # Perceptual & MD5 hash deduplication (prevents leakage)
      splitter.py           # Family-aware 70/15/15 train/val/test split
    preprocessing/
      transforms.py         # Data augmentations & PyTorch ImageDataset loader
    training/
      train.py              # Transfer learning loop & ONNX export
    evaluation/
      evaluate.py           # Metric evaluation (Accuracy, F1, ROC-AUC, FPR, FNR)
    models/
      backbone.py           # Pretrained vision backbone (EfficientNet-B0 / MobileNet-V3)
      exporter.py           # ONNX exporter with dynamic batching
    README.md
```

---

## Target Classes & Architecture

- **Classes**: `REAL` (Label 0), `AI_GENERATED` (Label 1)
- **Vision Backbones**: `EfficientNet-B0` (Default) or `MobileNet-V3-Small`
- **Output Format**: PyTorch 2-class logits -> Exported to `ai_image_detector.onnx` (`[1, 3, 224, 224]` Float32 Input).

---

## Configuration & Environment Variables

The training pipeline reads configuration from environment variables with sensible defaults:

| Variable | Default | Description |
|---|---|---|
| `IMAGE_AI_DATASET_DIR` | `ml/image_ai/dataset_raw` | Root directory containing `REAL` and `AI_GENERATED` image subfolders. |
| `IMAGE_AI_OUTPUT_DIR` | `src/ml/artifacts` | Destination directory for exported `ai_image_detector.onnx` and metadata. |
| `IMAGE_AI_BACKBONE` | `efficientnet_b0` | Vision backbone (`efficientnet_b0` or `mobilenet_v3_small`). |
| `BATCH_SIZE` | `32` | Training batch size. |
| `EPOCHS` | `10` | Total training epochs. |
| `LEARNING_RATE` | `1e-4` | AdamW learning rate. |

---

## Reproducible Commands

### 1. Run Dataset Ingestion & Validation
```bash
python -m ml.image_ai.dataset.validator
```

### 2. Run Reproducible Model Training & ONNX Export
```bash
python -m ml.image_ai.training.train
```

### 3. Run Test Evaluation & Metric Tracking
```bash
python -m ml.image_ai.evaluation.evaluate
```

---

## Required Dataset Specification

To train a production-grade vision model, place raw images into `ml/image_ai/dataset_raw/` with the following structure:

```
ml/image_ai/dataset_raw/
├── REAL/
│   ├── photo_0001.jpg
│   └── photo_0002.jpg
└── AI_GENERATED/
    ├── midjourney_0001.png
    └── dalle_0002.png
```

- **Recommended Volume**: Minimum **5,000 REAL** and **5,000 AI_GENERATED** images (total 10,000+).
- **Supported Formats**: JPEG, PNG, WEBP.
- **Recommended Resolution**: Minimum $512 \times 512$ pixels before resizing.
