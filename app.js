import { 
  initFirebaseCloud, 
  auth, 
  loginUser, 
  registerUser, 
  logoutUser, 
  subscribeToNucleusData, 
  saveNucleusDoc, 
  saveParticipantDoc, 
  deleteParticipantDoc,
  getUserNucleiList,
  joinNucleusByInvite,
  renameNucleusDoc
} from './firebase-config.js?v=202610081952';

export const state = {
  user: null,
  activeNucleusId: 'default-nucleus',
  activeNucleus: {
    id: 'default-nucleus',
    name: 'Núcleo Principal',
    circles: [
      { id: 0, name: 'Círculo 1', color: '#3b82f6', ratio: 0.25 },
      { id: 1, name: 'Círculo 2', color: '#10b981', ratio: 0.50 },
      { id: 2, name: 'Círculo 3', color: '#f59e0b', ratio: 0.75 },
      { id: 3, name: 'Círculo 4', color: '#ef4444', ratio: 1.00 }
    ]
  },
  nucleiList: [
    { id: 'default-nucleus', name: 'Núcleo Principal' }
  ],
  participants: [],
  selectedParticipantId: null,
  sidebarOpen: false,
  groupByCircle: true,
  currentSort: 'custom',
  authMode: 'login',
  unsubscribeNucleus: null
};

const dom = {
  nucleusBtn: document.getElementById('nucleus-dropdown-btn'),
  currentNucleusName: document.getElementById('current-nucleus-name'),
  nucleusDropdown: document.getElementById('nucleus-dropdown'),
  nucleusList: document.getElementById('nucleus-list'),
  btnNewNucleus: document.getElementById('btn-new-nucleus'),
  btnShareNucleus: document.getElementById('btn-share-nucleus'),
  btnCustomizeCircles: document.getElementById('btn-customize-circles'),
  btnAuthAction: document.getElementById('btn-auth-action'),
  userEmailDisplay: document.getElementById('user-email-display'),
  btnShowList: document.getElementById('btn-show-list'),
  sideMenu: document.getElementById('side-menu'),
  canvasContainer: document.getElementById('canvas-container'),
  svgCanvas: document.getElementById('circles-canvas'),
  personPop: document.getElementById('person-pop'),
  btnOpenSearch: document.getElementById('btn-open-search'),
  searchBox: document.getElementById('search-box'),
  searchInput: document.getElementById('search-input'),
  searchCount: document.getElementById('search-count'),
  searchPrev: document.getElementById('search-prev'),
  searchNext: document.getElementById('search-next'),
  searchClose: document.getElementById('search-close'),
  searchInComments: document.getElementById('search-in-comments'),
  circlesLayer: document.getElementById('circles-layer'),
  participantsLayer: document.getElementById('participants-layer'),
  formAddParticipant: document.getElementById('form-add-participant'),
  inputName: document.getElementById('input-name'),
  inputAge: document.getElementById('input-age'),
  inputComments: document.getElementById('input-comments'),
  inputNextSteps: document.getElementById('input-next-steps'),
  participantCount: document.getElementById('participant-count'),
  toggleGroupCircles: document.getElementById('toggle-group-circles'),
  selectSort: document.getElementById('select-sort'),
  participantsListContainer: document.getElementById('participants-list-container'),
  sideViewMain: document.getElementById('side-view-main'),
  sideViewDetail: document.getElementById('side-view-detail'),
  btnBackToList: document.getElementById('btn-back-to-list'),
  formEditParticipant: document.getElementById('form-edit-participant'),
  detailId: document.getElementById('detail-participant-id'),
  detailCircleName: document.getElementById('detail-circle-name'),
  detailName: document.getElementById('detail-name'),
  detailAge: document.getElementById('detail-age'),
  detailComments: document.getElementById('detail-comments'),
  detailNextSteps: document.getElementById('detail-next-steps'),
  detailBooksEditor: document.getElementById('detail-books-editor'),
  detailSaveStatus: document.getElementById('detail-save-status'),
  addBooksEditor: document.getElementById('add-books-editor'),
  detailCreatedAt: document.getElementById('detail-created-at'),
  detailUpdatedAt: document.getElementById('detail-updated-at'),
  btnArchiveParticipant: document.getElementById('btn-archive-participant'),
  btnDeleteParticipant: document.getElementById('btn-delete-participant'),
  modalNewNucleus: document.getElementById('modal-new-nucleus'),
  formCreateNucleus: document.getElementById('form-create-nucleus'),
  inputNewNucleusName: document.getElementById('input-new-nucleus-name'),
  modalCustomizeCircles: document.getElementById('modal-customize-circles'),
  circleCustomizersContainer: document.getElementById('circle-customizers-container'),
  btnSaveCircleSettings: document.getElementById('btn-save-circle-settings'),
  fontSizeSlider: document.getElementById('font-size-slider'),
  fontSizeValue: document.getElementById('font-size-value'),
  modalAuth: document.getElementById('modal-auth'),
  formAuth: document.getElementById('form-auth'),
  authModalTitle: document.getElementById('auth-modal-title'),
  authEmail: document.getElementById('auth-email'),
  authPassword: document.getElementById('auth-password'),
  authSubmitBtn: document.getElementById('auth-submit-btn'),
  authErrorMsg: document.getElementById('auth-error-msg'),
  btnToggleAuthMode: document.getElementById('btn-toggle-auth-mode'),
  authToggleText: document.getElementById('auth-toggle-text'),
  toast: document.getElementById('toast'),
  btnRenameNucleus: document.getElementById('btn-rename-nucleus'),
  modalRenameNucleus: document.getElementById('modal-rename-nucleus'),
  formRenameNucleus: document.getElementById('form-rename-nucleus'),
  inputRenameNucleus: document.getElementById('input-rename-nucleus')
};

document.addEventListener('DOMContentLoaded', () => {
  loadLocalState();
  initEventListeners();
  observeCanvasSize();
  initCanvasZoom();
  renderCanvas();
  renderParticipantsList();
  updateNucleusUI();

  window.addEventListener('resize', () => renderCanvas());

  // Enlace de invitación: lo guardamos y lo procesamos cuando Firebase sepa
  // si hay sesión (antes se perdía si la sesión aún no se había restaurado).
  const urlParams = new URLSearchParams(window.location.search);
  const joinId = urlParams.get('join');
  if (joinId) {
    setPendingJoin(joinId);
    urlParams.delete('join');
    const clean = window.location.pathname + (urlParams.toString() ? '?' + urlParams : '') + window.location.hash;
    window.history.replaceState(null, '', clean);
  }

  initFirebaseCloud((user) => {
    state.user = user;
    updateAuthUI();
    if (user) {
      loadUserCloudData();
    } else if (getPendingJoin()) {
      showToast('Inicia sesión o crea una cuenta para unirte al núcleo compartido.');
      openAuthModal('login');
    }
  });
});

function setPendingJoin(id) {
  try { localStorage.setItem('circulos_pending_join', id); } catch (_) {}
}
function getPendingJoin() {
  try { return localStorage.getItem('circulos_pending_join'); } catch (_) { return null; }
}
function clearPendingJoin() {
  try { localStorage.removeItem('circulos_pending_join'); } catch (_) {}
}

function saveLocalState() {
  localStorage.setItem('circulos_state', JSON.stringify({
    activeNucleusId: state.activeNucleusId,
    activeNucleus: state.activeNucleus,
    nucleiList: state.nucleiList,
    participants: state.participants
  }));
}

function loadLocalState() {
  const saved = localStorage.getItem('circulos_state');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.activeNucleus) state.activeNucleus = data.activeNucleus;
      if (data.activeNucleusId) state.activeNucleusId = data.activeNucleusId;
      if (data.nucleiList) state.nucleiList = data.nucleiList;
      if (data.participants) state.participants = data.participants;
    } catch (e) {
      console.error(e);
    }
  }
}

