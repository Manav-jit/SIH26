import cv2
import json
import sys
import os
import numpy as np

sys.path.append(os.path.abspath('backend'))
import vectorizer

SHRINK = 0.92  # Shrink building footprints slightly towards centroid to reveal road gaps


def _shrink_polygon(points, cx, cy, factor):
    """Shrink polygon points toward the centroid by a factor."""
    return [
        [cx + (px - cx) * factor, cy + (py - cy) * factor]
        for px, py in points
    ]


def main():
    cls_img = cv2.imread('DC_07_29_CLS.png', cv2.IMREAD_GRAYSCALE)
    agl_img = cv2.imread('DC_07_29_AGL.png', cv2.IMREAD_GRAYSCALE)
    
    if cls_img is None or agl_img is None:
        print("Could not load images")
        return
    
    # Extract all features (buildings, trees, roads) via updated vectorizer
    objects = vectorizer.extract_features(cls_img, agl_img)
    
    result = []
    for obj in objects:
        if obj['type'] == 'building':
            pts = obj['points']
            cx = obj['cx']
            cy = obj['cy']
            
            # Shrink building polygon towards centroid to create road gaps
            shrunk_pts = _shrink_polygon(pts, cx, cy, SHRINK)
            
            result.append({
                "type": "building",
                "points": shrunk_pts,
                "cx": cx,
                "cy": cy,
                "height": float(obj['height']),
            })
            
        elif obj['type'] == 'tree':
            result.append({
                "type": "tree",
                "cx": obj['cx'],
                "cy": obj['cy'],
                "height": float(obj['height']),
            })
            
        elif obj['type'] == 'road':
            result.append({
                "type": "road",
                "points": obj['points'],
            })
    
    # Save to frontend
    out_path = os.path.join('frontend', 'src', 'data', 'buildings.json')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    
    with open(out_path, 'w') as f:
        json.dump(result, f)
        
    buildings = [o for o in result if o['type'] == 'building']
    trees = [o for o in result if o['type'] == 'tree']
    roads = [o for o in result if o['type'] == 'road']
    print(f"Saved {len(result)} objects:")
    print(f"  {len(buildings)} buildings (polygon footprints)")
    print(f"  {len(trees)} trees")
    print(f"  {len(roads)} roads")
    print(f"  -> {out_path}")

if __name__ == "__main__":
    main()
