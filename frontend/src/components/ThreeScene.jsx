import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Html, Edges, Line } from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */
const WORLD_SCALE = 1000;
const FIRE_SPREAD_RADIUS = 40;       // world units — how far fire jumps
const FIRE_SPREAD_INTERVAL = 2000;   // ms between spreads

/* ═══════════════════════════════════════════
   Fly Camera
   ═══════════════════════════════════════════ */
const FlyCamera = ({ isFlythrough }) => {
    useFrame((state) => {
        if (isFlythrough) {
            const time = state.clock.getElapsedTime();
            const radius = 500;
            state.camera.position.x = Math.sin(time * 0.12) * radius;
            state.camera.position.z = Math.cos(time * 0.12) * radius;
            state.camera.position.y = 250 + Math.sin(time * 0.25) * 80;
            state.camera.lookAt(0, 30, 0);
        }
    });
    return null;
};

/* ═══════════════════════════════════════════
   Click Handler — raycasts to ground plane
   ═══════════════════════════════════════════ */
function ClickHandler({ activeTool, onSceneClick }) {
    const { camera, raycaster, gl } = useThree();
    const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

    const handleClick = useCallback((event) => {
        if (!activeTool) return;

        const rect = gl.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, intersection);

        if (intersection) {
            onSceneClick({ x: intersection.x, y: intersection.y, z: intersection.z });
        }
    }, [activeTool, camera, raycaster, gl, groundPlane, onSceneClick]);

    useEffect(() => {
        const canvas = gl.domElement;
        canvas.addEventListener('click', handleClick);
        return () => canvas.removeEventListener('click', handleClick);
    }, [gl, handleClick]);

    return null;
}

/* ═══════════════════════════════════════════
   SOS Beacon — pulsing animated marker
   ═══════════════════════════════════════════ */
function SOSBeacon({ position, id }) {
    const meshRef = useRef();
    const ringRef = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (meshRef.current) {
            const pulse = 1 + Math.sin(t * 4 + id) * 0.3;
            meshRef.current.scale.setScalar(pulse);
        }
        if (ringRef.current) {
            const ringScale = 1 + ((t * 0.5 + id * 0.3) % 1) * 3;
            ringRef.current.scale.set(ringScale, ringScale, 1);
            ringRef.current.material.opacity = 1 - ((t * 0.5 + id * 0.3) % 1);
        }
    });

    return (
        <group position={position}>
            {/* Vertical beam */}
            <mesh position={[0, 40, 0]}>
                <cylinderGeometry args={[0.5, 0.5, 80, 8]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
            </mesh>

            {/* Core sphere */}
            <mesh ref={meshRef} position={[0, 6, 0]}>
                <sphereGeometry args={[4, 16, 16]} />
                <meshStandardMaterial
                    color="#ef4444"
                    emissive="#ff0000"
                    emissiveIntensity={2}
                    roughness={0.2}
                />
            </mesh>

            {/* Expanding ring */}
            <mesh ref={ringRef} position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[5, 6, 32]} />
                <meshBasicMaterial color="#ef4444" transparent side={THREE.DoubleSide} />
            </mesh>

            {/* Label */}
            <Html position={[0, 85, 0]} center>
                <div style={{
                    background: 'rgba(220, 38, 38, 0.95)',
                    color: 'white',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    fontFamily: "'JetBrains Mono', monospace",
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(248, 113, 113, 0.8)',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
                    letterSpacing: '0.5px',
                }}>
                    🚨 SOS-{String(id + 1).padStart(2, '0')}
                </div>
            </Html>
        </group>
    );
}

/* ═══════════════════════════════════════════
   Evacuation Path — animated flowing dots
   ═══════════════════════════════════════════ */
