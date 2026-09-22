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
  joinNucleusByInvite
} from './firebase-config.js';

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
  sidebarOpen: true,
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
  btnToggleMenu: document.getElementById('btn-toggle-menu'),
  sideMenu: document.getElementById('side-menu'),
  canvasContainer: document.getElementById('canvas-container'),
  svgCanvas: document.getElementById('circles-canvas'),
  circlesLayer: document.getElementById('circles-layer'),
  participantsLayer: document.getElementById('participants-layer'),
  formAddParticipant: document.getElementById('form-add-participant'),
  inputName: document.getElementById('input-name'),
  inputAge: document.getElementById('input-age'),
  inputComments: document.getElementById('input-comments'),
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
  modalAuth: document.getElementById('modal-auth'),
  formAuth: document.getElementById('form-auth'),
  authModalTitle: document.getElementById('auth-modal-title'),
  authEmail: document.getElementById('auth-email'),
  authPassword: document.getElementById('auth-password'),
  authSubmitBtn: document.getElementById('auth-submit-btn'),
  authErrorMsg: document.getElementById('auth-error-msg'),
  btnToggleAuthMode: document.getElementById('btn-toggle-auth-mode'),
  authToggleText: document.getElementById('auth-toggle-text'),
  toast: document.getElementById('toast')
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

  initFirebaseCloud((user) => {
    state.user = user;
    updateAuthUI();
    if (user) loadUserCloudData();
  });

  const urlParams = new URLSearchParams(window.location.search);
  const joinId = urlParams.get('join');
  if (joinId) handleInviteLink(joinId);
});

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
  dom.btnToggleMenu.addEventListener('click', toggleSidebar);
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
  setTimeout(() => renderCanvas(), 300);
}

// ---- Zoom del lienzo (rueda del ratón) ----
const view = { zoom: 1, x: 0, y: 0, w: 0, h: 0 };
const ZOOM_MIN = 1;
const ZOOM_MAX = 6;

function applyViewBox() {
  if (view.w < 2 || view.h < 2) return;
  const vw = view.w / view.zoom;
  const vh = view.h / view.zoom;
  // mantener la vista dentro del lienzo
  view.x = Math.min(Math.max(view.x, 0), view.w - vw);
  view.y = Math.min(Math.max(view.y, 0), view.h - vh);
  dom.svgCanvas.setAttribute('viewBox', `${view.x} ${view.y} ${vw} ${vh}`);
  dom.canvasContainer.dataset.zoomed = view.zoom > 1.01 ? 'true' : 'false';
}

function zoomAt(clientX, clientY, factor) {
  const rect = dom.canvasContainer.getBoundingClientRect();
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
    zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016));
  }, { passive: false });

  // doble clic en el fondo: volver a la vista completa
  dom.canvasContainer.addEventListener('dblclick', (e) => {
    if (e.target.closest('.participant-node')) return;
    view.zoom = 1; view.x = 0; view.y = 0;
    applyViewBox();
  });
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
  
  if (view.w !== width || view.h !== height) {
    view.w = width;
    view.h = height;
  }
  applyViewBox();
  
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.42;

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

    const labelY = centerY - r + 18;
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', centerX);
    textEl.setAttribute('y', labelY);
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

    const textWidth = Math.max(54, p.name.length * 5.7 + 18);
    const textHeight = 20;

    const rectEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rectEl.setAttribute('x', -textWidth / 2);
    rectEl.setAttribute('y', -textHeight / 2);
    rectEl.setAttribute('width', textWidth);
    rectEl.setAttribute('height', textHeight);
    rectEl.setAttribute('class', 'participant-chip-rect');

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
    text.setAttribute('fill', '#0f172a');
    text.textContent = p.name;

    g.appendChild(rectEl);
    g.appendChild(text);

    makeDraggable(g, p, centerX, centerY, maxRadius);

    g.addEventListener('click', () => {
      if (g.dataset.dragged === 'true') return;
      openParticipantDetail(p.id);
    });

    dom.participantsLayer.appendChild(g);
  });
}

