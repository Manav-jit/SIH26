from transformers import pipeline
from PIL import Image
import torch
import numpy as np
import io

class DepthEstimator:
    def __init__(self):
        # Use GPU if available
        self.device = 0 if torch.cuda.is_available() else -1
        # depth-anything-base-hf has better structural boundaries than small, uses ~400MB VRAM
        print(f"Loading model on device: {'GPU' if self.device == 0 else 'CPU'}")
        self.pipe = pipeline(task="depth-estimation", model="LiheYoung/depth-anything-base-hf", device=self.device)
        print("Model loaded.")

    def estimate_depth(self, image: Image.Image) -> bytes:
        """
        Takes a PIL Image, estimates depth, and returns a PNG grayscale image byte array.
        """
        max_size = 1024
        if max(image.size) > max_size:
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        # Run inference
        result = self.pipe(image)
        depth_img = result["depth"]
        
        img_byte_arr = io.BytesIO()
        depth_img.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()

    def apply_semantic_flattening(self, depth_bytes: bytes, class_image: Image.Image) -> bytes:
        """
        Flattens the depth map in regions classified as ground/roads or water.
        """
        depth_img = Image.open(io.BytesIO(depth_bytes)).convert("L")
        
        # Ensure sizes match
        if depth_img.size != class_image.size:
            class_image = class_image.resize(depth_img.size, Image.Resampling.NEAREST)
            
        depth_arr = np.array(depth_img, dtype=np.float32)
        class_arr = np.array(class_image.convert("L"))
        
        # The class image extracted is scaled by 30 (0=ground/background, 3=water=90)
        baseline = depth_arr.min()
        mask = (class_arr < 15) | ((class_arr > 75) & (class_arr < 105))
        
        depth_arr[mask] = baseline
        depth_arr = depth_arr.astype(np.uint8)
        
        out_img = Image.fromarray(depth_arr)
        img_byte_arr = io.BytesIO()
        out_img.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()

# Singleton instance
depth_estimator = None

def get_estimator():
    global depth_estimator
    if depth_estimator is None:
        depth_estimator = DepthEstimator()
    return depth_estimator
