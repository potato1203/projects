// Abstract base class for all game modes
class GameMode {
  constructor(game) {
    this.game = game;
    this.over = false;
    this.won  = false;
  }

  // Called after game sets up map — spawn brawlers, objectives, etc.
  init() {}

  // Called every frame during 'playing' state
  update(dt) {}

  // Returns plain object for HUD.update()
  getHUDData() { return {}; }

  // Returns a world position {x,z} the bot should move toward, or null
  getBotGoal(botAI, allBrawlers) { return null; }

  // Called when a brawler dies
  onBrawlerDied(brawler) {}

  // Called to destroy mode-specific scene objects
  cleanup() {}

  // Helpers shared by subclasses
  _spawnBrawler(BrawlerClass, team, pos) {
    const { scene, renderer, allBrawlers, bots } = this.game;
    const b = new BrawlerClass(
      renderer.scene,
      renderer.brawlerGroup,
      renderer.effectsGroup
    );
    b.team = team;
    b.init(pos);
    b.onDeath = (brawler) => this.onBrawlerDied(brawler);
    allBrawlers.push(b);
    return b;
  }

  _spawnBot(BrawlerClass, team, pos) {
    const { BotAI } = this._getBotAI();
    const b = this._spawnBrawler(BrawlerClass, team, pos);
    const ai = new BotAI(b);
    this.game.bots.push(ai);
    return { brawler: b, ai };
  }

  _getBotAI() {
    // Lazy import workaround (modules already loaded)
    return { BotAI: this.game._BotAI };
  }

  _endGame(won) {
    if (this.over) return;
    this.over = true;
    this.won  = won;
    setTimeout(() => this.game.enterGameOver(won), 1200);
  }

  _randomOpenPos(margin) {
    return this.game.map.randomOpenPosition(margin ?? 3);
  }
}
