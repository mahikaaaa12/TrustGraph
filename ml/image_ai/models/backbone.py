import torch
import torch.nn as nn
from torchvision import models
from ml.image_ai.configs.default_config import Config

class AIImageClassifier(nn.Module):
    """
    Pretrained Vision Backbone Transfer Learning Architecture
    Supports EfficientNet-B0 and MobileNet-V3-Small
    Outputs raw 2-class logits [logit_real, logit_ai]
    """
    def __init__(self, backbone_name=Config.BACKBONE, num_classes=Config.NUM_CLASSES, pretrained=True):
        super(AIImageClassifier, self).__init__()
        self.backbone_name = backbone_name.lower()

        if "efficientnet" in self.backbone_name:
            weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
            self.backbone = models.efficientnet_b0(weights=weights)
            in_features = self.backbone.classifier[1].in_features
            self.backbone.classifier = nn.Sequential(
                nn.Dropout(p=0.3, inplace=True),
                nn.Linear(in_features, num_classes)
            )
        elif "mobilenet" in self.backbone_name:
            weights = models.MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
            self.backbone = models.mobilenet_v3_small(weights=weights)
            in_features = self.backbone.classifier[3].in_features
            self.backbone.classifier[3] = nn.Linear(in_features, num_classes)
        else:
            # Fallback to ResNet-18
            weights = models.ResNet18_Weights.DEFAULT if pretrained else None
            self.backbone = models.resnet18(weights=weights)
            in_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Linear(in_features, num_classes)

    def forward(self, x):
        return self.backbone(x)
