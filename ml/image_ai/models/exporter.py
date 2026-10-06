import os
import torch
import onnx
from ml.image_ai.configs.default_config import Config

class ONNXExporter:
    """
    Model Exporter Module
    Converts trained PyTorch vision model to optimized ONNX format for Node.js production runtime.
    """
    @staticmethod
    def export_to_onnx(model, output_path=None, img_size=Config.IMAGE_SIZE):
        out_path = output_path or Config.get_onnx_output_path()
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        model.eval()
        dummy_input = torch.randn(1, 3, img_size[0], img_size[1], device="cpu")

        input_names = ["input"]
        output_names = ["output"]
        dynamic_axes = {
            "input": {0: "batch_size"},
            "output": {0: "batch_size"}
        }

        torch.onnx.export(
            model,
            dummy_input,
            out_path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=input_names,
            output_names=output_names,
            dynamic_axes=dynamic_axes,
            dynamo=False
        )

        # Validate ONNX graph integrity
        onnx_model = onnx.load(out_path)
        onnx.checker.check_model(onnx_model)
        
        return out_path
