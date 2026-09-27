## Task 1: Map and Extract Grass in Backend

**Description:** Update `CLASS_MAP` in `vectorizer.py` to recognize class 150 as `"grass"`. Implement logic to extract grass contours into `raw_objects` with `height = 0.0` so they lay flat like roads.

**Acceptance criteria:**
- [x] Class 150 maps to `"grass"`.
- [x] `"grass"` objects are processed and assigned a height of `0.0`.

**Verification:**
- [x] Verify `vectorizer.py` code correctly handles `"grass"`.

**Dependencies:** None

**Files likely touched:**
- `backend/vectorizer.py`

**Estimated scope:** Small: 1 file

---

## Task 2: Fix Low-Height Building Misclassifications

**Description:** Refine the logic in `vectorizer.py` that checks for low buildings (which result in the "elevated blue areas"). Instead of leaving them as buildings, properly convert them to flat `"grass"` or `"road"` objects based on height.

**Acceptance criteria:**
- [x] Blue "elevated areas" logic is fixed by enforcing a stricter threshold and converting those objects to `"grass"`.

**Verification:**
- [x] Check `extract_features` logic for `sub_buildings`.

**Dependencies:** Task 1

**Files likely touched:**
- `backend/vectorizer.py`

**Estimated scope:** Small: 1 file

---

## Task 3: Render Grass Objects in Frontend

**Description:** Update `ThreeScene.jsx` to filter `sceneObjects` for `"grass"` and render them as flat `ShapeGeometry` objects colored green, similar to how roads are rendered. Place them slightly above the ground plane to avoid Z-fighting.

**Acceptance criteria:**
- [x] Grass polygons are rendered using a green material.
- [x] Grass polygons lie flat on the ground plane without overlapping depth issues.

**Verification:**
- [x] Run the React frontend and observe the 3D map for flat grass areas.

**Dependencies:** Task 1

**Files likely touched:**
- `frontend/src/components/ThreeScene.jsx`

**Estimated scope:** Small: 1 file
