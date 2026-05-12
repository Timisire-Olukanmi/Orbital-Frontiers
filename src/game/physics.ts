import { Vec2 } from './vec2';
import { G, Planet, ShipState, Laser, Entity, GameState } from './constants';

export const PHYSICS_TIMESTEP = 1 / 60; // Fixed timestep for simulation

function applyGravityAndDrag(pos: Vec2, vel: Vec2, mass: number, planets: Planet[]): { force: Vec2; collision: string | null; nearestId: string; minDist: number } {
  let force = new Vec2(0, 0);
  let collision = null;
  let nearestId = planets[0].id;
  let minDist = Infinity;

  for (const planet of planets) {
    const rVec = planet.pos.sub(pos);
    const rSq = rVec.magSq();
    const r = Math.sqrt(rSq);
    
    if (r < minDist) {
      minDist = r;
      nearestId = planet.id;
    }

    if (r <= planet.radius + 5) {
      collision = planet.id;
    }

    if (r > planet.radius) {
      const gForceMag = (G * mass * planet.mass) / rSq;
      const gForce = rVec.normalize().mult(gForceMag);
      force = force.add(gForce);
    }

    if (r < planet.atmosphereRadius) {
      const atmosphereFactor = 1 - (r - planet.radius) / (planet.atmosphereRadius - planet.radius);
      const dragMag = planet.atmosphereDrag * vel.magSq() * atmosphereFactor;
      if (dragMag > 0) {
        const dragForce = vel.normalize().mult(-dragMag);
        force = force.add(dragForce);
      }
    }
  }

  return { force, collision, nearestId, minDist };
}

