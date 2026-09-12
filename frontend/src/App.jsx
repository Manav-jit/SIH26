import React, { useState, useMemo } from 'react';
import ThreeScene from './components/ThreeScene';
import ErrorBoundary from './components/ErrorBoundary';
import UploadZone from './components/UploadZone';
import ToastContainer, { toast } from './components/Toast';
import { 
  Map, Activity, Play, Square, Maximize, 
  Building2, TreePine, ArrowUpDown, Layers,
  Camera, RotateCcw, Eye
} from 'lucide-react';

function App() {
  const [originalFile, setOriginalFile] = useState(null);
  const [classMapFile, setClassMapFile] = useState(null);
  const [groundTruthFile, setGroundTruthFile] = useState(null);

  const [rawDepth, setRawDepth] = useState(null);
  const [lod1Objects, setLod1Objects] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [scale, setScale] = useState(100);
  const [isFlythrough, setIsFlythrough] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Compute statistics from lod1Objects
  const stats = useMemo(() => {
    if (!lod1Objects) return null;
    const buildings = lod1Objects.filter(o => o.type === 'building');
    const trees = lod1Objects.filter(o => o.type === 'tree');
    const heights = buildings.map(b => b.height);
    const maxH = heights.length > 0 ? Math.max(...heights) : 0;
    const avgH = heights.length > 0 ? heights.reduce((a, b) => a + b, 0) / heights.length : 0;
    return {
      buildingCount: buildings.length,
      treeCount: trees.length,
      maxHeight: maxH.toFixed(1),
      avgHeight: avgH.toFixed(1),
      totalObjects: lod1Objects.length
    };
  }, [lod1Objects]);

  // Step tracking
  const currentStep = useMemo(() => {
    if (lod1Objects || rawDepth) return 3;
    if (originalFile && classMapFile) return 2;
    if (originalFile) return 1;
    return 0;
  }, [originalFile, classMapFile, lod1Objects, rawDepth]);

  const generateDepth = async () => {
    if (!originalFile) return;
    
    setLoading(true);
    setLoadingStep('Uploading images...');
    const formData = new FormData();
    formData.append('image', originalFile);
    if (classMapFile) {
        formData.append('class_map', classMapFile);
    }
    if (groundTruthFile) {
        formData.append('ground_truth', groundTruthFile);
    }

    try {
      setLoadingStep('Running AI depth estimation...');
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to generate depth map');
      
      setLoadingStep('Parsing 3D geometry...');
      const data = await response.json();
      setRawDepth(data.raw_depth);
      
      if (data.lod1_objects) {
          setLoadingStep('Building 3D city...');
          setLod1Objects(data.lod1_objects);
          toast.success(`City generated! ${data.lod1_objects.length} objects detected.`);
      } else {
          setLod1Objects(null);
          toast.info('Depth map generated (no class map for LoD1).');
      }
      
    } catch (err) {
      console.error(err);
      toast.error('Error generating 3D data. Ensure backend is running.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleReset = () => {
    setOriginalFile(null);
    setClassMapFile(null);
    setGroundTruthFile(null);
    setRawDepth(null);
    setLod1Objects(null);
    setIsFlythrough(false);
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <ToastContainer />

      {/* Sidebar */}
      <div style={{
        width: '320px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 2px 8px rgba(59, 91, 219, 0.3)'
          }}>
            <Map size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>DepthWizard</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>3D City Reconstruction</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Step Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '0' }}>
            <div className={`step-dot ${currentStep >= 1 ? (currentStep > 1 ? 'complete' : 'active') : ''}`}>1</div>
            <div className={`step-line ${currentStep >= 2 ? 'complete' : ''}`} />
            <div className={`step-dot ${currentStep >= 2 ? (currentStep > 2 ? 'complete' : 'active') : ''}`}>2</div>
            <div className={`step-line ${currentStep >= 3 ? 'complete' : ''}`} />
            <div className={`step-dot ${currentStep >= 3 ? 'complete' : ''}`}>3</div>
          </div>

          {/* Step labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            <span>Upload</span>
            <span>Configure</span>
            <span>Generate</span>
          </div>

          {/* Upload Section */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Input Data
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <UploadZone
                label="Source Image"
                description="RGB satellite / aerial image"
                required
                file={originalFile}
                onFileSelect={setOriginalFile}
              />
              <UploadZone
                label="Class Map"
                description="Semantic segmentation map"
                required
                file={classMapFile}
                onFileSelect={setClassMapFile}
              />
              <UploadZone
                label="Height Map"
                description="Ground truth AGL (optional)"
                file={groundTruthFile}
                onFileSelect={setGroundTruthFile}
              />
            </div>
          </div>

          {/* Generate Button */}
          {originalFile && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={generateDepth}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <><Activity size={16} style={{ animation: 'spin 1s linear infinite' }} /> {loadingStep}</>
                ) : (
                  'Generate LoD1 City'
                )}
              </button>

              {/* Progress bar */}
              {loading && (
                <div className="progress-bar" style={{ marginTop: '8px' }}>
                  <div className="progress-fill" style={{
                    width: loadingStep.includes('Upload') ? '25%' :
                           loadingStep.includes('AI') ? '50%' :
                           loadingStep.includes('Parsing') ? '75%' :
                           loadingStep.includes('Building') ? '95%' : '10%'
                  }} />
                </div>
              )}
            </div>
          )}

          {/* Controls (visible after generation) */}
          {rawDepth && (
            <>
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Controls
                </h3>

                {/* Height Scale */}
                <div className="stat-card" style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Height Scale</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>{scale}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'ew-resize' }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => setIsFlythrough(!isFlythrough)}
                    className={`btn-secondary ${isFlythrough ? 'active' : ''}`}
                  >
                    {isFlythrough ? <><Square size={14} /> Stop Flythrough</> : <><Play size={14} /> Cinematic Flythrough</>}
                  </button>
                  <button onClick={handleReset} className="btn-secondary">
                    <RotateCcw size={14} /> Reset All
                  </button>
                </div>
              </div>

              {/* Statistics Dashboard */}
              {stats && (
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                    Detection Results
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="stat-card animate-count">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Building2 size={14} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Buildings</span>
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stats.buildingCount}
                      </div>
                    </div>
                    <div className="stat-card animate-count" style={{ animationDelay: '0.1s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <TreePine size={14} style={{ color: 'var(--success)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Trees</span>
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stats.treeCount}
                      </div>
                    </div>
                    <div className="stat-card animate-count" style={{ animationDelay: '0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <ArrowUpDown size={14} style={{ color: '#e67700' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Max Height</span>
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stats.maxHeight}<span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 400 }}>m</span>
                      </div>
                    </div>
                    <div className="stat-card animate-count" style={{ animationDelay: '0.25s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Layers size={14} style={{ color: '#ae3ec9' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Avg Height</span>
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stats.avgHeight}<span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 400 }}>m</span>
                      </div>
                    </div>
                  </div>
                  <div className="stat-card animate-count" style={{ marginTop: '8px', animationDelay: '0.4s' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>Total Objects Detected</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>
                      {stats.totalObjects}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-light)',
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          textAlign: 'center'
        }}>
          SIH 2026 • DepthWizard v1.0
        </div>
      </div>

      {/* Main Viewport */}
      <div style={{ flex: 1, position: 'relative', background: 'var(--bg-primary)' }}>
        {rawDepth ? (
          <div style={{ position: 'absolute', inset: 0 }}>
            <ErrorBoundary>
              <ThreeScene 
                  originalImage={originalFile ? URL.createObjectURL(originalFile) : null} 
                  rawDepth={!lod1Objects ? rawDepth : null} 
                  lod1Objects={lod1Objects}
                  displacementScale={scale} 
                  isFlythrough={isFlythrough}
                  showGrid={showGrid}
              />
            </ErrorBoundary>

            {/* HUD overlay */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
              zIndex: 10
            }}>
               <Maximize size={14} style={{ color: 'var(--text-tertiary)' }} />
               <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Left Click: Orbit • Right Click: Pan • Scroll: Zoom</span>
            </div>
            
            {/* Mode badge */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              padding: '6px 14px',
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 10
            }}>
               <Eye size={14} style={{ color: 'var(--accent)' }} />
               <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                   {lod1Objects ? 'LoD1 Vector Mode' : 'Displacement Mode'}
               </span>
            </div>

            {/* Height color legend */}
            {lod1Objects && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-light)',
                borderRadius: '10px',
                padding: '10px 14px',
                boxShadow: 'var(--shadow-sm)',
                zIndex: 10,
                minWidth: '180px'
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  Building Height
                </div>
                <div style={{
                  height: '10px',
                  borderRadius: '5px',
                  background: 'linear-gradient(to right, #7ea8c4, #9db8c8, #c5c8c6, #d4b896, #c99a6b, #bf7845)',
                  marginBottom: '4px'
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '12px',
            color: 'var(--text-tertiary)'
          }}>
             <Layers size={64} style={{ color: 'var(--border)' }} />
             <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-secondary)' }}>Upload source image and class map to begin.</p>
             <p style={{ fontSize: '13px' }}>Supported formats: PNG, JPG, TIFF</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