function initEventListeners() {
  dom.nucleusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.nucleusDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!dom.nucleusDropdown.contains(e.target) && !dom.nucleusBtn.contains(e.target)) {
      dom.nucleusDropdown.classList.add('hidden');
    }
  });

  dom.btnNewNucleus.addEventListener('click', () => {
    dom.nucleusDropdown.classList.add('hidden');
    dom.modalNewNucleus.classList.remove('hidden');
    dom.inputNewNucleusName.focus();
  });

  dom.btnShareNucleus.addEventListener('click', copyInviteLink);

  dom.btnRenameNucleus.addEventListener('click', () => openRenameNucleus(state.activeNucleusId));
  dom.formRenameNucleus.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = dom.inputRenameNucleus.value.trim();
    if (!name) return;
    renameNucleus(dom.formRenameNucleus.dataset.nucleusId, name);
    dom.modalRenameNucleus.classList.add('hidden');
  });

  dom.formCreateNucleus.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = dom.inputNewNucleusName.value.trim();
    if (name) {
      createNewNucleus(name);
      dom.modalNewNucleus.classList.add('hidden');
      dom.inputNewNucleusName.value = '';
    }
  });

  dom.btnCustomizeCircles.addEventListener('click', openCircleCustomizerModal);
  dom.btnSaveCircleSettings.addEventListener('click', saveCircleSettings);
  initSearch();
  initBooksEditors();
  dom.fontSizeSlider.addEventListener('input', () => {
    // nivel = último punto de control sobrepasado (vista previa en directo)
    setFontSizeUI(Math.floor(parseFloat(dom.fontSizeSlider.value) + 1e-6), false);
    renderCanvas();
  });
  // al cerrar sin guardar, volver al tamaño guardado
  dom.modalCustomizeCircles.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => { fontPreviewLevel = null; renderCanvas(); });
  });
  dom.btnShowList.addEventListener('click', toggleListView);
  // Formulario de alta: Intro añade (Mayús+Intro = salto de línea en el texto largo)
  dom.formAddParticipant.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    if (e.target.tagName === 'TEXTAREA' && e.shiftKey) return;
    if (e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    dom.formAddParticipant.requestSubmit();
  });
  dom.formAddParticipant.addEventListener('submit', handleAddParticipant);

  dom.toggleGroupCircles.addEventListener('change', (e) => {
    state.groupByCircle = e.target.checked;
    renderParticipantsList();
  });

  dom.selectSort.addEventListener('change', (e) => {
    state.currentSort = e.target.value;
    renderParticipantsList();
  });

  dom.btnBackToList.addEventListener('click', () => showSideView('main'));
  dom.formEditParticipant.addEventListener('submit', handleSaveParticipantDetail);
  [dom.detailName, dom.detailAge, dom.detailComments, dom.detailNextSteps].forEach((el) => {
    el.addEventListener('input', scheduleDetailAutosave);
    el.addEventListener('blur', () => { if (detailSaveTimer) flushDetailAutosave(); });
  });
  // Clic fuera del menú: guardar lo que haya (perfil o alta nueva) y cerrarlo
  document.addEventListener('pointerdown', (e) => {
    if (dom.sideMenu.classList.contains('collapsed')) return;
    const t = e.target;
    if (dom.sideMenu.contains(t)) return;
    if (t.closest('.modal-overlay') || t.closest('#person-pop') || t.closest('#btn-show-list') || t.closest('#toast')) return;
    closeSideMenuSaving();
  }, true);
  // Intro guarda; Mayús+Intro hace salto de línea en los textos largos
  dom.formEditParticipant.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    if (e.target.tagName === 'TEXTAREA' && e.shiftKey) return;
    if (e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    dom.formEditParticipant.requestSubmit();
  });
  dom.btnArchiveParticipant.addEventListener('click', handleToggleArchive);
  dom.btnDeleteParticipant.addEventListener('click', handleDeleteParticipant);

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').classList.add('hidden');
    });
  });

  dom.btnAuthAction.addEventListener('click', handleAuthButtonClick);
  dom.formAuth.addEventListener('submit', handleAuthSubmit);
  dom.btnToggleAuthMode.addEventListener('click', toggleAuthMode);
}

function toggleSidebar() {
  state.sidebarOpen = !dom.sideMenu.classList.contains('collapsed');
  state.sidebarOpen = !state.sidebarOpen;
  if (state.sidebarOpen) {
    dom.sideMenu.classList.remove('collapsed');
  } else {
    dom.sideMenu.classList.add('collapsed');
  }
}

// ---- Desplazamiento del lienzo cuando el menú lateral está abierto ----
// Con el menú abierto, el centro de los círculos se mueve al centro de la zona
// libre (a la izquierda del panel); al cerrarlo vuelve al centro de la pantalla.
function sidebarReservedWidth() {
  // anchura del panel + margen derecho (18px) + un pequeño respiro
  return (dom.sideMenu ? dom.sideMenu.offsetWidth : 372) + 18 + 18;
}

function updateCanvasShift() {
  if (!dom.canvasContainer || !dom.sideMenu) return;
  const open = !dom.sideMenu.classList.contains('collapsed');
  const cw = dom.canvasContainer.clientWidth;
  const reserved = sidebarReservedWidth();
  // en pantallas estrechas el panel tapa casi todo: no desplazamos
  const shift = open && cw - reserved > 240 ? reserved / 2 : 0;
  dom.canvasContainer.style.setProperty('--canvas-shift', shift + 'px');
  dom.canvasContainer.style.setProperty('--search-right', (shift ? reserved : 18) + 'px');
}

let sideMenuObserver = null;
function observeSideMenu() {
  if (sideMenuObserver || !dom.sideMenu) return;
  sideMenuObserver = new MutationObserver(updateCanvasShift);
  sideMenuObserver.observe(dom.sideMenu, { attributes: true, attributeFilter: ['class'] });
  updateCanvasShift();
}

// ---- Zoom del lienzo (rueda del ratón) ----
// El "mundo" es WORLD_SCALE veces más grande que la pantalla: con el zoom al
// mínimo se ven todos los círculos (las fichas quedan pequeñas) y al acercarse
// cada círculo tiene sitio de sobra para los nombres.
const WORLD_SCALE = 4;
const view = { zoom: 1, x: 0, y: 0, w: 0, h: 0, screenW: 0 };
const ZOOM_MIN = 1;
const ZOOM_MAX = 12;

// píxeles de pantalla por unidad del lienzo
function pxPerUnit() {
  if (!view.w) return 1;
  return view.screenW / (view.w / view.zoom);
}

// Los títulos de los círculos mantienen un tamaño legible en pantalla
// independientemente del zoom.
function updateCircleTitles() {
  if (!dom.circlesLayer) return;
  const k = 1 / pxPerUnit();
  dom.circlesLayer.querySelectorAll('.circle-title-text').forEach((t) => {
    const top = parseFloat(t.dataset.top);
    t.setAttribute('font-size', (12 * k).toFixed(3));
    t.setAttribute('y', top + 20 * k);
  });
}

function applyViewBox() {
  if (view.w < 2 || view.h < 2) return;
  const vw = view.w / view.zoom;
  const vh = view.h / view.zoom;
  // mantener la vista dentro del lienzo
  view.x = Math.min(Math.max(view.x, 0), view.w - vw);
  view.y = Math.min(Math.max(view.y, 0), view.h - vh);
  dom.svgCanvas.setAttribute('viewBox', `${view.x} ${view.y} ${vw} ${vh}`);
  dom.canvasContainer.dataset.zoomed = view.zoom > 1.01 ? 'true' : 'false';
  updateCircleTitles();
  positionPersonPop();
}

function zoomAt(clientX, clientY, factor) {
  const rect = dom.svgCanvas.getBoundingClientRect();
  const prev = view.zoom;
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev * factor));
  if (next === prev) return;
  // punto del lienzo bajo el cursor, invariante al hacer zoom
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  const cx = view.x + fx * (view.w / prev);
  const cy = view.y + fy * (view.h / prev);
  view.zoom = next;
  view.x = cx - fx * (view.w / next);
  view.y = cy - fy * (view.h / next);
  applyViewBox();
}

