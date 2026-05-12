import React, { useEffect, useState } from 'react';
import { useGame } from './game/useGame';
import { PLANETS } from './game/constants';
import { Rocket, Gauge, MapPin, Droplet, AlertTriangle, HelpCircle, Eye, Video, MonitorPlay, Users, Package } from 'lucide-react';

export default function App() {
  const { canvasRef, hudData, resetGame, repairShip, refuelShip, recruitAlly, customizeShip, sellResources, setFormation, cameraMode, setCameraMode } = useGame();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showHelp, setShowHelp] = useState(true);
  const [shopTab, setShopTab] = useState<'services' | 'garage'>('services');

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-screen h-screen bg-[#050608] text-[#e0e2e5] font-sans flex flex-col overflow-hidden select-none">
      {/* Game Canvas Container */}
      <div className="flex-1 relative bg-[#030405] overflow-hidden">
        {/* Grid Overlay from theme */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff08 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        {/* CRT Scanlines and Vignette */}
        <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.15]" 
             style={{
               background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
               backgroundSize: '100% 4px, 6px 100%',
               boxShadow: 'inset 0 0 100px rgba(0,0,0,0.9)'
             }}>
        </div>
        
        <canvas 
          ref={canvasRef} 
          width={dimensions.width} 
          height={dimensions.height}
          className="absolute inset-0 z-0"
        />

        {/* HUD Overlay layer */}
        <div className="absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between">
          
          {/* Top HUD Bar */}
          <div className="flex justify-between items-start">
            
            {/* Systems Panel */}
            <div className="bg-[#0a0c0fcc] border border-[#ffffff1a] rounded backdrop-blur-md p-6 shadow-2xl pointer-events-auto" style={{ width: '320px' }}>
              <div className="flex items-center space-x-4 border-b border-[#ffffff1a] pb-4 mb-4">
                <div className="w-8 h-8 rounded border border-cyan-500 flex items-center justify-center text-cyan-500 font-bold text-xs shadow-[0_0_8px_rgba(6,182,212,0.4)]">OF</div>
                <div>
                  <h1 className="text-[10px] font-bold tracking-widest text-white uppercase">Orbital Command</h1>
                  <p className="text-[9px] text-cyan-400 opacity-70 tracking-tight">FLIGHT SYSTEMS ACTIVE</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Speed */}
                <div>
                  <p className="flex items-center text-[9px] uppercase tracking-tighter opacity-50 mb-1">
                    <Gauge size={12} className="mr-2" />
                    Relative Velocity
                  </p>
                  <p className="text-xl font-mono text-cyan-400 tracking-tighter">
                    {hudData.speed.toFixed(1)} <span className="text-[10px] opacity-70">m/s</span>
                  </p>
                </div>

                {/* Altitude */}
                <div>
                  <p className="flex items-center text-[9px] uppercase tracking-tighter opacity-50 mb-1">
                    <MapPin size={12} className="mr-2" />
                    Relative Altitude
                  </p>
                  <p className="text-xl font-mono text-white tracking-tighter">
                    {hudData.altitude.toFixed(0)} <span className="text-[10px] opacity-70">m</span>
                  </p>
                  <div className="text-[9px] text-cyan-400 mt-1 uppercase tracking-widest">
                    REF: <span className="font-bold">{hudData.nearPlanet}</span>
                  </div>
                </div>

                {/* Health */}
                <div>
                  <div className="flex justify-between text-[10px] mb-2 uppercase tracking-tighter font-semibold">
                    <span className="flex items-center"><AlertTriangle size={12} className="mr-2" /> Hull Integrity</span>
                    <span className={`${hudData.health < 40 ? 'text-red-400' : 'text-green-400'}`}>
                      {hudData.health.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${hudData.health < 40 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(46,204,113,0.5)]'}`} 
                      style={{ width: `${Math.min(100, Math.max(0, hudData.health))}%` }}
                    />
                  </div>
                </div>

                {/* Fuel */}
                <div>
                  <div className="flex justify-between text-[10px] mb-2 uppercase tracking-tighter font-semibold">
                    <span className="flex items-center"><Droplet size={12} className="mr-2" /> Reaction Fuel</span>
                    <span className={`${hudData.fuel < 200 ? 'text-red-400' : 'text-cyan-400'}`}>
                      {((hudData.fuel / 3500) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${hudData.fuel < 200 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'}`} 
                      style={{ width: `${Math.min(100, (hudData.fuel / 3500) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Navigation / Jump */}
                <div className="pt-4 border-t border-[#ffffff1a] space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="flex w-1/2 items-center text-[9px] uppercase tracking-tighter opacity-50">
                      Target Locked
                    </p>
                    <p className="w-1/2 text-right text-sm font-mono text-cyan-400 tracking-tighter">
                      {hudData.targetPlanet}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                     <p className="flex w-1/2 items-center text-[9px] uppercase tracking-tighter opacity-50">
                       Warp Drive
                     </p>
                     {hudData.warpCooldown > 0 ? (
                        <p className="w-1/2 text-right text-sm font-mono text-red-400 tracking-tighter">{hudData.warpCooldown.toFixed(1)}s COOLDOWN</p>
                     ) : hudData.isWarpJumping ? (
                        <p className="w-1/2 text-right text-sm font-mono text-purple-400 tracking-tighter animate-pulse">WARPING</p>
                     ) : (
                        <p className="w-1/2 text-right text-sm font-mono text-green-400 tracking-tighter">READY</p>
                     )}
                  </div>
                </div>

                {/* Cargo Hold */}
                <div className="pt-4 border-t border-[#ffffff1a]">
                  <p className="flex items-center text-[9px] uppercase tracking-tighter opacity-50 mb-3">
                    <Package size={12} className="mr-2" />
                    Cargo Hold
                  </p>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                    {Object.entries(hudData.cargo).length > 0 ? (
                      Object.entries(hudData.cargo).map(([res, amount]) => (
                        <div key={res} className="flex justify-between items-center text-[10px] font-mono">
                          <span className="uppercase text-[#8e9299]">{res}</span>
                          <span className="text-cyan-400">{(amount as number).toFixed(1)} <span className="opacity-50 text-[8px]">u</span></span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[9px] opacity-30 italic text-center py-2 uppercase tracking-widest">Hold Empty</p>
                    )}
                  </div>
                </div>

                {/* Faction Standings */}
                <div className="pt-4 border-t border-[#ffffff1a]">
                  <p className="flex items-center text-[9px] uppercase tracking-tighter opacity-50 mb-3">
                    <Users size={12} className="mr-2" />
                    Faction Standings
                  </p>
                  <div className="space-y-3">
                    {Object.entries(hudData.reputations)
                      .filter(([f]) => !['independent', 'creature'].includes(f))
                      .map(([faction, value]) => {
                        const repValue = value as number;
                        const status = repValue <= -20 ? 'HOSTILE' : (repValue >= 40 ? 'ALLY' : 'NEUTRAL');
                        const colorClass = status === 'HOSTILE' ? 'text-red-400' : (status === 'ALLY' ? 'text-green-400' : 'text-cyan-400');
                        
                        return (
                          <div key={faction} className="space-y-1">
                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                               <span className="text-[#8e9299]">{faction}</span>
                               <span className={colorClass}>{status} ({repValue})</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                               <div 
                                 className={`h-full transition-all duration-500 ${status === 'HOSTILE' ? 'bg-red-500' : (status === 'ALLY' ? 'bg-green-500' : 'bg-cyan-500')}`}
                                 style={{ width: `${Math.min(100, Math.max(0, (repValue + 100) / 2))}%` }}
                               />
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </div>
                
                {/* Fleet Formation */}
                <div className="pt-4 border-t border-[#ffffff1a]">
                  <p className="flex items-center text-[9px] uppercase tracking-tighter opacity-50 mb-3">
                    <Users size={12} className="mr-2" />
                    Fleet Formation
                  </p>
                  <div className="grid grid-cols-3 gap-1 bg-[#030405] border border-[#ffffff1a] rounded p-1">
                    <button 
                      onClick={() => setFormation('wedge')}
                      className={`py-1.5 text-[9px] uppercase font-bold tracking-wider rounded transition-colors ${hudData.formation === 'wedge' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-[#8e9299] hover:bg-[#ffffff0a] border border-transparent'}`}
                    >
                      Wedge
                    </button>
                    <button 
                      onClick={() => setFormation('line')}
                      className={`py-1.5 text-[9px] uppercase font-bold tracking-wider rounded transition-colors ${hudData.formation === 'line' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-[#8e9299] hover:bg-[#ffffff0a] border border-transparent'}`}
                    >
                      Line
                    </button>
                    <button 
                      onClick={() => setFormation('echelon')}
                      className={`py-1.5 text-[9px] uppercase font-bold tracking-wider rounded transition-colors ${hudData.formation === 'echelon' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-[#8e9299] hover:bg-[#ffffff0a] border border-transparent'}`}
                    >
                      Echelon
                    </button>
                  </div>
                </div>

                {/* Camera Mode */}
                <div className="pt-4 border-t border-[#ffffff1a]">
                  <p className="text-[9px] uppercase tracking-tighter opacity-50 mb-3 text-center">Visual Mode</p>
                  <div className="flex bg-[#030405] border border-[#ffffff1a] rounded p-1 flex-wrap">
                    <button 
                      onClick={() => setCameraMode('world')}
                      className={`flex-1 min-w-[45%] flex items-center justify-center p-2 text-[9px] uppercase font-bold tracking-wider rounded transition-colors ${cameraMode === 'world' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-[#8e9299] hover:bg-[#ffffff0a] border border-transparent'}`}
                    >
                      <Eye className="mr-1" size={10} /> World
                    </button>
                    <button 
                      onClick={() => setCameraMode('chase')}
                      className={`flex-1 min-w-[45%] flex items-center justify-center p-2 text-[9px] uppercase font-bold tracking-wider rounded transition-colors ${cameraMode === 'chase' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-[#8e9299] hover:bg-[#ffffff0a] border border-transparent'}`}
                    >
                      <Video className="mr-1" size={10} /> Chase
                    </button>
                    <button 
                      onClick={() => setCameraMode('cockpit')}
                      className={`flex-1 min-w-[45%] flex items-center justify-center p-2 text-[9px] uppercase font-bold tracking-wider rounded transition-colors ${cameraMode === 'cockpit' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-[#8e9299] hover:bg-[#ffffff0a] border border-transparent'}`}
                    >
                      <MonitorPlay className="mr-1" size={10} /> Cockpit
                    </button>
                    <button 
                      onClick={() => setCameraMode('behind')}
                      className={`flex-1 min-w-[45%] flex items-center justify-center p-2 text-[9px] uppercase font-bold tracking-wider rounded transition-colors ${cameraMode === 'behind' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-[#8e9299] hover:bg-[#ffffff0a] border border-transparent'}`}
                    >
                      <Video className="mr-1" size={10} /> Behind
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Side Widgets */}
            <div className="flex flex-col items-end space-y-4">
              {/* System Status Widget */}
              <div className="bg-[#0a0c0fcc] border border-[#ffffff1a] rounded backdrop-blur-md p-4 shadow-2xl pointer-events-auto flex items-center space-x-6">
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-[#e0e2e5] opacity-50 tracking-widest uppercase mb-1">Flight State</span>
                  <div className="flex items-center justify-end gap-2">
                    {hudData.state === 'flying' && <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>}
                    {hudData.state === 'landed' && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>}
                    {(hudData.state === 'crashed' || hudData.state === 'destroyed') && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>}
                    <span className={`text-xs uppercase tracking-widest font-bold ${
                      hudData.state === 'flying' ? 'text-cyan-400' :
                      hudData.state === 'landed' ? 'text-green-400' :
                      'text-red-500'
                    }`}>
                      {hudData.state}
                    </span>
                  </div>
                </div>
                
                <div className="h-10 w-[1px] bg-[#ffffff1a]"></div>
                
                {(hudData.state === 'crashed' || hudData.state === 'destroyed') && (
                  <button 
                    onClick={resetGame}
                    className="px-6 py-2 bg-red-600/20 border border-red-500/50 text-red-500 hover:bg-red-600/40 text-[10px] font-bold uppercase tracking-[0.1em] rounded transition-colors cursor-pointer"
                  >
                    System Reboot
                  </button>
                )}
                {hudData.state === 'landed' && (
                  <button 
                    onClick={resetGame}
                    className="px-6 py-2 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/40 text-[10px] font-bold uppercase tracking-[0.1em] rounded transition-colors cursor-pointer"
                  >
                    Reset Sim
                  </button>
                )}
                
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="w-8 h-8 flex items-center justify-center bg-transparent border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors pointer-events-auto cursor-pointer"
                >
                  <HelpCircle size={14} />
                </button>
              </div>
              
              {/* Planetary Society Menu */}
              {hudData.state === 'landed' && hudData.landedOnSocietyAttitude === 'friendly' && (
                 <div className="bg-[#0a0c0fcc] border border-[#ffffff1a] rounded backdrop-blur-md p-6 shadow-2xl pointer-events-auto w-96 max-w-[90vw] flex flex-col max-h-[60vh] overflow-hidden">
                   <div className="flex justify-between items-center mb-4 shrink-0">
                     <h3 className="text-cyan-400 text-sm font-bold uppercase tracking-widest">{hudData.landedOnName}</h3>
                     <div className="flex flex-col items-end">
                        <span className="text-xs font-mono text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded bg-cyan-500/10 mb-1">BAL: {hudData.credits} CR</span>
                        {(() => {
                           const planet = PLANETS.find(p => p.id === hudData.nearPlanet);
                           if (planet && planet.factionId) {
                               const repValue = hudData.reputations[planet.factionId] || 0;
                               return <span className={`text-[8px] font-bold uppercase tracking-wider ${repValue < 0 ? 'text-red-400' : 'text-green-400'}`}>STANDING: {repValue}</span>;
                           }
                           return null;
                        })()}
                     </div>
                   </div>
                   
                   <div className="flex border-b border-[#ffffff1a] mb-4 shrink-0">
                     <button 
                       onClick={() => setShopTab('services')}
                       className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${shopTab === 'services' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-[#8a8d91] hover:text-[#e0e2e5]'}`}
                     >
                       Services
                     </button>
                     <button 
                       onClick={() => setShopTab('garage')}
                       className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${shopTab === 'garage' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-[#8a8d91] hover:text-[#e0e2e5]'}`}
                     >
                       Garage
                     </button>
                   </div>

                   <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                     {shopTab === 'services' ? (
                       <div className="space-y-3">
                         <p className="text-[#e0e2e5] opacity-70 text-xs mb-4 leading-relaxed">
                           The local trade syndicate welcomes you. Services are available to restore your vessel's operational capacity.
                         </p>
                         <button 
                           onClick={repairShip}
                           className="w-full flex justify-between items-center px-4 py-3 bg-[#ffffff0a] border border-[#ffffff1a] hover:bg-[#ffffff15] hover:border-[#00ffcc] text-left transition-colors cursor-pointer rounded"
                         >
                           <span><span className="text-cyan-400 font-bold mr-2 text-xs">REPAIR</span> <span className="text-xs text-[#e0e2e5] uppercase">Restore Hull Integrity</span></span>
                           <span className="text-xs font-mono text-cyan-400">100 CR</span>
                         </button>
                         <button 
                           onClick={refuelShip}
                           className="w-full flex justify-between items-center px-4 py-3 bg-[#ffffff0a] border border-[#ffffff1a] hover:bg-[#ffffff15] hover:border-[#00ffcc] text-left transition-colors cursor-pointer rounded"
                         >
                           <span><span className="text-cyan-400 font-bold mr-2 text-xs">REFUEL</span> <span className="text-xs text-[#e0e2e5] uppercase">Replenish Reaction Fuel</span></span>
                           <span className="text-xs font-mono text-cyan-400">50 CR</span>
                         </button>
                         <button 
                           onClick={recruitAlly}
                           disabled={(() => {
                              const planet = PLANETS.find(p => p.id === hudData.nearPlanet);
                              const repValue = (planet && planet.factionId) ? hudData.reputations[planet.factionId] : 0;
                              return repValue < 20;
                           })()}
                           className={`w-full flex justify-between items-center px-4 py-3 bg-[#ffffff0a] border border-[#ffffff1a] text-left transition-colors cursor-pointer rounded ${
                              (() => {
                                 const planet = PLANETS.find(p => p.id === hudData.nearPlanet);
                                 const repValue = (planet && planet.factionId) ? hudData.reputations[planet.factionId] : 0;
                                 return repValue < 20 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#ffffff15] hover:border-[#00ffcc]';
                              })()
                           }`}
                         >
                           <span><span className="text-cyan-400 font-bold mr-2 text-xs">RECRUIT</span> <span className="text-xs text-[#e0e2e5] uppercase">Hire Mercenary Escort</span></span>
                           {(() => {
                               const planet = PLANETS.find(p => p.id === hudData.nearPlanet);
                               const repValue = (planet && planet.factionId) ? hudData.reputations[planet.factionId] : 0;
                               return repValue < 20 ? <span className="text-[9px] text-red-400 font-bold uppercase">Locked: 20+ Standing REQUIRED</span> : <span className="text-xs font-mono text-cyan-400">200 CR</span>;
                           })()}
                         </button>
                       </div>
                     ) : (
                       <div className="space-y-4">
                         <div>
                           <h4 className="text-xs font-bold text-cyan-400 uppercase mb-2">Paint Job</h4>
                           <div className="grid grid-cols-4 gap-2">
                              {[
                                 { label: 'White', hex: '#ffffff' },
                                 { label: 'Red', hex: '#ef4444' },
                                 { label: 'Blue', hex: '#3b82f6' },
                                 { label: 'Green', hex: '#10b981' },
                                 { label: 'Yellow', hex: '#f59e0b' },
                                 { label: 'Purple', hex: '#8b5cf6' },
                                 { label: 'Pink', hex: '#ec4899' },
                                 { label: 'Cyber', hex: '#00ffcc' }
                              ].map(c => (
                                <button
                                  key={c.hex}
                                  onClick={() => customizeShip(c.hex)}
                                  className={`h-8 rounded border transition-all ${hudData.color === c.hex ? 'border-cyan-400 scale-110 shadow-[0_0_10px_rgba(0,255,204,0.3)]' : 'border-[#ffffff1a] hover:border-[#ffffff55]'}`}
                                  style={{ backgroundColor: c.hex }}
                                  title={c.label}
                                />
                              ))}
                           </div>
                         </div>
                         
                         <div>
                           <h4 className="text-xs font-bold text-cyan-400 uppercase mb-2">Weapon Systems</h4>
                           <div className="space-y-2">
                              <button 
                                onClick={() => customizeShip(undefined, 'basic')}
                                className={`w-full flex justify-between items-center px-3 py-2 bg-[#ffffff0a] border hover:bg-[#ffffff15] text-left transition-colors cursor-pointer rounded ${hudData.weaponType === 'basic' ? 'border-cyan-400' : 'border-[#ffffff1a]'}`}
                              >
                                <span><span className="text-[#e0e2e5] text-xs uppercase font-bold">Standard Blaster</span></span>
                                {hudData.weaponType === 'basic' ? <span className="text-xs font-mono text-cyan-400">EQUIPPED</span> : <span className="text-xs font-mono text-cyan-400">0 CR</span>}
                              </button>
                              <button 
                                onClick={() => customizeShip(undefined, 'rapid')}
                                className={`w-full flex justify-between items-center px-3 py-2 bg-[#ffffff0a] border hover:bg-[#ffffff15] text-left transition-colors cursor-pointer rounded ${hudData.weaponType === 'rapid' ? 'border-cyan-400' : 'border-[#ffffff1a]'}`}
                              >
                                <div>
                                  <div className="text-[#e0e2e5] text-xs uppercase font-bold">Rapid Repeater</div>
                                  <div className="text-[#8a8d91] text-[10px]">High firerate, fast projectile.</div>
                                </div>
                                {hudData.weaponType === 'rapid' ? <span className="text-xs font-mono text-cyan-400">EQUIPPED</span> : <span className="text-xs font-mono text-cyan-400">300 CR</span>}
                              </button>
                              <button 
                                onClick={() => customizeShip(undefined, 'heavy')}
                                disabled={(() => {
                                    const planet = PLANETS.find(p => p.id === hudData.nearPlanet);
                                    const repValue = (planet && planet.factionId) ? hudData.reputations[planet.factionId] : 0;
                                    return repValue < 40;
                                })()}
                                className={`w-full flex justify-between items-center px-3 py-2 bg-[#ffffff0a] border text-left transition-colors cursor-pointer rounded ${
                                    (() => {
                                        const planet = PLANETS.find(p => p.id === hudData.nearPlanet);
                                        const repValue = (planet && planet.factionId) ? hudData.reputations[planet.factionId] : 0;
                                        if (repValue < 40) return 'opacity-30 cursor-not-allowed border-[#ffffff1a]';
                                        return hudData.weaponType === 'heavy' ? 'border-cyan-400' : 'border-[#ffffff1a] hover:bg-[#ffffff15]';
                                    })()
                                }`}
                              >
                                <div>
                                  <div className="text-[#e0e2e5] text-xs uppercase font-bold">Tri-Beam Cannon</div>
                                  <div className="text-[#8a8d91] text-[10px]">Slow firerate, multi-shot.</div>
                                </div>
                                {(() => {
                                    const planet = PLANETS.find(p => p.id === hudData.nearPlanet);
                                    const repValue = (planet && planet.factionId) ? hudData.reputations[planet.factionId] : 0;
                                    if (repValue < 40) return <span className="text-[9px] text-red-400 font-bold uppercase">Locked: 40+ Standing</span>;
                                    return hudData.weaponType === 'heavy' ? <span className="text-xs font-mono text-cyan-400">EQUIPPED</span> : <span className="text-xs font-mono text-cyan-400">500 CR</span>;
                                })()}
                              </button>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
              )}

              {/* Combat Log */}
              {hudData.combatLog && hudData.combatLog.length > 0 && (
                <div className="bg-[#0a0c0fcc] border border-[#ffffff1a] rounded backdrop-blur-md p-4 shadow-2xl pointer-events-none w-80 max-h-48 overflow-hidden flex flex-col justify-end">
                  <h4 className="text-[9px] uppercase tracking-widest text-[#8a8d91] border-b border-[#ffffff1a] pb-2 mb-2 text-right">Combat Log</h4>
                  <div className="space-y-1 overflow-hidden flex flex-col justify-end">
                    {hudData.combatLog.slice(-5).map(log => (
                      <div key={log.id} className={`text-[10px] text-right break-words animate-in fade-in slide-in-from-right-4 duration-300 ${
                        log.type === 'danger' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        log.type === 'success' ? 'text-green-400' :
                        'text-cyan-400'
                      }`}>
                        {log.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Help/Warnings */}
          <div className="flex flex-col items-center justify-end flex-1 pointer-events-none mb-4">
             {!showHelp && hudData.altitude < 100 && hudData.state === 'flying' && (
               <div className="bg-red-600/20 border border-red-500/50 rounded p-4 flex items-center shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse mb-6">
                  <AlertTriangle className="text-red-500 mr-3" size={20} />
                  <span className="text-red-500 uppercase tracking-[0.2em] font-bold text-xs">Terrain Pull Up</span>
               </div>
             )}

             {showHelp && (
                <div className="bg-[#0a0c0fcc] backdrop-blur-md border border-[#ffffff1a] rounded p-8 max-w-lg text-center shadow-2xl pointer-events-auto mb-6">
                  <div className="inline-flex w-12 h-12 rounded-full border border-cyan-500/30 items-center justify-center mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    <Rocket className="text-cyan-400" size={24} />
                  </div>
                  <h2 className="text-[11px] text-cyan-500 font-bold mb-4 uppercase tracking-[0.2em]">Orbital Frontiers</h2>
                  <div className="text-[11px] text-[#e0e2e5] opacity-70 space-y-3 mb-6 leading-relaxed tracking-wide">
                    <p>Navigate the solar system using true Newtonian physics.</p>
                    <p>Gravity and velocity are continuous. Entering atmospheres will cause drag. Maintain orbital velocity to avoid crashing.</p>
                    <p className="text-cyan-400"><strong>Hull Integrity</strong> is your ship's armor. It depletes upon taking damage from hostile attacks or harsh impacts.</p>
                    <p className="text-cyan-400">Use <strong>SPACE</strong> to fire your lasers and defend against hostile forces.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-left border-t border-[#ffffff1a] pt-6">
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 rounded text-[10px] w-8 text-center mr-3 font-mono">W</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Main Engine</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 rounded text-[10px] w-8 text-center mr-3 font-mono">S</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Retro Engine</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 rounded text-[10px] w-8 text-center mr-3 font-mono">A</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">RCS Left</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 rounded text-[10px] w-8 text-center mr-3 font-mono">D</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">RCS Right</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 rounded text-[10px] w-8 text-center mr-3 font-mono">T</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Cycle Target</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 rounded text-[10px] w-8 text-center mr-3 font-mono">J</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Warp Speed</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 rounded text-[10px] w-8 text-center mr-3 font-mono">M</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Mining Laser (HOLD)</span>
                    </div>
                  </div>
                    <div className="mt-4 pt-4 border-t border-[#ffffff1a] flex justify-center space-x-6">
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 rounded text-[10px] text-center mr-3 font-mono">T</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Target</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 rounded text-[10px] text-center mr-3 font-mono">J</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Jump</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 rounded text-[10px] text-center mr-3 font-mono">SPACE</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Fire Laser</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 rounded text-[10px] text-center mr-3 font-mono">M</div> 
                      <span className="text-[10px] uppercase opacity-70 tracking-widest font-bold">Mine</span>
                    </div>
                  </div>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

