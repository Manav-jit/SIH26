import cv2
import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union

# GAMUS dataset class mapping (values in the CLS image after *30 scaling)
CLASS_MAP = {
    0:   "background",   # ~0.0% of image
    30:  "road",         # road, ~11%
    60:  "background",   # water, ~10%, disabled
    90:  "tree",         # ~24%, median height 5-6m
    120: "background",   # ~0.4%, rare
    150: "background",   # vegetation, ~23%
    180: "building",     # ~32%, median height 9-19m
}

HEIGHT_BIN_SIZE = 15  # Quantize 0-255 heights into bins of this size

# Epsilon factor for polygon simplification per type
# Lower = more vertices = more accurate shape
_EPSILON_FACTOR = {
    "building": 0.015,   # tight approximation for buildings
    "road":     0.008,   # very tight for roads
    "grass":    0.012,   # tight for grass paths
    "tree":     0.04,    # trees stay rough — rendered as cones anyway
}

def _contour_to_object(cnt, obj_type, cls, class_img_arr, height_img_arr):
    """Convert a single contour into an object dict with polygon points, height, and centroid."""
    area = cv2.contourArea(cnt)
    if area < 10:
        return None

    eps_factor = _EPSILON_FACTOR.get(obj_type, 0.04)
    epsilon = eps_factor * cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, epsilon, True)

    if len(approx) < 3:
        return None

    h, w = class_img_arr.shape[:2]
    points = []
    for p in approx:
        x = p[0][0] / w - 0.5
        y = -(p[0][1] / h - 0.5)   # flip Y so +Y = up
        points.append([float(x), float(y)])

    # Height sampling
    cnt_mask = np.zeros_like(height_img_arr, dtype=np.uint8)
    cv2.drawContours(cnt_mask, [cnt], -1, 255, -1)

    heights_inside = height_img_arr[cnt_mask == 255]
    if len(heights_inside) == 0:
        return None

    median_height = float(np.median(heights_inside))

    # Centroid (normalised the same way as points)
    M = cv2.moments(cnt)
    if M['m00'] != 0:
        cx_px = M['m10'] / M['m00']
        cy_px = M['m01'] / M['m00']
    else:
        cx_px, cy_px = float(approx[0][0][0]), float(approx[0][0][1])

    cx_norm = cx_px / w - 0.5
    cy_norm = -(cy_px / h - 0.5)

    return {
        "type": obj_type,
        "points": points,
        "cx": float(cx_norm),
        "cy": float(cy_norm),
        "height": median_height,
        "contour": cnt,           # kept temporarily for overlap filtering
        "centroid": (int(cx_px), int(cy_px)),
    }


def _split_building_by_height(cnt, cls, class_img_arr, height_img_arr):
    """
    Split a single building contour into sub-buildings based on height variation.
    Uses height-bin quantization + connected components to separate regions
    of different heights within the same contour.
    """
    # Create mask for this contour
    cnt_mask = np.zeros_like(height_img_arr, dtype=np.uint8)
    cv2.drawContours(cnt_mask, [cnt], -1, 255, -1)
    
    # Get height values inside contour
    heights_inside = height_img_arr[cnt_mask == 255]
    if len(heights_inside) == 0:
        return []
    
    # Check if splitting is needed: if height range is small, keep as one object
    h_min, h_max = heights_inside.min(), heights_inside.max()
    if (h_max - h_min) < HEIGHT_BIN_SIZE:
        obj = _contour_to_object(cnt, "building", cls, class_img_arr, height_img_arr)
        return [obj] if obj else []
    
    # Quantize heights into bins
    masked_heights = np.where(cnt_mask == 255, height_img_arr, 0).astype(np.float32)
    quantized = (masked_heights / HEIGHT_BIN_SIZE).astype(np.int32)
    
    sub_objects = []
    unique_bins = np.unique(quantized[cnt_mask == 255])
    
    for bin_val in unique_bins:
        # Create mask for this height bin within the contour
        bin_mask = ((quantized == bin_val) & (cnt_mask == 255)).astype(np.uint8) * 255
        
        # Apply morphological opening to clean up noise
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        bin_mask = cv2.morphologyEx(bin_mask, cv2.MORPH_OPEN, kernel)
        
        # Find connected components in this height bin
        num_labels, labels = cv2.connectedComponents(bin_mask)
        
        for label_id in range(1, num_labels):  # skip background (0)
            component_mask = (labels == label_id).astype(np.uint8) * 255
            
            # Find contours of this component
            sub_contours, _ = cv2.findContours(component_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for sub_cnt in sub_contours:
                obj = _contour_to_object(sub_cnt, "building", cls, class_img_arr, height_img_arr)
                if obj:
                    sub_objects.append(obj)
    
    return sub_objects if sub_objects else []


def extract_features(class_img_arr, height_img_arr):
    if class_img_arr.shape != height_img_arr.shape:
        class_img_arr = cv2.resize(class_img_arr, (height_img_arr.shape[1], height_img_arr.shape[0]), interpolation=cv2.INTER_NEAREST)

    unique_classes = np.unique(class_img_arr)
    raw_objects = []
    
    global_median_depth = np.median(height_img_arr)
    
    for cls in unique_classes:
        obj_type = CLASS_MAP.get(int(cls), "background")
        
        if obj_type == "background":
            continue
            
        mask = (class_img_arr == cls).astype(np.uint8) * 255

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 10:
                continue
            
            if obj_type == "building":
                # Split buildings by height variation
                sub_buildings = _split_building_by_height(cnt, cls, class_img_arr, height_img_arr)
                for b in sub_buildings:
                    # If building is very low, it's likely a misclassified road or grass
                    # Enforce a stricter absolute threshold rather than just a relative one
                    if b["height"] <= global_median_depth + 15:
                        b["type"] = "grass"
                        b["height"] = 0.0
                raw_objects.extend(sub_buildings)
            elif obj_type in ("road", "grass"):
                # Road and Grass polygons — no height needed
                obj = _contour_to_object(cnt, obj_type, cls, class_img_arr, height_img_arr)
                if obj:
                    obj["height"] = 0.0   # ground level
                    raw_objects.append(obj)
            else:
                # Non-building objects (trees etc.)
                obj = _contour_to_object(cnt, obj_type, cls, class_img_arr, height_img_arr)
                if obj:
                    if obj["height"] <= global_median_depth + 15:
                        obj["type"] = "grass"
                        obj["height"] = 0.0
                    raw_objects.append(obj)
                
    # Filter overlapping objects (remove trees inside buildings)
    buildings = [obj for obj in raw_objects if obj['type'] == 'building']
    trees = [obj for obj in raw_objects if obj['type'] == 'tree']
    roads = [obj for obj in raw_objects if obj['type'] == 'road']
    grass = [obj for obj in raw_objects if obj['type'] == 'grass']
    other = [obj for obj in raw_objects if obj['type'] not in ('building', 'tree', 'road', 'grass')]
    
    filtered_trees = []
    for tree in trees:
        is_inside_building = False
        for bldg in buildings:
            if cv2.pointPolygonTest(bldg['contour'], tree['centroid'], False) >= 0:
                is_inside_building = True
                break
        if not is_inside_building:
            filtered_trees.append(tree)

    objects = buildings + filtered_trees + roads + other
    for obj in objects:
        obj.pop('contour', None)
        obj.pop('centroid', None)
        
    return objects
