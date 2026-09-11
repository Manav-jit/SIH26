import React, { useState } from 'react';
import ThreeScene from './components/ThreeScene';
import ErrorBoundary from './components/ErrorBoundary';
import { UploadCloud, Layers, Activity, Maximize, Play, Square, Map } from 'lucide-react';

function App() {
  const [originalFile, setOriginalFile] = useState(null);
  const [classMapFile, setClassMapFile] = useState(null);
  const [groundTruthFile, setGroundTruthFile] = useState(null);

  const [rawDepth, setRawDepth] = useState(null);
  const [lod1Objects, setLod1Objects] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(100);
  const [isFlythrough, setIsFlythrough] = useState(false);

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (type === 'image') {
      setOriginalFile(file);
      setRawDepth(null);
      setLod1Objects(null);
    } else if (type === 'class') {
      setClassMapFile(file);
    } else if (type === 'groundTruth') {
      setGroundTruthFile(file);
    }
  };

  const generateDepth = async () => {
    if (!originalFile) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('image', originalFile);
    if (classMapFile) {
        formData.append('class_map', classMapFile);
    }
    if (groundTruthFile) {
        formData.append('ground_truth', groundTruthFile);
    }

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to generate depth map');
      
      const data = await response.json();
      setRawDepth(data.raw_depth);
      
      if (data.lod1_objects) {
          setLod1Objects(data.lod1_objects);
      } else {
          setLod1Objects(null);
      }
      
    } catch (err) {
      console.error(err);
      alert('Error generating 3D data. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 flex overflow-hidden text-zinc-100 font-sans">
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <Map className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            DepthWizard
          </h1>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Source Image (Required)</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-900/30 file:text-blue-400 hover:file:bg-blue-900/50" />
          </div>
          <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Class Map (Required for LoD1)</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'class')} className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700" />
          </div>
          <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">True Heightmap (Optional)</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'groundTruth')} className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700" />
          </div>
        </div>

        {originalFile && (
          <button 
            onClick={generateDepth}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 mb-6"
          >
            {loading ? (
              <><Activity className="w-5 h-5 animate-spin" /> Vectorizing...</>
            ) : (
              'Generate LoD1 City'
            )}
          </button>
        )}

        {rawDepth && (
          <div className="flex flex-col gap-6">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <label className="flex items-center justify-between text-sm font-medium text-zinc-400 mb-4">
                <span>Height Scale</span>
                <span className="text-blue-400 font-mono">{scale}</span>
              </label>
              <input 
                type="range" 
                min="10" 
                max="500" 
                value={scale} 
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-ew-resize"
              />
            </div>

            <button 
                onClick={() => setIsFlythrough(!isFlythrough)}
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${isFlythrough ? 'bg-red-900/40 text-red-400 border border-red-500/50 hover:bg-red-900/60' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            >
                {isFlythrough ? <><Square className="w-4 h-4"/> Stop Flythrough</> : <><Play className="w-4 h-4"/> Cinematic Flythrough</>}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 relative bg-zinc-950">
        {rawDepth ? (
          <div className="absolute inset-0">
            <ErrorBoundary>
              <ThreeScene 
                  originalImage={originalFile ? URL.createObjectURL(originalFile) : null} 
                  rawDepth={!lod1Objects ? rawDepth : null} 
                  lod1Objects={lod1Objects}
                  displacementScale={scale} 
                  isFlythrough={isFlythrough}
              />
            </ErrorBoundary>
            <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-xl z-10">
               <Maximize className="w-4 h-4 text-zinc-400" />
               <span className="text-sm text-zinc-300">Left Click: Orbit • Right Click: Pan • Scroll: Zoom</span>
            </div>
            
            <div className="absolute bottom-6 right-6 px-4 py-2 bg-zinc-900 border-2 border-zinc-800 rounded-xl shadow-2xl flex items-center gap-2">
               <span className="text-xs font-mono text-zinc-400 uppercase">
                   {lod1Objects ? 'LoD1 Vector Mode Active' : 'Displacement Mode Active'}
               </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 flex-col gap-4">
             <Layers className="w-24 h-24 text-zinc-800" />
             <p className="text-xl font-medium">Upload source image and class map to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
