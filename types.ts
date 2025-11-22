export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  color: string;
}

export interface Player extends Entity {
  score: number;
  lastShotTime: number;
  lastMissileTime: number;
  missilesAvailable: number;
}

export enum EnemyType {
  DRONE = 'DRONE',
  FIGHTER = 'FIGHTER',
  BOMBER = 'BOMBER',
  BOSS = 'BOSS'
}

export interface Enemy extends Entity {
  type: EnemyType;
  scoreValue: number;
  attackTimer?: number; // For boss attack patterns
}

export enum BulletType {
  PLAYER_MAIN = 'PLAYER_MAIN',
  PLAYER_MISSILE = 'PLAYER_MISSILE',
  ENEMY_NORMAL = 'ENEMY_NORMAL',
  ENEMY_BOSS_MAIN = 'ENEMY_BOSS_MAIN',
  ENEMY_BOSS_SPREAD = 'ENEMY_BOSS_SPREAD'
}

export interface Bullet extends Entity {
  damage: number;
  type: BulletType;
  active: boolean;
}

export interface Particle extends Point {
  vx: number;
  vy: number;
  life: number; // 0 to 1
  decay: number;
  color: string;
  size: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}