const BRAWLER_DEFS = [
  { id: 'bull',   name: 'Bull',   Class: Bull,   color: 0x8B4513, desc: 'High HP shotgun + dash' },
  { id: 'colt',   name: 'Colt',   Class: Colt,   color: 0x1a78c2, desc: 'Fast 3-bullet gunner' },
  { id: 'brock',  name: 'Brock',  Class: Brock,  color: 0x228B22, desc: 'Long-range rocket' },
  { id: 'barley', name: 'Barley', Class: Barley, color: 0x9932CC, desc: 'Arc bottles over walls' },
  { id: 'poco',   name: 'Poco',   Class: Poco,   color: 0xFFD700, desc: 'Heals allies with super' },
  { id: 'leon',   name: 'Leon',   Class: Leon,   color: 0x2d6b8a, desc: 'Assassin turns invisible' },
];

class Game {
  constructor() {
    this.state  = 'menu';

    // Selected options
    this.selectedBrawler = BRAWLER_DEFS[0];
    this.selectedMode    = 'showdown';

    // Subsystems (created on first play)
    this.renderer         = null;
    this.input            = null;
    this.camera           = null;
    this.physics          = null;
    this.projectileManager = null;
    this.map              = null;
    this.hud              = null;
    this.gameMode         = null;

    // Brawler roster available to bots
    this.BRAWLER_CLASSES = [Bull, Colt, Brock, Barley, Poco, Leon];
    this._BotAI = BotAI;

    // Active entities
    this.player      = null;
    this.bots        = [];       // BotAI[]
    this.allBrawlers = [];       // Brawler[]

    this._lastTime     = 0;
    this._countdownNum = 3;
    this._countdownTimer = 0;
  }

  init() {
    this._buildMenu();
    requestAnimationFrame(t => this._loop(t));
  }

  // ── Menu ────────────────────────────────────────────────────────────────────

