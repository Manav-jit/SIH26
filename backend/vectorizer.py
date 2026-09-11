import cv2
import numpy as np

# GAMUS dataset class mapping (values in the CLS image after *30 scaling)
CLASS_MAP = {
    0:   "background",   # ~0.0% of image
    30:  "background",   # road, ~11%, disabled
    60:  "background",   # water, ~10%, disabled
    90:  "tree",         # ~24%, median height 5-6m
    120: "background",   # ~0.4%, rare
    150: "background",   # vegetation, ~23%, disabled
    180: "building",     # ~32%, median height 9-19m
}

def extract_features(class_img_arr, height_img_arr):
    if class_img_arr.shape != height_img_arr.shape:
        class_img_arr = cv2.resize(class_img_arr, (height_img_arr.shape[1], height_img_arr.shape[0]), interpolation=cv2.INTER_NEAREST)

    unique_classes = np.unique(class_img_arr)
    raw_objects = []
    
    for cls in unique_classes:
        obj_type = CLASS_MAP.get(int(cls), "background")
        
        if obj_type == "background":
            continue
            
        mask = (class_img_arr == cls).astype(np.uint8) * 255

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 50:
                continue
                
            points = []
            epsilon = 0.01 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            for p in approx:
                x = p[0][0] / class_img_arr.shape[1] - 0.5
                y = p[0][1] / class_img_arr.shape[0] - 0.5
                points.append([float(x), float(-y)])
                
            cnt_mask = np.zeros_like(height_img_arr, dtype=np.uint8)
            cv2.drawContours(cnt_mask, [cnt], -1, 255, -1)
            
            heights_inside = height_img_arr[cnt_mask == 255]
            if len(heights_inside) > 0:
                median_height = np.median(heights_inside)
                    
                # calculate centroid for overlap testing
                M = cv2.moments(cnt)
                if M['m00'] != 0:
                    cx = int(M['m10']/M['m00'])
                    cy = int(M['m01']/M['m00'])
                else:
                    cx, cy = approx[0][0][0], approx[0][0][1]
                    
                raw_objects.append({
                    "type": obj_type,
                    "points": points,
                    "height": float(median_height),
                    "class": int(cls),
                    "contour": cnt,
                    "centroid": (cx, cy)
                })
                
    # Filter overlapping objects (remove trees inside buildings)
    buildings = [obj for obj in raw_objects if obj['type'] == 'building']
    trees = [obj for obj in raw_objects if obj['type'] == 'tree']
    other = [obj for obj in raw_objects if obj['type'] not in ('building', 'tree')]
    
    filtered_trees = []
    for tree in trees:
        is_inside_building = False
        for bldg in buildings:
            if cv2.pointPolygonTest(bldg['contour'], tree['centroid'], False) >= 0:
                is_inside_building = True
                break
        if not is_inside_building:
            filtered_trees.append(tree)
            
    objects = buildings + filtered_trees + other
    for obj in objects:
        del obj['contour']
        del obj['centroid']
        
    return objects
