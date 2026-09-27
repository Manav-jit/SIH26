import React, { useState, useEffect, useCallback, useRef } from 'react';
import ThreeScene from './components/ThreeScene';
import ErrorBoundary from './components/ErrorBoundary';
import UploadZone from './components/UploadZone';
import MissionBriefing from './components/MissionBriefing';
import ToastContainer, { toast } from './components/Toast';
import {
  Activity, Play, Square, Maximize,
  Building2, TreePine, ArrowUpDown, Layers,
  Camera, RotateCcw, Eye, ShieldAlert,
  Crosshair, Navigation, Database,
  AlertTriangle, CheckCircle2, ChevronRight,
  Radio, Flame, Thermometer, Route, FileText, X
} from 'lucide-react';

const WORLD_SCALE = 1000;
const FIRE_SPREAD_RADIUS = 45;
const FIRE_SPREAD_INTERVAL = 2000;

function App() {
  const [originalFile, setOriginalFile] = useState(null);
  const [rgbUrl, setRgbUrl] = useState(null);
  const [appState, setAppState] = useState('idle');
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Dashboard toggles
  const [isFlythrough, setIsFlythrough] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [activeLayer, setActiveLayer] = useState('3D Buildings');
  const [showWireframe, setShowWireframe] = useState(false);
  const [scale, setScale] = useState(150);

  // ═══ New Feature State ═══
  const [activeTool, setActiveTool] = useState(null);       // null | 'sos' | 'fire'
  const [sosMarkers, setSosMarkers] = useState([]);
  const [fireBuildings, setFireBuildings] = useState(new Set());
  const [fireBurnTimes, setFireBurnTimes] = useState(new Map());
  const [evacuationActive, setEvacuationActive] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);

  const [sceneObjects, setSceneObjects] = useState([]);
  const fireTimerRef = useRef(null);
  const bldgs = useRef([]);

  useEffect(() => {
    bldgs.current = sceneObjects.filter(b => b.type === 'building');
  }, [sceneObjects]);

  // ═══ Fire Spread Logic ═══
  useEffect(() => {
    if (fireBuildings.size === 0) {
      if (fireTimerRef.current) clearInterval(fireTimerRef.current);
      return;
    }

    fireTimerRef.current = setInterval(() => {
      setFireBuildings(prev => {
        const next = new Set(prev);
        const buildings = bldgs.current;

        prev.forEach(idx => {
          const burning = buildings[idx];
          if (!burning) return;
          const bx = burning.cx * WORLD_SCALE;
          const bz = -burning.cy * WORLD_SCALE;

          buildings.forEach((candidate, ci) => {
            if (next.has(ci)) return;
            const cx = candidate.cx * WORLD_SCALE;
            const cz = -candidate.cy * WORLD_SCALE;
            const dist = Math.sqrt((cx - bx) ** 2 + (cz - bz) ** 2);
            if (dist < FIRE_SPREAD_RADIUS) {
              next.add(ci);
            }
          });
        });

        // Update burn times
        setFireBurnTimes(prevTimes => {
          const nextTimes = new Map(prevTimes);
          next.forEach(idx => {
            nextTimes.set(idx, (nextTimes.get(idx) || 0) + 0.15);
          });
          return nextTimes;
        });

        return next;
      });
    }, FIRE_SPREAD_INTERVAL);

    return () => { if (fireTimerRef.current) clearInterval(fireTimerRef.current); };
  }, [fireBuildings.size]);

  // ═══ Scene Click Handler ═══
  const handleSceneClick = useCallback((position) => {
    if (activeTool === 'sos') {
      setSosMarkers(prev => [...prev, { x: position.x, z: position.z, id: prev.length }]);
      toast.success(`SOS Beacon #${sosMarkers.length + 1} placed`);
    } else if (activeTool === 'fire') {
      // Find nearest building to click point
      const buildings = bldgs.current;
      let nearestIdx = -1;
      let nearestDist = Infinity;

      buildings.forEach((b, i) => {
        const bx = b.cx * WORLD_SCALE;
        const bz = -b.cy * WORLD_SCALE;
        const dist = Math.sqrt((bx - position.x) ** 2 + (bz - position.z) ** 2);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      });

      if (nearestIdx >= 0 && nearestDist < 50) {
        setFireBuildings(prev => {
          const next = new Set(prev);
          next.add(nearestIdx);
          return next;
        });
        setFireBurnTimes(prev => {
          const next = new Map(prev);
          next.set(nearestIdx, 0);
          return next;
        });
        toast.success('🔥 Fire ignited! Watch it spread...');
      }
    }
  }, [activeTool, sosMarkers.length]);

  // ═══ Tool Toggle ═══
  const toggleTool = (tool) => {
    if (activeTool === tool) {
      setActiveTool(null);
    } else {
      setActiveTool(tool);
      setIsFlythrough(false); // Need orbit control to click
      if (tool === 'sos') toast.success('Click on the map to place SOS beacons');
      if (tool === 'fire') toast.success('Click near a building to ignite it');
    }
  };

  // ═══ Clear All ═══
  const clearAll = () => {
    setSosMarkers([]);
    setFireBuildings(new Set());
    setFireBurnTimes(new Map());
    setEvacuationActive(false);
    setActiveTool(null);
    toast.success('All markers and simulations cleared');
  };

  // ═══ Upload Handler ═══
  const handleUpload = async (file) => {
    setOriginalFile(file);
    setRgbUrl(URL.createObjectURL(file));
    setAppState('loading');
    setLoadingStep('Ingesting High-Res Satellite Imagery...');
    setLoadingProgress(15);

    try {
      const formData = new FormData();
      formData.append('image', file);

      setLoadingStep('Running Segmentation & Depth Models (This takes a moment)...');
      setLoadingProgress(45);

      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('API Error');

      setLoadingStep('Extracting Vector Meshes (LoD1)...');
      setLoadingProgress(75);

      const data = await response.json();
      setSceneObjects(data.lod1_objects || []);

      setLoadingStep('Initializing 3D Dashboard...');
      setLoadingProgress(100);

      setTimeout(() => {
        setAppState('ready');
        toast.success('System Online. 3D Environment Ready.');
      }, 500);

    } catch (err) {
      console.error(err);
      toast.error('Failed to process image. Make sure the backend is running.');
      setAppState('idle');
    }
  };

  const handleReset = () => {
    setOriginalFile(null);
    setRgbUrl(null);
    setSceneObjects([]);
    setAppState('idle');
    setLoadingProgress(0);
    clearAll();
    setShowHeatmap(false);
    setShowBriefing(false);
  };

  // ═══════════════ IDLE SCREEN ═══════════════
  if (appState === 'idle') {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center relative scanlines">
        <div className="absolute inset-0 bg-blue-50/30 -z-10" />
        <div className="glass-panel p-8 w-full max-w-lg flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Database className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Aether</h1>
              <p className="text-sm text-slate-500 font-medium">From vision to elevation</p>
            </div>
          </div>
          <div className="w-full">
            <UploadZone
              label="Upload RGB Satellite Imagery"
              description="Drop a high-res image to generate 3D environment"
              required
              file={originalFile}
              onFileSelect={handleUpload}
            />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════ LOADING SCREEN ═══════════════
  if (appState === 'loading') {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center relative scanlines">
        <div className="absolute inset-0 bg-blue-50/30 -z-10" />
        <div className="glass-panel p-10 w-full max-w-xl flex flex-col items-center gap-8">
          <Activity className="text-blue-500 w-12 h-12 animate-pulse" />
          <div className="text-center w-full">
            <h2 className="text-lg font-bold text-slate-700 mb-2 font-mono uppercase tracking-widest">System Initializing</h2>
            <p className="text-sm text-slate-500 h-6 font-mono">{loadingStep}</p>
          </div>
          <div className="w-full cinematic-progress-bar">
            <div className="cinematic-progress-fill" style={{ width: `${loadingProgress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════ READY — 3D VIEW ═══════════════
  return (
    <div className="w-screen h-screen relative overflow-hidden">
      <ToastContainer />

      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary>
          <ThreeScene
            rgbUrl={rgbUrl}
            sceneObjects={sceneObjects}
            isFlythrough={isFlythrough}
            showGrid={showGrid}
            activeLayer={activeLayer}
            showWireframe={showWireframe}
            displacementScale={scale}
            sosMarkers={sosMarkers}
            fireBuildings={fireBuildings}
            fireBurnTimes={fireBurnTimes}
            evacuationActive={evacuationActive}
            showHeatmap={showHeatmap}
            activeTool={activeTool}
            onSceneClick={handleSceneClick}
          />
        </ErrorBoundary>
      </div>

      {/* ─── TOP BAR ─── */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
        {/* Top Left */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-md px-4 py-2 flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
              <Database className="text-white w-3 h-3" />
            </div>
            <span className="font-semibold text-slate-800 text-sm tracking-tight">Aether</span>
          </div>
          <div className="h-4 w-px bg-slate-300" />
          <div className="data-badge bg-blue-50 text-blue-600 border-blue-200">SIH 2026</div>
          <div className="data-badge flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE</div>
        </div>

        {/* Top Right Tools */}
        <div className="flex gap-2 pointer-events-auto">
          <button onClick={() => setIsFlythrough(!isFlythrough)} className={`glass-button px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${isFlythrough ? 'active' : ''}`}>
            {isFlythrough ? <Square size={14} /> : <Play size={14} />}
            {isFlythrough ? 'STOP FLYTHROUGH' : 'CINEMATIC MODE'}
          </button>
        </div>
      </div>

      {/* ─── LEFT TOOLBAR ─── */}
      <div className="absolute top-20 left-4 z-10 flex flex-col gap-2 pointer-events-auto">
        {/* SOS */}
        <ToolButton
          icon={<Radio size={18} />}
          label="SOS"
          active={activeTool === 'sos'}
          onClick={() => toggleTool('sos')}
          color="red"
        />
        {/* Fire */}
        <ToolButton
          icon={<Flame size={18} />}
          label="Fire"
          active={activeTool === 'fire'}
          onClick={() => toggleTool('fire')}
          color="orange"
        />
        {/* Heatmap */}
        <ToolButton
          icon={<Thermometer size={18} />}
          label="Risk"
          active={showHeatmap}
          onClick={() => setShowHeatmap(!showHeatmap)}
          color="amber"
        />
        {/* Evacuate */}
        <ToolButton
          icon={<Route size={18} />}
          label="Evac"
          active={evacuationActive}
          onClick={() => {
            if (sosMarkers.length === 0) {
              toast.error('Place SOS markers first to create evacuation paths');
              return;
            }
            setEvacuationActive(!evacuationActive);
            if (!evacuationActive) toast.success('Evacuation simulation started');
          }}
          color="green"
          disabled={sosMarkers.length === 0 && !evacuationActive}
        />
        {/* Briefing */}
        <ToolButton
          icon={<FileText size={18} />}
          label="Brief"
          active={showBriefing}
          onClick={() => setShowBriefing(!showBriefing)}
          color="blue"
        />

        {/* Divider */}
        <div className="h-px bg-slate-300 my-1" />

        {/* Clear */}
        <ToolButton
          icon={<X size={18} />}
          label="Clear"
          active={false}
          onClick={clearAll}
          color="slate"
        />
      </div>

      {/* ─── Active Tool Indicator ─── */}
      {activeTool && (
        <div className="absolute top-20 left-20 z-10 pointer-events-none">
          <div className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg ${
            activeTool === 'sos'
              ? 'bg-red-500 text-white shadow-red-500/30'
              : 'bg-orange-500 text-white shadow-orange-500/30'
          }`}>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {activeTool === 'sos' ? 'CLICK TO PLACE SOS BEACON' : 'CLICK NEAR BUILDING TO IGNITE'}
          </div>
        </div>
      )}

      {/* ─── MISSION BRIEFING ─── */}
      {showBriefing && (
        <MissionBriefing
          sceneObjects={sceneObjects}
          sosMarkers={sosMarkers}
          fireBuildings={fireBuildings}
          evacuationActive={evacuationActive}
          onClose={() => setShowBriefing(false)}
        />
      )}

      {/* ─── RIGHT SIDEBAR ─── */}
      <div className="absolute top-20 right-4 z-10 w-72 flex flex-col gap-3 pointer-events-auto">
        {/* Stats Panel */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-md p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Database size={16} className="text-slate-500" /> Extraction Results
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-sm text-slate-600">Total Buildings</span>
              <span className="text-lg font-semibold text-slate-900">
                {bldgs.current.length}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-rose-500">▲</span> Highest Point
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Marked</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-emerald-500">▼</span> Lowest Point
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Marked</span>
            </div>

            {/* Live fire/SOS stats */}
            {(fireBuildings.size > 0 || sosMarkers.length > 0) && (
              <>
                <div className="h-px bg-slate-200" />
                {sosMarkers.length > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <Radio size={14} /> SOS Active
                    </div>
                    <span className="text-sm font-bold text-red-600 animate-pulse">{sosMarkers.length}</span>
                  </div>
                )}
                {fireBuildings.size > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <Flame size={14} /> On Fire
                    </div>
                    <span className="text-sm font-bold text-orange-600">{fireBuildings.size}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Image Preview */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-md p-3">
          <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Camera size={16} className="text-slate-500" /> Input RGB Image
          </h2>
          <div className="w-full h-40 rounded bg-slate-100 overflow-hidden border border-slate-200">
            <img src={rgbUrl} alt="Map Preview" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* ─── RESET BUTTON ─── */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-auto">
        <button onClick={handleReset} className="bg-white border border-slate-200 shadow-sm w-10 h-10 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors">
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Tool Button Component
   ═══════════════════════════════════════════ */
function ToolButton({ icon, label, active, onClick, color = 'slate', disabled = false }) {
  const colorMap = {
    red: { bg: 'bg-red-500', shadow: 'shadow-red-500/30', border: 'border-red-400' },
    orange: { bg: 'bg-orange-500', shadow: 'shadow-orange-500/30', border: 'border-orange-400' },
    amber: { bg: 'bg-amber-500', shadow: 'shadow-amber-500/30', border: 'border-amber-400' },
    green: { bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/30', border: 'border-emerald-400' },
    blue: { bg: 'bg-blue-500', shadow: 'shadow-blue-500/30', border: 'border-blue-400' },
    slate: { bg: 'bg-slate-500', shadow: 'shadow-slate-500/30', border: 'border-slate-400' },
  };

  const c = colorMap[color] || colorMap.slate;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${active
          ? `${c.bg} text-white shadow-lg ${c.shadow} border ${c.border}`
          : 'bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 hover:shadow-md'
        }
      `}
      title={label}
    >
      {icon}
      {/* Tooltip */}
      <span className="absolute left-14 bg-slate-800 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

export default App;
