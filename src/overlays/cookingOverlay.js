// cookingOverlay.js — 🍳 烹饪桌
import { getCtx } from '../overlays/OverlayContext.js';

export function show() {
  const { bindOverlayClose } = getCtx();
  bindOverlayClose('cooking-overlay', 'cooking-close');
  document.getElementById('cooking-overlay').classList.add('visible');
  renderCookingUI();
}

export function hide() {
  document.getElementById('cooking-overlay')?.classList.remove('visible');
}

function renderCookingUI() {
  const { gameWorld, showNotification } = getCtx();
  const cooking = gameWorld.getZoneByType('cooking');
  if (!cooking) return;

  const ingredientGrid = document.getElementById('cooking-ingredients');
  if (ingredientGrid) {
    ingredientGrid.innerHTML = '';
    for (const ing of cooking.allIngredients) {
      const btn = document.createElement('button');
      btn.className = 'cooking-ingredient';
      if (cooking.selected.includes(ing.id)) btn.classList.add('selected');
      btn.textContent = ing.name;
      btn.onclick = () => { cooking.toggleIngredient(ing.id); renderCookingUI(); };
      ingredientGrid.appendChild(btn);
    }
  }

  const selectedEl = document.getElementById('cooking-selected');
  if (selectedEl) {
    selectedEl.textContent = cooking.selected.length > 0
      ? cooking.selected.map(id => { const ing = cooking.allIngredients.find(i => i.id === id); return ing ? ing.name : ''; }).join(' ')
      : '请选择食材…';
  }

  const cookBtn = document.getElementById('cooking-cook');
  if (cookBtn) {
    cookBtn.disabled = cooking.cooking || cooking.selected.length < 2;
    cookBtn.onclick = () => {
      cooking.cook();
      showNotification('🍳 烹饪中…');
      setTimeout(() => {
        const result = cooking.lastResult;
        if (result) showNotification(result);
        renderCookingUI();
      }, 1600);
      renderCookingUI();
    };
  }

  const resultEl = document.getElementById('cooking-result');
  if (resultEl) resultEl.textContent = cooking.lastResult;

  const recipeEl = document.getElementById('cooking-recipes');
  if (recipeEl) {
    recipeEl.innerHTML = '';
    for (const recipe of cooking.recipes) {
      const div = document.createElement('span');
      div.className = 'cooking-recipe-tag';
      const unlocked = cooking.completed.includes(recipe.name);
      if (!unlocked) div.classList.add('locked');
      div.textContent = unlocked ? recipe.icon + ' ' + recipe.name : '🔒 ???';
      recipeEl.appendChild(div);
    }
  }
}