function EvacuationPath({ from, to }) {
    const ref = useRef();
    const dashOffset = useRef(0);

    // Create a curved path from SOS to exit
    const curve = useMemo(() => {
        const mid = new THREE.Vector3(
            (from[0] + to[0]) / 2 + (Math.random() - 0.5) * 60,
            3,
            (from[2] + to[2]) / 2 + (Math.random() - 0.5) * 60
        );
        return new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(from[0], 3, from[2]),
            mid,
            new THREE.Vector3(to[0], 3, to[2])
        );
    }, [from, to]);

    const points = useMemo(() => curve.getPoints(60), [curve]);

    useFrame((_, delta) => {
        if (ref.current) {
            dashOffset.current -= delta * 15;
            ref.current.material.dashOffset = dashOffset.current;
        }
    });

    return (
        <group>
            {/* Main path line */}
            <Line
                points={points}
                color="#22c55e"
                lineWidth={3}
                dashed
                dashSize={6}
                dashScale={1}
                gapSize={4}
                ref={ref}
            />
            {/* Glow line */}
            <Line
                points={points}
                color="#4ade80"
                lineWidth={1.5}
                transparent
                opacity={0.4}
            />
            {/* Exit marker */}
            <mesh position={[to[0], 8, to[2]]}>
                <coneGeometry args={[5, 10, 4]} />
                <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
            </mesh>
            <Html position={[to[0], 22, to[2]]} center>
                <div style={{
                    background: 'rgba(34, 197, 94, 0.9)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '1px',
                }}>
                    RALLY POINT
                </div>
            </Html>
        </group>
    );
}

/* ═══════════════════════════════════════════
   Animated Evacuee Dots
   ═══════════════════════════════════════════ */
function EvacueeDots({ from, to }) {
    const groupRef = useRef();
    const DOT_COUNT = 5;

    const curve = useMemo(() => {
        const mid = new THREE.Vector3(
            (from[0] + to[0]) / 2 + (Math.random() - 0.5) * 40,
            4,
            (from[2] + to[2]) / 2 + (Math.random() - 0.5) * 40
        );
        return new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(from[0], 4, from[2]),
            mid,
            new THREE.Vector3(to[0], 4, to[2])
        );
    }, [from, to]);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        groupRef.current.children.forEach((dot, i) => {
            const progress = ((t * 0.15 + i / DOT_COUNT) % 1);
            const pos = curve.getPoint(progress);
            dot.position.copy(pos);
        });
    });

    return (
        <group ref={groupRef}>
            {Array.from({ length: DOT_COUNT }).map((_, i) => (
                <mesh key={i}>
                    <sphereGeometry args={[2, 8, 8]} />
                    <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={1.5} />
                </mesh>
            ))}
        </group>
    );
}

/* ═══════════════════════════════════════════
   Building component with fire / heatmap
   Uses extruded polygon footprint from depth segmentation
   ═══════════════════════════════════════════ */
function Building({ obj, index, scaledHeight, baseColor, showWireframe, isBurning, burnIntensity, showHeatmap, maxH }) {
    const meshRef = useRef();

    // Build the extruded geometry from polygon points
    const geometry = useMemo(() => {
        if (!obj.points || obj.points.length < 3) return null;

        const shape = new THREE.Shape();
        obj.points.forEach((p, idx) => {
            const x = p[0] * WORLD_SCALE;
            const y = p[1] * WORLD_SCALE;
            if (idx === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        });

        const extrudeSettings = {
            depth: scaledHeight,
            bevelEnabled: false,
        };

        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        // Rotate from XY-plane to XZ-plane (lay flat, extrude upward)
        geom.rotateX(-Math.PI / 2);
        return geom;
    }, [obj.points, scaledHeight]);

    // Determine color
    let color, emissive, emissiveIntensity;

    if (isBurning) {
        const fireT = Math.min(burnIntensity, 1);
        color = new THREE.Color().lerpColors(
            new THREE.Color('#f97316'),
            new THREE.Color('#991b1b'),
            fireT
        );
        emissive = new THREE.Color('#ff4500');
        emissiveIntensity = 1.5 + Math.sin(Date.now() * 0.005) * 0.5;
    } else if (showHeatmap) {
        const ratio = obj.height / maxH;
        if (ratio > 0.65) {
            color = new THREE.Color().lerpColors(new THREE.Color('#f59e0b'), new THREE.Color('#dc2626'), (ratio - 0.65) / 0.35);
        } else if (ratio > 0.3) {
            color = new THREE.Color().lerpColors(new THREE.Color('#22c55e'), new THREE.Color('#f59e0b'), (ratio - 0.3) / 0.35);
        } else {
            color = new THREE.Color('#22c55e');
        }
        emissive = color.clone().multiplyScalar(0.15);
        emissiveIntensity = 0.3;
    } else {
        color = baseColor;
        emissive = undefined;
        emissiveIntensity = 0;
    }

    // Animate fire flicker
    useFrame(() => {
        if (isBurning && meshRef.current) {
            const flicker = 1 + Math.sin(Date.now() * 0.008 + index) * 0.02;
            meshRef.current.scale.y = flicker;
        }
    });

    if (!geometry) return null;

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            position={[0, 0, 0]}
            castShadow
            receiveShadow
        >
            <meshStandardMaterial
                color={color}
                roughness={isBurning ? 0.7 : 0.55}
                metalness={0.05}
                wireframe={showWireframe}
                transparent={showWireframe}
                opacity={showWireframe ? 0.3 : 1}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
            />
            {!showWireframe && !isBurning && (
                <Edges threshold={15} color="#1e293b" lineWidth={0.5} />
            )}
        </mesh>
    );
}