function initCanvasZoom() {
  dom.canvasContainer.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.002));
  }, { passive: false });

  // arrastrar el fondo para moverse por los círculos (clic simple: cerrar ficha)
  let pan = null;
  dom.canvasContainer.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.participant-node') || e.target.closest('.person-pop')) return;
    pan = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false, id: e.pointerId };
  });
  window.addEventListener('pointermove', (e) => {
    if (!pan || e.pointerId !== pan.id) return;
    const dx = e.clientX - pan.x;
    const dy = e.clientY - pan.y;
    if (!pan.moved && Math.hypot(dx, dy) < 4) return;
    if (!pan.moved) {
      pan.moved = true;
      dom.canvasContainer.classList.add('panning');
    }
    const k = pxPerUnit();
    view.x = pan.vx - dx / k;
    view.y = pan.vy - dy / k;
    applyViewBox();
  });
  const endPan = (e) => {
    if (!pan || e.pointerId !== pan.id) return;
    if (!pan.moved) closePersonPop();
    dom.canvasContainer.classList.remove('panning');
    pan = null;
  };
  window.addEventListener('pointerup', endPan);
  window.addEventListener('pointercancel', endPan);

  // ficha rápida: clic abre el perfil en el menú lateral
  dom.personPop.addEventListener('click', () => {
    const id = popState.id;
    closePersonPop();
    if (id) openParticipantDetail(id);
  });
  dom.personPop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dom.personPop.click(); }
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePersonPop(); });
  // clic fuera del lienzo (menú, cabecera...) también la cierra
  document.addEventListener('pointerdown', (e) => {
    if (popState.id && !dom.canvasContainer.contains(e.target)) closePersonPop();
  });

  // doble clic en el fondo: volver a la vista completa
  dom.canvasContainer.addEventListener('dblclick', (e) => {
    if (e.target.closest('.participant-node')) return;
    view.zoom = 1; view.x = 0; view.y = 0;
    applyViewBox();
  });
}

// ---- Libros de estudio (L1 = base de la pirámide … L7 = cima) ----
const BOOKS = [
  { n: 1, color: '#CA0068', ink: '#FFFFFF' },
  { n: 2, color: '#E23940', ink: '#FFFFFF' },
  { n: 3, color: '#EF7623', ink: '#14110C' },
  { n: 4, color: '#FCB131', ink: '#14110C' },
  { n: 5, color: '#FFD203', ink: '#14110C' },
  { n: 6, color: '#FFEA6D', ink: '#14110C' },
  { n: 7, color: '#E9EA67', ink: '#14110C' }
];

function hasBook(p, n) {
  return Array.isArray(p.books) && p.books.includes(n);
}

function booksStripHtml(p, cls) {
  return `<div class="${cls}">` + BOOKS.map((b) => {
    const done = hasBook(p, b.n);
    const style = done ? ` style="--book:${b.color};--book-ink:${b.ink}"` : '';
    return `<span class="book-chip${done ? ' done' : ''}"${style} title="Libro ${b.n}${done ? ' · hecho' : ' · pendiente'}">L${b.n}</span>`;
  }).join('') + '</div>';
}

function isDoing(p, n) {
  return Array.isArray(p.doing) && p.doing.includes(n);
}

function bookChipHtml(n, done, extra = '') {
  const b = BOOKS[n - 1];
  const style = done ? ` style="--book:${b.color};--book-ink:${b.ink}"` : '';
  return `<span class="book-chip${done ? ' done' : ''}${extra}"${style}>L${n}</span>`;
}

// Avisar al menú lateral de que su contenido ha cambiado de alto
function notifySideMenuResize() {
  window.dispatchEvent(new Event('resize'));
}

/*
 * Editor de libros reutilizable (perfil y formulario de alta):
 *  - «Libros completados»: 7 casillas que se colorean
 *  - «Haciendo ahora»: libros elegidos + botón «+» que despliega los 7 libros
 * getModel() devuelve el objeto con { books, doing }; onChange() se llama tras cada cambio.
 */
function createBooksEditor(root, getModel, onChange) {
  root.innerHTML = `
    <div class="form-group">
      <label>Libros completados</label>
      <div class="books-picker" role="group" aria-label="Libros completados"></div>
    </div>
    <div class="form-group">
      <label>Haciendo ahora</label>
      <div class="doing-row"></div>
      <div class="doing-choices hidden" role="group" aria-label="Elige el libro que está haciendo">
        <span class="doing-choices-label">Elige libro:</span>
      </div>
    </div>`;
  const grid = root.querySelector('.books-picker');
  const doingRow = root.querySelector('.doing-row');
  const choices = root.querySelector('.doing-choices');

  BOOKS.forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'book-toggle';
    btn.textContent = `L${b.n}`;
    btn.style.setProperty('--book', b.color);
    btn.style.setProperty('--book-ink', b.ink);
    btn.addEventListener('click', () => {
      const m = getModel();
      if (!m) return;
      const set = new Set(Array.isArray(m.books) ? m.books : []);
      if (set.has(b.n)) {
        set.delete(b.n);
      } else {
        set.add(b.n);
        // al completarlo, deja de estar «haciendo ahora»
        if (Array.isArray(m.doing)) m.doing = m.doing.filter((x) => x !== b.n);
      }
      m.books = [...set].sort((x, y) => x - y);
      update();
      onChange(m);
    });
    grid.appendChild(btn);

    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'book-toggle done small';
    pick.textContent = `L${b.n}`;
    pick.style.setProperty('--book', b.color);
    pick.style.setProperty('--book-ink', b.ink);
    pick.addEventListener('click', () => {
      const m = getModel();
      if (!m) return;
      const set = new Set(Array.isArray(m.doing) ? m.doing : []);
      set.add(b.n);
      m.doing = [...set].sort((x, y) => x - y);
      setChoicesOpen(false);
      update();
      onChange(m);
      const plus = doingRow.querySelector('.doing-add');
      if (plus) plus.focus();
    });
    choices.appendChild(pick);
  });
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'doing-cancel';
  cancel.textContent = 'Cancelar';
  cancel.addEventListener('click', () => setChoicesOpen(false));
  choices.appendChild(cancel);

  function setChoicesOpen(open) {
    choices.classList.toggle('hidden', !open);
    const plus = doingRow.querySelector('.doing-add');
    if (plus) plus.classList.toggle('open', open);
    notifySideMenuResize();
  }

  function update() {
    const m = getModel() || {};
    grid.querySelectorAll('.book-toggle').forEach((btn, i) => {
      const done = hasBook(m, BOOKS[i].n);
      btn.classList.toggle('done', done);
      btn.setAttribute('aria-pressed', done ? 'true' : 'false');
      btn.title = `Libro ${BOOKS[i].n}: ${done ? 'completado' : 'pendiente'}`;
    });
    // libros que ya está haciendo: no se ofrecen otra vez
    choices.querySelectorAll('.book-toggle').forEach((btn, i) => {
      btn.disabled = isDoing(m, BOOKS[i].n);
    });

    doingRow.innerHTML = '';
    (Array.isArray(m.doing) ? m.doing : []).forEach((n) => {
      const b = BOOKS[n - 1];
      if (!b) return;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'book-toggle done doing-chip';
      chip.style.setProperty('--book', b.color);
      chip.style.setProperty('--book-ink', b.ink);
      chip.innerHTML = `L${n}<span class="doing-x" aria-hidden="true">×</span>`;
      chip.title = `Haciendo el libro ${n} · clic para quitar`;
      chip.addEventListener('click', () => {
        const mm = getModel();
        if (!mm) return;
        mm.doing = (mm.doing || []).filter((x) => x !== n);
        update();
        onChange(mm);
      });
      doingRow.appendChild(chip);
    });
    const allDoing = (m.doing || []).length >= BOOKS.length;
    if (!allDoing) {
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'book-toggle doing-add';
      plus.textContent = '+';
      plus.title = 'Añadir libro que está haciendo';
      plus.classList.toggle('open', !choices.classList.contains('hidden'));
      plus.addEventListener('click', () => setChoicesOpen(choices.classList.contains('hidden')));
      doingRow.appendChild(plus);
    } else {
      setChoicesOpen(false);
    }
  }

  update();
  return { update, close: () => setChoicesOpen(false) };
}

let detailBooksEditor = null;
let addBooksEditor = null;
let addDraft = { books: [], doing: [] };

function initBooksEditors() {
  detailBooksEditor = createBooksEditor(
    dom.detailBooksEditor,
    () => state.participants.find((p) => p.id === dom.detailId.value),
    (p) => {
      // se guarda al momento
      p.updatedAt = new Date().toISOString();
      saveParticipant(p);
      if (popState.id === p.id) openPersonPop(p.id);
    }
  );
  addBooksEditor = createBooksEditor(dom.addBooksEditor, () => addDraft, () => {});
}

