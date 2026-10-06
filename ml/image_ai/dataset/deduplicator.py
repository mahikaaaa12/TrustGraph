import hashlib
import os
from PIL import Image

class DatasetDeduplicator:
    """
    Duplicate & Near-Duplicate Detection Module
    Uses MD5 byte hashing and dHash (difference hashing) to identify exact duplicate
    images and generation families, preventing data leakage across train/val/test splits.
    """
    @staticmethod
    def compute_md5(file_path):
        hasher = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    @staticmethod
    def compute_dhash(file_path, hash_size=8):
        try:
            with Image.open(file_path) as img:
                img_gray = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.BILINEAR)
                pixels = list(img_gray.getdata())
                
                difference = []
                for row in range(hash_size):
                    for col in range(hash_size):
                        pixel_left = pixels[row * (hash_size + 1) + col]
                        pixel_right = pixels[row * (hash_size + 1) + col + 1]
                        difference.append(pixel_left > pixel_right)
                
                decimal_val = 0
                for index, value in enumerate(difference):
                    if value:
                        decimal_val += 2 ** index
                return f"{decimal_val:016x}"
        except Exception:
            return None

    def find_duplicates(self, image_records):
        """
        Groups valid image records by MD5 and dHash to assign family cluster IDs.
        """
        md5_map = {}
        dhash_map = {}
        duplicates = []
        clusters = {} # family_id -> list of file paths

        family_counter = 0

        for record in image_records:
            fpath = record["path"]
            md5_h = self.compute_md5(fpath)
            d_h = self.compute_dhash(fpath)

            record["md5"] = md5_h
            record["dhash"] = d_h

            is_dup = False
            family_id = None

            if md5_h in md5_map:
                is_dup = True
                family_id = md5_map[md5_h]["familyId"]
            elif d_h and d_h in dhash_map:
                is_dup = True
                family_id = dhash_map[d_h]["familyId"]

            if not is_dup:
                family_counter += 1
                family_id = f"family_{family_counter}"
                md5_map[md5_h] = {"path": fpath, "familyId": family_id}
                if d_h:
                    dhash_map[d_h] = {"path": fpath, "familyId": family_id}
            else:
                duplicates.append({
                    "path": fpath,
                    "familyId": family_id,
                    "matchedWith": md5_map.get(md5_h, {}).get("path") or dhash_map.get(d_h, {}).get("path"),
                })

            record["familyId"] = family_id
            if family_id not in clusters:
                clusters[family_id] = []
            clusters[family_id].append(record)

        return {
            "totalImages": len(image_records),
            "duplicateCount": len(duplicates),
            "uniqueFamiliesCount": len(clusters),
            "duplicates": duplicates,
            "clusters": clusters,
            "imageRecords": image_records,
        }
