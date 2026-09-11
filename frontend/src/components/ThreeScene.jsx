import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
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

const useWindowTexture = () => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#11151c'; // Dark facade
        ctx.fillRect(0, 0, 256, 256);
        
        for(let x=8; x<256; x+=20) {
            for(let y=8; y<256; y+=28) {
                if(Math.random() > 0.4) {
                    ctx.fillStyle = '#fdfbd3'; // Warm white for lit windows
                    ctx.shadowColor = '#fdfbd3';
                    ctx.shadowBlur = 3;
                } else {
                    ctx.fillStyle = '#0a0d14'; // Unlit window
                    ctx.shadowBlur = 0;
                }
                ctx.fillRect(x, y, 10, 18);
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.02, 0.04);
        return texture;
    }, []);
};

const TerrainLoD1 = ({ originalImage, lod1Objects, displacementScale }) => {
    const [colorTexture, setColorTexture] = useState(null);

    useEffect(() => {
        if (!originalImage) return;
        const loader = new THREE.TextureLoader();
        loader.load(originalImage, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            setColorTexture(texture);
        });
    }, [originalImage]);

    const windowTexture = useWindowTexture();

    // Create shapes for buildings
    const buildingMeshes = useMemo(() => {
        if (!lod1Objects) return [];
        return lod1Objects.filter(obj => obj.type === 'building').map((obj, i) => {
            if (obj.points.length < 3) return null;
            const shape = new THREE.Shape();
            obj.points.forEach((p, index) => {
                const x = p[0] * 1000;
                const y = p[1] * 1000;
                if (index === 0) shape.moveTo(x, y);
                else shape.lineTo(x, y);
            });
            const height = (obj.height / 255.0) * displacementScale;
            
            let geom;
            try {
                geom = new THREE.ExtrudeGeometry(shape, { depth: Math.max(height, 5), bevelEnabled: false });
            } catch (e) {
                console.warn("Skipping degenerate polygon", e);
                return null;
            }
            
            return (
                <group key={`b-${i}`} rotation={[-Math.PI / 2, 0, 0]}>
                    <mesh geometry={geom}>
                        {/* Roof Material */}
                        <meshStandardMaterial attach="material-0" color="#0a0a0f" roughness={0.9} metalness={0.1} />
                        {/* Wall/Window Material */}
                        <meshStandardMaterial attach="material-1" color="#1a1f2b" roughness={0.6} metalness={0.2} map={windowTexture} emissiveMap={windowTexture} emissive="#fffae6" emissiveIntensity={0.6} />
                    </mesh>
                    <mesh geometry={geom}>
                        <meshBasicMaterial color="#ffffff" wireframe={true} transparent opacity={0.1} />
                    </mesh>
                </group>
            );
        });
    }, [lod1Objects, displacementScale, windowTexture]);

    // Create static models for trees
    const treeMeshes = useMemo(() => {
        if (!lod1Objects) return [];
        return lod1Objects.filter(obj => obj.type === 'tree').map((obj, i) => {
            let cx = 0, cy = 0;
            obj.points.forEach(p => { cx += p[0]; cy += p[1]; });
            cx = (cx / obj.points.length) * 1000;
            cy = (cy / obj.points.length) * 1000;
            
            const height = Math.max((obj.height / 255.0) * displacementScale, 10);
            return (
                <group key={`t-${i}`} position={[cx, height/2, -cy]}>
                     <mesh position={[0, -height/4, 0]}>
                         <cylinderGeometry args={[height*0.1, height*0.1, height/2, 8]} />
                         <meshStandardMaterial color="#3d2817" />
                     </mesh>
                     <mesh position={[0, height/4, 0]}>
                         <coneGeometry args={[height*0.4, height/2, 8]} />
                         <meshStandardMaterial color="#2d6a4f" />
                     </mesh>
                </group>
            );
        });
    }, [lod1Objects, displacementScale]);

    return (
        <group>
            {/* Simple solid ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
                <planeGeometry args={[1000, 1000]} />
                <meshStandardMaterial color="#111118" roughness={0.9} metalness={0.2} />
            </mesh>
            
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

export default function ThreeScene({ originalImage, rawDepth, lod1Objects, displacementScale, isFlythrough }) {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 500, 500], fov: 60, far: 10000 }} gl={{ powerPreference: "high-performance", antialias: false }}>
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[1000, 1000, 1000]} intensity={1.0} />
        <EffectComposer>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={0.6} mipmapBlur />
        </EffectComposer>
        
        {lod1Objects ? (
            <TerrainLoD1 
                originalImage={originalImage} 
                lod1Objects={lod1Objects} 
                displacementScale={displacementScale} 
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
