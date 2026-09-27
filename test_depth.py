import torch
from transformers import pipeline
from PIL import Image
import numpy as np
import cv2
import os

def test_depth_model():
    print("Loading Depth Anything V2 Small...")
    # Load the depth estimation pipeline
    # The 'depth-anything/Depth-Anything-V2-Small-hf' is lightweight enough for 6GB VRAM
    try:
        pipe = pipeline(task="depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device=0 if torch.cuda.is_available() else -1)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    # Look for a test image in gamus_samples
    img_path = "d:/SIH26/DC_07_29_RGB.png" # Assuming this file exists from earlier
    
    if not os.path.exists(img_path):
        print(f"Could not find test image at {img_path}.")
        return

    print(f"Processing {img_path}...")
    try:
        image = Image.open(img_path).convert("RGB")
        
        # Run inference
        result = pipe(image)
        
        # The result is usually a PIL Image or dict containing the depth map
        depth_map = result["depth"]
        
        # Convert to numpy array
        depth_np = np.array(depth_map)
        
        # Normalize to 16-bit for visualization/saving
        depth_min = depth_np.min()
        depth_max = depth_np.max()
        depth_normalized = ((depth_np - depth_min) / (depth_max - depth_min + 1e-8) * 65535).astype(np.uint16)
        
        output_path = "d:/SIH26/test_depth_output.png"
        cv2.imwrite(output_path, depth_normalized)
        print(f"Saved 16-bit depth map to {output_path}")
        
    except Exception as e:
        print(f"Error during inference: {e}")

if __name__ == "__main__":
    test_depth_model()