// ---- Ficha rápida de un participante ----
const popState = { id: null };

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function openPersonPop(id) {
  const p = state.participants.find((item) => item.id === id);
  if (!p) return;
  popState.id = id;
  const circle = state.activeNucleus.circles[p.circleIndex];
  const color = circle ? circle.color : '#94a3b8';
  const age = p.age || p.age === 0 ? `<span class="pop-age">${escapeHtml(p.age)}</span>` : '';
  const obs = p.comments ? `<div class="pop-obs">${escapeHtml(p.comments)}</div>` : '';
  const doingList = Array.isArray(p.doing) ? p.doing.filter((n) => BOOKS[n - 1]) : [];
  const doing = doingList.length
    ? `<span class="pop-doing"><span class="pop-doing-label">haciendo:</span>${doingList.map((n) => bookChipHtml(n, true)).join('')}</span>`
    : '';
  const steps = p.nextSteps
    ? `<div class="pop-steps">${escapeHtml(p.nextSteps)}</div>`
    : `<div class="pop-steps empty">Sin próximos pasos todavía</div>`;
  dom.personPop.style.setProperty('--pop-color', color);
  dom.personPop.innerHTML = `
    <div class="pop-head">
      <span class="pop-dot"></span>
      <span class="pop-name">${escapeHtml(p.name)}</span>${age}${doing}
    </div>
    ${obs}
    ${booksStripHtml(p, 'pop-books')}
    <div class="pop-label">Próximos pasos</div>
    ${steps}
    <div class="pop-foot">Abrir perfil →</div>`;
  dom.personPop.classList.remove('hidden', 'show');
  positionPersonPop();
  requestAnimationFrame(() => dom.personPop.classList.add('show'));
}

function closePersonPop() {
  popState.id = null;
  if (dom.personPop) dom.personPop.classList.add('hidden');
}

function positionPersonPop() {
  if (!popState.id || !dom.personPop) return;
  const node = dom.participantsLayer.querySelector(`[data-id="${popState.id}"]`);
  if (!node) { closePersonPop(); return; }
  const box = dom.canvasContainer.getBoundingClientRect();
  const r = node.getBoundingClientRect();
  const pop = dom.personPop;
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  const gap = 14;
  // límite derecho: no meterse debajo del menú lateral si está abierto
  const menuOpen = dom.sideMenu && !dom.sideMenu.classList.contains('collapsed');
  const rightLimit = menuOpen ? dom.sideMenu.getBoundingClientRect().left - box.left - 12 : box.width - 12;

  let left = r.right - box.left + gap;
  let side = 'right';
  if (left + pw > rightLimit) {
    left = r.left - box.left - gap - pw;
    side = 'left';
  }
  left = Math.max(12, left);
  const cy = r.top - box.top + r.height / 2;
  const top = Math.min(Math.max(12, cy - ph / 2), box.height - ph - 12);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  pop.style.setProperty('--arrow-y', Math.min(Math.max(14, cy - top), ph - 14) + 'px');
  pop.dataset.side = side;
}

let canvasObserver = null;
function observeCanvasSize() {
  if (canvasObserver || !dom.canvasContainer) return;
  let last = '';
  canvasObserver = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    const key = Math.round(width) + 'x' + Math.round(height);
    if (width < 2 || height < 2 || key === last) return;
    last = key;
    renderCanvas();
  });
  canvasObserver.observe(dom.canvasContainer);
  observeSideMenu();
}

function renderCanvas() {
  const rect = dom.canvasContainer.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // El primer render puede ocurrir antes de que el layout resuelva la caja del
  // contenedor: sin ancho/alto todos los radios saldrían 0. Reintentamos en el
  // siguiente frame y dejamos que el ResizeObserver haga el render definitivo.
  if (width < 2 || height < 2) {
    requestAnimationFrame(renderCanvas);
    return;
  }
  
  updateCanvasShift();

  const worldW = width * WORLD_SCALE;
  const worldH = height * WORLD_SCALE;
  if (view.w !== worldW || view.h !== worldH) {
    // conservar la zona que se estaba mirando si cambia el tamaño
    const ratio = view.w ? worldW / view.w : 1;
    view.x *= ratio;
    view.y *= ratio;
    view.w = worldW;
    view.h = worldH;
  }
  view.screenW = width;

  const centerX = worldW / 2;
  const centerY = worldH / 2;
  // Radio calculado para que, con el zoom al mínimo, todo quepa en la zona que
  // deja libre el menú lateral (así no cambia la geometría al abrirlo/cerrarlo).
  const freeW = width - sidebarReservedWidth() > 240 ? width - sidebarReservedWidth() : width;
  const maxRadius = Math.min(freeW, height) * WORLD_SCALE * 0.46;

  // 1. Círculos
  dom.circlesLayer.innerHTML = '';
  const circles = [...state.activeNucleus.circles].reverse();

  circles.forEach((circle) => {
    const r = maxRadius * circle.ratio;
    
    const circleEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circleEl.setAttribute('cx', centerX);
    circleEl.setAttribute('cy', centerY);
    circleEl.setAttribute('r', r);
    circleEl.setAttribute('fill', circle.color);
    circleEl.setAttribute('stroke', circle.color);
    circleEl.setAttribute('class', 'concentric-circle');
    circleEl.dataset.circleId = circle.id;
    dom.circlesLayer.appendChild(circleEl);

    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', centerX);
    textEl.dataset.top = centerY - r;
    textEl.setAttribute('class', 'circle-title-text');
    textEl.setAttribute('fill', circle.color);
    textEl.textContent = circle.name;

    dom.circlesLayer.appendChild(textEl);
  });

  // 2. Participantes
  dom.participantsLayer.innerHTML = '';
  const activeParticipants = state.participants.filter(p => !p.archived);

  activeParticipants.forEach((p) => {
    const px = centerX + (p.normX || 0) * maxRadius;
    const py = centerY + (p.normY || 0) * maxRadius;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'participant-node');
    g.setAttribute('transform', `translate(${px}, ${py})`);
    g.dataset.id = p.id;

    const fs = FONT_LEVEL_SCALES[currentFontLevel()];
    const textWidth = Math.max(54, p.name.length * 5.7 + 18) * fs;
    const textHeight = 20 * fs;

    const rectEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rectEl.setAttribute('x', -textWidth / 2);
    rectEl.setAttribute('y', -textHeight / 2);
    rectEl.setAttribute('width', textWidth);
    rectEl.setAttribute('height', textHeight);
    rectEl.setAttribute('class', 'participant-chip-rect');
    rectEl.style.rx = 10 * fs;

    const circleInfo = state.activeNucleus.circles[p.circleIndex];
    if (circleInfo) {
      rectEl.setAttribute('fill', '#ffffff');
      rectEl.setAttribute('stroke', circleInfo.color);
    } else {
      rectEl.setAttribute('fill', '#f8fafc');
      rectEl.setAttribute('stroke', '#94a3b8');
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', 0);
    text.setAttribute('y', 1);
    text.setAttribute('class', 'participant-chip-text');
    text.style.fontSize = (9.5 * fs) + 'px';
    text.setAttribute('fill', '#0f172a');
    text.textContent = p.name;

    g.appendChild(rectEl);
    g.appendChild(text);

    makeDraggable(g, p, centerX, centerY, maxRadius);


    dom.participantsLayer.appendChild(g);
  });

  applySearchHighlights();
  applyViewBox();
}

// Convierte un punto de pantalla a coordenadas del lienzo
function screenToWorld(clientX, clientY) {
  const rect = dom.svgCanvas.getBoundingClientRect();
  const k = pxPerUnit();
  return { x: view.x + (clientX - rect.left) / k, y: view.y + (clientY - rect.top) / k };
}

// Zona visible útil del lienzo (sin la parte que tapa el menú lateral)
function visibleCanvasBounds() {
  const box = dom.canvasContainer.getBoundingClientRect();
  let right = box.right;
  if (dom.sideMenu && !dom.sideMenu.classList.contains('collapsed')) {
    const menuLeft = dom.sideMenu.getBoundingClientRect().left;
    if (menuLeft - box.left > 240) right = menuLeft;
  }
  return { left: box.left, top: box.top, right, bottom: box.bottom };
}

// Autodesplazamiento al llevar una ficha al borde
const EDGE_ZONE = 70;        // px desde el borde en los que empieza a moverse
const EDGE_MIN_SPEED = 180;  // px de pantalla por segundo al entrar en la zona
const EDGE_MAX_SPEED = 650;  // px de pantalla por segundo pegado al borde

