import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const TerrainDisplaced = ({ originalImage, depthMap, displacementScale }) => {
  const meshRef = useRef();
  const [colorTexture, setColorTexture] = useState(null);
  const [depthTexture, setDepthTexture] = useState(null);

  useEffect(() => {
    if (!originalImage || !depthMap) return;
    const loader = new THREE.TextureLoader();
    loader.load(originalImage, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      setColorTexture(texture);
    });
    loader.load(depthMap, (texture) => {
      setDepthTexture(texture);
    });
  }, [originalImage, depthMap]);

  if (!colorTexture || !depthTexture) return null;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1000, 1000, 256, 256]} />
      <meshStandardMaterial 
        map={colorTexture}
        displacementMap={depthTexture}
        displacementScale={displacementScale}
        wireframe={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Procedural window texture for buildings
const useWindowTexture = () => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#d5dae3';
        ctx.fillRect(0, 0, 256, 256);
        
        ctx.strokeStyle = '#bcc3d0';
        ctx.lineWidth = 1;
        for (let y = 28; y < 256; y += 28) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(256, y);
            ctx.stroke();
        }
        
        for(let x = 8; x < 256; x += 20) {
            for(let y = 8; y < 256; y += 28) {
                if(Math.random() > 0.3) {
                    const warmth = Math.random();
                    if (warmth > 0.6) ctx.fillStyle = '#fff8e1';
                    else if (warmth > 0.3) ctx.fillStyle = '#ffe0b2';
                    else ctx.fillStyle = '#e3f2fd';
                } else {
                    ctx.fillStyle = '#37474f';
                }
                ctx.fillRect(x, y, 10, 18);
                ctx.strokeStyle = '#90a4ae';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, 10, 18);
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.02, 0.04);
        return texture;
    }, []);
};

// Procedural road texture with dashed center lines
const useRoadTexture = () => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Asphalt base
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, 0, 256, 256);
        
        // Asphalt noise
        for (let i = 0; i < 800; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const gray = 60 + Math.random() * 30;
            ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
            ctx.fillRect(x, y, 2, 2);
        }
        
        // White dashed center line
        ctx.fillStyle = '#e0e0e0';
        for (let y = 0; y < 256; y += 32) {
            ctx.fillRect(124, y, 8, 20);
        }
        
        // Edge lines (thinner)
        ctx.fillStyle = '#bdbdbd';
        for (let y = 0; y < 256; y++) {
            ctx.fillRect(12, y, 3, 1);
            ctx.fillRect(241, y, 3, 1);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.05, 0.05);
        return texture;
    }, []);
};

