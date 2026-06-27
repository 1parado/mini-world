import Peer from 'peerjs';
import { generateId, showNotification } from '../utils/helpers.js';

export class PeerManager {
  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.onRemoteJoin = null;
    this.onRemoteLeave = null;
    this.onRemoteState = null;
    this.onRemoteChat = null;
    this.onRemoteEdit = null; // New: page edit events
    this.roomId = null;
    this.isHost = false;
  }

  init(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('PeerJS connection timeout'));
      }, timeout);

      const params = new URLSearchParams(window.location.search);
      const existingRoom = params.get('room');
      const hostId = params.get('host');

      if (existingRoom && hostId) {
        this.roomId = existingRoom;
        this.createPeer(() => {
          clearTimeout(timer);
          this.joinRoom(hostId);
          resolve(this.roomId);
        }, (err) => { clearTimeout(timer); reject(err); });
      } else {
        this.roomId = generateId(6);
        this.isHost = true;
        this.createPeer(() => {
          clearTimeout(timer);
          resolve(this.roomId);
        }, (err) => { clearTimeout(timer); reject(err); });
      }
    });
  }

  createPeer(onOpen, onError) {
    const peerId = 'notebook-' + this.roomId + '-' + generateId(4);
    this.peer = new Peer(peerId, { debug: 0 });
    this.myId = peerId;

    this.peer.on('open', (id) => {
      this.myId = id;
      if (onOpen) onOpen();
    });

    this.peer.on('connection', (conn) => { this.handleConnection(conn); });

    this.peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') showNotification('房间未找到');
      if (onError) onError(err);
    });

    this.peer.on('disconnected', () => { this.peer.reconnect(); });
  }

  joinRoom(hostPeerId) {
    const conn = this.peer.connect(hostPeerId, { reliable: true });
    this.handleConnection(conn);
  }

  handleConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      conn.send({ type: 'join', id: this.myId, name: 'Writer' });
      if (this.onRemoteJoin) this.onRemoteJoin(conn.peer);
      showNotification('新写作者加入了');
    });

    conn.on('data', (data) => { this.handleData(conn.peer, data); });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (this.onRemoteLeave) this.onRemoteLeave(conn.peer);
      showNotification('写作者离开了');
    });
  }

  handleData(peerId, data) {
    switch (data.type) {
      case 'state':
        if (this.onRemoteState) this.onRemoteState(peerId, data);
        break;
      case 'chat':
        if (this.onRemoteChat) this.onRemoteChat(peerId, data.message);
        break;
      case 'stroke-add':
      case 'stroke-erase':
      case 'text-add':
      case 'sticker-add':
      case 'page-flip':
      case 'template-change':
        if (this.onRemoteEdit) this.onRemoteEdit(peerId, data);
        break;
      case 'cursor-move':
        if (this.onRemoteState) this.onRemoteState(peerId, data);
        break;
      case 'join':
        if (this.isHost) {
          this.broadcast({ type: 'new-peer', id: data.id }, peerId);
          const conn = this.connections.get(peerId);
          if (conn) {
            for (const [id] of this.connections) {
              if (id !== peerId) conn.send({ type: 'existing-peer', id });
            }
          }
        }
        if (this.onRemoteJoin) this.onRemoteJoin(data.id);
        break;
      case 'new-peer':
        if (!this.connections.has(data.id)) {
          this.handleConnection(this.peer.connect(data.id, { reliable: true }));
        }
        break;
      case 'existing-peer':
        if (!this.connections.has(data.id)) {
          this.handleConnection(this.peer.connect(data.id, { reliable: true }));
        }
        break;
    }
  }

  broadcast(data, excludePeerId = null) {
    for (const [id, conn] of this.connections) {
      if (id !== excludePeerId && conn.open) {
        try { conn.send(data); } catch (e) { /* skip */ }
      }
    }
  }

  sendState(state) { this.broadcast({ type: 'state', ...state }); }
  sendChat(message) { this.broadcast({ type: 'chat', message }); }

  // Send page edit events
  sendEdit(editData) { this.broadcast(editData); }

  getShareUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.roomId);
    url.searchParams.set('host', this.myId);
    return url.toString();
  }

  destroy() {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    if (this.peer) this.peer.destroy();
  }
}