function edgeSpeed(dist) {
  // dist: px que faltan hasta el borde (negativo si el cursor ya lo ha pasado)
  if (dist >= EDGE_ZONE) return 0;
  const t = Math.min(1, Math.max(0, 1 - dist / EDGE_ZONE));
  return EDGE_MIN_SPEED + (EDGE_MAX_SPEED - EDGE_MIN_SPEED) * t * t;
}

function makeDraggable(element, participant, centerX, centerY, maxRadius) {
  let isDragging = false;
  let startX, startY;
  let lastX, lastY;
  let grabDX = 0, grabDY = 0;   // desfase entre el cursor y el centro de la ficha (lienzo)
  let newNormX = participant.normX || 0;
  let newNormY = participant.normY || 0;
  let raf = null;
  let lastT = 0;

  const placeAtCursor = () => {
    const w = screenToWorld(lastX, lastY);
    newNormX = (w.x + grabDX - centerX) / maxRadius;
    newNormY = (w.y + grabDY - centerY) / maxRadius;
    element.setAttribute('transform', `translate(${centerX + newNormX * maxRadius}, ${centerY + newNormY * maxRadius})`);
    highlightCircleRing(Math.sqrt(newNormX * newNormX + newNormY * newNormY));
  };

  const tick = (t) => {
    if (!isDragging) { raf = null; return; }
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
    lastT = t;
    if (element.dataset.dragged === 'true' && dt > 0) {
      const b = visibleCanvasBounds();
      const vx = edgeSpeed(b.right - lastX) - edgeSpeed(lastX - b.left);
      const vy = edgeSpeed(b.bottom - lastY) - edgeSpeed(lastY - b.top);
      if (vx || vy) {
        const k = pxPerUnit();
        const ox = view.x, oy = view.y;
        view.x += (vx * dt) / k;
        view.y += (vy * dt) / k;
        applyViewBox();
        if (view.x !== ox || view.y !== oy) placeAtCursor();
      }
    }
    raf = requestAnimationFrame(tick);
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    element.dataset.dragged = 'false';
    element.classList.add('dragging');
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    const w = screenToWorld(e.clientX, e.clientY);
    grabDX = centerX + (participant.normX || 0) * maxRadius - w.x;
    grabDY = centerY + (participant.normY || 0) * maxRadius - w.y;
    element.setPointerCapture(e.pointerId);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    lastT = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    lastX = e.clientX;
    lastY = e.clientY;
    if (Math.abs(lastX - startX) > 3 || Math.abs(lastY - startY) > 3) element.dataset.dragged = 'true';
    if (element.dataset.dragged === 'true') placeAtCursor();
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    element.classList.remove('dragging');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (raf) { cancelAnimationFrame(raf); raf = null; }

    // sin movimiento: es un clic → mostrar/ocultar la ficha rápida
    if (element.dataset.dragged !== 'true') {
      dom.circlesLayer.querySelectorAll('.hover-active').forEach((el) => el.classList.remove('hover-active'));
      if (popState.id === participant.id) closePersonPop();
      else openPersonPop(participant.id);
      return;
    }

    participant.normX = newNormX;
    participant.normY = newNormY;
    participant.updatedAt = new Date().toISOString();

    const distance = Math.sqrt(newNormX * newNormX + newNormY * newNormY);
    participant.circleIndex = calculateCircleFromDistance(distance);

    saveParticipant(participant);
    renderCanvas();
    renderParticipantsList();
  };

  element.addEventListener('pointerdown', onPointerDown);
}

function calculateCircleFromDistance(dist) {
  const circles = state.activeNucleus.circles;
  for (let i = 0; i < circles.length; i++) {
    if (dist <= circles[i].ratio) return i;
  }
  return -1;
}

function highlightCircleRing(dist) {
  const circleEls = dom.circlesLayer.querySelectorAll('.concentric-circle');
  circleEls.forEach(el => el.classList.remove('hover-active'));

  const circleIdx = calculateCircleFromDistance(dist);
  if (circleIdx !== -1) {
    const activeEl = dom.circlesLayer.querySelector(`[data-circle-id="${circleIdx}"]`);
    if (activeEl) activeEl.classList.add('hover-active');
  }
}

function handleAddParticipant(e) {
  if (e) e.preventDefault();
  const name = dom.inputName.value.trim();
  if (!name) return;

  const age = dom.inputAge.value ? parseInt(dom.inputAge.value, 10) : null;
  const comments = dom.inputComments.value.trim();
  const nextSteps = dom.inputNextSteps.value.trim();

  const angle = Math.random() * Math.PI * 2;
  const normX = 1.15 * Math.cos(angle);
  const normY = 1.15 * Math.sin(angle);

  const newParticipant = {
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name,
    age,
    comments,
    nextSteps,
    books: [...addDraft.books],
    doing: [...addDraft.doing],
    normX,
    normY,
    circleIndex: -1,
    customOrder: state.participants.length,
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.participants.push(newParticipant);
  saveParticipant(newParticipant);

  dom.inputName.value = '';
  dom.inputAge.value = '';
  dom.inputComments.value = '';
  dom.inputNextSteps.value = '';
  addDraft = { books: [], doing: [] };
  if (addBooksEditor) { addBooksEditor.close(); addBooksEditor.update(); }

  renderCanvas();
  renderParticipantsList();
  showToast(`"${name}" añadido en el exterior. ¡Arrastra su ficha al círculo!`);
  // si se añadió con Intro, dejar listo el formulario para el siguiente
  if (e && !dom.sideMenu.classList.contains('collapsed')) dom.inputName.focus();
}

function saveParticipant(p) {
  saveLocalState();
  if (state.user) saveParticipantDoc(state.activeNucleusId, p);
}

function renderParticipantsList() {
  const activeParticipants = state.participants.filter(p => !p.archived);
  dom.participantCount.textContent = activeParticipants.length;
  dom.participantsListContainer.innerHTML = '';

  if (activeParticipants.length === 0) {
    dom.participantsListContainer.innerHTML = `
      <div style="text-align:center; padding: 24px; color: var(--text-muted); font-size: 13px;">
        No hay participantes en este núcleo.<br>Añade uno con el formulario de arriba.
      </div>
    `;
    return;
  }

  let sortedList = [...activeParticipants];
  if (state.currentSort === 'alpha') {
    sortedList.sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.currentSort === 'createdAt') {
    sortedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (state.currentSort === 'updatedAt') {
    sortedList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } else {
    sortedList.sort((a, b) => (a.customOrder || 0) - (b.customOrder || 0));
  }

  if (state.groupByCircle) {
    const circles = state.activeNucleus.circles;
    circles.forEach((circle, idx) => {
      const inCircle = sortedList.filter(p => p.circleIndex === idx);
      renderCircleGroupSection(circle.name, circle.color, inCircle);
    });

    const unassigned = sortedList.filter(p => p.circleIndex === -1 || p.circleIndex >= circles.length);
    if (unassigned.length > 0) {
      renderCircleGroupSection('Exterior (Sin asignar)', '#64748b', unassigned);
    }
  } else {
    sortedList.forEach(p => {
      dom.participantsListContainer.appendChild(createParticipantListItem(p));
    });
  }

  initDragAndDropListReordering();
}

function renderCircleGroupSection(title, color, items) {
  const groupHeader = document.createElement('div');
  groupHeader.className = 'circle-group-header';
  groupHeader.style.backgroundColor = color + '1a';
  groupHeader.style.color = color;
  groupHeader.innerHTML = `<span>${title}</span><span style="font-weight:700;">${items.length}</span>`;
  dom.participantsListContainer.appendChild(groupHeader);

  items.forEach(p => dom.participantsListContainer.appendChild(createParticipantListItem(p)));
}

function createParticipantListItem(p) {
  const item = document.createElement('div');
  item.className = 'participant-list-item';
  item.dataset.id = p.id;
  item.draggable = (state.currentSort === 'custom');

  const circle = state.activeNucleus.circles[p.circleIndex];
  const circleLabel = circle ? circle.name : 'Exterior';

  item.innerHTML = `
    <span class="drag-handle" title="Arrastra para cambiar orden">☰</span>
    <div class="participant-info">
      <div class="participant-name-text">${p.name}</div>
      <div class="participant-meta-text">${circleLabel} ${p.age ? '• ' + p.age + ' años' : ''}</div>
    </div>
  `;

  item.addEventListener('click', (e) => {
    if (e.target.classList.contains('drag-handle')) return;
    openParticipantDetail(p.id);
  });

  return item;
}

function initDragAndDropListReordering() {
  if (state.currentSort !== 'custom') return;

  const items = dom.participantsListContainer.querySelectorAll('.participant-list-item');
  let draggedItem = null;

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      e.dataTransfer.effectAllowed = 'move';
      item.style.opacity = '0.4';
    });

    item.addEventListener('dragend', () => {
      if (draggedItem) draggedItem.style.opacity = '1';
      draggedItem = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedItem || draggedItem === item) return;

      const allItems = [...dom.participantsListContainer.querySelectorAll('.participant-list-item')];
      const fromIndex = allItems.indexOf(draggedItem);
      const toIndex = allItems.indexOf(item);

      if (fromIndex !== -1 && toIndex !== -1) {
        const pDragged = state.participants.find(p => p.id === draggedItem.dataset.id);
        const pTarget = state.participants.find(p => p.id === item.dataset.id);

        if (pDragged && pTarget) {
          const temp = pDragged.customOrder;
          pDragged.customOrder = pTarget.customOrder;
          pTarget.customOrder = temp;
          saveParticipant(pDragged);
          saveParticipant(pTarget);
          renderParticipantsList();
        }
      }
    });
  });
}

