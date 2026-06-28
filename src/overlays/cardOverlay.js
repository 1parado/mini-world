// cardOverlay.js — 🃏 卡牌翻翻乐
import { getCtx } from '../overlays/OverlayContext.js';

let cardGameState = null;

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('card-overlay', 'card-close');
  document.getElementById('card-overlay').classList.add('visible');
  if (!cardGameState || cardGameState.matched === cardGameState.pairs) {
    initCardGame();
  }
  renderCardGameUI();
}

export function hide() {
  document.getElementById('card-overlay')?.classList.remove('visible');
}

function initCardGame() {
  const winEl = document.getElementById('card-win');
  if (winEl) winEl.style.display = 'none';

  const symbols = ['★', '♥', '♦', '♣', '♠', '☀'];
  const deck = [...symbols, ...symbols];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  cardGameState = {
    deck,
    flipped: [],
    matched: 0,
    pairs: symbols.length,
    moves: 0,
    startTime: Date.now(),
    locked: false,
    revealed: new Array(12).fill(false),
    matchedIdx: new Array(12).fill(false),
  };
}

function renderCardGameUI() {
  if (!cardGameState) return;
  const { showNotification } = getCtx();
  const container = document.getElementById('card-grid');
  if (!container) return;
  container.innerHTML = '';

  const movesEl = document.getElementById('card-moves');
  const pairsEl = document.getElementById('card-pairs');
  const timeEl = document.getElementById('card-time');

  if (movesEl) movesEl.textContent = cardGameState.moves;
  if (pairsEl) pairsEl.textContent = cardGameState.matched + '/' + cardGameState.pairs;
  if (timeEl) {
    const elapsed = Math.floor((Date.now() - cardGameState.startTime) / 1000);
    timeEl.textContent = elapsed + '秒';
  }

  cardGameState.deck.forEach((symbol, idx) => {
    const card = document.createElement('div');
    card.className = 'card-cell';
    const isRevealed = cardGameState.revealed[idx] || cardGameState.matchedIdx[idx];
    if (cardGameState.matchedIdx[idx]) card.classList.add('matched');

    if (isRevealed) {
      card.classList.add('flipped');
      card.textContent = symbol;
    } else {
      card.textContent = '?';
      card.addEventListener('click', () => flipCard(idx));
    }
    container.appendChild(card);
  });

  const restartBtn = document.getElementById('card-restart');
  if (restartBtn) {
    restartBtn.onclick = () => { initCardGame(); renderCardGameUI(); };
  }

  if (cardGameState.matched === cardGameState.pairs) {
    const elapsed = Math.floor((Date.now() - cardGameState.startTime) / 1000);
    const winEl = document.getElementById('card-win');
    if (winEl) {
      winEl.textContent = '🎉 全部配对！用了 ' + cardGameState.moves + ' 步，' + elapsed + ' 秒';
      winEl.style.display = 'block';
    }
  }
}

function flipCard(idx) {
  if (!cardGameState || cardGameState.locked) return;
  if (cardGameState.revealed[idx] || cardGameState.matchedIdx[idx]) return;

  cardGameState.revealed[idx] = true;
  cardGameState.flipped.push(idx);

  if (cardGameState.flipped.length === 2) {
    cardGameState.moves++;
    cardGameState.locked = true;
    const [a, b] = cardGameState.flipped;

    if (cardGameState.deck[a] === cardGameState.deck[b]) {
      cardGameState.matchedIdx[a] = true;
      cardGameState.matchedIdx[b] = true;
      cardGameState.matched++;
      cardGameState.flipped = [];
      cardGameState.locked = false;
      renderCardGameUI();
      if (cardGameState.matched === cardGameState.pairs) {
        const { showNotification, progress } = getCtx();
        showNotification('🃏 配对成功！太厉害了！');
        progress.markZoneComplete('card');
        progress.earnCoins(10, 'card');
      }
    } else {
      renderCardGameUI();
      setTimeout(() => {
        cardGameState.revealed[a] = false;
        cardGameState.revealed[b] = false;
        cardGameState.flipped = [];
        cardGameState.locked = false;
        renderCardGameUI();
      }, 800);
    }
  } else {
    renderCardGameUI();
  }
}
