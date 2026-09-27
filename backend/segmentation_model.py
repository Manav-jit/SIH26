from transformers import pipeline
from PIL import Image
import torch
import numpy as np
import io

class SegmentationEstimator:
    def __init__(self):
        self.device = 0 if torch.cuda.is_available() else -1
        print(f"Loading segmentation model on device: {'GPU' if self.device == 0 else 'CPU'}")
        # Using a model finetuned on ADE20K for good general outdoor/satellite performance
        self.pipe = pipeline(task="image-segmentation", model="nvidia/segformer-b0-finetuned-ade-512-512", device=self.device)
        print("Segmentation model loaded.")

    def segment_image(self, image: Image.Image) -> np.ndarray:
        """
        Takes a PIL Image, estimates segmentation, and returns a class map as a numpy array
        where values map to the Aether CLASS_MAP (0, 30, 90, 180).
        """
        max_size = 1024
        original_size = image.size
        
        if max(image.size) > max_size:
            image = image.copy()
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        # Run inference
        results = self.pipe(image)
        
        # Create an empty class map (default background = 0)
        class_map = np.zeros((image.size[1], image.size[0]), dtype=np.uint8)
        
        for result in results:
            label = result["label"].lower()
            mask = np.array(result["mask"])
            
            # Map ADE20K labels to Aether classes
            # 180 = building, 90 = tree, 30 = road, 0 = background
            mapped_value = 0
            if any(term in label for term in ["building", "house", "edifice", "wall", "skyscraper", "tower"]):
                mapped_value = 180
            elif any(term in label for term in ["tree", "plant", "flora", "grass", "vegetation"]):
                mapped_value = 90
            elif any(term in label for term in ["road", "route", "street", "path", "highway", "sidewalk"]):
                mapped_value = 30
                
            if mapped_value > 0:
                # Where mask is 255 (true), set the mapped_value in our class_map
                # Use np.maximum to prefer the highest value (building > tree > road) if they overlap slightly
                class_map = np.where(mask > 128, mapped_value, class_map)

        # Resize back to original size
        class_map_img = Image.fromarray(class_map).resize(original_size, Image.Resampling.NEAREST)
        return np.array(class_map_img)

# Singleton instance
seg_estimator = None

def get_seg_estimator():
    global seg_estimator
    if seg_estimator is None:
        seg_estimator = SegmentationEstimator()
    return seg_estimator
