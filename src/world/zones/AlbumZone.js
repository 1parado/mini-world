// AlbumZone — 相册区域，支持上传查看照片
import { Zone } from '../Zone.js';

export class AlbumZone extends Zone {
  constructor(x, y) {
    super('album', x, y, 160, 180, 155, '📷 相册');
    this.type = 'album';
  }
}
