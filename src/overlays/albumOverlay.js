// albumOverlay.js — 📷 相册（含密码锁 + Lightbox + 上传/删除）
import { getCtx } from '../overlays/OverlayContext.js';

let albumSessionAuthed = false;
let albumPendingAction = null;
let currentAlbumPhotos = [];
let currentLightboxPhoto = null;
let lightboxPhotos = [];
let lightboxIndex = 0;

export function show() {
  const { bindOverlayClose, storageClient, audio, showNotification, isAlbumPasswordEnabled, verifyAlbumPassword } = getCtx();
  bindOverlayClose('album-overlay', 'album-close');
  document.getElementById('album-overlay').classList.add('visible');

  document.getElementById('album-empty').style.display = 'none';
  document.getElementById('album-uploading').style.display = 'none';

  if (storageClient.isConfigured()) {
    storageClient.listPhotos().then(cloudPhotos => {
      currentAlbumPhotos = cloudPhotos;
      renderAlbumGrid(currentAlbumPhotos);
    }).catch(() => {
      currentAlbumPhotos = [];
      renderAlbumGrid(currentAlbumPhotos);
    });
  } else {
    currentAlbumPhotos = [];
    renderAlbumGrid(currentAlbumPhotos);
  }

  const uploadBtn = document.getElementById('album-upload-btn');
  const fileInput = document.getElementById('album-file-input');
  if (uploadBtn) uploadBtn.onclick = () => {
    if (!storageClient.isConfigured()) { showNotification('请先配置图床 ⚙️'); return; }
    requestAlbumAuth(() => fileInput.click());
  };
  if (fileInput) fileInput.onchange = handleAlbumUpload;

  const pwdConfirm = document.getElementById('album-password-confirm');
  const pwdCancel = document.getElementById('album-password-cancel');
  const pwdInput = document.getElementById('album-password-input');
  if (pwdConfirm) pwdConfirm.onclick = confirmAlbumPassword;
  if (pwdCancel) pwdCancel.onclick = cancelAlbumPassword;
  if (pwdInput) pwdInput.onkeydown = (e) => {
    if (e.key === 'Enter') confirmAlbumPassword();
    if (e.key === 'Escape') cancelAlbumPassword();
  };

  const lbClose = document.getElementById('album-lightbox-close');
  if (lbClose) lbClose.onclick = closeAlbumLightbox;
  const lbEl = document.getElementById('album-lightbox');
  if (lbEl) lbEl.onclick = (e) => { if (e.target === lbEl) closeAlbumLightbox(); };
  const lbPrev = document.getElementById('album-lb-prev');
  if (lbPrev) lbPrev.onclick = (e) => { e.stopPropagation(); lightboxPrev(); };
  const lbNext = document.getElementById('album-lb-next');
  if (lbNext) lbNext.onclick = (e) => { e.stopPropagation(); lightboxNext(); };
  const lbRename = document.getElementById('album-lb-rename');
  if (lbRename) lbRename.onclick = (e) => { e.stopPropagation(); startRenameCaption(); };
  const lbCaption = document.getElementById('album-lightbox-caption');
  if (lbCaption) lbCaption.onclick = (e) => { e.stopPropagation(); startRenameCaption(); };
  const lbInput = document.getElementById('album-lb-caption-input');
  if (lbInput) lbInput.onkeydown = (e) => {
    if (e.key === 'Enter') { e.stopPropagation(); finishRenameCaption(); }
    if (e.key === 'Escape') { e.stopPropagation(); cancelRenameCaption(); }
    e.stopPropagation();
  };
  const lbDelete = document.getElementById('album-lightbox-delete');
  if (lbDelete) lbDelete.onclick = (e) => { e.stopPropagation(); requestAlbumAuth(handleAlbumDelete); };
}

export function hide() {
  document.getElementById('album-overlay')?.classList.remove('visible');
}

