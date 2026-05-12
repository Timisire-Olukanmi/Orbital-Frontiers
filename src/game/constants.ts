import { Vec2 } from './vec2';

// Universal Constants
export const G = 0.5; // Gravitational constant for our universe

export type FactionId = 'union' | 'consortium' | 'syndicate' | 'marauders' | 'independent' | 'creature';

export type Planet = {
  id: string;
  name: string;
  pos: Vec2;
  mass: number;
  radius: number;
  color: string;
  atmosphereRadius: number;
  atmosphereDrag: number;
  surfaceFriction: number;
  type: 'planet' | 'star' | 'moon' | 'gas_giant';
  hasSociety?: boolean;
  societyAttitude?: 'friendly' | 'hostile';
  factionId?: FactionId;
};

export const PLANETS: Planet[] = [
  { id: 'terra', name: 'Terra', pos: new Vec2(0, 0), mass: 10000, radius: 400, color: '#3498db', atmosphereRadius: 600, atmosphereDrag: 0.05, surfaceFriction: 0.8, type: 'planet', hasSociety: true, societyAttitude: 'friendly', factionId: 'union' },
  { id: 'ares', name: 'Ares', pos: new Vec2(4000, -2000), mass: 3000, radius: 200, color: '#e74c3c', atmosphereRadius: 250, atmosphereDrag: 0.01, surfaceFriction: 0.9, type: 'planet', factionId: 'consortium' },
  { id: 'sol', name: 'Sol (Star)', pos: new Vec2(0, 5000), mass: 100000, radius: 1000, color: '#f1c40f', atmosphereRadius: 1500, atmosphereDrag: 0.2, surfaceFriction: 0, type: 'star' },
  { id: 'luna', name: 'Luna', pos: new Vec2(-1000, 1000), mass: 800, radius: 100, color: '#bdc3c7', atmosphereRadius: 0, atmosphereDrag: 0.0, surfaceFriction: 0.95, type: 'moon', factionId: 'union' },
  { id: 'vulcan', name: 'Vulcan', pos: new Vec2(2000, 6000), mass: 6000, radius: 300, color: '#9b111e', atmosphereRadius: 400, atmosphereDrag: 0.03, surfaceFriction: 0.7, type: 'planet', hasSociety: true, societyAttitude: 'hostile', factionId: 'marauders' },
  { id: 'cryos', name: 'Cryos', pos: new Vec2(-5000, -3000), mass: 4000, radius: 250, color: '#74b9ff', atmosphereRadius: 300, atmosphereDrag: 0.02, surfaceFriction: 0.9, type: 'planet', factionId: 'independent' },
  { id: 'jovian', name: 'Jovian', pos: new Vec2(12000, 0), mass: 35000, radius: 800, color: '#e1b12c', atmosphereRadius: 1600, atmosphereDrag: 0.1, surfaceFriction: 0.4, type: 'gas_giant' },
  { id: 'jovian_moon1', name: 'Io', pos: new Vec2(10000, 500), mass: 900, radius: 120, color: '#fbc531', atmosphereRadius: 0, atmosphereDrag: 0, surfaceFriction: 0.9, type: 'moon', hasSociety: true, societyAttitude: 'hostile', factionId: 'marauders' },
  { id: 'jovian_moon2', name: 'Europa', pos: new Vec2(14000, -600), mass: 1200, radius: 150, color: '#dcdde1', atmosphereRadius: 180, atmosphereDrag: 0.01, surfaceFriction: 0.95, type: 'moon' },
  { id: 'nexus', name: 'Nexus Prime', pos: new Vec2(-8000, 8000), mass: 8000, radius: 350, color: '#9c88ff', atmosphereRadius: 500, atmosphereDrag: 0.04, surfaceFriction: 0.8, type: 'planet', hasSociety: true, societyAttitude: 'friendly', factionId: 'syndicate' },
  { id: 'tartarus', name: 'Tartarus', pos: new Vec2(-10000, -10000), mass: 5000, radius: 280, color: '#2f3640', atmosphereRadius: 450, atmosphereDrag: 0.08, surfaceFriction: 0.6, type: 'planet', hasSociety: true, societyAttitude: 'hostile', factionId: 'marauders' },
  { id: 'veridian', name: 'Veridian', pos: new Vec2(8000, 10000), mass: 7000, radius: 320, color: '#44bd32', atmosphereRadius: 480, atmosphereDrag: 0.05, surfaceFriction: 0.8, type: 'planet', hasSociety: true, societyAttitude: 'friendly', factionId: 'syndicate' },
  { id: 'obsidian', name: 'Obsidian', pos: new Vec2(5000, -8000), mass: 9000, radius: 380, color: '#1e272e', atmosphereRadius: 0, atmosphereDrag: 0, surfaceFriction: 0.9, type: 'planet', factionId: 'consortium' }
];