function openParticipantDetail(id) {
  const p = state.participants.find(item => item.id === id);
  if (!p) return;

  if (isDetailOpen() && dom.detailId.value && dom.detailId.value !== id) flushDetailAutosave();
  clearTimeout(detailSaveTimer);
  detailSaveTimer = null;
  setSaveStatus('Los cambios se guardan automáticamente');
  state.selectedParticipantId = id;
  dom.detailId.value = p.id;
  dom.detailName.value = p.name;
  dom.detailAge.value = p.age || '';
  dom.detailComments.value = p.comments || '';
  dom.detailNextSteps.value = p.nextSteps || '';
  if (detailBooksEditor) { detailBooksEditor.close(); detailBooksEditor.update(); }

  const circle = state.activeNucleus.circles[p.circleIndex];
  dom.detailCircleName.textContent = circle ? circle.name : 'Exterior / Sin asignar';
  dom.detailCreatedAt.textContent = p.createdAt ? new Date(p.createdAt).toLocaleString() : '-';
  dom.detailUpdatedAt.textContent = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '-';
  dom.btnArchiveParticipant.textContent = p.archived ? 'Desarchivar' : 'Archivar';

  showSideView('detail');
  focusNextStepsField();
}

// Deja el cursor listo en «Próximos pasos», al final del texto
let focusNextStepsTimer = null;
function focusNextStepsField() {
  clearTimeout(focusNextStepsTimer);
  // esperar a que termine la animación del panel / cambio de vista
  focusNextStepsTimer = setTimeout(() => {
    const ta = dom.detailNextSteps;
    if (!ta || dom.sideViewDetail.classList.contains('hidden')) return;
    ta.focus({ preventScroll: true });
    const end = ta.value.length;
    ta.setSelectionRange(end, end);
    ta.scrollTop = ta.scrollHeight;
  }, 450);
}

function showSideView(view) {
  if (view !== 'detail' && isDetailOpen()) flushDetailAutosave();
  if (view === 'detail') {
    dom.sideViewMain.classList.add('hidden');
    dom.sideViewDetail.classList.remove('hidden');
    // abrir el menú lateral si estaba plegado (el estado real es la clase)
    if (dom.sideMenu.classList.contains('collapsed')) {
      state.sidebarOpen = false;
      toggleSidebar();
    }
  } else {
    dom.sideViewDetail.classList.add('hidden');
    dom.sideViewMain.classList.remove('hidden');
  }
}

// ---- Abrir/cerrar el menú lateral ----
function sideMenuCurrentView() {
  if (isDetailOpen()) return 'detail';
  return window.__sideMenu ? window.__sideMenu.current() : 'main';
}

// Cierra el menú guardando: perfil abierto → se guarda; alta con nombre → se crea
function closeSideMenuSaving() {
  const view = sideMenuCurrentView();
  if (view === 'detail') {
    flushDetailAutosave();
    showSideView('main');
  } else if (view === 'main' && dom.inputName.value.trim()) {
    handleAddParticipant(null);
  }
  if (document.activeElement && dom.sideMenu.contains(document.activeElement)) document.activeElement.blur();
  if (!dom.sideMenu.classList.contains('collapsed')) toggleSidebar();
}

// Botón «Ver lista» de la cabecera
function toggleListView() {
  const sm = window.__sideMenu;
  if (!sm) return;
  const open = !dom.sideMenu.classList.contains('collapsed');
  if (open && sideMenuCurrentView() === 'list') {
    closeSideMenuSaving();
    return;
  }
  if (isDetailOpen()) {
    flushDetailAutosave();
    showSideView('main');
  } else if (sideMenuCurrentView() === 'main' && dom.inputName.value.trim()) {
    handleAddParticipant(null);   // no perder a quien se estaba añadiendo
  }
  sm.setView('list');
  if (!open) sm.setOpen(true);
}

// ---- Guardado automático del perfil ----
let detailSaveTimer = null;
let detailStatusTimer = null;

function setSaveStatus(text, cls) {
  if (!dom.detailSaveStatus) return;
  dom.detailSaveStatus.textContent = text;
  dom.detailSaveStatus.className = 'save-status' + (cls ? ' ' + cls : '');
}

function scheduleDetailAutosave() {
  clearTimeout(detailSaveTimer);
  setSaveStatus('Guardando…', 'pending');
  detailSaveTimer = setTimeout(flushDetailAutosave, 600);
}

// Pasa lo escrito en el perfil a la persona y lo guarda (solo si hay cambios)
function flushDetailAutosave() {
  clearTimeout(detailSaveTimer);
  detailSaveTimer = null;
  const p = state.participants.find((item) => item.id === dom.detailId.value);
  if (!p) return;

  const name = dom.detailName.value.trim();
  const age = dom.detailAge.value ? parseInt(dom.detailAge.value, 10) : null;
  const comments = dom.detailComments.value.trim();
  const nextSteps = dom.detailNextSteps.value.trim();

  const changed = (name && name !== p.name) || age !== (p.age ?? null)
    || comments !== (p.comments || '') || nextSteps !== (p.nextSteps || '');
  if (!changed) {
    if (!name) setSaveStatus('El nombre no puede quedar vacío', 'error');
    else setSaveStatus('Guardado ✓', 'ok');
    return;
  }

  if (name) p.name = name;
  p.age = age;
  p.comments = comments;
  p.nextSteps = nextSteps;
  p.updatedAt = new Date().toISOString();

  saveParticipant(p);
  renderCanvas();
  renderParticipantsList();
  if (popState.id === p.id) openPersonPop(p.id);
  dom.detailUpdatedAt.textContent = new Date(p.updatedAt).toLocaleString();
  if (!name) setSaveStatus('El nombre no puede quedar vacío', 'error');
  else setSaveStatus('Guardado ✓', 'ok');
  clearTimeout(detailStatusTimer);
  detailStatusTimer = setTimeout(() => {
    if (!detailSaveTimer) setSaveStatus('Los cambios se guardan automáticamente');
  }, 2500);
}

function isDetailOpen() {
  return !dom.sideViewDetail.classList.contains('hidden');
}

// Intro (en el perfil): guardar y cerrar el menú
function handleSaveParticipantDetail(e) {
  e.preventDefault();
  closeSideMenuSaving();
}

function handleToggleArchive() {
  flushDetailAutosave();
  const id = dom.detailId.value;
  const p = state.participants.find(item => item.id === id);
  if (!p) return;

  p.archived = !p.archived;
  p.updatedAt = new Date().toISOString();

  saveParticipant(p);
  renderCanvas();
  renderParticipantsList();
  showToast(p.archived ? 'Participante archivado' : 'Participante desarchivado');
  showSideView('main');
}

function handleDeleteParticipant() {
  clearTimeout(detailSaveTimer);
  detailSaveTimer = null;
  const id = dom.detailId.value;
  const p = state.participants.find(item => item.id === id);
  if (!p) return;

  if (confirm(`¿Estás seguro de que deseas eliminar a "${p.name}"?`)) {
    state.participants = state.participants.filter(item => item.id !== id);
    saveLocalState();
    if (state.user) deleteParticipantDoc(state.activeNucleusId, id);
    renderCanvas();
    renderParticipantsList();
    showToast('Participante eliminado');
    showSideView('main');
  }
}

