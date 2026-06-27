export class ChatUI {
  constructor() {
    this.wrapper = document.getElementById('chat-input-wrapper');
    this.input = document.getElementById('chat-input');
    this.active = false;
  }

  show() {
    if (this.wrapper) {
      this.wrapper.style.display = 'block';
      this.active = true;
      setTimeout(() => this.input && this.input.focus(), 50);
    }
  }

  hide() {
    if (this.wrapper) {
      this.wrapper.style.display = 'none';
      this.active = false;
      if (this.input) this.input.value = '';
    }
  }

  getMessage() {
    if (this.input) {
      const msg = this.input.value.trim();
      this.input.value = '';
      return msg;
    }
    return '';
  }

  isActive() { return this.active; }
}
