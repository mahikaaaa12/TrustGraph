import os

class Config:
    """
    Central Configuration for TrustGraph AI-Generated Image Detector ML Training Pipeline
    """
    # Directory Paths (override via env variables)
    DATASET_DIR = os.getenv("IMAGE_AI_DATASET_DIR", os.path.join("ml", "image_ai", "dataset_raw"))
    PROCESSED_DIR = os.getenv("IMAGE_AI_PROCESSED_DIR", os.path.join("ml", "image_ai", "dataset_processed"))
    OUTPUT_DIR = os.getenv("IMAGE_AI_OUTPUT_DIR", os.path.join("src", "ml", "artifacts"))
    REPORT_DIR = os.getenv("IMAGE_AI_REPORT_DIR", os.path.join("ml", "image_ai", "output"))

    # Model Parameters
    BACKBONE = os.getenv("IMAGE_AI_BACKBONE", "efficientnet_b0") # options: efficientnet_b0, mobilenet_v3_small
    MODEL_VERSION = os.getenv("IMAGE_AI_MODEL_VERSION", "1.0.0-onnx-mobilenet")
    ONNX_FILENAME = os.getenv("IMAGE_AI_ONNX_FILENAME", "ai_image_detector.onnx")

    # Image Preprocessing Settings
    IMAGE_SIZE = (224, 224)
    MEAN = [0.485, 0.456, 0.406]
    STD = [0.229, 0.224, 0.225]

    # Target Binary Classes
    NUM_CLASSES = 2
    CLASS_NAMES = ["REAL", "AI_GENERATED"]
    CLASS_MAP = {"REAL": 0, "AI_GENERATED": 1}

    # Training Parameters
    BATCH_SIZE = int(os.getenv("BATCH_SIZE", "32"))
    EPOCHS = int(os.getenv("EPOCHS", "10"))
    LEARNING_RATE = float(os.getenv("LEARNING_RATE", "1e-4"))
    WEIGHT_DECAY = float(os.getenv("WEIGHT_DECAY", "1e-2"))
    NUM_WORKERS = int(os.getenv("NUM_WORKERS", "2"))

    # Leakage-Proof Splitting Ratios
    TRAIN_SPLIT = 0.70
    VAL_SPLIT = 0.15
    TEST_SPLIT = 0.15
    RANDOM_SEED = 42

    @classmethod
    def get_onnx_output_path(cls):
        os.makedirs(cls.OUTPUT_DIR, exist_ok=True)
        return os.path.join(cls.OUTPUT_DIR, cls.ONNX_FILENAME)

    @classmethod
    def get_report_output_path(cls):
        os.makedirs(cls.REPORT_DIR, exist_ok=True)
        return os.path.join(cls.REPORT_DIR, "dataset_report.json")