/* ═══════════════════════════════════════════
   Fire Smoke Particles (simple animated)
   ═══════════════════════════════════════════ */
function FireParticles({ sceneObjects, fireSet, displacementScale }) {
    const groupRef = useRef();
    const bldgs = useMemo(() => sceneObjects.filter(b => b.type === 'building'), [sceneObjects]);
    const maxH = useMemo(() => Math.max(...bldgs.map(b => b.height), 1), [bldgs]);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        groupRef.current.children.forEach((particle, i) => {
            particle.position.y += 0.3;
            particle.material.opacity -= 0.003;
            if (particle.material.opacity <= 0) {
                // Reset particle
                const data = particle.userData;
                particle.position.set(
                    data.baseX + (Math.random() - 0.5) * 10,
                    data.baseY,
                    data.baseZ + (Math.random() - 0.5) * 10
                );
                particle.material.opacity = 0.6;
            }
        });
    });

    const particles = useMemo(() => {
        const result = [];
        fireSet.forEach(idx => {
            const obj = bldgs[idx];
            if (!obj) return;
            const wx = obj.cx * WORLD_SCALE;
            const wz = -obj.cy * WORLD_SCALE;
            const h = Math.max(4, (obj.height / maxH) * displacementScale);
            for (let p = 0; p < 3; p++) {
                result.push({
                    baseX: wx + (Math.random() - 0.5) * 10,
                    baseY: h + 5,
                    baseZ: wz + (Math.random() - 0.5) * 10,
                });
            }
        });
        return result;
    }, [fireSet, bldgs, maxH, displacementScale]);

    return (
        <group ref={groupRef}>
            {particles.map((p, i) => (
                <mesh key={i} position={[p.baseX, p.baseY, p.baseZ]} userData={p}>
                    <sphereGeometry args={[3, 6, 6]} />
                    <meshBasicMaterial color="#555" transparent opacity={0.6} />
                </mesh>
            ))}
        </group>
    );
}

/* ═══════════════════════════════════════════
   Main City Layer
   ═══════════════════════════════════════════ */