  _buildMenu() {
    // Brawler cards
    const grid = document.getElementById('brawler-select');
    BRAWLER_DEFS.forEach((def, i) => {
      const card = document.createElement('div');
      card.className = 'brawler-card' + (i === 0 ? ' selected' : '');
      card.innerHTML = `
        <div class="brawler-avatar" style="background:${this._hex(def.color)}"></div>
        <div class="brawler-name">${def.name}</div>
        <div class="brawler-desc">${def.desc}</div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.brawler-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedBrawler = def;
      });
      grid.appendChild(card);
    });

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedMode = btn.dataset.mode;
      });
    });

    // Action buttons
    document.getElementById('btn-play').addEventListener('click', () => this._startGame());
    document.getElementById('btn-restart').addEventListener('click', () => this._startGame());
    document.getElementById('btn-menu').addEventListener('click', () => this._goMenu());
  }

  _hex(n) { return '#' + n.toString(16).padStart(6, '0'); }

  // ── Game start ──────────────────────────────────────────────────────────────

  _startGame() {
    this._hideScreens();
    document.getElementById('hud').classList.remove('hidden');

    if (!this.renderer) {
      // First-time init
      const canvas = document.getElementById('game-canvas');
      this.renderer          = new Renderer(canvas);
      this.input             = new InputManager(canvas);
      this.camera            = new CameraController(this.renderer.camera);
      this.physics           = new PhysicsEngine();
      this.projectileManager = new ProjectileManager(this.renderer.scene, this.renderer.projectileGroup);
      this.hud               = new HUD();
    } else {
      this._cleanupGame();
    }

    // Create map
    this.map = new GameMap(this.renderer.scene, this.renderer.mapGroup, this.selectedMode);

    // Create mode
    const modes = { showdown: Showdown, gemgrab: GemGrab, brawlball: BrawlBall };
    this.gameMode = new modes[this.selectedMode](this);
    this.gameMode.init();

    // Set player HUD name
    this.hud.setBrawlerName(this.selectedBrawler.name.toUpperCase());

    this._beginCountdown();
  }

  _cleanupGame() {
    if (this.gameMode) this.gameMode.cleanup();
    if (this.map)      this.map.cleanup();
    if (this.projectileManager) this.projectileManager.removeAll();
    this.allBrawlers = [];
    this.bots        = [];
    this.player      = null;
    this.gameMode    = null;
    this.map         = null;
  }

  _goMenu() {
    this._cleanupGame();
    this._hideScreens();
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('screen-menu').classList.remove('hidden');
    this.state = 'menu';
  }

  // ── Countdown ───────────────────────────────────────────────────────────────

  _beginCountdown() {
    this.state = 'countdown';
    this._countdownNum = 3;
    this._countdownTimer = 1.0;
    this._showCountdown(3);
  }

  _showCountdown(n) {
    const overlay = document.getElementById('countdown-overlay');
    const num     = document.getElementById('countdown-number');
    overlay.classList.remove('hidden');
    num.textContent = n > 0 ? String(n) : 'GO!';
    // Restart CSS animation
    num.style.animation = 'none';
    void num.offsetWidth;
    num.style.animation = '';
  }

  // ── Game Over ────────────────────────────────────────────────────────────────

  enterGameOver(won) {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    this.hud.hide();
    const screen = document.getElementById('screen-gameover');
    screen.classList.remove('hidden');
    document.getElementById('gameover-icon').textContent  = won ? '🏆' : '💀';
    document.getElementById('gameover-title').textContent = won ? 'VICTORY!' : 'DEFEATED!';
    document.getElementById('gameover-title').style.color = won ? '#ffd700' : '#ff4444';
    document.getElementById('gameover-sub').textContent   = won
      ? 'You won the match!' : 'Better luck next time!';
  }

  // ── Main Loop ────────────────────────────────────────────────────────────────

  _loop(timestamp) {
    requestAnimationFrame(t => this._loop(t));

    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    switch (this.state) {
      case 'countdown': this._tickCountdown(dt); break;
      case 'playing':   this._tickGame(dt);      break;
      case 'gameover':
      case 'menu':      break;
    }

    if (this.renderer) this.renderer.render();
  }

  _tickCountdown(dt) {
    this._countdownTimer -= dt;
    if (this._countdownTimer <= 0) {
      this._countdownNum--;
      if (this._countdownNum > 0) {
        this._countdownTimer = 1.0;
        this._showCountdown(this._countdownNum);
      } else {
        // Show GO!
        this._showCountdown(0);
        setTimeout(() => {
          document.getElementById('countdown-overlay').classList.add('hidden');
          this.state = 'playing';
          this.hud.show();
        }, 600);
      }
    }
  }

  _tickGame(dt) {
    if (!this.gameMode || this.gameMode.over) return;

    // Input
    this.input.update(this.renderer.camera);

    // Player
    if (this.player?.isAlive) {
      this.player.update(dt, this.input.snapshot, this.projectileManager);
    } else if (this.player && !this.player.isAlive && !this.gameMode.over) {
      // Player dead — check if mode ends on player death (Showdown)
      if (this.selectedMode === 'showdown') {
        this.gameMode._endGame?.(false);
      }
    }

    // Bots
    for (const ai of this.bots) {
      if (ai.brawler.isAlive) {
        const cmd = ai.update(dt, this.gameMode, this.allBrawlers, this.map);
        // Bot's aimWorld from target position
        if (cmd.aimWorld) {
          cmd.aimWorld = { ...cmd.aimWorld }; // ensure plain object copy
        }
        ai.brawler.update(dt, cmd, this.projectileManager);
      }
    }

    // Projectiles
    this.projectileManager.update(dt, this.physics, this.allBrawlers, this.map);

    // Puddles (Barley)
    if (this.projectileManager._puddles) {
      for (let i = this.projectileManager._puddles.length - 1; i >= 0; i--) {
        const p = this.projectileManager._puddles[i];
        p.update(dt, this.allBrawlers);
        if (!p.active) this.projectileManager._puddles.splice(i, 1);
      }
    }

    // Physics
    this.physics.resolveCollisions(this.allBrawlers, this.map);

    // Mode
    this.gameMode.update(dt);

    // Camera follow player (or last alive)
    const followTarget = this.player?.isAlive
      ? this.player
      : this.allBrawlers.find(b => b.isAlive && b.team === 0);
    if (followTarget) {
      this.camera.update(dt, followTarget.position);
    }

    // HUD
    const hudData = this.gameMode.getHUDData();
    if (this.player) {
      hudData.playerHealth    = this.player.health;
      hudData.playerMaxHealth = this.player.maxHealth;
      hudData.superCharge     = this.player.superCharge;
    }
    this.hud.update(hudData);
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  _hideScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('countdown-overlay').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
  }
}
