# Implementation Plan: Fix Elevated Blue Areas & Add Grasspaths

## Overview
The current 3D city scene renders some ground-level flat areas (like grass/vegetation or pavement) as "elevated blue areas" because they are misclassified as low-height buildings. Additionally, actual vegetation (class 150) is being ignored entirely. This plan aims to re-classify and extract grass paths/vegetation properly as flat surfaces and render them distinctly in the frontend.

## Architecture Decisions
- **Backend Classification Update**: We will update `CLASS_MAP` in `vectorizer.py` to change class `150` from `"background"` to `"grass"`.
- **Backend Geometry Extraction**: `"grass"` objects will be extracted with a height of `0.0`, similarly to roads, so they do not protrude upwards like buildings.
- **Backend Misclassification Filter**: We will improve the filter for buildings to reassign "very low buildings" (the blue elevated areas) to a flat surface like `"grass"` or `"road"` rather than just checking if it is below `global_median_depth * 1.1`.
- **Frontend Rendering**: In `ThreeScene.jsx`, we will parse the `"grass"` objects and render them as a flat `ShapeGeometry` on the ground, painted in a suitable green color, similar to how roads are rendered.

## Task List

### Phase 1: Foundation (Backend)
- [x] Task 1: Update `vectorizer.py` to map class `150` to `"grass"` and extract grass objects at height `0.0`.
- [x] Task 2: Enhance the misclassified building filter in `vectorizer.py` to convert low-height "blue" buildings into flat objects to eliminate the visual clutter.

### Checkpoint: Foundation
- [x] Backend extracts `lod1_objects` with type `"grass"`.
- [x] Low-height misclassified buildings are no longer classified as `"building"`.

### Phase 2: Core Features (Frontend)
- [x] Task 3: Update `ThreeScene.jsx` to render `"grass"` objects using `ShapeGeometry` placed slightly above the ground plane.

### Checkpoint: Complete
- [x] Grass paths render correctly as flat green polygons.
- [x] The "elevated blue areas" issue is resolved in the 3D scene.
- [x] Ready for review.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-filtering buildings | Medium | Ensure the threshold for reclassifying buildings as ground level is tuned carefully (e.g., checking against a sensible height threshold). |
| Z-fighting with ground plane | Low | Raise the `grass` polygons slightly above the ground plane (`y=0.1` or `y=0.2`) to prevent clipping. |
