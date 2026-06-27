// StorageClient.js — Supabase Storage 图床客户端 + 数据库元数据管理
// 照片上传/删除/列表 + 密码验证
// 照片元数据存 Supabase 数据库（所有人共享），不再用 localStorage

import { createClient } from '@supabase/supabase-js';
import SUPABASE_CONFIG from './supabase.config.js';
import { dbListPhotos, dbInsertPhoto, dbDeletePhoto, dbUpdateCaption } from './DatabaseClient.js';

const CONFIG_KEY = 'supabase-config';

// ── 配置管理 ───────────────────────────────

export function loadConfig() {
  let saved = {};
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch { /* ignore */ }
  return { ...SUPABASE_CONFIG, ...saved };
}

export function saveConfig(cfg) {
  const toSave = {
    supabaseUrl: cfg.supabaseUrl || '',
    supabaseAnonKey: cfg.supabaseAnonKey || '',
    bucketName: cfg.bucketName || 'photos',
  };
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(toSave)); } catch { /* ignore */ }
}

// ── 相册密码验证（SHA-256 哈希比对） ──

/** 是否启用相册密码锁 */
export function isAlbumPasswordEnabled() {
  return typeof __ALBUM_PWD_HASH__ !== 'undefined' && __ALBUM_PWD_HASH__ !== '';
}

/** 对用户输入做 SHA-256 后与构建时注入的哈希比对 */
export async function verifyAlbumPassword(inputPwd) {
  if (!isAlbumPasswordEnabled()) return true; // 无密码，直接放行
  if (!inputPwd) return false;
  const encoder = new TextEncoder();
  const data = encoder.encode(inputPwd);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return inputHash === __ALBUM_PWD_HASH__;
}

// ── 图片压缩 ───────────────────────────────

export function compressImage(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          if (blob) resolve(blob);
          else reject(new Error('压缩失败'));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('图片加载失败')); };
    img.src = URL.createObjectURL(file);
  });
}

// ── Supabase 连接测试 ───────────────────────

export async function testConnection(url, key) {
  if (!url || !key) throw new Error('URL 和 anon key 不能为空');
  const cleanUrl = url.replace(/\/+$/, '');
  const res = await fetch(`${cleanUrl}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
  });
  if (res.ok || res.status === 200 || res.status === 406) {
    // 406 = "Not Acceptable" but means connection works (no Accept header match)
    return true;
  }
  throw new Error(`连接失败 (HTTP ${res.status})`);
}

// ── 核心：StorageClient 类 ──────────────────

export class StorageClient {
  constructor() {
    this.config = loadConfig();
    this._client = null;
  }

  refreshConfig() {
    this.config = loadConfig();
    this._client = null; // 重建 client
  }

  /** 获取或创建 Supabase client */
  _getClient() {
    if (this._client) return this._client;
    const { supabaseUrl, supabaseAnonKey } = this.config;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    this._client = createClient(supabaseUrl, supabaseAnonKey);
    return this._client;
  }

  /** 从数据库读取照片列表（所有人共享） */
  async listPhotos() {
    return dbListPhotos();
  }

  /** 上传照片到 Supabase Storage + 写入数据库 */
  async uploadPhoto(file, onProgress) {
    const client = this._getClient();
    if (!client) throw new Error('请先配置 Supabase');

    const { bucketName } = this.config;
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ext = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
    const path = `${id}.${ext === 'jpg' || ext === 'jpeg' ? 'jpg' : ext}`;

    // 压缩图片
    let fileToUpload = file;
    if (file.type && file.type.startsWith('image/')) {
      try {
        fileToUpload = await compressImage(file, 800);
      } catch {
        // 压缩失败就用原文件
        fileToUpload = file;
      }
    }

    // 上传到 Storage
    const { data, error } = await client.storage
      .from(bucketName)
      .upload(path, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (error) throw new Error(`上传失败: ${error.message}`);

    // 获取公开URL
    const { data: urlData } = client.storage
      .from(bucketName)
      .getPublicUrl(path);

    const photo = {
      id,
      url: urlData.publicUrl,
      caption: file.name ? file.name.replace(/\.[^.]+$/, '') : '',
      date: new Date().toISOString().slice(0, 10),
      path,
    };

    // 写入数据库（所有人共享）
    await dbInsertPhoto(photo);

    return photo;
  }

  /** 删除照片（Storage + 数据库） */
  async deletePhoto(photoId) {
    const client = this._getClient();

    // 从数据库获取照片信息（用于 Storage 路径）
    const photos = await dbListPhotos();
    const photo = photos.find(p => p.id === photoId);

    // 从 Storage 删除
    if (client && photo && photo.path) {
      try {
        await client.storage
          .from(this.config.bucketName)
          .remove([photo.path]);
      } catch { /* Storage 删除失败不阻塞数据库删除 */ }
    }

    // 从数据库删除
    await dbDeletePhoto(photoId);
    return true;
  }

  /** 更新照片标题（数据库） */
  async updateCaption(photoId, caption) {
    return dbUpdateCaption(photoId, caption);
  }

  /** 检查是否已配置 */
  isConfigured() {
    return !!(this.config.supabaseUrl && this.config.supabaseAnonKey);
  }
}

// 全局单例
export const storageClient = new StorageClient();
