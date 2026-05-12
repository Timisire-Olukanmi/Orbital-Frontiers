import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Vec2 } from './vec2';
import { PLANETS, INITIAL_SHIP_STATE, INITIAL_ENTITIES, GameState, CombatLogEntry, G, Entity } from './constants';
import { updatePhysics } from './physics';
import { soundManager } from './sounds';

const STARS = Array.from({ length: 400 }).map(() => ({
  x: Math.random() * 4000,
  y: Math.random() * 4000,
  z: Math.random() * 0.4 + 0.1,
  size: Math.random() * 1.5 + 0.5,
  twinkle: Math.random() > 0.8
}));

export type CameraMode = 'world' | 'chase' | 'cockpit' | 'behind';

export const useGame = () => {
  const cameraModeRef = useRef<CameraMode>('chase');
  const [cameraMode, setCameraModeState] = useState<CameraMode>('chase');
  
  const setCameraMode = useCallback((mode: CameraMode) => {
    cameraModeRef.current = mode;
    setCameraModeState(mode);
  }, []);

  const gameStateRef = useRef<GameState>({
    ship: { ...INITIAL_SHIP_STATE, pos: new Vec2(INITIAL_SHIP_STATE.pos.x, INITIAL_SHIP_STATE.pos.y), vel: new Vec2(INITIAL_SHIP_STATE.vel.x, INITIAL_SHIP_STATE.vel.y) },
    lasers: [],
    entities: INITIAL_ENTITIES.map(e => ({...e, pos: new Vec2(e.pos.x, e.pos.y), vel: new Vec2(e.vel.x, e.vel.y)})),
    vfx: [],
    triggeredSounds: [],
    visitedPlanets: [],
    combatLog: []
  });
  
  const lastTimeRef = useRef<number>(performance.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<Vec2[]>([]);
  
  // Track inputs
  const keysRef = useRef<{ [key: string]: boolean }>({});

  const [hudData, setHudData] = useState({
    fuel: INITIAL_SHIP_STATE.fuel,
    health: INITIAL_SHIP_STATE.health,
    speed: 0,
    altitude: 0,
    state: INITIAL_SHIP_STATE.state,
    nearPlanet: 'Terra',
    targetPlanet: 'NONE',
    warpCooldown: 0,
    isWarpJumping: false,
    landedOnSocietyAttitude: null as string | null | undefined,
    landedOnName: null as string | null | undefined,
    credits: INITIAL_SHIP_STATE.credits,
    color: INITIAL_SHIP_STATE.color,
    weaponType: INITIAL_SHIP_STATE.weaponType,
    formation: INITIAL_SHIP_STATE.formation,
    cargo: INITIAL_SHIP_STATE.cargo,
    reputations: INITIAL_SHIP_STATE.reputations,
    miningLaserActive: false,
    combatLog: [] as CombatLogEntry[]
  });

  const resetGame = useCallback(() => {
    trailRef.current = [];
    gameStateRef.current = {
      ship: { ...INITIAL_SHIP_STATE, pos: new Vec2(INITIAL_SHIP_STATE.pos.x, INITIAL_SHIP_STATE.pos.y), vel: new Vec2(INITIAL_SHIP_STATE.vel.x, INITIAL_SHIP_STATE.vel.y) },
      lasers: [],
      entities: INITIAL_ENTITIES.map(e => ({...e, pos: new Vec2(e.pos.x, e.pos.y), vel: new Vec2(e.vel.x, e.vel.y)})),
      vfx: [],
      triggeredSounds: [],
      visitedPlanets: [],
      combatLog: []
    };

    // Generate some asteroids
    PLANETS.forEach(p => {
      if (p.type === 'moon' || p.type === 'planet' || p.type === 'gas_giant') {
        const asteroidCount = p.id === 'obsidian' ? 12 : 5;
        for (let i = 0; i < asteroidCount; i++) {
          const ang = Math.random() * Math.PI * 2;
          const dist = p.radius + 1800 + Math.random() * 1000;
          const resources: ('iron' | 'gold' | 'crystal' | 'platinum')[] = ['iron', 'iron', 'gold', 'crystal'];
          if (p.id === 'obsidian') resources.push('platinum');
          const res = resources[Math.floor(Math.random() * resources.length)];
          
          gameStateRef.current.entities.push({
            id: `asteroid_${p.id}_${i}_${Math.random()}`,
            type: 'asteroid',
            pos: p.pos.add(new Vec2(Math.cos(ang) * dist, Math.sin(ang) * dist)),
            vel: new Vec2(-Math.sin(ang) * 0.5, Math.cos(ang) * 0.5).mult(Math.sqrt((G * 10 * p.mass) / dist)), 
            angle: Math.random() * Math.PI * 2,
            angularVel: (Math.random() - 0.5) * 0.05,
            mass: 50,
            health: 1,
            attitude: 'neutral',
            state: 'orbit',
            thrustForce: 0,
            fireCooldown: 0,
            resourceType: res,
            resourceAmount: 20 + Math.random() * 80,
            size: 15 + Math.random() * 25
          });
        }
      }
    });
  }, []);

  const repairShip = useCallback(() => {
    if (gameStateRef.current.ship.health < 100 && gameStateRef.current.ship.credits >= 100) {
      gameStateRef.current.ship.health = 100;
      gameStateRef.current.ship.credits -= 100;
    }
  }, []);

  const refuelShip = useCallback(() => {
    if (gameStateRef.current.ship.fuel < 3500 && gameStateRef.current.ship.credits >= 50) {
      gameStateRef.current.ship.fuel = 3500;
      gameStateRef.current.ship.credits -= 50;
    }
  }, []);

  const recruitAlly = useCallback(() => {
    if (gameStateRef.current.ship.credits >= 200 && gameStateRef.current.ship.state === 'landed') {
      gameStateRef.current.ship.credits -= 200;
      
      const pId = gameStateRef.current.ship.landedOn;
      const planet = PLANETS.find(p => p.id === pId);
      if (planet) {
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = planet.radius + 200;
        const ePos = planet.pos.add(new Vec2(Math.cos(spawnAngle) * spawnDist, Math.sin(spawnAngle) * spawnDist));
        
        gameStateRef.current.entities.push({
            id: 'ally_' + Math.random(),
            type: 'spaceship',
            pos: ePos,
            vel: new Vec2(Math.cos(spawnAngle) * 2, Math.sin(spawnAngle) * 2),
            angle: spawnAngle,
            angularVel: 0,
            mass: 15,
            health: 200,
            attitude: 'friendly',
            state: 'follow',
            thrustForce: 25,
            fireCooldown: 0.5,
            recruited: true,
            formationIndex: gameStateRef.current.entities.filter(e => e.recruited).length
        });
      }
    }
  }, []);

  const customizeShip = useCallback((color?: string, weaponType?: 'basic' | 'rapid' | 'heavy') => {
    if (color) {
        gameStateRef.current.ship.color = color;
    }
    if (weaponType && gameStateRef.current.ship.weaponType !== weaponType) {
        // Weapon costs
        const costs = { basic: 0, rapid: 300, heavy: 500 };
        if (gameStateRef.current.ship.credits >= costs[weaponType]) {
            gameStateRef.current.ship.credits -= costs[weaponType];
            gameStateRef.current.ship.weaponType = weaponType;
        } else {
            // Not enough money
        }
    }
  }, []);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const setFormation = useCallback((formation: 'wedge' | 'line' | 'echelon') => {
    gameStateRef.current.ship.formation = formation;
  }, []);

  const setMiningLaser = useCallback((active: boolean) => {
    gameStateRef.current.ship.miningLaserActive = active;
  }, []);

  const sellResources = useCallback(() => {
    const ship = gameStateRef.current.ship;
    const planetId = ship.landedOn;
    const planet = PLANETS.find(p => p.id === planetId);

    const prices = { iron: 5, gold: 20, crystal: 15, platinum: 50 };
    let totalValue = 0;
    Object.entries(ship.cargo).forEach(([res, amount]) => {
      totalValue += (amount as number) * (prices[res as keyof typeof prices] || 1);
    });

    if (totalValue > 0) {
      ship.credits += Math.floor(totalValue);
      ship.cargo = {};

      // Reputation gain
      if (planet && planet.factionId && planet.factionId !== 'independent' && planet.factionId !== 'creature' && planet.factionId !== 'marauders') {
          const repGain = Math.max(1, Math.floor(totalValue / 100)); // 1 rep per 100 credits of trade
          const fId = planet.factionId;
          const currentRep = ship.reputations[fId];
          ship.reputations[fId] = Math.min(100, currentRep + repGain);
          gameStateRef.current.combatLog.push({ 
            id: Math.random().toString(), 
            text: `Trade favor: +${repGain} standing with ${fId.toUpperCase()}`, 
            type: 'success', 
            timestamp: Date.now() 
          });
      }

      gameStateRef.current.combatLog.push({ 
        id: Math.random().toString(), 
        text: `Sold cargo for ${Math.floor(totalValue)} CR`, 
        type: 'success', 
        timestamp: Date.now() 
      });
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true;
      if (e.code === 'KeyT') {
          const ship = gameStateRef.current.ship;
          if (!ship.targetPlanetId) {
              ship.targetPlanetId = PLANETS[0].id;
          } else {
              const idx = PLANETS.findIndex(p => p.id === ship.targetPlanetId);
              ship.targetPlanetId = PLANETS[(idx + 1) % PLANETS.length].id;
          }
      } else if (e.code === 'KeyJ') {
          const ship = gameStateRef.current.ship;
          if (ship.targetPlanetId && ship.warpCooldown <= 0 && !ship.isWarpJumping && ship.state === 'flying') {
              ship.isWarpJumping = true;
              ship.warpProgress = 0;
          }
      } else if (e.code === 'KeyM') {
          gameStateRef.current.ship.miningLaserActive = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { 
      keysRef.current[e.code] = false; 
      if (e.code === 'KeyM') {
          gameStateRef.current.ship.miningLaserActive = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let accumulatedTime = 0;
    const FIXED_DT = 1 / 60;
    let lastHudUpdate = 0;

    const loop = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      
      accumulatedTime += Math.min(dt, 0.1); 

      // Input mapping
      const keys = keysRef.current;
      gameStateRef.current.ship.isMainEngineOn = keys['KeyW'] || keys['ArrowUp'];
      gameStateRef.current.ship.isRetroOn = keys['KeyS'] || keys['ArrowDown'];
      gameStateRef.current.ship.isRcsLeftOn = keys['KeyA'] || keys['ArrowLeft'];
      gameStateRef.current.ship.isRcsRightOn = keys['KeyD'] || keys['ArrowRight'];
      gameStateRef.current.ship.isFiringLaser = keys['Space'];

      // Physics steps
      while (accumulatedTime >= FIXED_DT) {
        gameStateRef.current = updatePhysics(gameStateRef.current, PLANETS, FIXED_DT);
        
        // Play sounds that were triggered in this physics step
        if (gameStateRef.current.triggeredSounds) {
            for (const s of gameStateRef.current.triggeredSounds) {
                if (s.startsWith('laser_')) {
                    soundManager.playLaser(s.split('_')[1] as any);
                } else if (s === 'hit') {
                    soundManager.playHit();
                } else if (s === 'explosion') {
                    soundManager.playExplosion();
                }
            }
            // Clear sounds after playing
            gameStateRef.current.triggeredSounds = [];
        }

        accumulatedTime -= FIXED_DT;
      }

      const ship = gameStateRef.current.ship;
      const lasers = gameStateRef.current.lasers;
      const entities = gameStateRef.current.entities;
      const vfx = gameStateRef.current.vfx;

      // Rendering
      const width = canvas.width;
      const height = canvas.height;
      
      // Low Health flickering lights logic
      const isLowHealth = ship.health < 30;
      const flicker = isLowHealth && Math.random() < 0.1;

      ctx.fillStyle = flicker ? '#1a0505' : '#030405';
      ctx.fillRect(0, 0, width, height);

      // Base Camera Transform
      ctx.save();
      
      if (cameraModeRef.current === 'behind') {
          // In behind view, the ship is near the bottom of the screen to show more ahead
          ctx.translate(width / 2, height * 0.8);
          ctx.rotate(-ship.angle - Math.PI / 2);
      } else {
          ctx.translate(width / 2, height / 2);
          if (cameraModeRef.current === 'chase' || cameraModeRef.current === 'cockpit') {
              // Rotate world so the ship points UP (-Math.PI/2)
              ctx.rotate(-ship.angle - Math.PI / 2);
          }
      }

      // Draw Parallax Stars
      const starBox = 4000;
      for (const star of STARS) {
        const relX = (star.x - ship.pos.x * star.z);
        const relY = (star.y - ship.pos.y * star.z);
        
        const sx = ((relX % starBox) + starBox) % starBox - starBox/2;
        const sy = ((relY % starBox) + starBox) % starBox - starBox/2;
        
        const twinkle = star.twinkle ? (Math.sin(time / 200 + star.x) * 0.5 + 0.5) : 1;
        ctx.globalAlpha = star.z * 1.5 * twinkle;
        
        ctx.fillStyle = star.twinkle ? '#aaccff' : '#ffffff';
        ctx.beginPath();
        if (ship.isWarpJumping) {
            const stretchX = Math.cos(ship.angle) * ship.warpProgress * 300 * star.z;
            const stretchY = Math.sin(ship.angle) * ship.warpProgress * 300 * star.z;
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - stretchX, sy - stretchY);
            ctx.lineWidth = star.size * 2;
            ctx.strokeStyle = `hsl(${Math.random() * 360}, 100%, 80%)`;
            ctx.stroke();
        } else {
            ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
            if (star.size > 1.5) {
                ctx.shadowBlur = 5;
                ctx.shadowColor = ctx.fillStyle as string;
            } else {
                ctx.shadowBlur = 0;
            }
            ctx.fill();
        }
        ctx.shadowBlur = 0; // Reset
      }
      ctx.globalAlpha = 1.0;

      // Zoom Transform
      const speed = ship.vel.mag();
      const zoom = cameraModeRef.current === 'cockpit' ? 1.5 : Math.max(0.2, Math.min(1.0, 1.5 - speed / 15));
      ctx.scale(zoom, zoom);
      ctx.translate(-ship.pos.x, -ship.pos.y);

      // Map closest planet for HUD
      let nearPlanet = PLANETS[0];
      let minDist = Infinity;

      for (const planet of PLANETS) {
        const d = planet.pos.distance(ship.pos);
        if (d < minDist) {
          minDist = d;
          nearPlanet = planet;
        }

        // Lens Flare effect for active stars
        if (planet.type === 'star') {
          ctx.beginPath();
          const pgrad = ctx.createRadialGradient(planet.pos.x, planet.pos.y, planet.radius * 0.8, planet.pos.x, planet.pos.y, planet.radius * 3);
          pgrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
          pgrad.addColorStop(0.2, planet.color + '88');
          pgrad.addColorStop(1, 'transparent');
          ctx.fillStyle = pgrad;
          ctx.arc(planet.pos.x, planet.pos.y, planet.radius * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Atmosphere
        if (planet.atmosphereRadius > 0) {
          const atmGrad = ctx.createRadialGradient(planet.pos.x, planet.pos.y, planet.radius, planet.pos.x, planet.pos.y, planet.atmosphereRadius);
          atmGrad.addColorStop(0, planet.color + '44');
          atmGrad.addColorStop(1, planet.color + '00');
          ctx.beginPath();
          ctx.arc(planet.pos.x, planet.pos.y, planet.atmosphereRadius, 0, Math.PI * 2);
          ctx.fillStyle = atmGrad;
          ctx.fill();
        }

        // Planet body
        if (ship.targetPlanetId === planet.id) {
           ctx.beginPath();
           ctx.shadowBlur = 20;
           ctx.shadowColor = '#00ffcc';
           ctx.lineWidth = 4;
           ctx.strokeStyle = '#00ffcc';
           ctx.arc(planet.pos.x, planet.pos.y, planet.radius + 15, 0, Math.PI * 2);
           ctx.stroke();
           ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(planet.pos.x, planet.pos.y, planet.radius, 0, Math.PI * 2);
        
        if (planet.type === 'gas_giant') {
            const ggGrad = ctx.createLinearGradient(planet.pos.x - planet.radius, planet.pos.y - planet.radius, planet.pos.x + planet.radius, planet.pos.y + planet.radius);
            ggGrad.addColorStop(0, planet.color);
            ggGrad.addColorStop(0.5, '#bdc3c7');
            ggGrad.addColorStop(1, planet.color);
            ctx.fillStyle = ggGrad;
        } else {
            ctx.fillStyle = planet.color;
        }
        
        ctx.shadowBlur = planet.type === 'star' ? 100 : 0;
        ctx.shadowColor = planet.color;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
        
        ctx.strokeStyle = planet.type === 'star' ? '#fff' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Planet label
        // To keep text upright when rotated
        ctx.save();
        ctx.translate(planet.pos.x, planet.pos.y - planet.radius - 20);
        if (cameraModeRef.current === 'chase' || cameraModeRef.current === 'cockpit' || cameraModeRef.current === 'behind') {
            ctx.rotate(ship.angle + Math.PI / 2); // keep text upright
        }
        ctx.fillStyle = ship.targetPlanetId === planet.id ? '#00ffcc' : 'rgba(255,255,255,0.7)';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(planet.name + (planet.hasSociety ? (planet.societyAttitude === 'hostile' ? ' [DANGER]' : ' [SECURE]') : '') + (ship.targetPlanetId === planet.id ? ' [TARGET]' : ''), 0, 0);
        ctx.restore();
      }

      // Draw Entities
      for (const e of entities) {
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y);
        ctx.rotate(e.angle);

        if (e.type === 'spaceship') {
            ctx.fillStyle = e.attitude === 'hostile' ? '#331111' : (e.recruited ? '#113322' : '#111133');
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-10, 10);
            ctx.lineTo(-5, 0);
            ctx.lineTo(-10, -10);
            ctx.closePath();
            ctx.fill();
            
            const strokeCol = e.attitude === 'hostile' ? '#ff3333' : (e.recruited ? '#33ff88' : '#3388ff');
            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 8;
            ctx.shadowColor = strokeCol;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Thruster
            if ((e.state === 'chase' || e.state === 'flee' || e.state === 'follow' || e.state === 'patrol') && e.vel.mag() > 0.5) {
                ctx.fillStyle = e.attitude === 'hostile' ? '#ffaa00' : '#00ffff';
                ctx.beginPath();
                ctx.moveTo(-7, 4);
                ctx.lineTo(-7, -4);
                ctx.lineTo(-25 - Math.random() * 10, 0);
                ctx.fill();
            }
        } else if (e.type === 'creature') {
            // Cosmic Creature
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#9b59b6';
            ctx.fillStyle = 'rgba(155, 89, 182, 0.8)';
            ctx.beginPath();
            ctx.arc(0, 0, 60 + Math.sin(time / 200) * 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // tentacles
             ctx.strokeStyle = '#8e44ad';
             ctx.lineWidth = 6;
             for(let i=0; i<8; i++) {
                 ctx.beginPath();
                 ctx.moveTo(0,0);
                 ctx.lineTo(Math.cos(i + time/500)*150, Math.sin(i + time/500)*150);
                 ctx.stroke();
             }
        } else if (e.type === 'asteroid') {
            // Asteroid Graphic
            const resColor = { iron: '#95a5a6', gold: '#f1c40f', crystal: '#3498db', platinum: '#ecf0f1' }[e.resourceType || 'iron'];
            ctx.fillStyle = '#2c3e50';
            ctx.strokeStyle = resColor;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            const sides = 8;
            for(let j=0; j<sides; j++){
                const ang = (j/sides) * Math.PI * 2;
                const r = e.size! * (0.8 + Math.sin(j * 17 + e.id.length) * 0.2);
                if(j === 0) ctx.moveTo(Math.cos(ang)*r, Math.sin(ang)*r);
                else ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Draw some resource dots
            ctx.fillStyle = resColor;
            for(let j=0; j<5; j++) {
                ctx.beginPath();
                ctx.arc(Math.cos(j)*e.size!*0.5, Math.sin(j)*e.size!*0.5, 2, 0, Math.PI*2);
                ctx.fill();
            }
        } else if (e.type === 'doppleganger') {
            if (e.state === 'idle') {
                // simulate planet
                const distToPlayer = Math.hypot(e.pos.x - ship.pos.x, e.pos.y - ship.pos.y);
                ctx.beginPath();
                ctx.arc(0, 0, e.fakePlanetRadius || 100, 0, Math.PI * 2);
                ctx.fillStyle = e.fakePlanetColor || '#b2bec3';
                ctx.fill();
                
                // Draw face details based on distance
                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                
                if (distToPlayer > 3000) {
                    // Just two dashes
                    ctx.fillRect(-30, -15, 20, 6);
                    ctx.fillRect(10, -15, 20, 6);
                } else {
                    // Start opening eyes
                    const openLevel = Math.max(0, Math.min(1, (3000 - distToPlayer) / 1800)); // 1.0 when closer than 1200
                    ctx.fillRect(-30, -15 - openLevel * 10, 20, 6 + openLevel * 20);
                    ctx.fillRect(10, -15 - openLevel * 10, 20, 6 + openLevel * 20);
                    
                    // Reveal eyes
                    if (openLevel > 0.3) {
                        const redLevel = (openLevel - 0.3) / 0.7;
                        ctx.fillStyle = `rgba(255, 0, 0, ${redLevel})`;
                        ctx.beginPath();
                        ctx.arc(-20, -12, redLevel * 6, 0, Math.PI*2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(20, -12, redLevel * 6, 0, Math.PI*2);
                        ctx.fill();
                    }
                    
                    // Open mouth
                    ctx.fillStyle = `rgba(0, 0, 0, ${0.5 + openLevel * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(0, 30, openLevel * 20, 0, Math.PI, false);
                    ctx.fill();
                }
                ctx.restore();
            } else {
                // reveal true form
                ctx.fillStyle = '#ff3838';
                ctx.beginPath();
                // jagged shape
                for(let i=0; i<10; i++) {
                    const angle = (i/10) * Math.PI * 2;
                    const r = 50 + (i%2===0 ? 30 : 0) + Math.cos(time/100 + i)*10;
                    if(i===0) ctx.moveTo(Math.cos(angle)*r, Math.sin(angle)*r);
                    else ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
                }
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // eye
                ctx.fillStyle = '#111';
                ctx.beginPath();
                ctx.arc(15, 0, 20, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(20, 0, 8, 0, Math.PI*2);
                ctx.fill();
            }
        }
        
        ctx.restore();

        // Draw Health Bar
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y);
        if (cameraModeRef.current === 'chase' || cameraModeRef.current === 'cockpit' || cameraModeRef.current === 'behind') {
            ctx.rotate(ship.angle + Math.PI / 2); // keep text upright
        }
        ctx.fillStyle = 'rgba(231, 76, 60, 0.5)';
        ctx.fillRect(-15, -25, 30, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(-15, -25, 30 * (e.health / (e.type === 'creature' ? 500 : 100)), 4);
        ctx.restore();
      }

      // Draw Lasers
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (const l of lasers) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = l.friendly ? '#00ffcc' : '#ff3366';
        ctx.strokeStyle = l.friendly ? '#00ffcc' : '#ff3366';
        
        ctx.beginPath();
        const laserTail = l.friendly ? Math.max(0.2, l.vel.mag() * 0.05) : 0.15;
        ctx.moveTo(l.pos.x, l.pos.y);
        ctx.lineTo(l.pos.x - l.vel.x * laserTail, l.pos.y - l.vel.y * laserTail);
        ctx.stroke();
        
        // laser core
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.moveTo(l.pos.x, l.pos.y);
        ctx.lineTo(l.pos.x - l.vel.x * (laserTail * 0.5), l.pos.y - l.vel.y * (laserTail * 0.5));
        ctx.stroke();
        ctx.lineWidth = 4;
      }
      ctx.shadowBlur = 0;
      ctx.lineCap = 'butt';

      // Draw Trail
      if (trailRef.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trailRef.current[0].x, trailRef.current[0].y);
        for (let i = 1; i < trailRef.current.length; i++) {
            ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
        }
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Ship
      if (ship.state !== 'destroyed' && cameraModeRef.current !== 'cockpit') {
        ctx.save();
        ctx.translate(ship.pos.x, ship.pos.y);
        ctx.rotate(ship.angle);

        // Visible hull damage indicators
        if (ship.health < 70) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(2, 4, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        if (ship.health < 40) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-5, -5);
            ctx.lineTo(5, 5);
            ctx.stroke();
        }

        if (ship.isWarpJumping) {
            const stretch = 1 + Math.sin(ship.warpProgress * Math.PI) * 15;
            const alpha = 1 - Math.pow(ship.warpProgress, 2);
            ctx.scale(stretch, 1 / Math.sqrt(stretch));
            ctx.globalAlpha = Math.max(0, alpha);
            
            // Visual distortion effect around ship
            ctx.beginPath();
            ctx.arc(0, 0, 40 * stretch, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 255, ${0.1 * alpha})`;
            ctx.fill();
        }

        // Flame main engine
        if (ship.isMainEngineOn && ship.fuel > 0) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#f39c12';
          ctx.fillStyle = '#f39c12';
          ctx.beginPath();
          ctx.moveTo(-10, 5);
          ctx.lineTo(-10, -5);
          ctx.lineTo(-30 - Math.random() * 10, 0);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        // Flame retro engine
        if (ship.isRetroOn && ship.fuel > 0) {
          ctx.fillStyle = '#00d2ff';
          ctx.beginPath();
          ctx.moveTo(8, 5);
          ctx.lineTo(8, -5);
          ctx.lineTo(20 + Math.random() * 5, 0);
          ctx.fill();
        }
        // RCS left
        if (ship.isRcsLeftOn && ship.fuel > 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(-8, -8, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // RCS right
        if (ship.isRcsRightOn && ship.fuel > 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(-8, 8, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ship body
        ctx.fillStyle = ship.state === 'crashed' ? '#222' : '#0a0c0f';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-10, -10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ship.state === 'crashed' ? '#e74c3c' : (ship.color || '#06b6d4');
        ctx.lineWidth = 2.0;
        if(ship.state !== 'crashed') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = ship.color || '#06b6d4';
        }
        ctx.stroke();
        
        // Cockpit window
        ctx.fillStyle = ship.state === 'crashed' ? '#333' : 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-2, 4);
        ctx.lineTo(-2, -4);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;

        // Mining Laser Beam
        if (ship.miningLaserActive) {
           const MINING_RANGE = 400;
           let miningTarget: Entity | null = null;
           let nearestDist = MINING_RANGE;
           
           for(const e of entities) {
               if (e.type === 'asteroid' && e.resourceAmount! > 0) {
                   const d = e.pos.distance(ship.pos);
                   if (d < nearestDist) {
                       nearestDist = d;
                       miningTarget = e;
                   }
               }
           }

           if (miningTarget) {
               ctx.save();
               ctx.rotate(-ship.angle); // back to world orientation to draw beam to target
               
               const selfToTarget = miningTarget.pos.sub(ship.pos);
               
               ctx.shadowBlur = 15;
               ctx.shadowColor = '#00ffcc';
               ctx.strokeStyle = '#00ccff';
               ctx.lineWidth = 3 + Math.sin(time / 50) * 2;
               
               ctx.beginPath();
               ctx.moveTo(Math.cos(ship.angle) * 15, Math.sin(ship.angle) * 15);
               ctx.lineTo(selfToTarget.x, selfToTarget.y);
               ctx.stroke();
               
               // Beam core
               ctx.strokeStyle = '#fff';
               ctx.lineWidth = 1;
               ctx.stroke();
               
               // Particle sparks etc
               for(let i=0; i<3; i++) {
                   ctx.fillStyle = '#00ffcc';
                   ctx.beginPath();
                   const px = selfToTarget.x + (Math.random() - 0.5) * 40;
                   const py = selfToTarget.y + (Math.random() - 0.5) * 40;
                   ctx.arc(px, py, 1 + Math.random() * 2, 0, Math.PI * 2);
                   ctx.fill();
               }
               ctx.restore();
           } else {
               // Idle beam
               ctx.strokeStyle = 'rgba(0, 204, 255, 0.3)';
               ctx.lineWidth = 1;
               ctx.beginPath();
               ctx.moveTo(15, 0);
               ctx.lineTo(50 + Math.sin(time/100) * 20, 0);
               ctx.stroke();
           }
        }

        // Damage effects
        if (ship.health < 60) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Scorch mark
            ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
            ctx.beginPath();
            ctx.ellipse(5, 5, 4, 8, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();

            // Intermittent sparks
            if (Math.random() > 0.8) {
                ctx.strokeStyle = '#f1c40f';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.random() * 20 - 10, Math.random() * 20 - 10);
                ctx.stroke();
            }
        }
        if (ship.health < 30) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
            ctx.beginPath();
            ctx.arc(-5, -2, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Flashing light / exposed wiring
            if (Math.sin(time / 50) > 0) {
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(-2, 4, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // More aggressive sparks
            if (Math.random() > 0.5) {
                ctx.strokeStyle = '#e67e22';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(-5, -2);
                ctx.lineTo(-5 + Math.random() * 30 - 15, -2 + Math.random() * 30 - 15);
                ctx.stroke();
            }
        }

        ctx.restore();
      }

      // Draw VFX
      for (const v of vfx) {
          ctx.save();
          ctx.translate(v.pos.x, v.pos.y);
          ctx.globalAlpha = v.life / v.maxLife;
          ctx.fillStyle = v.color;
          
          if (v.type === 'hit') {
              ctx.shadowBlur = 10;
              ctx.shadowColor = v.color;
              ctx.beginPath();
              ctx.arc(0, 0, v.size * (1 - v.life/v.maxLife), 0, Math.PI * 2);
              ctx.fill();
          } else if (v.type === 'explosion') {
              ctx.shadowBlur = 20;
              ctx.shadowColor = v.color;
              const r = v.size * (1 + (1 - v.life/v.maxLife) * 2);
              ctx.beginPath();
              ctx.arc(0, 0, r, 0, Math.PI * 2);
              ctx.fill();
              
              // Internal flash
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
              ctx.fill();
          } else if (v.type === 'smoke') {
              ctx.beginPath();
              ctx.arc(0, 0, v.size, 0, Math.PI * 2);
              ctx.fill();
          } else if (v.type === 'spark') {
              ctx.fillRect(-1, -1, 2, 2);
          }
          
          ctx.restore();
      }
      ctx.globalAlpha = 1.0;

      ctx.restore(); // Restore base transform

      // Cockpit Overlay (Top of screen coordinates, unaffected by camera)
      if (cameraModeRef.current === 'cockpit') {
         // Grid UI lines
         ctx.strokeStyle = 'rgba(6,182,212,0.15)'; 
         ctx.lineWidth = 1;
         
         ctx.beginPath();
         // draw targeting reticle
         ctx.arc(width/2, height/2, 50, 0, Math.PI*2);
         ctx.moveTo(width/2 - 70, height/2); ctx.lineTo(width/2 + 70, height/2);
         ctx.moveTo(width/2, height/2 - 70); ctx.lineTo(width/2, height/2 + 70);
         ctx.stroke();
         
         ctx.fillStyle = 'rgba(6,182,212,0.8)';
         ctx.font = '12px Courier';
         ctx.fillText("TARGETING SYSTEM ONLINE", width/2 - 80, height/2 - 80);

         ctx.fillStyle = '#050608';
         ctx.beginPath();
         // Outer bounding box (canvas dims)
         ctx.moveTo(0, 0);
         ctx.lineTo(0, height);
         ctx.lineTo(width, height);
         ctx.lineTo(width, 0);
         ctx.closePath();
         // Inner cutout (drawn clockwise for evenodd)
         ctx.moveTo(width * 0.1, height * 0.1);
         ctx.lineTo(width * 0.9, height * 0.1);
         ctx.lineTo(width * 0.9, height * 0.9);
         ctx.lineTo(width * 0.1, height * 0.9);
         ctx.closePath();
         
         ctx.fill('evenodd');

         // Cyan window frame with glow
         ctx.shadowBlur = 20;
         ctx.shadowColor = '#06b6d4';
         ctx.strokeStyle = 'rgba(6,182,212,0.6)'; 
         ctx.lineWidth = 3;
         ctx.beginPath();
         ctx.moveTo(width * 0.1, height * 0.1);
         ctx.lineTo(width * 0.9, height * 0.1);
         ctx.lineTo(width * 0.9, height * 0.9);
         ctx.lineTo(width * 0.1, height * 0.9);
         ctx.closePath();
         ctx.stroke();
         ctx.shadowBlur = 0;
      }

      // Tactical Map Overlay
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space
      const mmSize = 250;
      const padding = 24;
      const mmX = width - mmSize - padding;
      const mmY = height - mmSize - padding;

      // Map background
      ctx.fillStyle = 'rgba(5, 6, 8, 0.8)';
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1;

      // Draw map frame
      ctx.beginPath();
      ctx.rect(mmX, mmY, mmSize, mmSize);
      ctx.fill();
      ctx.stroke();

      // Clip map area
      ctx.save();
      ctx.beginPath();
      ctx.rect(mmX, mmY, mmSize, mmSize);
      ctx.clip();
      
      // Draw Grid on map
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
      ctx.lineWidth = 1;
      const gridSpacing = mmSize / 5;
      for(let i=0; i<5; i++) {
         ctx.beginPath();
         ctx.moveTo(mmX + i*gridSpacing, mmY);
         ctx.lineTo(mmX + i*gridSpacing, mmY + mmSize);
         ctx.stroke();
         ctx.beginPath();
         ctx.moveTo(mmX, mmY + i*gridSpacing);
         ctx.lineTo(mmX + mmSize, mmY + i*gridSpacing);
         ctx.stroke();
      }

      ctx.translate(mmX + mmSize / 2, mmY + mmSize / 2);
      
      const mapExtents = 16000;
      const mmScale = mmSize / mapExtents;
      ctx.scale(mmScale, mmScale);
      ctx.translate(-ship.pos.x, -ship.pos.y);

      // Draw planets
      for (const p of PLANETS) {
        if (ship.targetPlanetId === p.id) {
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 100;
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, Math.max(p.radius, 400) + 200, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, Math.max(p.radius, 400), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw entities
      for (const e of entities) {
        if (e.type === 'doppleganger' && e.state === 'idle') {
            ctx.fillStyle = e.fakePlanetColor || '#b2bec3';
            ctx.beginPath();
            ctx.arc(e.pos.x, e.pos.y, Math.max(e.fakePlanetRadius || 0, 400), 0, Math.PI * 2);
            ctx.fill();
            continue;
        }

        ctx.fillStyle = e.attitude === 'hostile' ? '#ff0055' : '#00d2ff';
        ctx.beginPath();
        // Make them visible on map
        ctx.arc(e.pos.x, e.pos.y, 400, 0, Math.PI * 2);
        ctx.fill();
        
        // pulsing effect for hostiles
        if (e.attitude === 'hostile') {
           ctx.strokeStyle = `rgba(255, 0, 85, ${0.3 + Math.sin(time/200)*0.3})`;
           ctx.lineWidth = 150;
           ctx.beginPath();
           ctx.arc(e.pos.x, e.pos.y, 800, 0, Math.PI * 2);
           ctx.stroke();
        }
      }

      // Draw Ship
      ctx.fillStyle = ship.color || '#ffffff';
      ctx.save();
      ctx.translate(ship.pos.x, ship.pos.y);
      ctx.rotate(ship.angle);
      ctx.beginPath();
      ctx.moveTo(800, 0);
      ctx.lineTo(-400, 500);
      ctx.lineTo(-400, -500);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore(); // restore clip region

      // Draw Map UI Label (in screen space)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText("TACTICAL MAP", mmX, mmY - 8);

      // Rotate radar scanline
      ctx.save();
      // Clip to bounds to avoid bleed outside
      ctx.beginPath();
      ctx.rect(mmX, mmY, mmSize, mmSize);
      ctx.clip();
      ctx.translate(mmX + mmSize / 2, mmY + mmSize / 2);
      ctx.rotate(time / 500);
      const grad = ctx.createLinearGradient(0, 0, mmSize/1.414, 0);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.5)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, mmSize/1.414, 0, Math.PI / 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      
      ctx.restore(); // restore full screen map overlay transform

      // HUD Update throttling (10fps for react state to avoid lag)
      if (time - lastHudUpdate > 100) {
        lastHudUpdate = time;
        if (ship.state === 'flying') {
            trailRef.current.push(ship.pos.copy());
            if (trailRef.current.length > 200) {
                trailRef.current.shift();
            }
        }
        setHudData({
          fuel: Math.max(0, ship.fuel),
          health: Math.max(0, ship.health),
          speed: ship.vel.mag() * 100, // Scaling for display
          altitude: minDist - nearPlanet.radius,
          state: ship.state,
          nearPlanet: nearPlanet.name,
          targetPlanet: ship.targetPlanetId ? PLANETS.find(p => p.id === ship.targetPlanetId)?.name : 'NONE',
          warpCooldown: ship.warpCooldown,
          isWarpJumping: ship.isWarpJumping,
          landedOnSocietyAttitude: ship.state === 'landed' && ship.landedOn ? PLANETS.find(p => p.id === ship.landedOn)?.societyAttitude : null,
          landedOnName: ship.state === 'landed' && ship.landedOn ? PLANETS.find(p => p.id === ship.landedOn)?.name : null,
          credits: ship.credits,
          color: ship.color,
          weaponType: ship.weaponType,
          formation: ship.formation,
          cargo: { ...ship.cargo },
          reputations: { ...ship.reputations },
          miningLaserActive: ship.miningLaserActive,
          combatLog: gameStateRef.current.combatLog
        });
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return { canvasRef, hudData, resetGame, repairShip, refuelShip, recruitAlly, customizeShip, sellResources, setFormation, cameraMode, setCameraMode };
};