// Helper to create shape from points
const createShape = (points) => {
    if (points.length < 3) return null;
    const shape = new THREE.Shape();
    points.forEach((p, index) => {
        const x = p[0] * 1000;
        const y = p[1] * 1000;
        if (index === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    });
    return shape;
};

const TerrainLoD1 = ({ originalImage, lod1Objects, displacementScale, showGrid }) => {
    const windowTexture = useWindowTexture();
    const roadTexture = useRoadTexture();

    // ── Buildings ──
    const buildingMeshes = useMemo(() => {
        if (!lod1Objects) return [];
        return lod1Objects.filter(obj => obj.type === 'building').map((obj, i) => {
            const shape = createShape(obj.points);
            if (!shape) return null;
            const height = (obj.height / 255.0) * displacementScale;
            
            let geom;
            try {
                geom = new THREE.ExtrudeGeometry(shape, { depth: Math.max(height, 5), bevelEnabled: false });
            } catch (e) {
                return null;
            }
            
            return (
                <group key={`b-${i}`} rotation={[-Math.PI / 2, 0, 0]}>
                    <mesh geometry={geom} castShadow receiveShadow>
                        <meshStandardMaterial attach="material-0" color="#5c6370" roughness={0.95} metalness={0.05} />
                        <meshStandardMaterial attach="material-1" color="#c8cdd6" roughness={0.4} metalness={0.1} map={windowTexture} emissiveMap={windowTexture} emissive="#fff8e1" emissiveIntensity={0.15} />
                    </mesh>
                    <mesh geometry={geom}>
                        <meshBasicMaterial color="#3b5bdb" wireframe={true} transparent opacity={0.04} />
                    </mesh>
                </group>
            );
        });
    }, [lod1Objects, displacementScale, windowTexture]);

    // ── Trees ──
    const treeMeshes = useMemo(() => {
        if (!lod1Objects) return [];
        return lod1Objects.filter(obj => obj.type === 'tree').map((obj, i) => {
            let cx = 0, cy = 0;
            obj.points.forEach(p => { cx += p[0]; cy += p[1]; });
            cx = (cx / obj.points.length) * 1000;
            cy = (cy / obj.points.length) * 1000;
            
            const height = Math.max((obj.height / 255.0) * displacementScale, 8);
            return (
                <group key={`t-${i}`} position={[cx, height/2, -cy]}>
                     <mesh position={[0, -height/4, 0]} castShadow>
                         <cylinderGeometry args={[height*0.06, height*0.08, height/2, 6]} />
                         <meshStandardMaterial color="#5d4037" roughness={0.9} />
                     </mesh>
                     <mesh position={[0, height*0.1, 0]} castShadow>
                         <coneGeometry args={[height*0.4, height*0.45, 8]} />
                         <meshStandardMaterial color="#388e3c" roughness={0.8} />
                     </mesh>
                     <mesh position={[0, height*0.35, 0]} castShadow>
                         <coneGeometry args={[height*0.28, height*0.35, 8]} />
                         <meshStandardMaterial color="#43a047" roughness={0.8} />
                     </mesh>
                </group>
            );
        });
    }, [lod1Objects, displacementScale]);

    return (
        <group>
            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
                <planeGeometry args={[1000, 1000]} />
                <meshStandardMaterial color="#e8ecf0" roughness={0.95} metalness={0.05} />
            </mesh>
            
            {/* Grid overlay */}
            {showGrid && (
                <Grid
                    position={[0, -0.5, 0]}
                    args={[1000, 1000]}
                    cellSize={20}
                    cellThickness={0.3}
                    cellColor="#c5cad4"
                    sectionSize={100}
                    sectionThickness={0.6}
                    sectionColor="#a0a8b8"
                    fadeDistance={800}
                    fadeStrength={1.5}
                    infiniteGrid={false}
                />
            )}
            
            {/* Render order: ground features first, then elevated objects */}
            {buildingMeshes}
            {treeMeshes}
        </group>
    );
};

const FlyCamera = ({ isFlythrough }) => {
    useFrame((state) => {
        if (isFlythrough) {
            const time = state.clock.getElapsedTime();
            const radius = 600;
            state.camera.position.x = Math.sin(time * 0.2) * radius;
            state.camera.position.z = Math.cos(time * 0.2) * radius;
            state.camera.position.y = 300 + Math.sin(time * 0.5) * 100;
            state.camera.lookAt(0, 0, 0);
        }
    });
    return null;
};

export default function ThreeScene({ originalImage, rawDepth, lod1Objects, displacementScale, isFlythrough, showGrid = true }) {
  return (
    <div className="w-full h-full relative">
      <Canvas 
        camera={{ position: [0, 500, 500], fov: 60, far: 10000 }} 
        gl={{ powerPreference: "high-performance", antialias: true }}
        shadows
      >
        <color attach="background" args={['#f0f2f5']} />
        <fog attach="fog" args={['#f0f2f5', 600, 1500]} />
        
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[500, 800, 500]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={2000}
          shadow-camera-left={-500}
          shadow-camera-right={500}
          shadow-camera-top={500}
          shadow-camera-bottom={-500}
        />
        <directionalLight position={[-300, 400, -300]} intensity={0.3} />
        
        <EffectComposer>
            <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.9} intensity={0.2} mipmapBlur />
        </EffectComposer>
        
        {lod1Objects ? (
            <TerrainLoD1 
                originalImage={originalImage} 
                lod1Objects={lod1Objects} 
                displacementScale={displacementScale}
                showGrid={showGrid}
            />
        ) : rawDepth ? (
            <TerrainDisplaced 
                originalImage={originalImage} 
                depthMap={rawDepth} 
                displacementScale={displacementScale} 
            />
        ) : null}

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} enabled={!isFlythrough} />
        <FlyCamera isFlythrough={isFlythrough} />
      </Canvas>
    </div>
  );
}
