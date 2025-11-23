/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PLAYER_SPEED, 
  PLAYER_SIZE, 
  PLAYER_MAX_HP,
  FIRE_RATE_MAIN,
  FIRE_RATE_MISSILE,
  BULLET_SPEED_MAIN,
  BULLET_SPEED_MISSILE,
  BULLET_SPEED_ENEMY,
  MAIN_GUN_DAMAGE,
  MISSILE_DAMAGE,
  COLORS,
  ENEMY_SPAWN_RATE_BASE,
  BOSS_SCORE_THRESHOLD,
  BOSS_HP,
  BOSS_WIDTH,
  BOSS_HEIGHT
} from '../constants';
import { 
  GameState, 
  Player, 
  Enemy, 
  Bullet, 
  BulletType, 
  Particle, 
  EnemyType, 
  Star 
} from '../types';
import { checkCollision, randomRange } from '../utils/math';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, setScore }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mutable game state (refs for performance)
  const playerRef = useRef<Player>({
    x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
    y: CANVAS_HEIGHT - 100,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    vx: 0,
    vy: 0,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    color: COLORS.player,
    score: 0,
    lastShotTime: 0,
    lastMissileTime: 0,
    missilesAvailable: 999
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const frameCountRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const animationFrameId = useRef<number>(0);
  
  // Boss state
  const hasSpawnedBossRef = useRef<boolean>(false);
  const bossActiveRef = useRef<boolean>(false);

  // Message state (for "BOSS DEFEATED" etc)
  const messageRef = useRef<{text: string, timer: number} | null>(null);

  // Track previous game state to detect transitions
  const prevGameState = useRef<GameState>(gameState);

  // Initialize Stars Background
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 3 + 0.5,
        brightness: Math.random(),
      });
    }
    starsRef.current = stars;
  }, []);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Reset Game Logic
  const resetGame = useCallback(() => {
    playerRef.current = {
      x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2,
      y: CANVAS_HEIGHT - 100,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      vx: 0,
      vy: 0,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      color: COLORS.player,
      score: 0,
      lastShotTime: 0,
      lastMissileTime: 0,
      missilesAvailable: 999
    };
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    hasSpawnedBossRef.current = false;
    bossActiveRef.current = false;
    messageRef.current = null;
    frameCountRef.current = 0;
    setScore(0);
  }, [setScore]);

  // Trigger reset ONLY when switching TO Playing from another state
  useEffect(() => {
    if (gameState === GameState.PLAYING && prevGameState.current !== GameState.PLAYING) {
      resetGame();
    }
    prevGameState.current = gameState;
  }, [gameState, resetGame]);

  // Helper: Create Explosions
  const createExplosion = (x: number, y: number, color: string, count: number, speedMultiplier: number = 1) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10 * speedMultiplier,
        vy: (Math.random() - 0.5) * 10 * speedMultiplier,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        color: color,
        size: Math.random() * 4 + 2
      });
    }
  };

  // Spawning Logic
  const spawnEnemy = (difficultyMultiplier: number) => {
    const rand = Math.random();
    let type = EnemyType.DRONE;
    let width = 30;
    let height = 30;
    let hp = 20;
    let speed = 2;
    let color = COLORS.enemyDrone;
    let scoreValue = 100;

    if (rand > 0.7 && rand < 0.9) {
      type = EnemyType.FIGHTER;
      width = 40;
      height = 40;
      hp = 40;
      speed = 3;
      color = COLORS.enemyFighter;
      scoreValue = 300;
    } else if (rand >= 0.9) {
      type = EnemyType.BOMBER;
      width = 60;
      height = 50;
      hp = 120;
      speed = 1;
      color = COLORS.enemyBomber;
      scoreValue = 500;
    }

    enemiesRef.current.push({
      x: randomRange(0, CANVAS_WIDTH - width),
      y: -height,
      width,
      height,
      vx: 0,
      vy: speed + (difficultyMultiplier * 0.5),
      hp,
      maxHp: hp,
      type,
      color,
      scoreValue
    });
  };

  const spawnBoss = () => {
    enemiesRef.current.push({
      x: CANVAS_WIDTH / 2 - BOSS_WIDTH / 2,
      y: -BOSS_HEIGHT - 50, // Start well above screen
      width: BOSS_WIDTH,
      height: BOSS_HEIGHT,
      vx: 0,
      vy: 1,
      hp: BOSS_HP,
      maxHp: BOSS_HP,
      type: EnemyType.BOSS,
      color: COLORS.enemyBoss,
      scoreValue: 10000,
      attackTimer: 0
    });
    bossActiveRef.current = true;
  };

  // Main Game Loop
  const update = useCallback((timestamp: number) => {
    if (gameState !== GameState.PLAYING) {
      updateStars();
      draw();
      animationFrameId.current = requestAnimationFrame(update);
      return;
    }

    const player = playerRef.current;
    const keys = keysPressed.current;

    // --- Player Movement ---
    if (keys.has('ArrowUp')) player.y = Math.max(0, player.y - PLAYER_SPEED);
    if (keys.has('ArrowDown')) player.y = Math.min(CANVAS_HEIGHT - player.height, player.y + PLAYER_SPEED);
    if (keys.has('ArrowLeft')) player.x = Math.max(0, player.x - PLAYER_SPEED);
    if (keys.has('ArrowRight')) player.x = Math.min(CANVAS_WIDTH - player.width, player.x + PLAYER_SPEED);

    // --- Shooting ---
    // Main Gun (Auto) - TRIPLE SHOT
    if (timestamp - player.lastShotTime > FIRE_RATE_MAIN) {
      // Center
      bulletsRef.current.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 12,
        vx: 0,
        vy: -BULLET_SPEED_MAIN,
        hp: 1,
        maxHp: 1,
        color: COLORS.playerBullet,
        damage: MAIN_GUN_DAMAGE,
        type: BulletType.PLAYER_MAIN,
        active: true
      });
      // Left
      bulletsRef.current.push({
        x: player.x + 4,
        y: player.y + 12,
        width: 4,
        height: 12,
        vx: 0,
        vy: -BULLET_SPEED_MAIN,
        hp: 1,
        maxHp: 1,
        color: COLORS.playerBullet,
        damage: MAIN_GUN_DAMAGE,
        type: BulletType.PLAYER_MAIN,
        active: true
      });
      // Right
      bulletsRef.current.push({
        x: player.x + player.width - 8,
        y: player.y + 12,
        width: 4,
        height: 12,
        vx: 0,
        vy: -BULLET_SPEED_MAIN,
        hp: 1,
        maxHp: 1,
        color: COLORS.playerBullet,
        damage: MAIN_GUN_DAMAGE,
        type: BulletType.PLAYER_MAIN,
        active: true
      });
      player.lastShotTime = timestamp;
    }

    // Missile (Space)
    if (keys.has('Space') && timestamp - player.lastMissileTime > FIRE_RATE_MISSILE) {
      bulletsRef.current.push({
        x: player.x,
        y: player.y + 10,
        width: 8,
        height: 20,
        vx: -1,
        vy: -BULLET_SPEED_MISSILE,
        hp: 1,
        maxHp: 1,
        color: COLORS.missile,
        damage: MISSILE_DAMAGE,
        type: BulletType.PLAYER_MISSILE,
        active: true
      });
      bulletsRef.current.push({
        x: player.x + player.width - 8,
        y: player.y + 10,
        width: 8,
        height: 20,
        vx: 1,
        vy: -BULLET_SPEED_MISSILE,
        hp: 1,
        maxHp: 1,
        color: COLORS.missile,
        damage: MISSILE_DAMAGE,
        type: BulletType.PLAYER_MISSILE,
        active: true
      });
      player.lastMissileTime = timestamp;
    }

    // --- Enemy Spawning ---
    frameCountRef.current++;
    
    // Check if Boss is present
    const currentBoss = enemiesRef.current.find(e => e.type === EnemyType.BOSS);
    bossActiveRef.current = !!currentBoss;

    if (!bossActiveRef.current) {
      // Normal spawning logic
      const difficulty = Math.floor(player.score / 1000);
      const spawnRate = Math.max(20, ENEMY_SPAWN_RATE_BASE - difficulty * 2);
      
      if (player.score >= BOSS_SCORE_THRESHOLD && !hasSpawnedBossRef.current) {
        // Time for the Boss!
        spawnBoss();
        hasSpawnedBossRef.current = true;
      } else if (frameCountRef.current % spawnRate === 0) {
        spawnEnemy(difficulty * 0.1);
      }
    }

    // --- Enemy Logic ---
    enemiesRef.current.forEach(enemy => {
      if (enemy.type === EnemyType.BOSS) {
        // BOSS AI
        // 1. Entry Phase: Move down to Y=80
        if (enemy.y < 80) {
          enemy.y += 1.5;
        } else {
          // 2. Combat Phase: Oscillation
          enemy.vx = Math.sin(frameCountRef.current * 0.02) * 2;
          enemy.x += enemy.vx;
          // Keep in bounds
          if (enemy.x < 0) enemy.x = 0;
          if (enemy.x > CANVAS_WIDTH - enemy.width) enemy.x = CANVAS_WIDTH - enemy.width;

          // 3. Attack Patterns
          if (!enemy.attackTimer) enemy.attackTimer = 0;
          enemy.attackTimer++;

          // Pattern A: Fast aimed shots (every 60 frames)
          if (enemy.attackTimer % 60 === 0) {
            const dx = (player.x + player.width/2) - (enemy.x + enemy.width/2);
            const dy = (player.y + player.height/2) - (enemy.y + enemy.height/2);
            const mag = Math.sqrt(dx*dx + dy*dy);
            
            bulletsRef.current.push({
              x: enemy.x + enemy.width / 2 - 5,
              y: enemy.y + enemy.height - 10,
              width: 10,
              height: 10,
              vx: (dx / mag) * 7,
              vy: (dy / mag) * 7,
              hp: 1,
              maxHp: 1,
              color: COLORS.bossBullet,
              damage: 20,
              type: BulletType.ENEMY_BOSS_MAIN,
              active: true
            });
          }

          // Pattern B: Spread shot (every 150 frames)
          if (enemy.attackTimer % 150 === 0) {
            for (let i = -2; i <= 2; i++) {
              bulletsRef.current.push({
                x: enemy.x + enemy.width / 2 - 4,
                y: enemy.y + enemy.height / 2,
                width: 8,
                height: 8,
                vx: i * 2,
                vy: 5,
                hp: 1,
                maxHp: 1,
                color: COLORS.enemyBullet,
                damage: 15,
                type: BulletType.ENEMY_BOSS_SPREAD,
                active: true
              });
            }
          }
        }

      } else {
        // Standard Enemy Logic
        enemy.y += enemy.vy;
        // Simple random shooting
        if (Math.random() < 0.01) {
           bulletsRef.current.push({
            x: enemy.x + enemy.width / 2 - 4,
            y: enemy.y + enemy.height,
            width: 8,
            height: 8,
            vx: 0,
            vy: BULLET_SPEED_ENEMY,
            hp: 1,
            maxHp: 1,
            color: COLORS.enemyBullet,
            damage: 10,
            type: BulletType.ENEMY_NORMAL,
            active: true
          });
        }
      }
    });

    // --- Bullet Logic ---
    bulletsRef.current.forEach(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Bounds check
      if (bullet.y < -50 || bullet.y > CANVAS_HEIGHT + 50 || bullet.x < -50 || bullet.x > CANVAS_WIDTH + 50) {
        bullet.active = false;
      }
    });

    // --- Collision Detection ---
    
    // 1. Player Bullets hitting Enemies
    const playerBullets = bulletsRef.current.filter(b => 
      (b.type === BulletType.PLAYER_MAIN || b.type === BulletType.PLAYER_MISSILE) && b.active
    );
    
    playerBullets.forEach(bullet => {
      enemiesRef.current.forEach(enemy => {
        if (checkCollision(bullet, enemy)) {
          bullet.active = false;
          enemy.hp -= bullet.damage;
          createExplosion(bullet.x, bullet.y, COLORS.particleExplosion, 3);
          
          if (enemy.hp <= 0) {
            // Boss Death Logic
            if (enemy.type === EnemyType.BOSS) {
              createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, COLORS.enemyBoss, 100, 2);
              bossActiveRef.current = false;
              
              // Victory Message
              messageRef.current = { text: "MISSION COMPLETE", timer: 200 };
              player.score += enemy.scoreValue;

              // Delay before Victory Screen to allow seeing the explosion
              setTimeout(() => {
                 setGameState(GameState.VICTORY);
              }, 3000);

            } else {
              createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, 15);
              player.score += enemy.scoreValue;
            }
            setScore(player.score); 
          }
        }
      });
    });

    // 2. Enemy Bullets hitting Player
    const enemyBullets = bulletsRef.current.filter(b => 
      (b.type === BulletType.ENEMY_NORMAL || b.type === BulletType.ENEMY_BOSS_MAIN || b.type === BulletType.ENEMY_BOSS_SPREAD) && b.active
    );

    enemyBullets.forEach(bullet => {
      if (checkCollision(bullet, player)) {
        bullet.active = false;
        player.hp -= bullet.damage;
        createExplosion(bullet.x, bullet.y, COLORS.player, 5);
      }
    });

    // 3. Enemies colliding with Player
    enemiesRef.current.forEach(enemy => {
      if (checkCollision(enemy, player)) {
        player.hp -= 20;
        // Boss doesn't die from collision, but takes damage? 
        if (enemy.type === EnemyType.BOSS) {
          enemy.hp -= 50; 
        } else {
          enemy.hp = 0; // Kamikaze destroys normal enemy
          createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, COLORS.enemyDrone, 10);
        }
      }
    });

    // --- Cleanup ---
    enemiesRef.current = enemiesRef.current.filter(e => e.y < CANVAS_HEIGHT + 50 && e.hp > 0);
    bulletsRef.current = bulletsRef.current.filter(b => b.active);
    
    // --- Particle Logic ---
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // --- Message Logic ---
    if (messageRef.current) {
      messageRef.current.timer--;
      if (messageRef.current.timer <= 0) {
        messageRef.current = null;
      }
    }

    // --- Game Over Check ---
    if (player.hp <= 0) {
      createExplosion(player.x, player.y, COLORS.player, 50);
      setGameState(GameState.GAME_OVER);
    }

    // Update Stars and Draw everything
    updateStars();
    draw();

    animationFrameId.current = requestAnimationFrame(update);
  }, [gameState, setGameState, setScore]);

  const updateStars = () => {
     starsRef.current.forEach(star => {
      star.y += star.speed;
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#020617'; // Slate 950 background
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Stars
    starsRef.current.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    const player = playerRef.current;

    // --- Draw Player ---
    if (player.hp > 0) {
      ctx.save();
      // Move context to center of player for easier drawing
      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;
      ctx.translate(px, py);

      // Engine Flame
      ctx.fillStyle = '#0ea5e9'; // Sky 500
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#0ea5e9';
      ctx.beginPath();
      ctx.moveTo(-4, player.height/2 - 5);
      ctx.lineTo(4, player.height/2 - 5);
      // Flicker effect
      ctx.lineTo(0, player.height/2 + 15 + Math.random() * 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Main Body (Delta Wing)
      ctx.fillStyle = '#e2e8f0'; // Slate 200
      ctx.beginPath();
      ctx.moveTo(0, -player.height/2); // Nose
      ctx.lineTo(player.width/2, player.height/2); // Right Rear
      ctx.lineTo(0, player.height/2 - 10); // Engine Notch
      ctx.lineTo(-player.width/2, player.height/2); // Left Rear
      ctx.closePath();
      ctx.fill();

      // Inner Body Details
      ctx.fillStyle = player.color; // Player blue
      ctx.beginPath();
      ctx.moveTo(0, -player.height/2 + 5); 
      ctx.lineTo(8, player.height/2 - 5); 
      ctx.lineTo(0, player.height/2 - 12); 
      ctx.lineTo(-8, player.height/2 - 5); 
      ctx.fill();

      // Extra Gun Barrels (Visuals for Triple Shot)
      ctx.fillStyle = '#94a3b8'; // Slate 400
      ctx.fillRect(-player.width/2 + 2, player.height/2 - 15, 6, 12); // Left
      ctx.fillRect(player.width/2 - 8, player.height/2 - 15, 6, 12);  // Right

      // Cockpit
      ctx.fillStyle = '#1e293b'; // Dark Slate
      ctx.beginPath();
      ctx.ellipse(0, -5, 3, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing Accents
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-player.width/2 + 5, player.height/2 - 5);
      ctx.lineTo(-player.width/2 + 5, player.height/2 - 15);
      ctx.moveTo(player.width/2 - 5, player.height/2 - 5);
      ctx.lineTo(player.width/2 - 5, player.height/2 - 15);
      ctx.stroke();

      ctx.restore();
    }

    // --- Draw Enemies ---
    enemiesRef.current.forEach(enemy => {
      ctx.save();
      const ex = enemy.x + enemy.width/2;
      const ey = enemy.y + enemy.height/2;
      ctx.translate(ex, ey);
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = enemy.color;
      ctx.fillStyle = enemy.color;

      if (enemy.type === EnemyType.DRONE) {
        // --- DRONE ---
        ctx.beginPath();
        ctx.moveTo(0, enemy.height/2); 
        ctx.lineTo(enemy.width/2, -enemy.height/4); 
        ctx.lineTo(0, -enemy.height/2); 
        ctx.lineTo(-enemy.width/2, -enemy.height/4); 
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI*2);
        ctx.fill();

      } else if (enemy.type === EnemyType.FIGHTER) {
        // --- FIGHTER ---
        ctx.beginPath();
        ctx.moveTo(0, enemy.height/2); 
        ctx.lineTo(6, -enemy.height/2); 
        ctx.lineTo(-6, -enemy.height/2); 
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, 0); 
        ctx.lineTo(enemy.width/2, enemy.height/2 - 5); 
        ctx.lineTo(6, 10); 
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-4, 0); 
        ctx.lineTo(-enemy.width/2, enemy.height/2 - 5); 
        ctx.lineTo(-6, 10); 
        ctx.fill();
        ctx.fillStyle = '#991b1b'; 
        ctx.fillRect(-2, -enemy.height/4, 4, enemy.height/2);

      } else if (enemy.type === EnemyType.BOMBER) {
        // --- BOMBER ---
        ctx.beginPath();
        const r = enemy.width / 2;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = r * Math.cos(angle);
          const y = r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#e879f9';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI*2);
        ctx.stroke();
        ctx.fillStyle = '#581c87'; 
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI*2);
        ctx.fill();
      } else if (enemy.type === EnemyType.BOSS) {
         // --- BOSS ---
         // Massive Main Body
         ctx.fillStyle = '#450a0a'; // Deep Red Black
         ctx.beginPath();
         // Main central spike
         ctx.moveTo(0, enemy.height/2); 
         ctx.lineTo(30, 0);
         ctx.lineTo(enemy.width/2, -enemy.height/3);
         ctx.lineTo(20, -enemy.height/2);
         ctx.lineTo(-20, -enemy.height/2);
         ctx.lineTo(-enemy.width/2, -enemy.height/3);
         ctx.lineTo(-30, 0);
         ctx.closePath();
         ctx.fill();

         // Glowing Core
         ctx.shadowBlur = 30;
         ctx.shadowColor = '#ef4444';
         ctx.fillStyle = '#ef4444';
         ctx.beginPath();
         ctx.arc(0, -10, 20, 0, Math.PI*2);
         ctx.fill();
         ctx.fillStyle = '#fecaca';
         ctx.beginPath();
         ctx.arc(0, -10, 10, 0, Math.PI*2);
         ctx.fill();
         ctx.shadowBlur = 10;

         // Wings/Guns
         ctx.fillStyle = '#7f1d1d';
         ctx.beginPath();
         ctx.moveTo(40, -20);
         ctx.lineTo(enemy.width/2 + 10, 10);
         ctx.lineTo(enemy.width/2, -40);
         ctx.fill();
         
         ctx.beginPath();
         ctx.moveTo(-40, -20);
         ctx.lineTo(-(enemy.width/2 + 10), 10);
         ctx.lineTo(-enemy.width/2, -40);
         ctx.fill();
      }
      
      ctx.restore();
    });

    // Draw Bullets
    bulletsRef.current.forEach(bullet => {
      ctx.fillStyle = bullet.color;
      ctx.shadowBlur = 5;
      ctx.shadowColor = bullet.color;
      
      if (bullet.type === BulletType.PLAYER_MAIN) {
         ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
         ctx.fillStyle = 'white';
         ctx.fillRect(bullet.x + 1, bullet.y + 2, bullet.width - 2, bullet.height - 4);
      } else if (bullet.type === BulletType.PLAYER_MISSILE) {
        ctx.beginPath();
        ctx.moveTo(bullet.x + bullet.width/2, bullet.y);
        ctx.lineTo(bullet.x + bullet.width, bullet.y + bullet.height);
        ctx.lineTo(bullet.x + bullet.width/2, bullet.y + bullet.height - 4);
        ctx.lineTo(bullet.x, bullet.y + bullet.height);
        ctx.fill();
        if (Math.random() > 0.5) {
           ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
           ctx.beginPath();
           ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height + 5, 2, 0, Math.PI*2);
           ctx.fill();
        }
      } else if (bullet.type === BulletType.ENEMY_BOSS_MAIN) {
        // Big boss energy ball
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height/2, bullet.width/2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height/2, bullet.width/3, 0, Math.PI*2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height/2, bullet.width/2, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });
    
    // Draw HUD on Canvas (Score/HP)
    if (gameState === GameState.PLAYING || gameState === GameState.VICTORY) {
      ctx.font = 'bold 20px Courier New';
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 2;
      ctx.fillText(`SCORE: ${playerRef.current.score}`, 20, 30);
      
      // HP Bar
      const hpPercent = Math.max(0, playerRef.current.hp / playerRef.current.maxHp);
      ctx.fillStyle = '#334155';
      ctx.fillRect(20, 45, 200, 15);
      ctx.fillStyle = hpPercent > 0.3 ? '#22c55e' : '#ef4444';
      ctx.fillRect(20, 45, 200 * hpPercent, 15);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 45, 200, 15);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.fillText("SHIELD", 230, 58);

      // BOSS HP BAR
      const boss = enemiesRef.current.find(e => e.type === EnemyType.BOSS);
      if (boss && boss.hp > 0) {
        const bossHpPercent = Math.max(0, boss.hp / boss.maxHp);
        const barWidth = CANVAS_WIDTH - 40;
        const barX = 20;
        const barY = 80;
        
        ctx.fillStyle = '#334155';
        ctx.fillRect(barX, barY, barWidth, 20);
        ctx.fillStyle = '#dc2626'; // Boss Red
        ctx.fillRect(barX, barY, barWidth * bossHpPercent, 20);
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, 20);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("WARNING: GIANT BATTLESHIP DETECTED", CANVAS_WIDTH/2, barY - 10);
        ctx.textAlign = 'left'; // Reset
      }

      // Victory Message
      if (messageRef.current) {
        ctx.save();
        ctx.shadowColor = '#facc15'; // Yellow glow
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fef08a';
        ctx.font = '900 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(messageRef.current.text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.strokeText(messageRef.current.text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.restore();
      }

      ctx.shadowBlur = 0;
    }
  };

  // Start Loop
  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(update);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [update]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="bg-slate-950 shadow-2xl rounded-lg cursor-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export default GameCanvas;