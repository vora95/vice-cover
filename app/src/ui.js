// Vice Cover — UI bindings: every control mutates state, then re-renders.
// No control ever draws directly; renderCover owns every pixel.

function bindUI(state, render, els) {
  const $ = (id) => document.getElementById(id);

  // --- photo list ---------------------------------------------------------
  function refreshPhotoList() {
    const list = $('photo-list');
    list.innerHTML = '';
    state.photos.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'photo-row' + (i === 0 ? ' hero-photo' : '');
      const label = document.createElement('span');
      label.textContent = (i === 0 ? 'Hero · ' : 'Photo ' + (i + 1) + ' · ') + p.name;
      const zoom = document.createElement('input');
      zoom.type = 'range'; zoom.min = '0.5'; zoom.max = '3'; zoom.step = '0.05';
      zoom.value = String(p.zoom || 1);
      zoom.title = 'Zoom';
      zoom.setAttribute('aria-label', 'Zoom ' + p.name);
      zoom.addEventListener('input', () => { p.zoom = parseFloat(zoom.value); render(); });
      const fit = document.createElement('button');
      fit.className = 'mini';
      fit.textContent = 'Fit';
      fit.addEventListener('click', () => { p.zoom = 1; p.offsetX = 0; p.offsetY = 0; zoom.value = '1'; render(); });
      const rm = document.createElement('button');
      rm.className = 'mini danger';
      rm.textContent = 'Remove';
      rm.disabled = !!p.demo;
      rm.addEventListener('click', () => {
        state.photos.splice(i, 1);
        if (state.photos.length === 0) state.photos.push(makeDemoPhoto(state.theme, state.seed));
        refreshPhotoList(); render();
      });
      row.append(label, zoom, fit, rm);
      list.appendChild(row);
    });
    $('photo-count').textContent = state.photos.filter((p) => !p.demo).length + ' / ' + MAX_PHOTOS + ' photos';
  }

  async function addFiles(files) {
    const status = $('status');
    for (const file of [...files]) {
      if (state.photos.filter((p) => !p.demo).length >= MAX_PHOTOS) {
        status.textContent = 'Already have ' + MAX_PHOTOS + ' photos — remove one first.';
        return;
      }
      try {
        const photo = await loadPhotoFile(file);
        const demoIdx = state.photos.findIndex((p) => p.demo);
        if (demoIdx !== -1) state.photos.splice(demoIdx, 1);
        state.photos.push(photo);
        status.textContent = 'Added ' + photo.name + '.';
      } catch (err) {
        status.textContent = err.message || 'Could not load that photo.';
      }
    }
    refreshPhotoList();
    render();
  }

  $('file-input').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  $('add-photo').addEventListener('click', () => $('file-input').click());
  $('demo-btn').addEventListener('click', () => {
    state.photos = [makeDemoPhoto(state.theme, state.seed)];
    $('status').textContent = 'Demo scene loaded.';
    refreshPhotoList(); render();
  });

  // Drag-and-drop onto the preview.
  const drop = $('drop-zone');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

  // Drag on the canvas pans the hero photo.
  const canvas = $('cover');
  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = { x: e.clientX, y: e.clientY, ox: state.photos[0]?.offsetX || 0, oy: state.photos[0]?.offsetY || 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !state.photos[0]) return;
    const r = canvas.getBoundingClientRect();
    state.photos[0].offsetX = Math.max(-1, Math.min(1, dragging.ox + ((e.clientX - dragging.x) / r.width) * 2));
    state.photos[0].offsetY = Math.max(-1, Math.min(1, dragging.oy + ((e.clientY - dragging.y) / r.height) * 2));
    render();
  });
  canvas.addEventListener('pointerup', () => { dragging = null; });

  // --- caption ------------------------------------------------------------
  $('caption').addEventListener('input', (e) => { state.caption = e.target.value.toUpperCase().slice(0, 24); render(); });
  $('subcaption').addEventListener('input', (e) => { state.subcaption = e.target.value.toUpperCase().slice(0, 40); render(); });

  // --- theme / layout / size ----------------------------------------------
  const themeRow = $('theme-row');
  Object.keys(THEMES).forEach((key) => {
    const b = document.createElement('button');
    b.className = 'chip' + (key === state.theme ? ' active' : '');
    b.textContent = THEMES[key].name;
    b.addEventListener('click', () => {
      state.theme = key;
      [...themeRow.children].forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
      render();
    });
    themeRow.appendChild(b);
  });

  const layoutSel = $('layout');
  Object.keys(LAYOUTS).forEach((key) => {
    const o = document.createElement('option');
    o.value = key; o.textContent = LAYOUTS[key];
    layoutSel.appendChild(o);
  });
  layoutSel.value = state.layout;
  layoutSel.addEventListener('change', (e) => { state.layout = e.target.value; render(); });

  const sizeRow = $('size-row');
  Object.keys(SIZES).forEach((key) => {
    const b = document.createElement('button');
    b.className = 'chip' + (key === state.size ? ' active' : '');
    b.textContent = key;
    b.addEventListener('click', () => {
      state.size = key;
      [...sizeRow.children].forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
      render();
    });
    sizeRow.appendChild(b);
  });

  $('retro').checked = state.retro;
  $('retro').addEventListener('change', (e) => { state.retro = e.target.checked; render(); });

  // --- export ---------------------------------------------------------------
  $('export-btn').addEventListener('click', async () => {
    const status = $('status');
    status.textContent = 'Exporting…';
    try {
      const name = await exportPng(state);
      status.textContent = 'Exported ✓ ' + name;
    } catch (err) {
      status.textContent = 'Export failed: ' + (err.message || err);
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'e' || e.key === 'E') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) {
      $('export-btn').click();
    }
  });

  refreshPhotoList();
}