function updateNucleusUI() {
  dom.currentNucleusName.textContent = state.activeNucleus.name;
  dom.nucleusList.innerHTML = '';

  state.nucleiList.forEach(n => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'nucleus-item-name';
    label.textContent = n.name;
    li.appendChild(label);
    if (n.id === state.activeNucleusId) li.classList.add('active');

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'nucleus-rename-btn';
    edit.title = 'Renombrar';
    edit.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.59 3.59a2 2 0 012.82 2.82l-8.5 8.5a1 1 0 01-.46.26l-3.2.8a.5.5 0 01-.6-.6l.8-3.2a1 1 0 01.26-.46l8.5-8.5z"/></svg>';
    edit.addEventListener('click', (e) => {
      e.stopPropagation();
      openRenameNucleus(n.id);
    });
    li.appendChild(edit);

    li.addEventListener('click', () => {
      switchNucleus(n.id);
      dom.nucleusDropdown.classList.add('hidden');
    });
    dom.nucleusList.appendChild(li);
  });
}

function switchNucleus(nucleusId) {
  state.activeNucleusId = nucleusId;
  const found = state.nucleiList.find(n => n.id === nucleusId);
  if (found) {
    state.activeNucleus.id = found.id;
    state.activeNucleus.name = found.name;
    if (found.circles) state.activeNucleus.circles = found.circles;
  }

  saveLocalState();
  updateNucleusUI();

  if (state.user) {
    listenToNucleusRealtime(nucleusId);
  } else {
    renderCanvas();
    renderParticipantsList();
  }
  showToast(`Cambiado a núcleo: ${state.activeNucleus.name}`);
}

function newNucleusId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'nuc_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function createNewNucleus(name) {
  const newId = newNucleusId();
  const defaultCircles = [
    { id: 0, name: 'Círculo 1', color: '#3b82f6', ratio: 0.25 },
    { id: 1, name: 'Círculo 2', color: '#10b981', ratio: 0.50 },
    { id: 2, name: 'Círculo 3', color: '#f59e0b', ratio: 0.75 },
    { id: 3, name: 'Círculo 4', color: '#ef4444', ratio: 1.00 }
  ];

  const newNucleus = {
    id: newId,
    name,
    circles: defaultCircles,
    ownerId: state.user ? state.user.uid : 'local'
  };

  state.nucleiList.push({ id: newId, name, circles: defaultCircles });
  state.activeNucleusId = newId;
  state.activeNucleus = newNucleus;
  state.participants = [];

  saveLocalState();
  if (state.user) saveNucleusDoc(newNucleus);

  updateNucleusUI();
  renderCanvas();
  renderParticipantsList();
  showToast(`Núcleo "${name}" creado.`);
}

function openRenameNucleus(nucleusId) {
  const n = state.nucleiList.find((item) => item.id === nucleusId)
    || (state.activeNucleus.id === nucleusId ? state.activeNucleus : null);
  dom.nucleusDropdown.classList.add('hidden');
  dom.formRenameNucleus.dataset.nucleusId = nucleusId;
  dom.inputRenameNucleus.value = n ? n.name : '';
  dom.modalRenameNucleus.classList.remove('hidden');
  dom.inputRenameNucleus.focus();
  dom.inputRenameNucleus.select();
}

async function renameNucleus(nucleusId, name) {
  const entry = state.nucleiList.find((item) => item.id === nucleusId);
  if (entry) entry.name = name;
  if (state.activeNucleusId === nucleusId || state.activeNucleus.id === nucleusId) state.activeNucleus.name = name;
  saveLocalState();
  updateNucleusUI();

  if (state.user) {
    try {
      await renameNucleusDoc(nucleusId, name);
    } catch (err) {
      console.error(err);
      showToast('No se pudo guardar el nombre en la nube.');
      return;
    }
  }
  showToast(`Núcleo renombrado a "${name}"`);
}

