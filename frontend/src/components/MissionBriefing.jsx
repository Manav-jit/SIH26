import React from 'react';
import { ShieldAlert, Building2, Flame, Users, MapPin, Radio, AlertTriangle, CheckCircle2, X } from 'lucide-react';
export default function MissionBriefing({ sceneObjects = [], sosMarkers, fireBuildings, evacuationActive, onClose }) {
    const buildings = sceneObjects.filter(b => b.type === 'building');
    const trees = sceneObjects.filter(b => b.type === 'tree');
    
    const heights = buildings.map(b => b.height);
    const maxH = Math.max(...heights, 1);
    const avgH = (heights.reduce((a, b) => a + b, 0) / heights.length).toFixed(1);
    const p70 = heights.sort((a, b) => a - b)[Math.floor(heights.length * 0.7)];
    const highRisk = buildings.filter(b => b.height >= p70).length;
    const lowRise = buildings.filter(b => b.height < p70 * 0.5).length;
    
    const estimatedPop = buildings.length * 8;
    const fireCount = fireBuildings ? fireBuildings.size : 0;
    const sosCount = sosMarkers ? sosMarkers.length : 0;

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

    return (
        <div className="absolute top-20 left-20 z-20 w-80 pointer-events-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={16} className="text-amber-400" />
                        <span className="text-xs font-bold tracking-widest uppercase">Mission Briefing</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>

                {/* Timestamp */}
                <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                    <span className="text-[10px] text-slate-500 tracking-wider">{dateStr}</span>
                    <span className="text-[10px] text-slate-500 tracking-wider">{timestamp} IST</span>
                </div>

                <div className="p-4 space-y-4 text-xs">
                    {/* Sector Overview */}
                    <section>
                        <h3 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-2">
                            Sector Overview
                        </h3>
                        <div className="space-y-1.5">
                            <Row icon={<Building2 size={12} />} label="Structures Detected" value={buildings.length} />
                            <Row icon={<AlertTriangle size={12} className="text-red-500" />} label="High-Risk (>70th pctl)" value={highRisk} valueClass="text-red-600 font-bold" />
                            <Row label="Low-Rise Structures" value={lowRise} />
                            <Row label="Tallest Structure" value={`${maxH.toFixed(0)}m`} />
                            <Row label="Avg. Height" value={`${avgH}m`} />
                            <Row label="Vegetation Zones" value={trees.length} />
                        </div>
                    </section>

                    <hr className="border-slate-200" />

                    {/* Population Estimate */}
                    <section>
                        <h3 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-2">
                            Population Estimate
                        </h3>
                        <div className="space-y-1.5">
                            <Row icon={<Users size={12} />} label="Est. Residents" value={`~${estimatedPop.toLocaleString()}`} />
                            <Row label="Density" value="Moderate-High" />
                        </div>
                    </section>

                    <hr className="border-slate-200" />

                    {/* Active Situation */}
                    <section>
                        <h3 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-2">
                            Active Situation
                        </h3>
                        <div className="space-y-1.5">
                            <Row 
                                icon={<Radio size={12} className={sosCount > 0 ? "text-red-500" : "text-slate-400"} />}
                                label="SOS Beacons" 
                                value={sosCount}
                                valueClass={sosCount > 0 ? "text-red-600 font-bold animate-pulse" : ""}
                            />
                            <Row 
                                icon={<Flame size={12} className={fireCount > 0 ? "text-orange-500" : "text-slate-400"} />}
                                label="Structures on Fire" 
                                value={fireCount}
                                valueClass={fireCount > 0 ? "text-orange-600 font-bold" : ""}
                            />
                            <Row 
                                icon={<MapPin size={12} className={evacuationActive ? "text-green-500" : "text-slate-400"} />}
                                label="Evacuation" 
                                value={evacuationActive ? "ACTIVE" : "STANDBY"}
                                valueClass={evacuationActive ? "text-green-600 font-bold" : "text-slate-500"}
                            />
                        </div>
                    </section>

                    {/* Threat Assessment */}
                    {(fireCount > 0 || sosCount > 0) && (
                        <>
                            <hr className="border-slate-200" />
                            <section>
                                <h3 className="text-[10px] font-bold text-red-400 tracking-[0.2em] uppercase mb-2">
                                    ⚠ Threat Assessment
                                </h3>
                                <div className="bg-red-50 border border-red-200 rounded p-2 text-[11px] text-red-800 leading-relaxed">
                                    {fireCount > 0 && (
                                        <p>🔥 Active fire affecting {fireCount} structure{fireCount > 1 ? 's' : ''}. 
                                        Est. {(fireCount * 8)} personnel at risk. 
                                        Recommend immediate deployment of fire suppression units.</p>
                                    )}
                                    {sosCount > 0 && (
                                        <p className="mt-1">🚨 {sosCount} SOS beacon{sosCount > 1 ? 's' : ''} active. 
                                        Dispatch search & rescue teams to marked coordinates.</p>
                                    )}
                                </div>
                            </section>
                        </>
                    )}

                    {/* Status */}
                    <div className="flex items-center gap-2 pt-1">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <span className="text-[10px] text-green-600 font-medium tracking-wider">SYSTEM OPERATIONAL</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Row({ icon, label, value, valueClass = '' }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-600">
                {icon}
                <span>{label}</span>
            </div>
            <span className={`text-slate-800 font-semibold ${valueClass}`}>{value}</span>
        </div>
    );
}
