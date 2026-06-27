// Zone — base class for interactive areas in the 2D world
export class Zone {
  constructor(id, x, y, w, h, triggerRadius, label) {
    this.id = id;
    this.x = x;           // center X
    this.y = y;           // bottom Y (where it sits on ground)
    this.w = w;           // width
    this.h = h;           // height
    this.triggerRadius = triggerRadius; // how close player must be
    this.label = label;
    this.playerNear = false;
    this.onEnter = null;  // callback when player enters range
    this.onLeave = null;  // callback when player leaves range
    this.onInteract = null; // callback when player presses F near zone
  }

  update(player) {
    const wasNear = this.playerNear;
    this.playerNear = player.isNearZone(this);
    if (this.playerNear && !wasNear && this.onEnter) this.onEnter();
    if (!this.playerNear && wasNear && this.onLeave) this.onLeave();
  }

  canInteract(player) {
    return player.isNearZone(this);
  }
}