export function requestAlbumAuth(action) {
  const { isAlbumPasswordEnabled } = getCtx();
  if (albumSessionAuthed || !isAlbumPasswordEnabled()) { action(); return; }
  albumPendingAction = action;
  const panel = document.getElementById('album-password-panel');
  const input = document.getElementById('album-password-input');
  const error = document.getElementById('album-password-error');
  if (input) input.value = '';
  if (error) error.textContent = '';
  if (panel) panel.classList.add('visible');
  setTimeout(() => { if (input) input.focus(); }, 100);
}

export function cancelAlbumPassword() {
  const panel = document.getElementById('album-password-panel');
  if (panel) panel.classList.remove('visible');
  albumPendingAction = null;
}

async function confirmAlbumPassword() {
  const { verifyAlbumPassword, audio } = getCtx();
  const input = document.getElementById('album-password-input');
  const error = document.getElementById('album-password-error');
  const pwd = input ? input.value : '';
  const ok = await verifyAlbumPassword(pwd);
  if (ok) {
    albumSessionAuthed = true;
    const panel = document.getElementById('album-password-panel');
    if (panel) panel.classList.remove('visible');
    audio.playSFX('success');
    if (albumPendingAction) { albumPendingAction(); albumPendingAction = null; }
  } else {
    if (error) error.textContent = '❌ 密码错误，请重试';
    audio.playSFX('fail');
    if (input) { input.value = ''; input.focus(); }
  }
}

function renderAlbumGrid(photos) {
  if (!photos) photos = currentAlbumPhotos;
  const grid = document.getElementById('album-grid');
  const emptyEl = document.getElementById('album-empty');
  const countEl = document.getElementById('album-count');
  if (!grid) return;

  grid.innerHTML = '';
  if (photos.length === 0) {
    emptyEl.style.display = 'block';
    grid.style.display = 'none';
  } else {
    emptyEl.style.display = 'none';
    grid.style.display = 'grid';
    photos.forEach(photo => {
      const card = document.createElement('div');
      card.className = 'album-card';
      card.innerHTML = `
        <img src="${photo.url}" alt="${photo.caption}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23FAF5E8%22 width=%22200%22 height=%22200%22/><text x=%2250%%22 y=%2250%%22 font-size=%2240%22 text-anchor=%22middle%22>❌</text></svg>'" />
        <div class="album-card-info">${photo.caption || '未命名'}</div>
        <div class="album-card-date">${photo.date || ''}</div>
      `;
      card.onclick = () => openAlbumLightbox(photo);
      grid.appendChild(card);
    });
  }
  if (countEl) countEl.textContent = `📷 ${photos.length} 张照片`;
}

function openAlbumLightbox(photo) {
  const { audio } = getCtx();
  lightboxPhotos = currentAlbumPhotos;
  lightboxIndex = lightboxPhotos.findIndex(p => p.id === photo.id);
  if (lightboxIndex < 0) lightboxIndex = 0;
  showLightboxPhoto();
  document.getElementById('album-lightbox').style.display = 'flex';
  audio.playSFX('open');
}

function showLightboxPhoto() {
  const photo = lightboxPhotos[lightboxIndex];
  if (!photo) return;
  currentLightboxPhoto = photo;
  document.getElementById('album-lightbox-img').src = photo.url;
  document.getElementById('album-lightbox-caption').textContent = photo.caption || '未命名';
  document.getElementById('album-lightbox-caption').style.display = '';
  document.getElementById('album-lb-caption-input').style.display = 'none';
  document.getElementById('album-lightbox-date').textContent = photo.date || '';
  const counter = document.getElementById('album-lb-counter');
  if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  const prevBtn = document.getElementById('album-lb-prev');
  const nextBtn = document.getElementById('album-lb-next');
  if (prevBtn) prevBtn.style.display = lightboxIndex > 0 ? '' : 'none';
  if (nextBtn) nextBtn.style.display = lightboxIndex < lightboxPhotos.length - 1 ? '' : 'none';
}

function lightboxPrev() { if (lightboxIndex > 0) { lightboxIndex--; showLightboxPhoto(); } }
function lightboxNext() { if (lightboxIndex < lightboxPhotos.length - 1) { lightboxIndex++; showLightboxPhoto(); } }