const ExtractedCityLayer = ({
    sceneObjects,
    activeLayer, showWireframe, displacementScale,
    sosMarkers, fireBuildings, fireBurnTimes,
    evacuationActive, showHeatmap,
    activeTool, onSceneClick
}) => {
    const bldgs = useMemo(() => sceneObjects.filter(b => b.type === 'building'), [sceneObjects]);
    const maxH = useMemo(() => Math.max(...bldgs.map(b => b.height), 1), [bldgs]);
    const minH = useMemo(() => Math.min(...bldgs.map(b => b.height)), [bldgs]);

    /* ─── Buildings ─── */
    const buildingElements = useMemo(() => {
        let highestBuilding = null;
        let lowestBuilding = null;

        const rendered = bldgs.map((obj, i) => {
            const scaledHeight = Math.max(4, (obj.height / maxH) * displacementScale);
            const wx = obj.cx * WORLD_SCALE;
            const wz = -obj.cy * WORLD_SCALE;

            if (obj.height === maxH && !highestBuilding) {
                highestBuilding = { wx, wz, h: scaledHeight };
            }
            if (obj.height === minH && !lowestBuilding) {
                lowestBuilding = { wx, wz, h: scaledHeight };
            }

            // Base color (when not in heatmap or fire mode)
            let baseColor;
            if (activeLayer === 'Slope Risk') {
                const ratio = obj.height / maxH;
                if (ratio > 0.6) baseColor = new THREE.Color('#ef4444');
                else if (ratio > 0.3) baseColor = new THREE.Color('#f59e0b');
                else baseColor = new THREE.Color('#10b981');
            } else if (activeLayer === 'True Color') {
                const t = obj.height / maxH;
                const gray = 0.45 + t * 0.25;
                baseColor = new THREE.Color(gray, gray, gray * 0.98);
            } else {
                const t = Math.min(1, obj.height / maxH);
                baseColor = new THREE.Color().lerpColors(
                    new THREE.Color('#38bdf8'),
                    new THREE.Color('#fb7185'),
                    t
                );
            }

            const isBurning = fireBuildings.has(i);
            const burnIntensity = fireBurnTimes.get(i) || 0;

            return (
                <Building
                    key={`b-${i}`}
                    obj={obj}
                    index={i}
                    scaledHeight={scaledHeight}
                    baseColor={baseColor}
                    showWireframe={showWireframe}
                    isBurning={isBurning}
                    burnIntensity={burnIntensity}
                    showHeatmap={showHeatmap}
                    maxH={maxH}
                />
            );
        });

        // Height indicators
        if (highestBuilding && !showHeatmap) {
            rendered.push(
                <Html key="highest-indicator" position={[highestBuilding.wx, highestBuilding.h + 20, highestBuilding.wz]} center>
                    <div className="flex flex-col items-center">
                        <div style={{
                            background: 'rgba(239,68,68,0.9)', color: 'white',
                            padding: '4px 12px', borderRadius: '4px',
                            fontSize: '10px', fontWeight: 'bold',
                            fontFamily: 'monospace', whiteSpace: 'nowrap',
                            border: '1px solid rgba(239,68,68,0.6)',
                        }}>▲ HIGHEST POINT</div>
                        <div style={{ width: '2px', height: '24px', background: 'rgba(239,68,68,0.7)' }} />
                    </div>
                </Html>
            );
        }
        if (lowestBuilding && !showHeatmap) {
            rendered.push(
                <Html key="lowest-indicator" position={[lowestBuilding.wx, lowestBuilding.h + 20, lowestBuilding.wz]} center>
                    <div className="flex flex-col items-center">
                        <div style={{
                            background: 'rgba(16,185,129,0.9)', color: 'white',
                            padding: '4px 12px', borderRadius: '4px',
                            fontSize: '10px', fontWeight: 'bold',
                            fontFamily: 'monospace', whiteSpace: 'nowrap',
                            border: '1px solid rgba(16,185,129,0.6)',
                        }}>▼ LOWEST POINT</div>
                        <div style={{ width: '2px', height: '24px', background: 'rgba(16,185,129,0.7)' }} />
                    </div>
                </Html>
            );
        }

        return rendered;
    }, [bldgs, maxH, minH, activeLayer, showWireframe, displacementScale, fireBuildings, fireBurnTimes, showHeatmap]);

    /* ─── Trees ─── */
    const treeMeshes = useMemo(() => {
        const trees = sceneObjects.filter(b => b.type === 'tree');
        return trees.map((obj, i) => {
            const wx = obj.cx * WORLD_SCALE;
            const wz = -obj.cy * WORLD_SCALE;
            const height = Math.max((obj.height / 255.0) * displacementScale, 8);
            return (
                <group key={`t-${i}`} position={[wx, height / 2, wz]}>
                    <mesh position={[0, -height / 4, 0]} castShadow>
                        <cylinderGeometry args={[height * 0.06, height * 0.08, height / 2, 6]} />
                        <meshStandardMaterial color="#6b4423" roughness={0.9} />
                    </mesh>
                    <mesh position={[0, height * 0.1, 0]} castShadow>
                        <coneGeometry args={[height * 0.35, height * 0.45, 8]} />
                        <meshStandardMaterial color="#22c55e" roughness={0.8} />
                    </mesh>
                </group>
            );
        });
    }, [displacementScale]);

    /* ─── Roads ─── */
    const roadMeshes = useMemo(() => {
        const roads = sceneObjects.filter(b => b.type === 'road');
        return roads.map((obj, i) => {
            if (!obj.points || obj.points.length < 3) return null;
            const shape = new THREE.Shape();
            obj.points.forEach((p, idx) => {
                const x = p[0] * WORLD_SCALE;
                const y = p[1] * WORLD_SCALE;
                if (idx === 0) shape.moveTo(x, y);
                else shape.lineTo(x, y);
            });
            const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: false });
            return (
                <mesh key={`r-${i}`} geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]} receiveShadow castShadow>
                    <meshStandardMaterial color="#94a3b8" roughness={0.95} metalness={0} />
                </mesh>
            );
        });
    }, [sceneObjects]);




    /* ─── Evacuation paths (from SOS markers to nearest map edge) ─── */
    const evacuationPaths = useMemo(() => {
        if (!evacuationActive || sosMarkers.length === 0) return [];

        return sosMarkers.map((marker, i) => {
            // Find nearest edge for the rally point
            const edges = [
                [500, 3, marker.z],     // +X edge
                [-500, 3, marker.z],    // -X edge
                [marker.x, 3, 500],     // +Z edge
                [marker.x, 3, -500],    // -Z edge
            ];
            let nearest = edges[0];
            let minDist = Infinity;
            edges.forEach(e => {
                const d = Math.sqrt((e[0] - marker.x) ** 2 + (e[2] - marker.z) ** 2);
                if (d < minDist) { minDist = d; nearest = e; }
            });

            return { from: [marker.x, 3, marker.z], to: nearest, id: i };
        });
    }, [evacuationActive, sosMarkers]);

    return (
        <group>
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                <planeGeometry args={[1200, 1200]} />
                <meshStandardMaterial color={showHeatmap ? '#1e293b' : '#4ade80'} roughness={0.92} metalness={0.02} />
            </mesh>

            {roadMeshes}
            {buildingElements}
            {treeMeshes}

            {/* SOS Markers */}
            {sosMarkers.map((m, i) => (
                <SOSBeacon key={`sos-${i}`} position={[m.x, 0, m.z]} id={i} />
            ))}

            {/* Fire particles */}
            {fireBuildings.size > 0 && (
                <FireParticles sceneObjects={sceneObjects} fireSet={fireBuildings} displacementScale={displacementScale} />
            )}

            {/* Evacuation paths */}
            {evacuationPaths.map((path, i) => (
                <React.Fragment key={`evac-${i}`}>
                    <EvacuationPath from={path.from} to={path.to} />
                    <EvacueeDots from={path.from} to={path.to} />
                </React.Fragment>
            ))}

            {/* Click handler */}
            <ClickHandler activeTool={activeTool} onSceneClick={onSceneClick} />
        </group>
    );
};

