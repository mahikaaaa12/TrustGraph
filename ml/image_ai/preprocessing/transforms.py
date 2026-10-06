import torch
from torch.utils.data import Dataset
from torchvision import transforms
from PIL import Image
from ml.image_ai.configs.default_config import Config

class ImageDataset(Dataset):
    """
    PyTorch Dataset for AI-Generated Image Classification
    """
    def __init__(self, records, transform=None):
        self.records = records
        self.transform = transform

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        record = self.records[idx]
        img_path = record["path"]
        label = record["label"]

        try:
            image = Image.open(img_path).convert("RGB")
        except Exception as e:
            # Fallback for unexpected corrupt read
            image = Image.new("RGB", Config.IMAGE_SIZE, (0, 0, 0))

        if self.transform:
            image = self.transform(image)

        return image, label, img_path

def get_train_transforms(img_size=Config.IMAGE_SIZE):
    return transforms.Compose([
        transforms.Resize(img_size),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=Config.MEAN, std=Config.STD),
    ])

def get_val_transforms(img_size=Config.IMAGE_SIZE):
    return transforms.Compose([
        transforms.Resize(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=Config.MEAN, std=Config.STD),
    ])