export function updatePhysics(state: GameState, planets: Planet[], dt: number): GameState {
  let newShip = { ...state.ship };
  let newLasers = [...state.lasers];
  let newEntities = state.entities.map(e => ({...e}));
  let newVfx = [...(state.vfx || [])];
  let newSounds: any[] = []; // We will fill this with SoundEffect
  let newVisitedPlanets = [...state.visitedPlanets];
  let newCombatLog = [...(state.combatLog || [])];

  function logEvent(text: string, type: 'info'|'warning'|'danger'|'success') {
      newCombatLog.push({ id: Math.random().toString(), text, type, timestamp: Date.now() });
      if (newCombatLog.length > 50) newCombatLog.shift();
  }

  function changeReputation(factionId: string | undefined, amount: number) {
    if (!factionId || factionId === 'independent' || factionId === 'creature') return;
    const fId = factionId as any;
    const current = newShip.reputations[fId] || 0;
    const next = Math.max(-100, Math.min(100, current + amount));
    newShip.reputations[fId] = next;

    if (amount < 0 && current >= -20 && next < -20) {
        logEvent(`WARNING: ${fId.toUpperCase()} authority has declared you HOSTILE.`, 'danger');
    } else if (amount > 0 && current < -20 && next >= -20) {
        logEvent(`${fId.toUpperCase()} has rescinded your hostile status.`, 'success');
    }
  }

  const isHostileToPlayer = (e: Entity) => {
    if (e.attitude === 'hostile') return true;
    if (e.factionId && newShip.reputations[e.factionId] < -20) return true;
    return false;
  };

  function spawnVFX(type: 'hit' | 'explosion' | 'spark' | 'smoke', pos: Vec2, count: number = 1, color: string = '#fff', size: number = 5, velRandom: number = 2) {
    for (let j = 0; j < count; j++) {
      newVfx.push({
        id: Math.random().toString(),
        type,
        pos: new Vec2(pos.x, pos.y),
        life: 1.0,
        maxLife: 1.0,
        color,
        size,
        vel: new Vec2((Math.random() - 0.5) * velRandom, (Math.random() - 0.5) * velRandom)
      });
    }
  }

  // Update existing VFX
  newVfx = newVfx.map(v => {
    const decay = v.type === 'smoke' ? dt * 0.5 : dt * 2;
    const newLife = v.life - decay;
    const newPos = v.vel ? v.pos.add(v.vel.mult(dt)) : v.pos;
    return { ...v, life: newLife, pos: newPos };
  }).filter(v => v.life > 0);

  // === SHIP PHYSICS ===
  if (newShip.isWarpJumping) {
      newShip.miningLaserActive = false;
      newShip.warpProgress += dt * 0.8;
      if (newShip.warpProgress >= 1) {
         newShip.isWarpJumping = false;
         newShip.warpCooldown = 5;
         if (newShip.targetPlanetId) {
             const targetPlanet = planets.find(p => p.id === newShip.targetPlanetId);
             if (targetPlanet) {
                 logEvent(`Warp Jump to ${targetPlanet.name} complete.`, 'info');
                 const offsetDist = targetPlanet.radius + 1500;
                 const angleFromShip = Math.atan2(targetPlanet.pos.y - newShip.pos.y, targetPlanet.pos.x - newShip.pos.x);
                 newShip.pos = targetPlanet.pos.sub(new Vec2(Math.cos(angleFromShip) * offsetDist, Math.sin(angleFromShip) * offsetDist));
                 const orbitalV = Math.sqrt((G * targetPlanet.mass) / offsetDist);
                 newShip.vel = new Vec2(-Math.sin(angleFromShip) * orbitalV, Math.cos(angleFromShip) * orbitalV);
                 newShip.angle = angleFromShip;
             }
         }
      }
  } else if (newShip.state !== 'crashed' && newShip.state !== 'destroyed') {
    if (newShip.warpCooldown > 0) newShip.warpCooldown -= dt;

    if (newShip.state === 'landed') {
      newShip.vel = new Vec2(0, 0);
      newShip.angularVel = 0;
      newShip.miningLaserActive = false;
      if (newShip.isMainEngineOn && newShip.fuel > 0) {
        newShip.state = 'flying';
        newShip.landedOn = null;
      }
    } else {
      let { force, collision, nearestId, minDist } = applyGravityAndDrag(newShip.pos, newShip.vel, newShip.mass, planets);

      // Doppleganger spawn logic
      if (!newVisitedPlanets.includes(nearestId) && minDist < 3000) {
        newVisitedPlanets.push(nearestId);
        if (Math.random() < 0.3) {
          const planet = planets.find(p => p.id === nearestId)!;
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnDist = planet.radius + 1200;
          const ePos = planet.pos.add(new Vec2(Math.cos(spawnAngle) * spawnDist, Math.sin(spawnAngle) * spawnDist));
          newEntities.push({
            id: 'doppleganger_' + Math.random(),
            type: 'doppleganger',
            pos: ePos,
            vel: new Vec2(0, 0),
            angle: 0,
            angularVel: 0,
            mass: 200,
            health: 800,
            attitude: 'hostile',
            state: 'idle',
            thrustForce: 150,
            fireCooldown: 0,
            originalPos: ePos,
            fakePlanetRadius: planet.radius,
            fakePlanetColor: planet.color,
          });
        }
      }

      // Planetary society ship spawn logic
      const nearestPlanet = planets.find(p => p.id === nearestId);
      if (nearestPlanet && nearestPlanet.hasSociety) {
          const planetFaction = nearestPlanet.factionId;
          const isActuallyHostile = nearestPlanet.societyAttitude === 'hostile' || (planetFaction && newShip.reputations[planetFaction] < -20);
          const isActuallyFriendly = nearestPlanet.societyAttitude === 'friendly' && (!planetFaction || newShip.reputations[planetFaction] >= -20);

          if (isActuallyHostile) {
              if (minDist - nearestPlanet.radius < 2000) {
                  if (Math.random() < dt * 0.1) { // 10% chance per second
                     const hostileCount = newEntities.filter(e => isHostileToPlayer(e) && e.type === 'spaceship' && e.pos.distance(nearestPlanet.pos) < 3000).length;
                     if (hostileCount < 3) {
                         const spawnAngle = Math.random() * Math.PI * 2;
                         const spawnDist = nearestPlanet.radius + 100;
                         const ePos = nearestPlanet.pos.add(new Vec2(Math.cos(spawnAngle) * spawnDist, Math.sin(spawnAngle) * spawnDist));
                         newEntities.push({
                            id: 'defense_' + Math.random(),
                            type: 'spaceship',
                            pos: ePos,
                            vel: new Vec2(Math.cos(spawnAngle) * 2, Math.sin(spawnAngle) * 2),
                            angle: spawnAngle,
                            angularVel: 0,
                            mass: 5,
                            health: 100,
                            attitude: 'hostile',
                            state: 'chase',
                            thrustForce: 25,
                            fireCooldown: 1.0,
                            patrolTargetId: nearestPlanet.id,
                            formationIndex: hostileCount,
                            factionId: planetFaction
                         });
                     }
                  }
              }
          } else if (isActuallyFriendly) {
              if (Math.random() < dt * 0.05) { // 5% chance per second
                 const friendlyCount = newEntities.filter(e => e.attitude === 'friendly' && e.type === 'spaceship' && e.pos.distance(nearestPlanet.pos) < 5000).length;
                 if (friendlyCount < 2) {
                     const spawnAngle = Math.random() * Math.PI * 2;
                     const spawnDist = nearestPlanet.radius + 300;
                     const ePos = nearestPlanet.pos.add(new Vec2(Math.cos(spawnAngle) * spawnDist, Math.sin(spawnAngle) * spawnDist));
                     newEntities.push({
                        id: 'trader_' + Math.random(),
                        type: 'spaceship',
                        pos: ePos,
                        vel: new Vec2(Math.cos(spawnAngle) * 2, Math.sin(spawnAngle) * 2),
                        angle: spawnAngle,
                        angularVel: 0,
                        mass: 15,
                        health: 100,
                        attitude: 'friendly',
                        state: 'patrol',
                        thrustForce: 12,
                        fireCooldown: 1.0,
                        patrolTargetId: nearestPlanet.id,
                        formationIndex: friendlyCount,
                        factionId: planetFaction
                     });
                 }
              }
          }
      }

      if (collision) {
        const speed = newShip.vel.mag();
        const planet = planets.find(p => p.id === collision)!;
        if (planet.type === 'star' || planet.type === 'gas_giant' || speed > 2.0) { 
          newShip.state = (planet.type === 'star' || planet.type === 'gas_giant') ? 'destroyed' : 'crashed';
          if (newShip.state === 'destroyed') {
              logEvent(`Vessel destroyed by ${planet.type === 'star' ? 'stellar heat' : 'atmospheric pressure'}.`, 'danger');
          } else {
              logEvent('Impact! Vessel crashed.', 'danger');
          }
        } else {
          newShip.state = 'landed';
          newShip.landedOn = planet.id;
          const rVec = planet.pos.sub(newShip.pos);
          newShip.angle = Math.atan2(-rVec.y, -rVec.x);
          logEvent(`Successfully landed on ${planet.name}.`, 'info');
        }
      }

      if (newShip.state === 'flying') {
        // Thrust
        if (newShip.isMainEngineOn && newShip.fuel > 0) {
          const thrust = new Vec2(Math.cos(newShip.angle), Math.sin(newShip.angle)).mult(newShip.mainThrustForce);
          force = force.add(thrust);
          newShip.fuel -= dt * 5;
        }
        if (newShip.isRetroOn && newShip.fuel > 0) {
          const thrust = new Vec2(Math.cos(newShip.angle), Math.sin(newShip.angle)).mult(-newShip.mainThrustForce * 0.5);
          force = force.add(thrust);
          newShip.fuel -= dt * 2.5;
        }

        // RCS
        if (newShip.isRcsLeftOn && newShip.fuel > 0) {
          newShip.angularVel -= newShip.rcsThrustForce * 0.5;
          newShip.fuel -= dt * 0.5;
        }
        if (newShip.isRcsRightOn && newShip.fuel > 0) {
          newShip.angularVel += newShip.rcsThrustForce * 0.5;
          newShip.fuel -= dt * 0.5;
        }

        const acceleration = force.div(newShip.mass);
        newShip.vel = newShip.vel.add(acceleration.mult(dt));
        newShip.pos = newShip.pos.add(newShip.vel.mult(dt));
        newShip.angularVel *= 0.90;
        newShip.angle += newShip.angularVel;

        // Mining Laser Logic
        if (newShip.miningLaserActive) {
          const MINING_RANGE = 400;
          const MINING_RATE = 2 * dt; // Resources per second
          
          for (let e of newEntities) {
            if (e.type === 'asteroid' && e.resourceAmount! > 0 && e.pos.distance(newShip.pos) < MINING_RANGE) {
              const amount = Math.min(e.resourceAmount!, MINING_RATE);
              e.resourceAmount! -= amount;
              const resType = e.resourceType || 'iron';
              newShip.cargo[resType] = (newShip.cargo[resType] || 0) + amount;
              
              if (Math.random() < 0.05) {
                 logEvent(`Extracting ${resType}...`, 'info');
              }
              
              if (e.resourceAmount! <= 0) {
                 logEvent(`${resType.toUpperCase()} deposit depleted.`, 'success');
                 e.health = 0; // Asteroid breaks apart when empty
              }
            }
          }
        }
      }
    }

    // Ship firing
    if (newShip.laserCooldown > 0) newShip.laserCooldown -= dt;
    if (newShip.isFiringLaser && newShip.laserCooldown <= 0) {
      let speedMult = 50;
      let cooldown = 0.2;
      let offsets = [0];
      
      if (newShip.weaponType === 'rapid') {
          speedMult = 65;
          cooldown = 0.08;
          offsets = [0];
      } else if (newShip.weaponType === 'heavy') {
          speedMult = 45;
          cooldown = 0.6;
          offsets = [-0.15, 0, 0.15];
      }

      for (let offset of offsets) {
          const fireAngle = newShip.angle + offset;
          newLasers.push({
            id: Math.random(),
            pos: newShip.pos.add(new Vec2(Math.cos(fireAngle) * 30, Math.sin(fireAngle) * 30)),
            vel: newShip.vel.add(new Vec2(Math.cos(fireAngle) * speedMult, Math.sin(fireAngle) * speedMult)),
            life: 5.0,
            friendly: true,
            weaponType: newShip.weaponType
          });
      }
      newSounds.push(`laser_${newShip.weaponType}`);
      newShip.laserCooldown = cooldown;
    }
  }

  // === ENTITIES PHYSICS & AI ===
  for (let i = 0; i < newEntities.length; i++) {
    let e = newEntities[i];
    if (e.health <= 0) continue; // dead

    let { force, collision } = applyGravityAndDrag(e.pos, e.vel, e.mass, planets);
    
    if (collision) {
      e.health = 0; // Destroyed on collision
      continue;
    }

    const distToPlayer = e.pos.distance(newShip.pos);
    
    // AI Logic
    let targetPos: Vec2 | null = null;
    let targetDist = Infinity;
    let shouldFlee = false;

    if (e.type === 'creature') {
        targetPos = newShip.pos;
        targetDist = distToPlayer;
        for (const other of newEntities) {
            if (other.id !== e.id && other.type === 'spaceship') {
                const d = e.pos.distance(other.pos);
                if (d < targetDist) {
                    targetDist = d;
                    targetPos = other.pos;
                }
            }
        }
        if (targetDist < 4000) {
           e.state = targetDist < 800 ? 'attack' : 'chase';
        } else {
           e.state = 'idle';
           targetPos = null;
        }
    } else if (e.type === 'doppleganger') {
        targetPos = newShip.pos;
        targetDist = distToPlayer;
        
        const wakeUpDist = (e.fakePlanetRadius || 100) + 1200;
        const attackDist = (e.fakePlanetRadius || 100) + 800;
        const fleeDist = (e.fakePlanetRadius || 100) + 3000;

        if (e.state === 'idle') {
            if (targetDist < wakeUpDist) {
                e.state = 'chase';
            } else {
                targetPos = null;
            }
        } else if (e.state === 'chase' || e.state === 'attack') {
            if (targetDist > fleeDist) {
                e.state = 'flee';
            } else if (targetDist < attackDist) {
                e.state = 'attack';
            } else {
                e.state = 'chase';
            }
        } else if (e.state === 'flee') {
            targetPos = e.originalPos || e.pos;
            let distToOrig = e.pos.distance(targetPos);
            if (distToOrig < 100) {
                e.health = 0; // disappear
                continue;
            }
            if (targetDist < wakeUpDist - 200) {
                e.state = 'chase'; // re-engage
            }
        }
    } else if (e.type === 'spaceship') {
        let localAllies = 0;
        let localEnemies = 0;
        const R_DETECT = 4000;
        for (const other of newEntities) {
            if (other.id !== e.id && other.pos.distance(e.pos) < R_DETECT) {
                if (other.attitude === e.attitude) localAllies++;
                else localEnemies++;
            }
        }
        if (isHostileToPlayer(e) && distToPlayer < R_DETECT) localEnemies++;
        else if (e.attitude === 'friendly' && distToPlayer < R_DETECT) localAllies++;
        
        const isOutnumbered = localEnemies > localAllies + 1;
        const isLowHealth = e.health < 30;
        const shouldRetreat = isLowHealth || isOutnumbered;

        const isActivelyHostile = isHostileToPlayer(e);

        if (isActivelyHostile) {
            targetPos = newShip.pos;
            targetDist = distToPlayer;
            
            for (const other of newEntities) {
               if (other.id !== e.id && (other.attitude === 'friendly' || other.type === 'creature')) {
                   const d = e.pos.distance(other.pos);
                   if (d < targetDist) {
                       targetDist = d;
                       targetPos = other.pos;
                   }
               }
            }

            if (targetDist < 6000) {
                if (shouldRetreat) {
                    e.state = 'flee';
                    shouldFlee = true;
                } else if (targetDist < 1200) {
                    e.state = 'attack';
                } else {
                    e.state = 'chase';
                }
            } else if (e.patrolTargetId) {
                e.state = 'patrol';
                targetPos = null;
            } else {
                e.state = 'idle';
                targetPos = null;
            }
        } else if (e.attitude === 'friendly' || (e.attitude === 'neutral')) {
            if (e.recruited) {
               let threatPos = null;
               let threatDist = Infinity;
               for (const other of newEntities) {
                   if (other.id !== e.id && (other.attitude === 'hostile' || other.type === 'creature')) {
                       const d = e.pos.distance(other.pos);
                       if (d < threatDist) {
                           threatDist = d;
                           threatPos = other.pos;
                       }
                   }
               }
               
                if (threatPos && threatDist < 3000) {
                    targetPos = threatPos;
                    targetDist = threatDist;
                    if (shouldRetreat) {
                        e.state = 'flee';
                        shouldFlee = true;
                    } else if (threatDist < 1200) {
                        e.state = 'attack';
                    } else {
                        e.state = 'chase';
                    }
                } else {
                    // Formation logic for recruited allies
                    const recruitedAllies = newEntities.filter(ent => ent.recruited);
                    const allyIndex = recruitedAllies.indexOf(e);
                    
                    const formationGap = 400;
                    const shipForward = new Vec2(Math.cos(newShip.angle), Math.sin(newShip.angle));
                    const shipRight = new Vec2(-Math.sin(newShip.angle), Math.cos(newShip.angle));
                    
                    let offset = new Vec2(0, 0);
                    if (newShip.formation === 'wedge') {
                        const row = Math.floor(allyIndex / 2) + 1;
                        const col = allyIndex % 2 === 0 ? 1 : -1;
                        offset = shipForward.mult(-row * formationGap).add(shipRight.mult(col * row * formationGap * 0.5));
                    } else if (newShip.formation === 'line') {
                        const col = allyIndex % 2 === 0 ? 1 : -1;
                        const posInLine = Math.floor(allyIndex / 2) + 1;
                        offset = shipRight.mult(col * posInLine * formationGap);
                    } else if (newShip.formation === 'echelon') {
                        offset = shipForward.mult(-(allyIndex + 1) * formationGap).add(shipRight.mult((allyIndex + 1) * formationGap * 0.5));
                    }
                    
                    targetPos = newShip.pos.add(offset);
                    targetDist = e.pos.distance(targetPos);
                    e.state = 'follow'; 
                }
            } else {
                // Find threats
                for (const other of newEntities) {
                    if (other.id !== e.id && (other.attitude === 'hostile' || other.type === 'creature')) {
                        const d = e.pos.distance(other.pos);
                        if (d < targetDist) {
                            targetDist = d;
                            targetPos = other.pos;
                        }
                    }
                }
    
                if (targetDist < 2000 || (newShip.isFiringLaser && distToPlayer < 1500) || (shouldRetreat && targetDist < 4000)) {
                    e.state = 'flee';
                    shouldFlee = true;
                    if (!targetPos || distToPlayer < targetDist) {
                        targetPos = newShip.pos; // Flee from player if they are shooting
                    }
                } else if (e.patrolTargetId) {
                    e.state = 'patrol';
                    targetPos = null;
                } else {
                    e.state = 'idle';
                    targetPos = null;
                }
            }
        }
    }
    
    // Update AI timers
    e.patrolTimer = (e.patrolTimer || 0) + dt;

    if ((e.state === 'idle' || e.state === 'patrol') && e.type === 'spaceship') {
        let nearest = null;
        if (e.state === 'patrol' && e.patrolTargetId) {
            nearest = planets.find(p => p.id === e.patrolTargetId);
        }
        
        if (!nearest) {
            let eNearestId = planets[0].id;
            let eMinDist = Infinity;
            for (const p of planets) {
                const d = p.pos.distance(e.pos);
                if (d < eMinDist) {
                    eMinDist = d;
                    eNearestId = p.id;
                }
            }
            nearest = planets.find(p => p.id === eNearestId);
        }

        if (nearest && nearest.id !== 'sol') {
           const rVec = e.pos.sub(nearest.pos);
           const r = rVec.mag();
           const patrolDist = nearest.radius + 1500 + (e.formationIndex || 0) * 300;
           
           if (r > patrolDist + 500) {
               // Head towards the patrol orbit
               const targetAngle = Math.atan2(nearest.pos.y - e.pos.y, nearest.pos.x - e.pos.x);
               let angleDiff = targetAngle - e.angle;
               while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
               while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
               if (angleDiff > 0.05) e.angularVel += 0.01;
               else if (angleDiff < -0.05) e.angularVel -= 0.01;
               
               if (Math.abs(angleDiff) < 1.0) {
                  const thrust = new Vec2(Math.cos(e.angle), Math.sin(e.angle)).mult(e.thrustForce);
                  force = force.add(thrust);
               }
           } else {
               // Orbit the planet
               const targetAngle = Math.atan2(rVec.y, rVec.x) + Math.PI / 2 + Math.sin(e.patrolTimer! / 5) * 0.2;
               
               let angleDiff = targetAngle - e.angle;
               while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
               while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
               
               if (angleDiff > 0.05) e.angularVel += 0.01;
               else if (angleDiff < -0.05) e.angularVel -= 0.01;
               
               const desiredVLevel = Math.sqrt((G * e.mass * nearest.mass) / Math.max(r, 1)) * 1.5;
               if (Math.abs(angleDiff) < 1.0 && e.vel.mag() < desiredVLevel) {
                  const thrust = new Vec2(Math.cos(e.angle), Math.sin(e.angle)).mult(e.thrustForce * 0.5);
                  force = force.add(thrust);
               }
           }
        }
    } else if (targetPos && (e.state === 'chase' || e.state === 'flee' || e.state === 'attack' || e.state === 'follow')) {
        let targetAngle = Math.atan2(targetPos.y - e.pos.y, targetPos.x - e.pos.x);
        
        if (shouldFlee) {
            targetAngle += Math.PI; // Flee in opposite direction
        } else if (e.type === 'doppleganger' && e.state === 'flee') {
            // targetAngle is already set towards originalPos, which is correct
            // we don't want to flee away from originalPos
        }

        // Evasive maneuvers and flanking
        if (e.state === 'attack' || e.state === 'chase' || e.state === 'flee' || e.state === 'follow') {
            if (e.state === 'attack' || e.state === 'flee') {
                e.evasionOffset = (Math.sin(e.patrolTimer! * 2) + Math.cos(e.patrolTimer! * 3)) * 0.5; // Irregular zig-zag
                targetAngle += e.evasionOffset * (shouldFlee ? 0.8 : 0.4); 
            }
            
            // Formation spreading and flanking for attackers
            if ((e.state === 'attack' || e.state === 'chase' || e.state === 'follow') && e.type === 'spaceship' && targetDist > 400) {
               const flankMult = e.formationIndex !== undefined ? (e.formationIndex % 2 === 0 ? 1 : -1) : 0;
               const flankSpread = e.formationIndex !== undefined ? Math.ceil(e.formationIndex / 2) : 0;
               targetAngle += flankMult * flankSpread * 0.6 * Math.min(1, targetDist / 1500);
            }
        }

        let angleDiff = targetAngle - e.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        if (angleDiff > 0.05) e.angularVel += 0.01;
        else if (angleDiff < -0.05) e.angularVel -= 0.01;
        
        if (Math.abs(angleDiff) < 0.5) {
            if (e.state === 'flee' && e.type !== 'doppleganger') {
               const thrust = new Vec2(Math.cos(e.angle), Math.sin(e.angle)).mult(e.thrustForce * 1.5);
               force = force.add(thrust);
            } else if (e.state === 'follow') {
               if (targetDist > 150) {
                   const thrust = new Vec2(Math.cos(e.angle), Math.sin(e.angle)).mult(e.thrustForce * (targetDist > 500 ? 1 : 0.5));
                   force = force.add(thrust);
               } else if (e.vel.mag() > 1) {
                   const brake = e.vel.normalize().mult(-e.thrustForce * 0.8);
                   force = force.add(brake);
               }
            } else if (targetDist > (e.type === 'creature' ? 200 : (e.type === 'doppleganger' ? (e.fakePlanetRadius || 100) + 200 : 500))) {
               const thrust = new Vec2(Math.cos(e.angle), Math.sin(e.angle)).mult(e.thrustForce);
               force = force.add(thrust);
            }
        }

        // Fire logic
        if (e.state === 'attack' && e.type === 'spaceship' && e.fireCooldown <= 0 && Math.abs(angleDiff) < 0.2) {
          newLasers.push({
            id: Math.random(),
            pos: e.pos.add(new Vec2(Math.cos(e.angle) * 30, Math.sin(e.angle) * 30)),
            vel: e.vel.add(new Vec2(Math.cos(e.angle) * 40, Math.sin(e.angle) * 40)),
            life: 5.0,
            friendly: !!e.recruited,
            weaponType: 'enemy'
          });
          newSounds.push('laser_enemy');
          e.fireCooldown = 1.0;
        }

        const attackRange = e.type === 'doppleganger' ? (e.fakePlanetRadius || 100) + 1000 : 1000;
        if (e.state === 'attack' && (e.type === 'creature' || e.type === 'doppleganger') && targetDist < attackRange && e.fireCooldown <= 0 && Math.abs(angleDiff) < 0.5) {
            const dirs = [-0.2, 0, 0.2];
            const spawnOffset = e.type === 'doppleganger' && e.fakePlanetRadius ? e.fakePlanetRadius + 50 : 30;
            for (let d of dirs) {
                newLasers.push({
                    id: Math.random(),
                    pos: e.pos.add(new Vec2(Math.cos(e.angle + d) * spawnOffset, Math.sin(e.angle + d) * spawnOffset)),
                    vel: e.vel.add(new Vec2(Math.cos(e.angle + d) * 40, Math.sin(e.angle + d) * 40)),
                    life: 5.0,
                    friendly: false,
                    weaponType: 'enemy'
                });
            }
            newSounds.push('laser_heavy'); // Use heavy sound for creature/doppleganger
            e.fireCooldown = e.type === 'doppleganger' ? 1.0 : 2.0;
        }
    }

    if (e.fireCooldown > 0) e.fireCooldown -= dt;

    const acceleration = force.div(e.mass);
    e.vel = e.vel.add(acceleration.mult(dt));
    e.pos = e.pos.add(e.vel.mult(dt));
    e.angularVel *= 0.90;
    e.angle += e.angularVel;
  }

  // === LASER PHYSICS ===
  let remainingLasers = [];
  for (let l of newLasers) {
    l.pos = l.pos.add(l.vel.mult(dt));
    l.life -= dt;
    let hit = false;
    
    // Check hit ship
    if (!l.friendly && newShip.state !== 'crashed' && newShip.state !== 'destroyed' && l.pos.distance(newShip.pos) < 15) {
      newShip.health -= 30;
      hit = true;
      spawnVFX('hit', l.pos, 5, '#ff4757', 3, 50);
      newSounds.push('hit');
      logEvent('Hull integrity damaged by enemy fire!', 'warning');
      if (newShip.health <= 0) {
          newShip.state = 'destroyed';
          spawnVFX('explosion', newShip.pos, 20, '#ff4757', 15, 100);
          newSounds.push('explosion');
          logEvent('Critical Failure: Hull Breach!', 'danger');
      }
    }

    // Check hit entity
    if (!hit) {
        if (l.friendly) {
          for (let e of newEntities) {
            let collisionDist = e.type === 'creature' ? 40 : 20;
            if (e.type === 'doppleganger' && e.fakePlanetRadius) {
                collisionDist = e.fakePlanetRadius;
            }
            if (e.health > 0 && l.pos.distance(e.pos) < collisionDist) {
              const damage = l.weaponType === 'heavy' ? 200 : (l.weaponType === 'rapid' ? 40 : 80);
              e.health -= damage;
              hit = true;
              
              const vfxColor = l.weaponType === 'heavy' ? '#e67e22' : (l.weaponType === 'rapid' ? '#3498db' : '#2ecc71');
              spawnVFX('hit', l.pos, 8, vfxColor, 4, 60);
              newSounds.push('hit');

              // Reputation hit for attacking non-hostiles
              if (!isHostileToPlayer(e)) {
                  changeReputation(e.factionId, -5);
              }

              if (e.health <= 0) {
                  spawnVFX('explosion', e.pos, 15, vfxColor, 10, 80);
                  newSounds.push('explosion');
                  
                  if (e.factionId === 'marauders' || e.factionId === 'creature') {
                      changeReputation('union', 2);
                      changeReputation('consortium', 1);
                  } else {
                      changeReputation(e.factionId, -15);
                  }
                  
                  logEvent(`Destroyed: ${e.type === 'creature' ? 'Unidentified Creature' : 'Vessel'}`, 'info');
              }
            }
          }
        } else {
          for (let e of newEntities) {
            if (e.health > 0 && e.attitude === 'friendly' && l.pos.distance(e.pos) < 20) {
              e.health -= 60;
              hit = true;
              spawnVFX('hit', l.pos, 5, '#ff4757', 3, 50);
              newSounds.push('hit');
              if (e.recruited) {
                  logEvent('Ally under fire!', 'warning');
              }
              if (e.health <= 0) {
                  spawnVFX('explosion', e.pos, 15, '#ff4757', 10, 80);
                  newSounds.push('explosion');
                  logEvent(`Ally ship lost.`, 'danger');
              }
            }
          }
        }
    }

    // Avoid hitting planets
    for (const p of planets) {
      if (l.pos.distance(p.pos) < p.radius) {
        hit = true;
        break;
      }
    }

    if (l.life > 0 && !hit) remainingLasers.push(l);
  }

  newEntities = newEntities.filter(e => e.health > 0);

  // Ship damage smoke
  if (newShip.health < 50 && Math.random() < dt * 10) {
      spawnVFX('smoke', newShip.pos.add(new Vec2((Math.random()-0.5)*20, (Math.random()-0.5)*20)), 1, '#ffffff44', 5 + Math.random() * 10, 5);
  }

  return { ship: newShip, lasers: remainingLasers, entities: newEntities, vfx: newVfx, triggeredSounds: newSounds, visitedPlanets: newVisitedPlanets, combatLog: newCombatLog };
}
