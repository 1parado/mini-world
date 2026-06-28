// chatOverlay.js — 🤖 AI助手聊天窗口
import { getCtx } from '../overlays/OverlayContext.js';
import { AIClient, loadConfig, saveConfig } from '../ai/AIClient.js';
import AI_CONFIG from '../ai/ai.config.js';

const aiClient = new AIClient();
let chatTypingEl = null;
let currentAssistantEl = null;

export function show() {
  const { setMode, showNotification } = getCtx();
  const overlay = document.getElementById('chat-overlay');
  overlay.classList.add('visible');

  const closeBtn = document.getElementById('chat-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.classList.remove('visible');
      aiClient.abort();
      setMode('explore');
    };
  }

  const input = document.getElementById('chat-user-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const sendMsg = () => {
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    input.value = '';
    addChatMessage('user', text);
    setChatTyping(true);
    sendBtn.disabled = true;

    aiClient.onToken = (delta, full) => {
      if (!currentAssistantEl) {
        setChatTyping(false);
        currentAssistantEl = addChatMessage('assistant', '');
      }
      currentAssistantEl.textContent = full;
      scrollChatBottom();
    };
    aiClient.onDone = (full) => {
      if (currentAssistantEl) currentAssistantEl.textContent = full;
      currentAssistantEl = null;
      setChatTyping(false);
      sendBtn.disabled = false;
      scrollChatBottom();
    };
    aiClient.onError = (err) => {
      setChatTyping(false);
      addChatMessage('error', '⚠️ ' + err);
      sendBtn.disabled = false;
      currentAssistantEl = null;
    };
    aiClient.sendMessage(text);
  };

  sendBtn.onclick = sendMsg;
  input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMsg(); } };

  const settingsBtn = document.getElementById('chat-settings-btn');
  const settingsPanel = document.getElementById('chat-settings-panel');
  settingsBtn.onclick = () => {
    settingsPanel.classList.toggle('visible');
    if (settingsPanel.classList.contains('visible')) {
      const cfg = loadConfig();
      document.getElementById('ai-base-url').value = cfg.baseUrl || '';
      document.getElementById('ai-api-key').value = cfg.apiKey || '';
      document.getElementById('ai-model').value = cfg.model || '';
      document.getElementById('ai-temperature').value = cfg.temperature || 0.8;
      document.getElementById('ai-temp-val').textContent = cfg.temperature || 0.8;
      if (cfg.baseUrl && cfg.apiKey) {
        doFetchModels(cfg.baseUrl, cfg.apiKey, cfg.model);
      }
    }
  };

  const tempSlider = document.getElementById('ai-temperature');
  if (tempSlider) {
    tempSlider.oninput = () => {
      document.getElementById('ai-temp-val').textContent = tempSlider.value;
    };
  }

  const fetchBtn = document.getElementById('ai-fetch-models-btn');
  fetchBtn.onclick = () => {
    const baseUrl = document.getElementById('ai-base-url').value.trim();
    const apiKey = document.getElementById('ai-api-key').value.trim();
    if (!baseUrl || !apiKey) { showModelStatus('请先填写 API 地址和密钥', true); return; }
    doFetchModels(baseUrl, apiKey);
  };

  const modelSelect = document.getElementById('ai-model-select');
  modelSelect.onchange = () => {
    if (modelSelect.value) document.getElementById('ai-model').value = modelSelect.value;
  };

  async function doFetchModels(baseUrl, apiKey, preselectedModel) {
    const fetchBtnEl = document.getElementById('ai-fetch-models-btn');
    const statusEl = document.getElementById('model-fetch-status');
    fetchBtnEl.disabled = true;
    fetchBtnEl.classList.add('spinning');
    statusEl.textContent = '正在获取模型列表...';
    statusEl.className = 'chat-setting-row model-status';

    try {
      const models = await aiClient.fetchModels(baseUrl, apiKey);
      const select = document.getElementById('ai-model-select');
      select.innerHTML = '<option value="">— 选择模型 (' + models.length + ' 个可用) —</option>';
      for (const id of models) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = id;
        select.appendChild(opt);
      }
      const currentModel = preselectedModel || document.getElementById('ai-model').value;
      if (currentModel) {
        select.value = currentModel;
        if (!select.value && currentModel) document.getElementById('ai-model').value = currentModel;
      }
      statusEl.textContent = `✅ 找到 ${models.length} 个模型`;
      statusEl.className = 'chat-setting-row model-status';
    } catch (e) {
      statusEl.textContent = '❌ ' + e.message;
      statusEl.className = 'chat-setting-row model-status error';
    } finally {
      fetchBtnEl.disabled = false;
      fetchBtnEl.classList.remove('spinning');
    }
  }

  function showModelStatus(msg, isError) {
    const el = document.getElementById('model-fetch-status');
    if (!el) return;
    el.textContent = isError ? '❌ ' + msg : '✅ ' + msg;
    el.className = 'chat-setting-row model-status' + (isError ? ' error' : '');
  }

  document.getElementById('ai-settings-save').onclick = () => {
    const selectedFromDrop = document.getElementById('ai-model-select').value;
    const manualInput = document.getElementById('ai-model').value.trim();
    const finalModel = selectedFromDrop || manualInput || AI_CONFIG.model;
    saveConfig({
      baseUrl: document.getElementById('ai-base-url').value,
      apiKey: document.getElementById('ai-api-key').value,
      model: finalModel,
      temperature: parseFloat(document.getElementById('ai-temperature').value) || 0.8,
    });
    aiClient.refreshConfig();
    settingsPanel.classList.remove('visible');
    showNotification('✅ AI设置已保存 — 模型: ' + finalModel);
  };
  document.getElementById('ai-settings-cancel').onclick = () => {
    settingsPanel.classList.remove('visible');
  };

  document.getElementById('chat-clear-btn').onclick = () => {
    aiClient.clearChat();
    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = '<div class="chat-welcome">嗨！我是文具世界的AI助手 ✏️<br/>来和我聊天吧~</div>';
  };

  const history = aiClient.history;
  if (history.length > 0) {
    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = '';
    for (const msg of history) {
      addChatMessage(msg.role, msg.content);
    }
  }

  setTimeout(() => input.focus(), 100);
}

export function hide() {
  document.getElementById('chat-overlay')?.classList.remove('visible');
}

function addChatMessage(role, content) {
  const msgContainer = document.getElementById('chat-messages');
  const welcome = msgContainer.querySelector('.chat-welcome');
  if (welcome) welcome.remove();
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;
  div.textContent = content;
  msgContainer.appendChild(div);
  scrollChatBottom();
  return div;
}

function setChatTyping(on) {
  const msgContainer = document.getElementById('chat-messages');
  const existing = msgContainer.querySelector('.chat-typing');
  if (existing) existing.remove();
  if (on) {
    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.innerHTML = '<span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span>';
    msgContainer.appendChild(typing);
    scrollChatBottom();
  }
}

function scrollChatBottom() {
  const msgContainer = document.getElementById('chat-messages');
  if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
}
