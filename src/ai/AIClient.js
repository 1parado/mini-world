// AIClient.js — OpenAI兼容格式AI对话客户端
// 支持：配置文件 + localStorage覆盖、流式输出、对话历史

import AI_CONFIG from './ai.config.js';

const STORAGE_KEY = 'ai-chat-config';
const HISTORY_KEY = 'ai-chat-history';

/** 从localStorage读取覆盖配置，合并默认值 */
export function loadConfig() {
  let saved = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    ...AI_CONFIG,
    ...saved,
  };
}

/** 保存用户配置到localStorage */
export function saveConfig(cfg) {
  const toSave = {
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: cfg.temperature,
    maxTokens: cfg.maxTokens,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

/** 读取对话历史 */
export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

/** 保存对话历史（最多保留50条） */
export function saveHistory(history) {
  const trimmed = history.slice(-50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

/** 清除对话历史 */
export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

/**
 * AI客户端 — 基于OpenAI Chat Completions API
 */
export class AIClient {
  constructor() {
    this.config = loadConfig();
    this.history = loadHistory();
    this.abortController = null;
    this.onToken = null;   // 流式token回调
    this.onDone = null;     // 完成回调
    this.onError = null;    // 错误回调
  }

  /** 刷新配置（页面设置变更后调用） */
  refreshConfig() {
    this.config = loadConfig();
  }

  /** 获取可用模型列表 — 调用 /models 端点 */
  async fetchModels(baseUrl, apiKey) {
    if (!baseUrl || !apiKey) return [];

    const url = baseUrl.replace(/\/+$/, '') + '/models';
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `获取模型列表失败 (${response.status})`;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || errJson.message || errMsg;
        } catch { /* use default */ }
        throw new Error(errMsg);
      }
      const json = await response.json();
      // OpenAI格式: { data: [{ id: "gpt-4o-mini", ... }, ...] }
      const models = json.data || json.models || [];
      return models
        .map(m => (typeof m === 'string' ? m : m.id || m.name))
        .filter(Boolean)
        .sort();
    } catch (e) {
      throw e;
    }
  }

  /** 发送消息，流式获取回复 */
  async sendMessage(userMessage) {
    const cfg = this.config;
    if (!cfg.apiKey) {
      if (this.onError) this.onError('请先在设置中配置API密钥 🔑');
      return;
    }

    // 加入用户消息
    this.history.push({ role: 'user', content: userMessage });
    saveHistory(this.history);

    // 构建消息列表
    const messages = [
      { role: 'system', content: cfg.systemPrompt },
      ...this.history.slice(-20), // 最近20条上下文
    ];

    // 取消上一次请求
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    try {
      const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
      const body = {
        model: cfg.model,
        messages,
        temperature: cfg.temperature,
        max_tokens: cfg.maxTokens,
        stream: cfg.stream,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `API错误 (${response.status})`;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || errMsg;
        } catch { /* use default */ }
        if (this.onError) this.onError(errMsg);
        return;
      }

      if (cfg.stream) {
        // 流式读取
        await this._readStream(response);
      } else {
        // 非流式
        const json = await response.json();
        const assistantMsg = json.choices?.[0]?.message?.content || '';
        this.history.push({ role: 'assistant', content: assistantMsg });
        saveHistory(this.history);
        if (this.onDone) this.onDone(assistantMsg);
      }
    } catch (e) {
      if (e.name === 'AbortError') return; // 被取消，静默
      if (this.onError) this.onError('网络请求失败: ' + e.message);
    }
  }

  /** 流式SSE解析 */
  async _readStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留未完成的行

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            this.history.push({ role: 'assistant', content: fullContent });
            saveHistory(this.history);
            if (this.onDone) this.onDone(fullContent);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              if (this.onToken) this.onToken(delta, fullContent);
            }
          } catch { /* skip malformed JSON */ }
        }
      }

      // 流结束但没收到[DONE]
      if (fullContent) {
        this.history.push({ role: 'assistant', content: fullContent });
        saveHistory(this.history);
        if (this.onDone) this.onDone(fullContent);
      }
    } catch (e) {
      if (e.name !== 'AbortError' && this.onError) {
        this.onError('流式读取错误: ' + e.message);
      }
    }
  }

  /** 中止当前请求 */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /** 清空对话历史 */
  clearChat() {
    this.history = [];
    clearHistory();
  }
}