/* ═══════════════════════════════════════════
   Exported Scene
   ═══════════════════════════════════════════ */
export default function ThreeScene({
    rgbUrl, sceneObjects = [],
    isFlythrough, showGrid, activeLayer, showWireframe, displacementScale = 30,
    sosMarkers = [], fireBuildings = new Set(), fireBurnTimes = new Map(),
    evacuationActive = false, showHeatmap = false,
    activeTool = null, onSceneClick = () => {}
}) {
    return (
        <div className="w-full h-full relative">
            <Canvas
                camera={{ position: [0, 350, 500], fov: 45, far: 5000 }}
                gl={{ powerPreference: "high-performance", antialias: true }}
                shadows
            >
                <color attach="background" args={[showHeatmap ? '#0f172a' : '#e8ecf1']} />

                <ambientLight intensity={showHeatmap ? 0.3 : 0.6} />
                <directionalLight
                    position={[350, 550, 250]}
                    intensity={1.6}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-camera-far={2000}
                    shadow-camera-left={-600}
                    shadow-camera-right={600}
                    shadow-camera-top={600}
                    shadow-camera-bottom={-600}
                    shadow-bias={-0.0005}
                />
                <directionalLight position={[-300, 400, -300]} intensity={0.35} color="#93c5fd" />
                <hemisphereLight args={['#87ceeb', '#d4c4a8', 0.3]} />

                <ExtractedCityLayer
                    sceneObjects={sceneObjects}
                    activeLayer={activeLayer}
                    showWireframe={showWireframe}
                    displacementScale={displacementScale}
                    sosMarkers={sosMarkers}
                    fireBuildings={fireBuildings}
                    fireBurnTimes={fireBurnTimes}
                    evacuationActive={evacuationActive}
                    showHeatmap={showHeatmap}
                    activeTool={activeTool}
                    onSceneClick={onSceneClick}
                />

                {showGrid && (
                    <Grid
                        position={[0, -0.6, 0]}
                        args={[1200, 1200]}
                        cellSize={20}
                        cellThickness={0.4}
                        cellColor={showHeatmap ? '#334155' : '#94a3b8'}
                        sectionSize={100}
                        sectionThickness={0.8}
                        sectionColor={showHeatmap ? '#475569' : '#64748b'}
                        fadeDistance={800}
                        fadeStrength={1.5}
                        infiniteGrid={true}
                    />
                )}

                <OrbitControls
                    makeDefault
                    maxPolarAngle={Math.PI / 2 - 0.05}
                    enabled={!isFlythrough}
                    dampingFactor={0.05}
                />
                <FlyCamera isFlythrough={isFlythrough} />
            </Canvas>
        </div>
    );
}
