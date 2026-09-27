# Option 3: Implicit Grass Background (Backup Plan)

If the geometric subtraction (Shapely) method proves too slow, complex, or creates rendering artifacts with complex polygons, we will fall back to this implicit grass method.

## Steps to Implement:

1. **Remove Grass Vectorization (Backend):**
   - In `backend/vectorizer.py`, completely remove the extraction of the `"grass"` class (class 150). We will no longer send grass polygons to the frontend.

2. **Update Ground Plane Color (Frontend):**
   - In `frontend/src/components/ThreeScene.jsx`, locate the ground plane mesh:
     ```jsx
     <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
         <planeGeometry args={[1200, 1200]} />
         <meshStandardMaterial color={showHeatmap ? '#1e293b' : '#4ade80'} roughness={0.92} metalness={0.02} />
     </mesh>
     ```
   - Change the default color to a grass-like green (`#4ade80`).

3. **Render Roads Above Ground:**
   - Ensure `roadMeshes` are positioned slightly above the ground plane (e.g., `y = 0.1`) so they are clearly visible on top of the green background.

**Why this works as a backup:** Vegetation and unpaved earth cover the vast majority of the non-built environment. By making the ground itself green, we achieve the visual effect of grass everywhere without processing tens of thousands of vector vertices. Roads and buildings simply sit on top of this green canvas.