function copyInviteLink() {
  if (!state.user) {
    dom.nucleusDropdown.classList.add('hidden');
    showToast('Inicia sesión para poder compartir este núcleo.');
    openAuthModal('login');
    return;
  }
  const url = `${window.location.origin}${window.location.pathname}?join=${state.activeNucleusId}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('¡Enlace de invitación copiado al portapapeles!');
    dom.nucleusDropdown.classList.add('hidden');
  }).catch(() => {
    prompt('Copia este enlace de invitación:', url);
  });
}



// ---- Buscador propio (Ctrl+F) ----
const search = { results: [], index: -1 };
const SEARCH_ZOOM = 6; // zoom mínimo al saltar a un resultado

function normalizeText(str) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function initSearch() {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'f') {
      // segundo Ctrl+F con el buscador ya activo → buscador del navegador
      if (!dom.searchBox.classList.contains('hidden') && document.activeElement === dom.searchInput) return;
      e.preventDefault();
      openSearch();
    }
  });
  dom.btnOpenSearch.addEventListener('click', openSearch);
  dom.searchInput.addEventListener('input', () => runSearch(true));
  dom.searchInComments.addEventListener('change', () => { runSearch(true); dom.searchInput.focus(); });
  dom.searchNext.addEventListener('click', () => { stepSearch(1); dom.searchInput.focus(); });
  dom.searchPrev.addEventListener('click', () => { stepSearch(-1); dom.searchInput.focus(); });
  dom.searchClose.addEventListener('click', closeSearch);
  dom.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); stepSearch(1); }
    else if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) { e.preventDefault(); stepSearch(-1); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSearch(); }
  });
}

function openSearch() {
  dom.searchBox.classList.remove('hidden');
  dom.searchInput.focus();
  dom.searchInput.select();
  if (dom.searchInput.value) runSearch(false);
}

function closeSearch() {
  dom.searchBox.classList.add('hidden');
  search.results = [];
  search.index = -1;
  applySearchHighlights();
}

function createdTime(p) {
  const t = Date.parse(p.createdAt);
  if (!isNaN(t)) return t;
  const m = /^p_(\d+)/.exec(p.id || '');
  return m ? Number(m[1]) : 0;
}

function runSearch(jump) {
  const q = normalizeText(dom.searchInput.value.trim());
  const prevId = search.results[search.index];
  if (!q) {
    search.results = [];
    search.index = -1;
  } else {
    const inComments = dom.searchInComments.checked;
    search.results = state.participants
      .filter((p) => !p.archived)
      .filter((p) => normalizeText(p.name).includes(q) || (inComments && normalizeText(p.comments).includes(q)))
      .sort((a, b) => createdTime(a) - createdTime(b))
      .map((p) => p.id);
    // si el resultado actual sigue valiendo, nos quedamos en él
    const keep = search.results.indexOf(prevId);
    search.index = search.results.length ? (keep >= 0 ? keep : 0) : -1;
  }
  updateSearchCount();
  applySearchHighlights();
  if (jump && search.index >= 0 && search.results[search.index] !== prevId) focusParticipant(search.results[search.index]);
}

function stepSearch(dir) {
  if (!search.results.length) { runSearch(true); return; }
  const n = search.results.length;
  search.index = (search.index + dir + n) % n; // al final vuelve al primero
  updateSearchCount();
  applySearchHighlights();
  focusParticipant(search.results[search.index]);
}

function updateSearchCount() {
  const hasQuery = dom.searchInput.value.trim() !== '';
  dom.searchCount.textContent = !hasQuery ? '' : search.results.length ? `${search.index + 1}/${search.results.length}` : '0/0';
  dom.searchBox.classList.toggle('no-results', hasQuery && !search.results.length);
}

function applySearchHighlights() {
  if (!dom.participantsLayer) return;
  const active = search.results.length > 0;
  const matches = new Set(search.results);
  const current = search.results[search.index];
  dom.participantsLayer.classList.toggle('searching', active);
  dom.participantsLayer.querySelectorAll('.participant-node').forEach((g) => {
    g.classList.toggle('search-match', matches.has(g.dataset.id));
    g.classList.toggle('search-current', g.dataset.id === current);
  });
  // el resultado actual, encima del resto
  const cur = current && dom.participantsLayer.querySelector(`[data-id="${current}"]`);
  if (cur) dom.participantsLayer.appendChild(cur);
}

let viewAnim = null;
function focusParticipant(id) {
  const p = state.participants.find((item) => item.id === id);
  if (!p || !view.w) return;
  const centerX = view.w / 2;
  const centerY = view.h / 2;
  const rect = dom.canvasContainer.getBoundingClientRect();
  const width = rect.width;
  const freeW = width - sidebarReservedWidth() > 240 ? width - sidebarReservedWidth() : width;
  const maxRadius = Math.min(freeW, rect.height) * WORLD_SCALE * 0.46;
  const wx = centerX + (p.normX || 0) * maxRadius;
  const wy = centerY + (p.normY || 0) * maxRadius;

  const toZoom = Math.max(view.zoom, SEARCH_ZOOM);
  // punto de pantalla donde queremos el resultado: centro de la zona visible
  const b = visibleCanvasBounds();
  const svgRect = dom.svgCanvas.getBoundingClientRect();
  const sx = (b.left + b.right) / 2 - svgRect.left;
  const sy = (b.top + b.bottom) / 2 - svgRect.top;
  const k = view.screenW / (view.w / toZoom);
  const to = { zoom: toZoom, x: wx - sx / k, y: wy - sy / k };
  const from = { zoom: view.zoom, x: view.x, y: view.y };

  if (viewAnim) cancelAnimationFrame(viewAnim);
  const t0 = performance.now();
  const DUR = 450;
  const step = (t) => {
    const u = Math.min(1, (t - t0) / DUR);
    const e = 1 - Math.pow(1 - u, 3);
    view.zoom = from.zoom + (to.zoom - from.zoom) * e;
    view.x = from.x + (to.x - from.x) * e;
    view.y = from.y + (to.y - from.y) * e;
    applyViewBox();
    viewAnim = u < 1 ? requestAnimationFrame(step) : null;
  };
  viewAnim = requestAnimationFrame(step);
}

// ---- Tamaño de los nombres (5 niveles) ----
const FONT_LEVEL_SCALES = [1, 1.35, 1.75, 2.2, 2.75];
let fontPreviewLevel = null;

function currentFontLevel() {
  if (fontPreviewLevel !== null) return fontPreviewLevel;
  const lvl = state.activeNucleus && state.activeNucleus.fontLevel;
  return Number.isInteger(lvl) && lvl >= 0 && lvl < FONT_LEVEL_SCALES.length ? lvl : 0;
}

function setFontSizeUI(level, moveThumb) {
  fontPreviewLevel = level;
  if (moveThumb) dom.fontSizeSlider.value = level;
  dom.fontSizeValue.textContent = `Nivel ${level + 1}`;
  document.querySelectorAll('.fs-ticks span').forEach((t) => {
    t.classList.toggle('passed', Number(t.dataset.level) <= level);
  });
}

function openCircleCustomizerModal() {
  setFontSizeUI(currentFontLevel(), true);
  dom.circleCustomizersContainer.innerHTML = '';
  state.activeNucleus.circles.forEach((circle, idx) => {
    const row = document.createElement('div');
    row.className = 'circle-custom-row';
    row.innerHTML = `
      <input type="color" id="circle-color-${idx}" value="${circle.color}" />
      <div class="form-group flex-1">
        <label>Nombre del nivel ${idx + 1}</label>
        <input type="text" id="circle-name-${idx}" value="${circle.name}" required />
      </div>
    `;
    dom.circleCustomizersContainer.appendChild(row);
  });
  dom.modalCustomizeCircles.classList.remove('hidden');
}

function saveCircleSettings() {
  state.activeNucleus.circles.forEach((circle, idx) => {
    const nameInput = document.getElementById(`circle-name-${idx}`);
    const colorInput = document.getElementById(`circle-color-${idx}`);
    if (nameInput && colorInput) {
      circle.name = nameInput.value.trim() || `Círculo ${idx + 1}`;
      circle.color = colorInput.value;
    }
  });
  state.activeNucleus.fontLevel = currentFontLevel();
  fontPreviewLevel = null;

  saveLocalState();
  if (state.user) saveNucleusDoc(state.activeNucleus);

  dom.modalCustomizeCircles.classList.add('hidden');
  renderCanvas();
  renderParticipantsList();
  showToast('Configuración de círculos guardada.');
}

function updateAuthUI() {
  if (state.user) {
    dom.userEmailDisplay.textContent = state.user.email;
    dom.btnAuthAction.textContent = 'Cerrar sesión';
  } else {
    dom.userEmailDisplay.textContent = '';
    dom.btnAuthAction.textContent = 'Iniciar sesión';
  }
}

function handleAuthButtonClick() {
  if (state.user) {
    logoutUser();
    state.user = null;
    updateAuthUI();
    showToast('Sesión cerrada.');
  } else {
    openAuthModal('login');
  }
}

function openAuthModal(mode = 'login') {
  state.authMode = mode;
  dom.authModalTitle.textContent = mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta';
  dom.authSubmitBtn.textContent = mode === 'login' ? 'Entrar' : 'Registrarse';
  dom.authToggleText.textContent = mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
  dom.btnToggleAuthMode.textContent = mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión';
  dom.authErrorMsg.classList.add('hidden');
  dom.modalAuth.classList.remove('hidden');
}

function toggleAuthMode() {
  openAuthModal(state.authMode === 'login' ? 'register' : 'login');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = dom.authEmail.value.trim();
  const password = dom.authPassword.value.trim();
  dom.authErrorMsg.classList.add('hidden');

  try {
    if (state.authMode === 'login') {
      await loginUser(email, password);
    } else {
      await registerUser(email, password);
    }
    dom.modalAuth.classList.add('hidden');
    dom.authEmail.value = '';
    dom.authPassword.value = '';
    showToast(state.authMode === 'login' ? '¡Bienvenido!' : '¡Cuenta creada!');
  } catch (err) {
    dom.authErrorMsg.textContent = err.message || 'Error de autenticación';
    dom.authErrorMsg.classList.remove('hidden');
  }
}

async function loadUserCloudData() {
  if (!state.user) return;
  // 1) Si venía de un enlace de invitación, unirse primero
  let joinedId = null;
  const pending = getPendingJoin();
  if (pending) {
    clearPendingJoin();
    try {
      const joinedName = await joinNucleusByInvite(pending, state.user.uid);
      if (joinedName) {
        joinedId = pending;
        showToast(`Te has unido a "${joinedName}"`);
      } else {
        showToast('El enlace de invitación no es válido o el núcleo ya no existe.');
      }
    } catch (err) {
      console.error(err);
      showToast('No se pudo usar el enlace de invitación.');
    }
  }

  // 2) Cargar los núcleos y elegir cuál abrir
  const nuclei = await getUserNucleiList(state.user.uid);
  if (nuclei && nuclei.length > 0) {
    const prev = state.activeNucleusId;
    const pick = nuclei.find((n) => n.id === joinedId)
      || nuclei.find((n) => n.id === prev)
      || nuclei[0];
    state.nucleiList = nuclei;
    state.activeNucleusId = pick.id;
    state.activeNucleus = pick;
    saveLocalState();
  } else {
    // Primer inicio de sesion: migramos lo que haya en local a un nucleo propio.
    const migratedId = newNucleusId();
    const migrated = {
      id: migratedId,
      name: state.activeNucleus.name || 'Núcleo Principal',
      circles: state.activeNucleus.circles,
      ownerId: state.user.uid
    };
    await saveNucleusDoc(migrated);
    for (const p of state.participants) {
      await saveParticipantDoc(migratedId, p);
    }
    state.nucleiList = [migrated];
    state.activeNucleusId = migratedId;
    state.activeNucleus = migrated;
    saveLocalState();
  }
  updateNucleusUI();
  listenToNucleusRealtime(state.activeNucleusId);
}

function listenToNucleusRealtime(nucleusId) {
  if (state.unsubscribeNucleus) state.unsubscribeNucleus();

  state.unsubscribeNucleus = subscribeToNucleusData(nucleusId, (nucleusData, participantsData) => {
    if (nucleusData) {
      state.activeNucleus = { ...nucleusData, id: nucleusData.id || nucleusId };
      // mantener la lista del desplegable al día (p. ej. si otro lo renombra)
      const entry = state.nucleiList.find((n) => n.id === nucleusId);
      if (entry) { entry.name = nucleusData.name; entry.circles = nucleusData.circles; }
    }
    if (participantsData) state.participants = participantsData;
    renderCanvas();
    renderParticipantsList();
    updateNucleusUI();
  });
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.remove('hidden');
  clearTimeout(dom.toast._timeout);
  dom.toast._timeout = setTimeout(() => dom.toast.classList.add('hidden'), 3500);
}
