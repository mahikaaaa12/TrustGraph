import os
import json
from PIL import Image
from ml.image_ai.configs.default_config import Config

class DatasetValidator:
    """
    Dataset Ingestion & Validation Module
    Inspects image files, detects corrupt images, measures dimensions and formats,
    and computes class balance ratios before training.
    """
    SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}

    def __init__(self, dataset_dir=None):
        self.dataset_dir = dataset_dir or Config.DATASET_DIR

    def validate_dataset(self):
        report = {
            "datasetDir": self.dataset_dir,
            "totalImages": 0,
            "classCounts": {"REAL": 0, "AI_GENERATED": 0},
            "validImages": [],
            "corruptImages": [],
            "unsupportedFiles": [],
            "formats": {},
            "dimensions": {"min": None, "max": None, "sample": []},
            "classBalanceRatio": 0.0,
            "status": "VALID",
        }

        if not os.path.exists(self.dataset_dir):
            report["status"] = "DATASET_NOT_FOUND"
            report["error"] = f"Dataset directory '{self.dataset_dir}' does not exist."
            return report

        for class_name in Config.CLASS_NAMES:
            class_folder = os.path.join(self.dataset_dir, class_name)
            if not os.path.exists(class_folder):
                continue

            for root, _, files in os.walk(class_folder):
                for fname in files:
                    ext = os.path.splitext(fname)[1].lower()
                    fpath = os.path.join(root, fname)

                    if ext not in self.SUPPORTED_EXTENSIONS:
                        report["unsupportedFiles"].append(fpath)
                        continue

                    report["totalImages"] += 1
                    try:
                        with Image.open(fpath) as img:
                            img.verify() # Verify integrity
                        
                        # Re-open for metadata (verify closes image)
                        with Image.open(fpath) as img:
                            w, h = img.size
                            fmt = img.format or ext.replace(".", "").upper()

                        report["classCounts"][class_name] += 1
                        report["formats"][fmt] = report["formats"].get(fmt, 0) + 1

                        if report["dimensions"]["min"] is None or (w * h) < (report["dimensions"]["min"][0] * report["dimensions"]["min"][1]):
                            report["dimensions"]["min"] = [w, h]
                        if report["dimensions"]["max"] is None or (w * h) > (report["dimensions"]["max"][0] * report["dimensions"]["max"][1]):
                            report["dimensions"]["max"] = [w, h]

                        report["validImages"].append({
                            "path": fpath,
                            "className": class_name,
                            "label": Config.CLASS_MAP[class_name],
                            "width": w,
                            "height": h,
                            "format": fmt,
                        })
                    except Exception as err:
                        report["corruptImages"].append({
                            "path": fpath,
                            "className": class_name,
                            "error": str(err),
                        })

        real_cnt = report["classCounts"]["REAL"]
        ai_cnt = report["classCounts"]["AI_GENERATED"]
        total_valid = len(report["validImages"])

        if total_valid > 0:
            report["classBalanceRatio"] = round(real_cnt / total_valid, 4) if total_valid > 0 else 0.0

        if total_valid == 0:
            report["status"] = "NO_VALID_IMAGES"
        elif len(report["corruptImages"]) > 0:
            report["status"] = "CORRUPT_FILES_DETECTED"

        return report

    def save_report(self, report, output_path=None):
        out_path = output_path or Config.get_report_output_path()
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        sanitized_report = {
            "datasetDir": report["datasetDir"],
            "status": report["status"],
            "totalImages": report["totalImages"],
            "classCounts": report["classCounts"],
            "validCount": len(report.get("validImages", [])),
            "corruptCount": len(report.get("corruptImages", [])),
            "unsupportedCount": len(report.get("unsupportedFiles", [])),
            "formats": report.get("formats", {}),
            "dimensions": report.get("dimensions", {}),
            "classBalanceRatio": report.get("classBalanceRatio", 0.0),
        }

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(sanitized_report, f, indent=2)

        return out_path

if __name__ == "__main__":
    validator = DatasetValidator()
    rpt = validator.validate_dataset()
    saved = validator.save_report(rpt)
    print(f"Dataset Validation Status: {rpt['status']}")
    print(f"Total Valid Images: {len(rpt['validImages'])}, Corrupt: {len(rpt['corruptImages'])}")
    print(f"Report saved to: {saved}")