export type ShipState = {
  pos: Vec2;
  vel: Vec2;
  angle: number; // in radians
  angularVel: number;
  mass: number;
  fuel: number;
  health: number;
  mainThrustForce: number;
  rcsThrustForce: number; // For turning
  isMainEngineOn: boolean;
  isRcsLeftOn: boolean;
  isRcsRightOn: boolean;
  isRetroOn: boolean;
  isFiringLaser: boolean;
  state: 'flying' | 'landed' | 'crashed' | 'destroyed';
  landedOn: string | null;
  laserCooldown: number;
  isWarpJumping: boolean;
  warpProgress: number;
  warpCooldown: number;
  targetPlanetId: string | null;
  credits: number;
  color: string;
  weaponType: 'basic' | 'rapid' | 'heavy';
  formation: 'wedge' | 'line' | 'echelon';
  miningLaserActive: boolean;
  cargo: { [key: string]: number };
  reputations: { [key in FactionId]: number };
};

export type VFX = {
  id: string;
  type: 'hit' | 'explosion' | 'spark' | 'smoke';
  pos: Vec2;
  life: number; // 0 to 1
  maxLife: number;
  color: string;
  size: number;
  vel?: Vec2;
};

export type SoundEffect = 'laser_basic' | 'laser_rapid' | 'laser_heavy' | 'laser_enemy' | 'hit' | 'explosion';

export const INITIAL_SHIP_STATE: ShipState = {
  pos: new Vec2(0, -500), // Starting parked just above Terra
  vel: new Vec2(3.5, 0),   // Starting orbital velocity roughly
  angle: 0,
  angularVel: 0,
  mass: 10,
  fuel: 3500,
  health: 100,
  mainThrustForce: 15, // Forward acceleration
  rcsThrustForce: 0.02, // Angular acceleration
  isMainEngineOn: false,
  isRcsLeftOn: false,
  isRcsRightOn: false,
  isRetroOn: false,
  isFiringLaser: false,
  state: 'flying',
  landedOn: null,
  laserCooldown: 0,
  isWarpJumping: false,
  warpProgress: 0,
  warpCooldown: 0,
  targetPlanetId: null,
  credits: 500,
  color: '#ffffff',
  weaponType: 'basic',
  formation: 'wedge',
  miningLaserActive: false,
  cargo: {},
  reputations: {
    union: 10,
    consortium: 0,
    syndicate: 0,
    marauders: -50,
    independent: 0,
    creature: -100
  },
};

export type Laser = {
  id: number;
  pos: Vec2;
  vel: Vec2;
  life: number;
  friendly: boolean;
  weaponType: 'basic' | 'rapid' | 'heavy' | 'enemy';
};

export type EntityType = 'spaceship' | 'creature' | 'doppleganger' | 'asteroid';

export type Entity = {
  id: string;
  type: EntityType;
  pos: Vec2;
  vel: Vec2;
  angle: number;
  angularVel: number;
  mass: number;
  health: number;
  attitude: 'friendly' | 'hostile' | 'neutral';
  state: 'idle' | 'chase' | 'flee' | 'attack' | 'patrol' | 'follow' | 'orbit';
  thrustForce: number;
  fireCooldown: number;
  originalPos?: Vec2;
  fakePlanetRadius?: number;
  fakePlanetColor?: string;
  patrolTargetId?: string;
  patrolTimer?: number;
  evasionOffset?: number;
  formationIndex?: number;
  recruited?: boolean;
  factionId?: FactionId;
  // Asteroid specific properties
  resourceType?: 'iron' | 'gold' | 'crystal' | 'platinum';
  resourceAmount?: number;
  size?: number;
};

// Initial Entities layout
export const INITIAL_ENTITIES: Entity[] = [
  { id: 'pirate_1', type: 'spaceship', pos: new Vec2(2200, 5800), vel: new Vec2(2, -1), angle: 0, angularVel: 0, mass: 8, health: 50, attitude: 'hostile', state: 'patrol', thrustForce: 15, fireCooldown: 0, patrolTargetId: 'vulcan', factionId: 'marauders' },
  { id: 'pirate_2', type: 'spaceship', pos: new Vec2(-9800, -10200), vel: new Vec2(0, 3), angle: 0, angularVel: 0, mass: 8, health: 50, attitude: 'hostile', state: 'patrol', thrustForce: 15, fireCooldown: 0, patrolTargetId: 'tartarus', factionId: 'marauders' },
  { id: 'creature_1', type: 'creature', pos: new Vec2(8000, 0), vel: new Vec2(0, 0), angle: 0, angularVel: 0, mass: 200, health: 2000, attitude: 'hostile', state: 'idle', thrustForce: 200, fireCooldown: 0, factionId: 'creature' },
  { id: 'trader_1', type: 'spaceship', pos: new Vec2(-8200, 7800), vel: new Vec2(1, 1), angle: 0, angularVel: 0, mass: 15, health: 100, attitude: 'friendly', state: 'patrol', thrustForce: 12, fireCooldown: 0, patrolTargetId: 'nexus', factionId: 'syndicate' },
];

export type CombatLogEntry = {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  timestamp: number;
};

export type GameState = {
  ship: ShipState;
  lasers: Laser[];
  entities: Entity[];
  vfx: VFX[];
  triggeredSounds: SoundEffect[];
  visitedPlanets: string[];
  combatLog: CombatLogEntry[];
};

