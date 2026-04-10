class HUD {
  constructor() {
    this.el = document.getElementById('hud');
    this.healthBar  = document.getElementById('hud-health-bar');
    this.superBar   = document.getElementById('hud-super-bar');
    this.superWrap  = document.getElementById('hud-super-wrap');
    this.modeInfo   = document.getElementById('hud-mode-info');
    this.brawlerName = document.getElementById('hud-brawler-name');

    this._lastHealth = -1;
    this._lastMaxHealth = -1;
    this._lastSuper = -1;
  }

  show() { this.el.classList.remove('hidden'); }
  hide() { this.el.classList.add('hidden'); }

  setBrawlerName(name) {
    this.brawlerName.textContent = name;
  }

  update(data) {
    // Health bar
    if (data.playerHealth !== undefined && data.playerMaxHealth) {
      if (data.playerHealth !== this._lastHealth || data.playerMaxHealth !== this._lastMaxHealth) {
        const pct = Math.max(0, data.playerHealth / data.playerMaxHealth) * 100;
        this.healthBar.style.width = pct + '%';
        // Color: green → yellow → red
        const hue = (pct / 100) * 120;
        this.healthBar.style.background = `hsl(${hue}, 80%, 45%)`;
        this._lastHealth = data.playerHealth;
        this._lastMaxHealth = data.playerMaxHealth;
      }
    }

    // Super bar
    if (data.superCharge !== undefined) {
      if (data.superCharge !== this._lastSuper) {
        const pct = Math.min(1, data.superCharge) * 100;
        this.superBar.style.width = pct + '%';
        if (pct >= 100) {
          this.superWrap.classList.add('super-ready');
        } else {
          this.superWrap.classList.remove('super-ready');
        }
        this._lastSuper = data.superCharge;
      }
    }

    // Mode-specific info
    if (data.modeText !== undefined) {
      this.modeInfo.innerHTML = data.modeText;
    }
  }
}