function makeDraggable(element, participant, centerX, centerY, maxRadius) {
  let isDragging = false;
  let startX, startY;
  let currentNormX = participant.normX || 0;
  let currentNormY = participant.normY || 0;

  const onPointerDown = (e) => {
    isDragging = true;
    element.dataset.dragged = 'false';
    element.classList.add('dragging');
    startX = e.clientX;
    startY = e.clientY;
    element.setPointerCapture(e.pointerId);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) element.dataset.dragged = 'true';

    const newNormX = currentNormX + dx / (maxRadius * view.zoom);
    const newNormY = currentNormY + dy / (maxRadius * view.zoom);

    const px = centerX + newNormX * maxRadius;
    const py = centerY + newNormY * maxRadius;
    element.setAttribute('transform', `translate(${px}, ${py})`);

    const dist = Math.sqrt(newNormX * newNormX + newNormY * newNormY);
    highlightCircleRing(dist);
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    element.classList.remove('dragging');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    participant.normX = currentNormX + dx / (maxRadius * view.zoom);
    participant.normY = currentNormY + dy / (maxRadius * view.zoom);
    participant.updatedAt = new Date().toISOString();

    const distance = Math.sqrt(participant.normX * participant.normX + participant.normY * participant.normY);
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
  e.preventDefault();
  const name = dom.inputName.value.trim();
  if (!name) return;

  const age = dom.inputAge.value ? parseInt(dom.inputAge.value, 10) : null;
  const comments = dom.inputComments.value.trim();

  const angle = Math.random() * Math.PI * 2;
  const normX = 1.15 * Math.cos(angle);
  const normY = 1.15 * Math.sin(angle);

  const newParticipant = {
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name,
    age,
    comments,
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

  renderCanvas();
  renderParticipantsList();
  showToast(`"${name}" añadido en el exterior. ¡Arrastra su ficha al círculo!`);
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

  state.selectedParticipantId = id;
  dom.detailId.value = p.id;
  dom.detailName.value = p.name;
  dom.detailAge.value = p.age || '';
  dom.detailComments.value = p.comments || '';

  const circle = state.activeNucleus.circles[p.circleIndex];
  dom.detailCircleName.textContent = circle ? circle.name : 'Exterior / Sin asignar';
  dom.detailCreatedAt.textContent = p.createdAt ? new Date(p.createdAt).toLocaleString() : '-';
  dom.detailUpdatedAt.textContent = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '-';
  dom.btnArchiveParticipant.textContent = p.archived ? 'Desarchivar' : 'Archivar';

  showSideView('detail');
}

function showSideView(view) {
  if (view === 'detail') {
    dom.sideViewMain.classList.add('hidden');
    dom.sideViewDetail.classList.remove('hidden');
    if (!state.sidebarOpen) toggleSidebar();
  } else {
    dom.sideViewDetail.classList.add('hidden');
    dom.sideViewMain.classList.remove('hidden');
  }
}

function handleSaveParticipantDetail(e) {
  e.preventDefault();
  const id = dom.detailId.value;
  const p = state.participants.find(item => item.id === id);
  if (!p) return;

  p.name = dom.detailName.value.trim();
  p.age = dom.detailAge.value ? parseInt(dom.detailAge.value, 10) : null;
  p.comments = dom.detailComments.value.trim();
  p.updatedAt = new Date().toISOString();

  saveParticipant(p);
  renderCanvas();
  renderParticipantsList();
  showToast('Cambios guardados correctamente');
  showSideView('main');
}

function handleToggleArchive() {
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
    li.textContent = n.name;
    if (n.id === state.activeNucleusId) li.classList.add('active');
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

function copyInviteLink() {
  const url = `${window.location.origin}${window.location.pathname}?join=${state.activeNucleusId}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast('¡Enlace de invitación copiado al portapapeles!');
    dom.nucleusDropdown.classList.add('hidden');
  }).catch(() => {
    prompt('Copia este enlace de invitación:', url);
  });
}

async function handleInviteLink(nucleusId) {
  if (state.user) {
    await joinNucleusByInvite(nucleusId, state.user.uid);
    switchNucleus(nucleusId);
  } else {
    showToast('Inicia sesión para unirte al núcleo compartido.');
    openAuthModal('login');
  }
}

function openCircleCustomizerModal() {
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
  const nuclei = await getUserNucleiList(state.user.uid);
  if (nuclei && nuclei.length > 0) {
    state.nucleiList = nuclei;
    state.activeNucleusId = nuclei[0].id;
    state.activeNucleus = nuclei[0];
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
    if (nucleusData) state.activeNucleus = nucleusData;
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
