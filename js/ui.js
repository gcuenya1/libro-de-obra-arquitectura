/* ===== Utilidades de interfaz ===== */
(function () {
  const U = {};

  U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  U.debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  U.setPath = (obj, path, val) => {
    const ks = path.split('.'); let o = obj;
    ks.slice(0, -1).forEach((k) => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
    o[ks[ks.length - 1]] = val;
  };

  /* ---- Fechas ---- */
  U.today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  U.parseDate = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  U.fmtDate = (s, opts) => { const d = U.parseDate(s); if (!d) return '—'; return d.toLocaleDateString('es-AR', opts || { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  U.fmtLong = (s) => U.fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  U.daysBetween = (a, b) => Math.round((U.parseDate(b) - U.parseDate(a)) / 86400000);
  U.addDays = (s, n) => { const d = U.parseDate(s); d.setDate(d.getDate() + n); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  U.MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* ---- Iconos (trazos estilo lucide) ---- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="m9 12 2 2 4-4"/><path d="M9 17h6"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
    gantt: '<path d="M3 4v16h18"/><rect x="6" y="6" width="8" height="3" rx="1"/><rect x="9" y="11" width="9" height="3" rx="1"/><rect x="7" y="16" width="6" height="3" rx="1"/>',
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5V21.5"/><path d="M8 7h8M8 11h6"/>',
    order: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
    stamp: '<path d="M9 3h6l-1 7h3a2 2 0 0 1 2 2v3H5v-3a2 2 0 0 1 2-2h3z"/><path d="M5 19h14"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    calc: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="8" y="5.5" width="8" height="4" rx="1"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
    upload: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M4 3h16"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    plan: '<path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z"/><path d="M9 3v16M15 5v16"/>',
    star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    pen: '<path d="M3 21c3-1 5-1 7 0s4 1 7 0"/><path d="M14.5 4.5l5 5L10 19l-6 1 1-6z"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    hard: '<path d="M2 18h20"/><path d="M4 18v-3a8 8 0 0 1 16 0v3"/><path d="M10 7V5h4v2"/><path d="M12 7v5"/>',
    grad: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
    code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    filter: '<path d="M3 5h18l-7 8.5V20l-4-2v-4.5z"/>',
    money: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    receipt: '<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>'
  };
  U.icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  /* ---- Toasts ---- */
  U.toast = (msg, type = 'ok') => {
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML = U.icon(type === 'bad' ? 'alert' : 'check') + '<span>' + U.esc(msg) + '</span>';
    U.$('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  };

  /* ---- Modal ---- */
  U.modal = ({ title, body, actions = [], wide = false, onOpen }) => new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
      <header class="modal-h"><h3>${U.esc(title)}</h3><button class="icon-btn" data-close aria-label="Cerrar">${U.icon('x')}</button></header>
      <div class="modal-b">${body}</div>
      ${actions.length ? `<footer class="modal-f">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-i="${i}">${a.label}</button>`).join('')}</footer>` : ''}
    </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('in'));
    const close = (v) => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 180); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', async (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) return close(null);
      const b = e.target.closest('[data-i]');
      if (b) {
        const a = actions[+b.dataset.i];
        const v = a.value !== undefined ? a.value : (a.onClick ? await a.onClick(wrap) : true);
        if (v !== false) close(v);
      }
    });
    if (onOpen) onOpen(wrap, close);
  });
  U.confirm = (title, text, okLabel = 'Confirmar', danger = false) => U.modal({
    title, body: `<p>${text}</p>`,
    actions: [{ label: 'Cancelar', cls: 'ghost', value: false }, { label: okLabel, cls: danger ? 'danger' : 'primary', value: true }]
  });

  /* ---- Gráficos SVG ---- */
  U.ring = (pct, size = 120, stroke = 12, label) => {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct / 100)));
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${Math.round(pct)}%">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--ring-track)" stroke-width="${stroke}" fill="none"/>
      <circle class="ring-val" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--accent)" stroke-width="${stroke}" fill="none" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})" style="--c:${c}"/>
      <text x="50%" y="${label ? '47%' : '50%'}" text-anchor="middle" dominant-baseline="central" class="ring-pct" style="font-size:${size * 0.22}px">${Math.round(pct)}%</text>
      ${label ? `<text x="50%" y="66%" text-anchor="middle" class="ring-lbl" style="font-size:${size * 0.09}px">${U.esc(label)}</text>` : ''}
    </svg>`;
  };

  U.bar = (pct, cls = '') => `<div class="bar ${cls}"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;

  // Curva de avance (plan vs real)
  U.lineChart = (series, { height = 220, today } = {}) => {
    const all = series.flatMap((s) => s.points);
    if (!all.length) return '<p class="muted small">Cargá la planificación (Gantt) para ver la curva de avance.</p>';
    const xs = all.map((p) => p.x), minX = Math.min(...xs), maxX = Math.max(...xs);
    const W = 640, H = height, pl = 40, pr = 14, pt = 12, pb = 28;
    const sx = (x) => pl + ((x - minX) / Math.max(1, maxX - minX)) * (W - pl - pr);
    const sy = (y) => pt + (1 - y / 100) * (H - pt - pb);
    let g = '';
    [0, 25, 50, 75, 100].forEach((v) => { g += `<line x1="${pl}" x2="${W - pr}" y1="${sy(v)}" y2="${sy(v)}" class="grid"/><text x="${pl - 6}" y="${sy(v)}" class="axis" text-anchor="end" dominant-baseline="central">${v}%</text>`; });
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const x = minX + (maxX - minX) * i / ticks; const d = new Date(x);
      g += `<text x="${sx(x)}" y="${H - 8}" class="axis" text-anchor="middle">${d.getDate()}/${d.getMonth() + 1}</text>`;
    }
    if (today && today >= minX && today <= maxX) g += `<line x1="${sx(today)}" x2="${sx(today)}" y1="${pt}" y2="${H - pb}" class="today"/><text x="${sx(today) + 4}" y="${pt + 10}" class="axis today-t">hoy</text>`;
    const paths = series.map((s) => {
      const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
      const area = s.fill ? `<path d="${d}L${sx(s.points[s.points.length - 1].x)},${sy(0)}L${sx(s.points[0].x)},${sy(0)}Z" fill="${s.color}" opacity=".12"/>` : '';
      return `${area}<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" ${s.dash ? 'stroke-dasharray="6 5"' : ''} stroke-linejoin="round"/>`;
    }).join('');
    const legend = series.map((s) => `<span class="lg"><i style="background:${s.color}"></i>${U.esc(s.name)}</span>`).join('');
    return `<svg class="linechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Curva de avance">${g}${paths}</svg><div class="legend">${legend}</div>`;
  };

  /* ---- Imágenes ---- */
  U.compressImage = (file, max = 1400, q = 0.72) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', q));
      };
      img.onerror = reject; img.src = fr.result;
    };
    fr.onerror = reject; fr.readAsDataURL(file);
  });

  /* ---- Firma digital ---- */
  U.signaturePad = (canvas) => {
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#13233a';
    let drawing = false, last = null, dirty = false;
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener('pointerdown', (e) => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; dirty = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => canvas.addEventListener(ev, () => { drawing = false; }));
    return { clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; }, data: () => (dirty ? canvas.toDataURL('image/png') : null) };
  };
  U.askSignature = (title = 'Firma') => U.modal({
    title,
    body: `<p class="muted small">Firmá con el dedo o el mouse dentro del recuadro.</p><canvas class="sigpad"></canvas>`,
    actions: [{ label: 'Limpiar', cls: 'ghost', onClick: (w) => { w._pad.clear(); return false; } }, { label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Guardar firma', cls: 'primary', onClick: (w) => w._pad.data() || false }],
    onOpen: (w) => { w._pad = U.signaturePad(U.$('.sigpad', w)); }
  });

  U.download = (filename, content, mime = 'application/json') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  U.slug = (s) => String(s || 'obra').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

  window.U = U;
})();
