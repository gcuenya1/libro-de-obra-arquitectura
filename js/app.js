/* ===== Aplicación: enrutador, layout, inicio y panel ===== */
(function () {
  const C = window.APP_CONFIG;
  const V = window.VIEWS = window.VIEWS || {};
  const app = document.getElementById('app');
  const esc = U.esc, I = U.icon;

  const NAV = [
    ['panel', 'Panel', 'dash'], ['datos', 'Datos de la obra', 'info'], ['actores', 'Actores y personal', 'users'],
    ['previas', 'Tareas previas', 'clip'], ['planillas', 'Planillas de control', 'list'], ['gantt', 'Planificación', 'gantt'],
    ['bitacora', 'Bitácora diaria', 'book'], ['ordenes', 'Órdenes y notas', 'order'], ['fotos', 'Fotos', 'camera'],
    ['presupuesto', 'Presupuesto', 'money'], ['certificados', 'Certificados de avance', 'receipt'],
    ['actas', 'Actas', 'stamp'], ['exportar', 'Imprimir y exportar', 'print'], ['calc', 'Calculadoras', 'calc']
  ];
  const MOBILE = [['panel', 'Panel', 'dash'], ['planillas', 'Planillas', 'list'], ['bitacora', 'Bitácora', 'book'], ['fotos', 'Fotos', 'camera']];

  /* ---- Tema ---- */
  const theme = { get: () => { try { return localStorage.getItem('lo-theme'); } catch (e) { return null; } }, set: (v) => { try { localStorage.setItem('lo-theme', v); } catch (e) { /* */ } } };
  const applyTheme = () => { const t = theme.get(); if (t) document.documentElement.dataset.theme = t; };
  applyTheme();
  const isDark = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';

  /* ---- Router ---- */
  const parse = () => {
    const h = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (h[0] === 'o' && h[1]) return { obra: h[1], view: h[2] || 'panel', param: h.slice(3).join('/') };
    return { view: h[0] || 'home', param: h[1] };
  };
  window.go = (path) => { location.hash = '#/' + path; };
  window.goObra = (path) => { location.hash = `#/o/${S.current.id}/${path}`; };

  let lastRoute = '';
  async function render(keepScroll) {
    const r = parse();
    const routeKey = location.hash;
    const scroll = keepScroll ? (document.querySelector('.main')?.scrollTop || window.scrollY) : 0;
    if (r.obra) {
      if (!S.current || S.current.id !== r.obra) {
        const o = await S.getObra(r.obra);
        if (!o) { U.toast('La obra no existe', 'bad'); return go(''); }
        S.current = o;
      }
      const view = V[r.view] || V.panel;
      app.innerHTML = shell(S.current, r.view, view.render(S.current, r.param));
      view.mount && view.mount(app.querySelector('.view'), S.current, r.param);
    } else {
      S.current = null;
      if (r.view === 'calc') { app.innerHTML = plainShell('Calculadoras', V.calc.render(null)); V.calc.mount(app.querySelector('.view')); }
      else if (r.view === 'acerca') { app.innerHTML = plainShell('Acerca del proyecto', V.acerca.render()); }
      else { app.innerHTML = await homeView(); }
    }
    if (keepScroll) window.scrollTo(0, scroll); else if (routeKey !== lastRoute) window.scrollTo(0, 0);
    lastRoute = routeKey;
    document.title = (S.current ? S.current.nombre + ' · ' : '') + C.nombre;
  }
  window.App = { render: (keep = true) => render(keep) };
  window.addEventListener('hashchange', () => render(false));

  /* ---- Layout ---- */
  const brand = () => `<a class="brand" href="#/"><img src="assets/icon.svg" alt="" width="34" height="34"><span><b>Libro de Obra</b><small>Digital</small></span></a>`;
  const themeBtn = () => `<button class="icon-btn" data-act="theme" aria-label="Cambiar tema" title="Modo claro/oscuro">${I(isDark() ? 'sun' : 'moon')}</button>`;

  function shell(o, active, content) {
    const st = S.obraStats(o);
    const nav = NAV.map(([k, l, ic]) => `<a href="#/o/${o.id}/${k}" class="nav-a ${active === k || (k === 'planillas' && active === 'rubro') ? 'on' : ''}">${I(ic)}<span>${l}</span></a>`).join('');
    return `<div class="layout">
      <aside class="side" id="side">
        ${brand()}
        <div class="side-obra">
          <div class="mini-ring">${U.ring(st.pct, 46, 6)}</div>
          <div><small>Obra activa</small><b title="${esc(o.nombre)}">${esc(o.nombre)}</b></div>
        </div>
        <nav class="nav">${nav}</nav>
        <div class="side-foot"><a href="#/" class="nav-a">${I('back')}<span>Todas las obras</span></a><a href="#/acerca" class="nav-a">${I('grad')}<span>Acerca del proyecto</span></a></div>
      </aside>
      <div class="side-scrim" data-act="closeSide"></div>
      <div class="main">
        <header class="top">
          <button class="icon-btn only-m" data-act="openSide" aria-label="Menú">${I('menu')}</button>
          <div class="crumbs"><a href="#/">Obras</a>${I('chevron')}<span>${esc(o.nombre)}</span></div>
          <span id="save-state" class="save-state">Guardado</span>
          ${themeBtn()}
        </header>
        <main class="view view-${active}">${content}</main>
      </div>
      <nav class="mnav">${MOBILE.map(([k, l, ic]) => `<a href="#/o/${o.id}/${k}" class="${active === k ? 'on' : ''}">${I(ic)}<span>${l}</span></a>`).join('')}<a href="#" data-act="openSide">${I('menu')}<span>Más</span></a></nav>
    </div>`;
  }
  function plainShell(title, content) {
    return `<div class="plain"><header class="top plain-top">${brand()}<div class="grow"></div><a class="btn ghost sm" href="#/">${I('back')} Obras</a>${themeBtn()}</header><main class="view plain-view">${content}</main></div>`;
  }

  /* ---- Inicio ---- */
  async function homeView() {
    const obras = (await S.listObras()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    const portadas = {};
    for (const o of obras) if (o.portada) { const f = await S.getFoto(o.portada); if (f) portadas[o.id] = f.data; }
    const cards = obras.map((o) => {
      const st = S.obraStats(o); const al = S.alerts(o).filter((a) => a.lvl !== 'info').length;
      return `<article class="obra-card" data-act="openObra" data-id="${o.id}" tabindex="0">
        <div class="obra-cover" style="${portadas[o.id] ? `background-image:url(${portadas[o.id]})` : ''}">${portadas[o.id] ? '' : `<div class="cover-ph">${I('hard')}</div>`}
          <div class="cover-ring">${U.ring(st.pct, 64, 7)}</div></div>
        <div class="obra-body">
          <h3>${esc(o.nombre)}</h3>
          <p class="muted small">${I('pin')} ${esc([o.datos.domicilio, o.datos.ciudad].filter(Boolean).join(', ') || 'Sin domicilio')}</p>
          <div class="chips">
            <span class="chip">${st.ok}/${st.total - st.na} ítems</span>
            ${al ? `<span class="chip warn">${I('alert')} ${al} alerta${al > 1 ? 's' : ''}</span>` : '<span class="chip ok">Sin alertas</span>'}
          </div>
          <p class="muted xs">Actualizada ${o.updatedAt ? new Date(o.updatedAt).toLocaleDateString('es-AR') : '—'}</p>
        </div>
      </article>`;
    }).join('');
    return `<div class="home">
      <header class="top plain-top home-top">${brand()}<div class="grow"></div><a class="btn ghost sm" href="#/calc">${I('calc')} <span class="hide-s">Calculadoras</span></a><a class="btn ghost sm" href="#/acerca">${I('grad')} <span class="hide-s">El proyecto</span></a>${themeBtn()}</header>
      <section class="hero">
        <div class="hero-grid"></div>
        <div class="hero-in">
          <div class="pills"><span class="pill">${I('plan')} ${esc(C.carreras[0].nombre)}</span><span class="pill">${I('code')} Desarrollo de Software</span></div>
          <h1>El Libro de Obra,<br><span>ahora digital.</span></h1>
          <p class="lead">Planillas de control de calidad, bitácora con clima automático, órdenes de servicio con firma, actas, fotos, planificación y curva de avance. Todo en el celular, en obra, incluso sin conexión.</p>
          <div class="hero-cta">
            <button class="btn primary lg" data-act="newObra">${I('plus')} Nueva obra</button>
            <button class="btn light lg" data-act="demo">${I('spark')} Ver obra de demostración</button>
            <label class="btn ghost-l lg">${I('upload')} Importar respaldo<input type="file" accept=".json,application/json" data-act="importFile" hidden></label>
          </div>
          <div class="hero-stats"><div><b>${window.LO_TEMPLATE.rubros.length}</b><span>planillas de control</span></div><div><b>${window.LO_TEMPLATE.rubros.reduce((a, r) => a + r.secs.reduce((b, s) => b + s.items.length, 0), 0)}</b><span>puntos de verificación</span></div><div><b>16</b><span>capítulos de obra</span></div></div>
        </div>
        <div class="hero-art" aria-hidden="true">${heroArt()}</div>
      </section>
      <section class="wrap">
        <div class="sec-h"><h2>Mis obras</h2>${obras.length ? `<span class="muted small">${obras.length} obra${obras.length > 1 ? 's' : ''} · guardadas en este dispositivo</span>` : ''}</div>
        ${obras.length ? `<div class="obras">${cards}</div>` : `<div class="empty">${I('hard', 'big')}<h3>Todavía no hay obras</h3><p class="muted">Creá tu primera obra o cargá la demostración para recorrer el sistema.</p></div>`}
        <div class="features">
          ${[['list', 'Planillas de control', 'Las planillas del libro en formato checklist: estado, fecha, S/Plano, seguridad, observaciones, medidas y fotos por ítem.', 'planillas'],
            ['gantt', 'Planificación y curva S', 'Gantt por rubro con planificación automática y curva de avance planificado vs. real.', 'gantt'],
            ['book', 'Bitácora con clima', 'Registro diario con el clima del día traído automáticamente y alertas para hormigonado.', 'bitacora'],
            ['order', 'Órdenes de servicio', 'Órdenes y notas de pedido numeradas, con plazo, estado y firma digital.', 'ordenes'],
            ['shield', 'Control de ART', 'Aviso de seguros vencidos o por vencer del personal en obra.', 'actores'],
            ['print', 'PDF y Excel', 'El libro completo listo para imprimir o guardar en PDF, y exportación a Excel.', 'exportar'],
            ['money', 'Presupuesto', 'Cómputo por rubro con coeficiente de pase, incidencias por capítulo y costo por m².', 'presupuesto'],
            ['receipt', 'Certificados de avance', 'Certificación mensual tomando el avance de las planillas, con redeterminación por índice.', 'certificados']]
            .map(([ic, t, d, v]) => `<button type="button" class="feat" data-act="feature" data-v="${v}" data-id="${obras[0] ? obras[0].id : ''}">${I(ic)}<h4>${t}</h4><p>${d}</p><span class="feat-go">${obras.length ? 'Abrir en ' + esc(obras[0].nombre) : 'Probar con la obra de demostración'} ${I('chevron')}</span></button>`).join('')}
        </div>
      </section>
      <footer class="foot">${esc(C.institucion)} · Proyecto interdisciplinario ${esc(C.carreras.map((c) => c.nombre).join(' × '))} · <a href="#/acerca">Conocé el proyecto</a></footer>
    </div>`;
  }
  function heroArt() {
    return `<svg viewBox="0 0 400 320" class="blueprint">
      <g fill="none" stroke="currentColor" stroke-width="1.6">
        <rect x="40" y="60" width="300" height="200"/><path d="M40 160h120M160 60v200M240 160v100M240 160h100M160 210h80"/>
        <path d="M100 260v-8h30v8" /><path d="M60 60a40 40 0 0 1 40 40" stroke-dasharray="4 4"/><path d="M290 160a30 30 0 0 0-30 30" stroke-dasharray="4 4"/>
        <path d="M40 40h300M40 34v12M340 34v12M160 34v12" opacity=".7"/><path d="M360 60v200M354 60h12M354 260h12" opacity=".7"/>
      </g>
      <g class="bp-t" fill="currentColor"><text x="190" y="30" text-anchor="middle">12.00</text><text x="372" y="165" transform="rotate(90 372 165)" text-anchor="middle">8.00</text>
      <text x="100" y="115" text-anchor="middle">ESTAR</text><text x="250" y="115" text-anchor="middle">COCINA</text><text x="100" y="215" text-anchor="middle">DORM. 1</text><text x="200" y="240" text-anchor="middle">BAÑO</text><text x="290" y="215" text-anchor="middle">DORM. 2</text></g>
      <g class="bp-check"><circle cx="330" cy="70" r="22"/><path d="m319 70 8 8 15-16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>
    </svg>`;
  }

  /* ---- Panel de la obra ---- */
  V.panel = {
    render(o) {
      const st = S.obraStats(o); const d = o.datos; const hoy = U.today();
      const dias = d.fechaInicio ? U.daysBetween(d.fechaInicio, hoy) : null;
      const plazo = Number(d.plazoDias) || 0;
      const fin = d.fechaInicio && plazo ? U.addDays(d.fechaInicio, plazo) : null;
      const tiempoPct = plazo && dias != null ? Math.max(0, Math.min(100, dias / plazo * 100)) : 0;
      const alerts = S.alerts(o);
      const ordPend = o.ordenes.filter((x) => x.estado !== 'cumplida').length;
      const recent = [];
      o.bitacora.slice(0, 3).forEach((b) => recent.push({ f: b.fecha, ic: 'book', t: b.texto, go: 'bitacora' }));
      o.ordenes.slice(-3).forEach((x) => recent.push({ f: x.fecha, ic: 'order', t: `${x.tipo === 'OS' ? 'OS' : 'NP'} Nº ${x.numero}: ${x.asunto}`, go: 'ordenes' }));
      recent.sort((a, b) => b.f.localeCompare(a.f));
      const caps = st.caps.map((c) => `<div class="capbar"><span class="capn">${c.cap}. ${esc(S.capName(c.cap))}</span>${U.bar(c.pct, c.obs ? 'has-obs' : '')}<b>${Math.round(c.pct)}%</b></div>`).join('');
      return `<section class="dash-hero" style="--obra:${esc(o.color || '#1f4e79')}">
          <div class="dh-cover" id="dh-cover"></div>
          <div class="dh-info">
            <span class="eyebrow">${esc(d.tipoObra || 'Obra')}</span>
            <h1>${esc(o.nombre)}</h1>
            <p>${I('pin')} ${esc([d.domicilio, d.barrio, d.ciudad].filter(Boolean).join(' · ') || 'Completá los datos de la obra')}</p>
            <div class="dh-meta">
              <div><small>Director técnico</small><b>${esc(o.actores.director?.nombre ? 'Arq. ' + o.actores.director.nombre : '—')}</b></div>
              <div><small>Inicio</small><b>${U.fmtDate(d.fechaInicio)}</b></div>
              <div><small>Fin previsto</small><b>${fin ? U.fmtDate(fin) : '—'}</b></div>
            </div>
          </div>
          <div class="dh-ring">${U.ring(st.pct, 150, 14, 'avance')}</div>
        </section>
        <section class="kpis">
          ${kpi('check', 'Ítems conformes', `${st.ok}<small>/${st.total - st.na}</small>`, 'planillas')}
          ${kpi('alert', 'Observaciones abiertas', st.obs, 'planillas', st.obs ? 'warn' : '')}
          ${kpi('clock', 'Días de obra', dias != null && dias >= 0 ? `${dias}<small>${plazo ? '/' + plazo : ''}</small>` : '—', 'gantt', tiempoPct > st.pct + 15 ? 'bad' : '')}
          ${kpi('order', 'Órdenes pendientes', ordPend, 'ordenes', ordPend ? 'warn' : '')}
        </section>
        <div class="grid2">
          <section class="card"><div class="card-h"><h3>Curva de avance</h3><a class="link" href="#/o/${o.id}/gantt">Planificación ${I('chevron')}</a></div>
            ${U.lineChart(S.sCurve(o), { today: Date.now() })}
            ${plazo ? `<div class="timebar"><span>Plazo consumido</span>${U.bar(tiempoPct, 'time')}<b>${Math.round(tiempoPct)}%</b></div>` : ''}
          </section>
          <section class="card"><div class="card-h"><h3>Clima en obra</h3><span class="muted xs">${esc(d.ciudad || '')}</span></div><div id="weather" class="weather"><div class="skeleton"></div></div></section>
        </div>
        <div class="grid2">
          <section class="card"><div class="card-h"><h3>Avance por capítulo</h3></div>${caps || '<p class="muted">Sin planillas activas.</p>'}</section>
          <section class="card"><div class="card-h"><h3>Alertas</h3><span class="badge">${alerts.length}</span></div>
            <div class="alerts">${alerts.length ? alerts.slice(0, 8).map((a) => `<a class="alert a-${a.lvl}" href="#/o/${o.id}/${a.go}">${I(a.icon)}<div><b>${esc(a.t)}</b><small>${esc(a.s)}</small></div></a>`).join('') : `<div class="ok-state">${I('check')} Todo en orden</div>`}</div>
          </section>
        </div>
        ${V._econCard ? V._econCard(o) : ''}
        <section class="card"><div class="card-h"><h3>Actividad reciente</h3><button class="btn sm primary" data-act="quickNote">${I('plus')} Nota rápida en bitácora</button></div>
          <div class="timeline">${recent.slice(0, 6).map((r) => `<a class="tl" href="#/o/${o.id}/${r.go}"><span class="tl-d">${U.fmtDate(r.f, { day: '2-digit', month: 'short' })}</span>${I(r.ic)}<p>${esc(r.t)}</p></a>`).join('') || '<p class="muted">Sin actividad registrada.</p>'}</div>
        </section>`;
    },
    async mount(root, o) {
      if (o.portada) { const f = await S.getFoto(o.portada); if (f) root.querySelector('#dh-cover').style.backgroundImage = `url(${f.data})`; }
      const w = root.querySelector('#weather');
      try {
        const days = await S.forecast(o);
        const t = days[0]; const [ic, lbl] = S.WMO(t.code);
        w.innerHTML = `<div class="w-now"><span class="w-ic">${ic}</span><div><b>${Math.round(t.tmax)}° <small>/ ${Math.round(t.tmin)}°</small></b><span>${lbl} · lluvia ${t.prob ?? 0}% · viento ${Math.round(t.viento)} km/h</span></div></div>
          <div class="w-adv">${S.weatherAdvice(t).map((a) => `<p class="adv adv-${a.lvl}">${a.t}</p>`).join('')}</div>
          <div class="w-days">${days.slice(1).map((x) => { const [i2] = S.WMO(x.code); const dd = U.parseDate(x.fecha); const risky = S.weatherAdvice(x).some((a) => a.lvl !== 'ok'); return `<div class="wd ${risky ? 'risk' : ''}" title="${S.weatherAdvice(x).map((a) => a.t).join(' ')}"><small>${dd.toLocaleDateString('es-AR', { weekday: 'short' })}</small><span>${i2}</span><b>${Math.round(x.tmax)}°</b><small>${Math.round(x.tmin)}°</small></div>`; }).join('')}</div>`;
      } catch (e) {
        const msg = e instanceof TypeError ? 'No se pudo consultar el clima (sin conexión a internet).' : (e.message || 'Clima no disponible.');
        w.innerHTML = `<p class="muted small">${esc(msg)}</p><a class="btn sm ghost" href="#/o/${o.id}/datos">Completar ciudad</a>`;
      }
    }
  };
  const kpi = (ic, l, v, go, cls = '') => `<a class="kpi ${cls}" href="#/o/${S.current.id}/${go}"><span class="kpi-ic">${I(ic)}</span><div><b>${v}</b><small>${l}</small></div></a>`;

  /* ---- Acciones globales ---- */
  const ACTIONS = {
    theme: () => { const t = isDark() ? 'light' : 'dark'; document.documentElement.dataset.theme = t; theme.set(t); App.render(); },
    openSide: (el, e) => { e.preventDefault(); document.body.classList.add('side-open'); },
    closeSide: () => document.body.classList.remove('side-open'),
    openObra: (el) => go('o/' + el.dataset.id + '/panel'),
    newObra: async () => {
      const nombre = await U.modal({
        title: 'Nueva obra', body: `<label class="fld"><span>Nombre de la obra</span><input id="nn" placeholder="Ej: Vivienda Familia Gómez" autofocus></label>
        <label class="fld"><span>Ciudad</span><input id="nc" placeholder="Río Cuarto"></label>`,
        actions: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Crear obra', cls: 'primary', onClick: (w) => ({ n: w.querySelector('#nn').value.trim() || 'Nueva obra', c: w.querySelector('#nc').value.trim() }) }],
        onOpen: (w) => setTimeout(() => w.querySelector('#nn').focus(), 50)
      });
      if (!nombre) return;
      const o = S.newObra(nombre.n); o.datos.ciudad = nombre.c; S.autoPlan(o);
      await S.putObra(o); U.toast('Obra creada'); go('o/' + o.id + '/datos');
    },
    feature: async (el) => {
      let id = el.dataset.id;
      if (!id) { U.toast('Generando obra de demostración…'); id = (await window.createDemoObra()).id; }
      go('o/' + id + '/' + el.dataset.v);
    },
    demo: async () => { U.toast('Generando obra de demostración…'); const o = await window.createDemoObra(); go('o/' + o.id + '/panel'); },
    quickNote: async () => {
      const txt = await U.modal({ title: 'Nota rápida', body: '<label class="fld"><span>¿Qué pasó hoy en obra?</span><textarea id="qn" rows="4"></textarea></label>', actions: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Guardar', cls: 'primary', onClick: (w) => w.querySelector('#qn').value.trim() || false }], onOpen: (w) => setTimeout(() => w.querySelector('#qn').focus(), 50) });
      if (!txt) return;
      S.current.bitacora.unshift({ id: U.uid(), fecha: U.today(), texto: txt, rubros: [] }); await S.saveNow(); U.toast('Agregado a la bitácora'); App.render();
    }
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT' && el.type === 'file') return;
    const name = el.dataset.act; const r = parse(); const view = V[r.view];
    if (view && view.actions && view.actions[name]) return view.actions[name](el, S.current, e);
    if (ACTIONS[name]) return ACTIONS[name](el, e);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.obra-card')) e.target.click(); });
  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.matches('[data-act="importFile"]')) {
      const f = el.files[0]; if (!f) return;
      try { const o = await S.importData(JSON.parse(await f.text())); U.toast('Respaldo importado'); go('o/' + o.id + '/panel'); } catch (err) { U.toast(err.message || 'No se pudo importar', 'bad'); }
      return;
    }
    const r = parse(); const view = V[r.view];
    if (view && view.onChange) view.onChange(el, S.current, e);
  });
  // Enlace de datos: data-bind="ruta.del.dato"
  document.addEventListener('input', (e) => {
    const el = e.target; if (!S.current) return;
    if (el.dataset.bind) {
      const v = el.type === 'checkbox' ? el.checked : el.value;
      U.setPath(S.current, el.dataset.bind, v); S.save();
      if (el.dataset.bind === 'nombre') { const b = document.querySelector('.side-obra b'); if (b) b.textContent = v; }
    }
    const r = parse(); const view = V[r.view];
    if (view && view.onInput) view.onInput(el, S.current, e);
  });
  document.addEventListener('click', (e) => { if (e.target.closest('.nav a')) document.body.classList.remove('side-open'); });

  // PWA
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

  render(false);
})();
