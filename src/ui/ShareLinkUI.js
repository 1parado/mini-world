export class ShareLinkUI {
  constructor(peerManager) {
    this.peerManager = peerManager;
    this.btn = document.getElementById('share-btn');
    this.roomInfo = document.getElementById('room-info');
    this.init();
  }

  init() {
    if (this.btn) {
      this.btn.style.display = 'block';
      this.btn.addEventListener('click', () => this.share());
    }
    if (this.roomInfo && this.peerManager) {
      this.roomInfo.textContent = 'ROOM: ' + this.peerManager.roomId;
    }
  }

  share() {
    const url = this.peerManager.getShareUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.btn.textContent = 'Copied!';
        setTimeout(() => { this.btn.textContent = 'Share link'; }, 2000);
      });
    }
  }
}
