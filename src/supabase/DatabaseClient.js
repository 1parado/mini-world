// DatabaseClient.js — Supabase 数据库客户端
// 管理所有共享数据的 CRUD（照片、留言、许愿等）
// 个人本地数据（日记、高分等）仍用 localStorage

import SUPABASE_CONFIG from './supabase.config.js';
import { createClient } from '@supabase/supabase-js';
import { loadConfig } from './StorageClient.js';

let _dbClient = null;

/** 获取或创建 Supabase 数据库 client */
function getDbClient() {
  if (_dbClient) return _dbClient;
  const config = loadConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
  _dbClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
  return _dbClient;
}

/** 重置 client（配置变更后调用） */
export function resetDbClient() {
  _dbClient = null;
}

// ── 照片 (photos 表) ───────────────────────────────

/** 从数据库读取照片列表 */
export async function dbListPhotos() {
  const client = getDbClient();
  if (!client) return [];
  const { data, error } = await client
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data.map(p => ({
    id: p.id,
    url: p.url,
    caption: p.caption || '',
    date: p.date || '',
    path: p.path,
  }));
}

/** 插入照片记录 */
export async function dbInsertPhoto(photo) {
  const client = getDbClient();
  if (!client) return false;
  const { error } = await client.from('photos').insert({
    id: photo.id,
    url: photo.url,
    caption: photo.caption || '',
    date: photo.date || '',
    path: photo.path,
  });
  if (error) { console.error('dbInsertPhoto error:', error.message); return false; }
  return true;
}

/** 删除照片记录 */
export async function dbDeletePhoto(photoId) {
  const client = getDbClient();
  if (!client) return false;
  const { error } = await client.from('photos').delete().eq('id', photoId);
  if (error) { console.error('dbDeletePhoto error:', error.message); return false; }
  return true;
}

/** 更新照片标题 */
export async function dbUpdateCaption(photoId, caption) {
  const client = getDbClient();
  if (!client) return false;
  const { error } = await client.from('photos').update({ caption }).eq('id', photoId);
  if (error) { console.error('dbUpdateCaption error:', error.message); return false; }
  return true;
}

// ── 邮箱留言 (mailbox_messages 表) ─────────────────

/** 读取邮箱留言 */
export async function dbListMessages() {
  const client = getDbClient();
  if (!client) return [];
  const { data, error } = await client
    .from('mailbox_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map(m => m.text);
}

/** 投递留言 */
export async function dbAddMessage(text) {
  const client = getDbClient();
  if (!client) return false;
  const { error } = await client.from('mailbox_messages').insert({ text });
  if (error) { console.error('dbAddMessage error:', error.message); return false; }
  return true;
}

// ── 公告板 (board_messages 表) ─────────────────────

/** 读取公告板消息 */
export async function dbListBoardMessages() {
  const client = getDbClient();
  if (!client) return [];
  const { data, error } = await client
    .from('board_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map(m => m.text);
}

/** 发布公告 */
export async function dbAddBoardMessage(text) {
  const client = getDbClient();
  if (!client) return false;
  const { error } = await client.from('board_messages').insert({ text });
  if (error) { console.error('dbAddBoardMessage error:', error.message); return false; }
  return true;
}

// ── 许愿池 (wishes 表) ─────────────────────────────

/** 读取许愿池愿望 + 累计投币数 */
export async function dbListWishes() {
  const client = getDbClient();
  if (!client) return { wishes: [], coinCount: 0 };
  const { data, error } = await client
    .from('wishes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return { wishes: [], coinCount: 0 };
  return {
    wishes: data.map(w => ({ text: w.text, time: new Date(w.created_at).getTime() })),
    coinCount: data.length,
  };
}

/** 许愿（投币） */
export async function dbAddWish(text) {
  const client = getDbClient();
  if (!client) return false;
  const { error } = await client.from('wishes').insert({ text });
  if (error) { console.error('dbAddWish error:', error.message); return false; }
  return true;
}