export function closeAlbumLightbox() {
  document.getElementById('album-lightbox').style.display = 'none';
  currentLightboxPhoto = null;
  lightboxPhotos = [];
}

function startRenameCaption() {
  const photo = lightboxPhotos[lightboxIndex];
  if (!photo) return;
  const captionEl = document.getElementById('album-lightbox-caption');
  const inputEl = document.getElementById('album-lb-caption-input');
  captionEl.style.display = 'none';
  inputEl.style.display = '';
  inputEl.value = photo.caption || '';
  inputEl.focus();
  inputEl.select();
}

async function finishRenameCaption() {
  const { storageClient, audio, showNotification } = getCtx();
  const inputEl = document.getElementById('album-lb-caption-input');
  const captionEl = document.getElementById('album-lightbox-caption');
  const newCaption = inputEl.value.trim() || '未命名';
  const photo = lightboxPhotos[lightboxIndex];
  if (photo && photo.caption !== newCaption) {
    photo.caption = newCaption;
    const idx = currentAlbumPhotos.findIndex(p => p.id === photo.id);
    if (idx >= 0) currentAlbumPhotos[idx].caption = newCaption;
    await storageClient.updateCaption(photo.id, newCaption);
    showNotification(`✏️ 已更名为「${newCaption}」`);
    audio.playSFX('click');
    renderAlbumGrid();
  }
  captionEl.textContent = newCaption;
  inputEl.style.display = 'none';
  captionEl.style.display = '';
}

function cancelRenameCaption() {
  const inputEl = document.getElementById('album-lb-caption-input');
  const captionEl = document.getElementById('album-lightbox-caption');
  inputEl.style.display = 'none';
  captionEl.style.display = '';
}

async function handleAlbumUpload(e) {
  const { storageClient, audio, showNotification } = getCtx();
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const uploadEl = document.getElementById('album-uploading');
  const progressFill = document.getElementById('album-progress-fill');
  const grid = document.getElementById('album-grid');
  uploadEl.style.display = 'block';
  grid.style.display = 'none';
  progressFill.style.width = '0%';

  let uploaded = 0;
  for (const file of files) {
    try {
      progressFill.style.width = `${((uploaded + 0.5) / files.length) * 100}%`;
      await storageClient.uploadPhoto(file);
      uploaded++;
      progressFill.style.width = `${(uploaded / files.length) * 100}%`;
      audio.playSFX('collect');
    } catch (err) {
      showNotification(`上传失败: ${err.message}`);
      audio.playSFX('fail');
    }
  }

  uploadEl.style.display = 'none';
  e.target.value = '';
  if (storageClient.isConfigured()) {
    storageClient.listPhotos().then(cloudPhotos => {
      currentAlbumPhotos = cloudPhotos;
      renderAlbumGrid(currentAlbumPhotos);
    });
  } else {
    renderAlbumGrid();
  }
  if (uploaded > 0) {
    showNotification(`✅ 成功上传 ${uploaded} 张照片`);
    audio.playSFX('success');
  }
}

async function handleAlbumDelete() {
  const { storageClient, audio, showNotification } = getCtx();
  if (!currentLightboxPhoto) return;
  const photoId = currentLightboxPhoto.id;
  try {
    await storageClient.deletePhoto(photoId);
    audio.playSFX('click');
    if (storageClient.isConfigured()) {
      currentAlbumPhotos = await storageClient.listPhotos();
    } else {
      currentAlbumPhotos = [];
    }
    lightboxPhotos = currentAlbumPhotos;
    if (lightboxPhotos.length === 0) {
      closeAlbumLightbox();
      renderAlbumGrid(currentAlbumPhotos);
      showNotification('🗑️ 照片已删除');
    } else {
      if (lightboxIndex >= lightboxPhotos.length) lightboxIndex = lightboxPhotos.length - 1;
      showLightboxPhoto();
      renderAlbumGrid(currentAlbumPhotos);
      showNotification('🗑️ 照片已删除');
    }
  } catch (err) {
    showNotification(`删除失败: ${err.message}`);
  }
}

// 导出 Lightbox 导航供全局键盘事件使用
export { lightboxPrev, lightboxNext };
