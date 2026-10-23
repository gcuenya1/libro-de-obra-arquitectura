/* ===== Vistas: datos, actores, tareas previas, planillas, rubro, planificación ===== */
(function () {
  const V = window.VIEWS = window.VIEWS || {};
  const esc = U.esc, I = U.icon;

  /* ---- Helpers de formulario ---- */
  const fld = (o, label, bind, { type = 'text', ph = '', cls = '', list } = {}) => {
    const v = U.getPath(o, bind) ?? '';
    const inp = type === 'textarea'
      ? `<textarea data-bind="${bind}" rows="3" placeholder="${esc(ph)}">${esc(v)}</textarea>`
      : `<input type="${type}" data-bind="${bind}" value="${esc(v)}" placeholder="${esc(ph)}" ${list ? `list="${list}"` : ''}>`;
    return `<label class="fld ${cls}"><span>${label}</span>${inp}</label>`;
  };
  V._fld = fld;
  const pageH = (title, sub, actions = '') => `<div class="page-h"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div><div class="page-actions">${actions}</div></div>`;
  V._pageH = pageH;

  const statusBtns = (cur, attrs) => ['ok', 'obs', 'proc', 'na'].map((v) => {
    const e = S.ESTADOS[v];
    return `<button class="sb ${e.cls} ${cur === v ? 'on' : ''}" data-act="st" data-v="${v}" ${attrs} title="${e.label}" aria-pressed="${cur === v}">${v === 'ok' ? I('check') : v === 'obs' ? I('alert') : v === 'proc' ? I('clock') : 'N/A'}<span class="sb-l">${e.label}</span></button>`;
  }).join('');
  V._statusBtns = statusBtns;

  /* ================= DATOS ================= */
  V.datos = {
    render(o) {
      const d = o.datos; const fin = d.fechaInicio && d.plazoDias ? U.addDays(d.fechaInicio, Number(d.plazoDias)) : null;
      return pageH('Datos de la obra', 'Equivale a la hoja "Datos" del libro. Se guarda automáticamente.') + `
      <div class="form-grid">
        <section class="card"><div class="card-h"><h3>${I('hard')} Identificación</h3></div>
          <div class="fields">
            ${fld(o, 'Nombre de la obra', 'nombre', { cls: 'span2' })}
            ${fld(o, 'Tipo de obra', 'datos.tipoObra', { ph: 'Vivienda unifamiliar, ampliación, local…', list: 'dl-tipo', cls: 'span2' })}
            ${fld(o, 'Superficie (m²)', 'datos.superficie', { type: 'number' })}
            <label class="fld"><span>Color de la obra</span><input type="color" data-bind="color" value="${esc(o.color || '#1f4e79')}"></label>
          </div>
          <datalist id="dl-tipo"><option>Vivienda unifamiliar — obra nueva</option><option>Ampliación</option><option>Refacción</option><option>Local comercial</option><option>Edificio en altura</option><option>Galpón / nave industrial</option></datalist>
          <div class="portada"><div class="portada-img" id="portada"></div><label class="btn ghost sm">${I('image')} Cambiar portada<input type="file" accept="image/*" data-act="portada" hidden></label></div>
        </section>
        <section class="card"><div class="card-h"><h3>${I('pin')} Ubicación</h3></div>
          <div class="fields">
            ${fld(o, 'Domicilio', 'datos.domicilio', { cls: 'span2' })}
            ${fld(o, 'Barrio', 'datos.barrio')}${fld(o, 'Ciudad', 'datos.ciudad')}
            ${fld(o, 'Provincia', 'datos.provincia')}
            <div class="fld"><span>Nomenclatura catastral</span><div class="cat">${['C', 'S', 'M', 'P'].map((k) => `<input aria-label="${k}" placeholder="${k}" data-bind="datos.cat${k}" value="${esc(d['cat' + k] || '')}">`).join('')}</div></div>
            ${fld(o, 'Manzana oficial', 'datos.mzOf')}${fld(o, 'Lote oficial', 'datos.loteOf')}
          </div>
          <div class="geo">${d.lat ? `<span class="muted small">${I('pin')} ${d.lat}, ${d.lon}</span> <a class="link" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lon}#map=16/${d.lat}/${d.lon}">Ver en mapa</a>` : '<span class="muted small">La ubicación se calcula desde la ciudad para el pronóstico del clima.</span>'}
            <button class="btn sm ghost" data-act="gps">${I('pin')} Usar mi ubicación (GPS)</button></div>
        </section>
        <section class="card"><div class="card-h"><h3>${I('stamp')} Aprobaciones</h3></div>
          <div class="fields">
            ${fld(o, 'Colegio de Arquitectos · Expediente Nº', 'datos.expColegio')}${fld(o, 'Fecha', 'datos.fechaColegio', { type: 'date' })}
            ${fld(o, 'Aprobación municipal · Expediente Nº', 'datos.expMunicipal')}${fld(o, 'Fecha', 'datos.fechaMunicipal', { type: 'date' })}
          </div>
        </section>
        <section class="card"><div class="card-h"><h3>${I('clock')} Administración y plazos</h3></div>
          <div class="fields">
            ${fld(o, 'Tipo de administración', 'datos.tipoAdmin', { list: 'dl-adm' })}${fld(o, 'Empresa', 'datos.empresa')}
            ${fld(o, 'Fecha de inicio', 'datos.fechaInicio', { type: 'date' })}${fld(o, 'Plazo de obra (días corridos)', 'datos.plazoDias', { type: 'number' })}
          </div>
          <datalist id="dl-adm"><option>Contrato por ajuste alzado</option><option>Contrato por unidad de medida</option><option>Administración</option><option>Coste y costas</option></datalist>
          <p class="muted small" id="finprev">${fin ? `Fecha de finalización prevista: <b>${U.fmtLong(fin)}</b>` : ''}</p>
        </section>
      </div>
      <section class="card danger-zone"><div><h3>Eliminar obra</h3><p class="muted small">Borra la obra y sus fotos de este dispositivo. Exportá un respaldo antes.</p></div><button class="btn danger" data-act="delObra">${I('trash')} Eliminar</button></section>`;
    },
    async mount(root, o) {
      if (o.portada) { const f = await S.getFoto(o.portada); if (f) root.querySelector('#portada').style.backgroundImage = `url(${f.data})`; }
    },
    onInput(el, o) {
      if (el.dataset.bind === 'datos.ciudad') { delete o.datos.lat; delete o.datos.lon; }
      if (['datos.fechaInicio', 'datos.plazoDias'].includes(el.dataset.bind)) {
        const d = o.datos; const fin = d.fechaInicio && d.plazoDias ? U.addDays(d.fechaInicio, Number(d.plazoDias)) : null;
        document.getElementById('finprev').innerHTML = fin ? `Fecha de finalización prevista: <b>${U.fmtLong(fin)}</b>` : '';
      }
    },
    async onChange(el, o) {
      if (el.dataset.act === 'portada' && el.files[0]) {
        const data = await U.compressImage(el.files[0]); const id = U.uid();
        await S.putFoto({ id, obraId: o.id, data, fecha: U.today(), caption: 'Portada', ref: 'gal' });
        o.portada = id; await S.saveNow(); App.render(); U.toast('Portada actualizada');
      }
    },
    actions: {
      gps: (el, o) => {
        if (!navigator.geolocation) return U.toast('GPS no disponible', 'bad');
        navigator.geolocation.getCurrentPosition((p) => { o.datos.lat = +p.coords.latitude.toFixed(5); o.datos.lon = +p.coords.longitude.toFixed(5); S.saveNow(); U.toast('Ubicación guardada'); App.render(); }, () => U.toast('No se pudo obtener la ubicación', 'bad'));
      },
      delObra: async (el, o) => {
        if (!(await U.confirm('Eliminar obra', `¿Eliminar definitivamente <b>${esc(o.nombre)}</b> y todas sus fotos?`, 'Eliminar', true))) return;
        await S.deleteObra(o.id); S.current = null; U.toast('Obra eliminada'); go('');
      }
    }
  };

  /* ================= ACTORES ================= */
  const ROLES = [['comitente', 'Comitente', 'Sr./Sra.', false], ['proyectista', 'Proyectista', 'Arq.', true], ['director', 'Director técnico', 'Arq.', true], ['representante', 'Representante técnico', 'Arq.', true], ['administrador', 'Administrador', 'Arq./Sr.', false]];
  V.ROLES = ROLES;
  V.actores = {
    render(o) {
      const hoy = U.today();
      const roles = ROLES.map(([k, l, tit, mp]) => {
        const a = o.actores[k] || (o.actores[k] = {});
        return `<section class="card actor"><div class="card-h"><h3><span class="avatar">${esc((a.nombre || l).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase())}</span>${l}</h3>
          ${k !== 'director' && k !== 'proyectista' ? '' : k === 'director' ? '<button class="btn xs ghost" data-act="copyDir" title="Copiar datos del proyectista">' + I('copy') + ' = proyectista</button>' : ''}</div>
          <div class="fields">
            ${fld(o, `Nombre <small class="muted">(${tit})</small>`, `actores.${k}.nombre`, { cls: 'span2' })}
            ${fld(o, 'DNI Nº', `actores.${k}.dni`)}${mp ? fld(o, 'Matrícula profesional (M.P.)', `actores.${k}.mp`) : fld(o, 'Carácter', `actores.${k}.caracter`)}
            ${fld(o, 'Domicilio', `actores.${k}.dom`)}${fld(o, 'Teléfono', `actores.${k}.tel`, { type: 'tel' })}
            ${fld(o, 'Observaciones', `actores.${k}.obs`, { cls: 'span2' })}
          </div>
          <div class="firma-row">${a.firma ? `<img src="${a.firma}" alt="Firma" class="firma-img">` : '<span class="muted small">Sin firma registrada</span>'}
            <button class="btn xs ghost" data-act="firmaActor" data-k="${k}">${I('pen')} ${a.firma ? 'Volver a firmar' : 'Registrar firma'}</button></div>
        </section>`;
      }).join('');
      const mo = o.manoObra.map((m, i) => {
        let art = '<span class="chip">Sin vencimiento</span>';
        if (m.artVto) { const dd = U.daysBetween(hoy, m.artVto); art = dd < 0 ? `<span class="chip bad">${I('alert')} ART vencida</span>` : dd <= 15 ? `<span class="chip warn">${I('clock')} Vence en ${dd} d</span>` : `<span class="chip ok">${I('shield')} ART vigente</span>`; }
        return `<div class="mo-card"><div class="mo-h"><b>${esc(m.rubro || 'Personal')}</b>${art}<button class="icon-btn sm" data-act="delMo" data-i="${i}" aria-label="Quitar">${I('trash')}</button></div>
          <div class="fields f3">
            ${fld(o, 'Nombre (Sr.)', `manoObra.${i}.nombre`)}${fld(o, 'DNI Nº', `manoObra.${i}.dni`)}${fld(o, 'Carácter / rubro', `manoObra.${i}.rubro`, { list: 'dl-rubro' })}
            ${fld(o, 'Domicilio / teléfono', `manoObra.${i}.tel`)}${fld(o, 'Inscripción', `manoObra.${i}.inscripcion`)}${fld(o, 'Aseguradora / ART', `manoObra.${i}.art`)}
            ${fld(o, 'Vencimiento ART', `manoObra.${i}.artVto`, { type: 'date' })}
          </div></div>`;
      }).join('');
      return pageH('Actores y personal', 'Actores intervinientes y mano de obra, con control de vencimiento de ART.') +
        `<div class="actors">${roles}</div>
        <div class="sec-h"><h2>Mano de obra</h2><button class="btn primary sm" data-act="addMo">${I('plus')} Agregar persona</button></div>
        <datalist id="dl-rubro"><option>Constructor</option><option>Sanitarista</option><option>Electricista</option><option>Gasista</option><option>Pintor</option><option>Herrero</option><option>Carpintero</option><option>Yesero</option><option>Techista</option></datalist>
        <div class="mo-list">${mo || '<p class="muted">Sin personal cargado.</p>'}</div>`;
    },
    actions: {
      addMo: (el, o) => { o.manoObra.push({ id: U.uid(), rubro: '' }); S.saveNow(); App.render(); },
      delMo: async (el, o) => { if (await U.confirm('Quitar persona', '¿Quitar a esta persona del listado?', 'Quitar', true)) { o.manoObra.splice(+el.dataset.i, 1); S.saveNow(); App.render(); } },
      copyDir: (el, o) => { o.actores.director = { ...o.actores.proyectista }; S.saveNow(); App.render(); U.toast('Datos copiados'); },
      firmaActor: async (el, o) => { const sig = await U.askSignature('Firma · ' + el.dataset.k); if (sig) { o.actores[el.dataset.k].firma = sig; await S.saveNow(); App.render(); U.toast('Firma registrada'); } }
    },
    onInput(el) { if (/manoObra\.\d+\.(artVto|rubro)/.test(el.dataset.bind || '')) { clearTimeout(this._t); this._t = setTimeout(() => App.render(), 900); } }
  };

  /* ================= TAREAS PREVIAS ================= */
  V.previas = {
    render(o) {
      const list = S.previasList();
      const done = list.filter((p) => ['ok', 'na'].includes(o.previas[p.k]?.estado)).length;
      const rows = list.map((p, n) => {
        const v = o.previas[p.k] || {};
        return `<div class="prow lvl${p.lvl} ${v.estado ? 'est-' + v.estado : ''}" data-k="${p.k}">
          <div class="pt"><span class="num">${p.lvl ? '' : (p.k.slice(1) * 1 + 1)}</span>${esc(p.t)}</div>
          <div class="sbs">${statusBtns(v.estado, `data-k="${p.k}" data-prev="1"`)}</div>
          <input type="date" aria-label="Fecha" data-bind="previas.${p.k}.fecha" value="${esc(v.fecha || '')}">
          <input aria-label="Conformidad" placeholder="Conformidad" data-bind="previas.${p.k}.conformidad" value="${esc(v.conformidad || '')}">
          <input class="obs-in" aria-label="Observaciones" placeholder="Observaciones" data-bind="previas.${p.k}.obs" value="${esc(v.obs || '')}">
        </div>`;
      }).join('');
      return pageH('Tareas previas de proyecto', `${done} de ${list.length} tareas resueltas`, `<div class="mini-prog">${U.bar(done / list.length * 100)}</div>`) +
        `<section class="card nopad"><div class="prows">${rows}</div></section>`;
    },
    actions: {
      st: (el, o) => {
        const k = el.dataset.k; const v = o.previas[k] || (o.previas[k] = {});
        v.estado = v.estado === el.dataset.v ? '' : el.dataset.v; if (v.estado && !v.fecha) v.fecha = U.today();
        S.save(); App.render();
      }
    }
  };

  /* ================= PLANILLAS ================= */
  V.planillas = {
    state: { q: '', f: 'all', config: false },
    render(o) {
      const st = this.state; const T = window.LO_TEMPLATE;
      const list = st.config ? S.allRubros(o).slice().sort((a, b) => a.cap - b.cap) : S.active(o);
      const byCap = {};
      list.forEach((r) => (byCap[r.cap] = byCap[r.cap] || []).push(r));
      let body = '';
      if (st.q.trim().length >= 2) body = this.search(o, st.q.trim());
      else body = Object.entries(byCap).map(([cap, rs]) => {
        const cards = rs.map((r) => {
          const s = S.rubroStats(o, r); const on = o.rubros.includes(r.id); const p = o.plan[r.id];
          if (!st.config && st.f === 'obs' && !s.obs) return '';
          if (!st.config && st.f === 'curso' && !(s.pct > 0 && s.pct < 100)) return '';
          if (!st.config && st.f === 'pend' && s.pct >= 100) return '';
          return st.config
            ? `<label class="rcard cfg ${on ? 'on' : ''}"><input type="checkbox" data-act="toggleR" data-id="${r.id}" ${on ? 'checked' : ''}><span class="code">${esc(r.code)}</span><b>${esc(r.t)}</b><small>${s.total} ítems</small>${r.custom ? `<button class="icon-btn sm" data-act="delCustom" data-id="${r.id}" aria-label="Eliminar">${I('trash')}</button>` : ''}</label>`
            : `<a class="rcard ${s.pct >= 100 ? 'done' : ''}" href="#/o/${o.id}/rubro/${r.id}">
                <div class="rc-top"><span class="code">${esc(r.code)}</span>${s.obs ? `<span class="chip warn xs">${I('alert')} ${s.obs}</span>` : ''}${s.pct >= 100 ? `<span class="chip ok xs">${I('check')}</span>` : ''}</div>
                <b>${esc(r.t)}</b>
                ${U.bar(s.pct, s.obs ? 'has-obs' : '')}
                <div class="rc-foot"><span>${s.ok}/${s.total - s.na} conformes</span><span>${p && p.ini ? U.fmtDate(p.ini, { day: '2-digit', month: 'short' }) : ''}</span></div></a>`;
        }).join('');
        if (!cards.trim()) return '';
        return `<section class="capsec"><h2 class="cap-h"><span class="capnum">${cap}</span>${esc(T.caps[cap] || 'Rubros personalizados')}</h2><div class="rgrid">${cards}</div></section>`;
      }).join('') || '<div class="empty"><p class="muted">No hay planillas que coincidan con el filtro.</p></div>';
      const chips = [['all', 'Todas'], ['curso', 'En curso'], ['obs', 'Con observaciones'], ['pend', 'Sin terminar']].map(([k, l]) => `<button class="fchip ${st.f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('');
      return pageH('Planillas de control', st.config ? 'Elegí qué rubros aplican a esta obra.' : `${S.active(o).length} planillas activas`,
        `<button class="btn ${st.config ? 'primary' : 'ghost'} sm" data-act="config">${I(st.config ? 'check' : 'filter')} ${st.config ? 'Listo' : 'Configurar rubros'}</button><button class="btn ghost sm" data-act="newCustom">${I('plus')} Rubro propio</button>`) +
        `<div class="toolbar"><div class="search">${I('search')}<input type="search" id="q" placeholder="Buscar en todas las planillas (ej: curado, recubrimiento)…" value="${esc(st.q)}"></div>${st.config ? `<div class="chips"><button class="fchip" data-act="allR" data-v="1">Activar todos</button><button class="fchip" data-act="allR" data-v="0">Desactivar todos</button></div>` : `<div class="chips">${chips}</div>`}</div>
        <div id="plist">${body}</div>`;
    },
    search(o, q) {
      const n = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const nq = n(q); const res = [];
      S.active(o).forEach((r) => r.secs.forEach((s, si) => s.items.forEach((it, ii) => { if (n(it.t).includes(nq)) res.push({ r, it, v: o.items[S.key(r.id, si, ii)] || {} }); })));
      if (!res.length) return '<div class="empty"><p class="muted">Sin resultados.</p></div>';
      return `<p class="muted small">${res.length} resultado${res.length > 1 ? 's' : ''}</p><div class="sres">${res.slice(0, 120).map(({ r, it, v }) => `<a class="sr" href="#/o/${o.id}/rubro/${r.id}"><span class="dot ${S.ESTADOS[v.estado || ''].cls}"></span><div><b>${esc(it.t)}</b><small>${esc(r.code)} · ${esc(r.t)}</small></div>${I('chevron')}</a>`).join('')}</div>`;
    },
    mount(root) {
      const q = root.querySelector('#q');
      q.addEventListener('input', U.debounce(() => { this.state.q = q.value; App.render(); setTimeout(() => { const nq = document.getElementById('q'); nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); }, 0); }, 250));
    },
    actions: {
      filter: (el) => { V.planillas.state.f = el.dataset.f; App.render(); },
      config: () => { V.planillas.state.config = !V.planillas.state.config; App.render(); },
      toggleR: (el, o) => { const id = el.dataset.id; o.rubros = el.checked ? [...new Set([...o.rubros, id])] : o.rubros.filter((x) => x !== id); S.save(); el.closest('.rcard').classList.toggle('on', el.checked); },
      allR: (el, o) => { o.rubros = el.dataset.v === '1' ? S.allRubros(o).map((r) => r.id) : []; S.save(); App.render(); },
      delCustom: async (el, o, e) => { e.preventDefault(); if (!(await U.confirm('Eliminar rubro', '¿Eliminar este rubro personalizado y sus registros?', 'Eliminar', true))) return; o.custom = o.custom.filter((r) => r.id !== el.dataset.id); o.rubros = o.rubros.filter((x) => x !== el.dataset.id); S.saveNow(); App.render(); },
      newCustom: async (el, o) => {
        const T = window.LO_TEMPLATE;
        const r = await U.modal({
          title: 'Nuevo rubro personalizado',
          body: `<div class="fields"><label class="fld"><span>Capítulo</span><select id="cc">${Object.entries(T.caps).map(([k, v]) => `<option value="${k}">${k}. ${v}</option>`).join('')}<option value="17">17. Otros</option></select></label>
            <label class="fld"><span>Código</span><input id="cd" placeholder="Ej: 4.1.2"></label>
            <label class="fld span2"><span>Nombre del rubro</span><input id="ct" placeholder="Ej: Fundaciones · Plateas"></label>
            <label class="fld span2"><span>Ítems de control (uno por línea)</span><textarea id="ci" rows="8" placeholder="Limpieza de fondo\nSección de hierros según cálculo\nRecubrimiento = ___ cm"></textarea></label></div>`,
          wide: true,
          actions: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Crear rubro', cls: 'primary', onClick: (w) => {
            const t = w.querySelector('#ct').value.trim(); const items = w.querySelector('#ci').value.split('\n').map((x) => x.trim()).filter(Boolean);
            if (!t || !items.length) { U.toast('Completá nombre e ítems', 'bad'); return false; }
            return { id: 'c' + Date.now().toString(36), custom: true, cap: +w.querySelector('#cc').value, code: w.querySelector('#cd').value.trim() || '—', t, secs: [{ t: '', items: items.map((x) => (/_{2,}|=\s*$|:\s*$/.test(x) ? { t: x, f: 1 } : { t: x })) }] };
          } }]
        });
        if (!r) return; o.custom.push(r); o.rubros.push(r.id); await S.saveNow(); U.toast('Rubro creado'); goObra('rubro/' + r.id);
      }
    }
  };

  /* ================= RUBRO (planilla) ================= */
  V.rubro = {
    state: { f: 'all', open: {} },
    head(o, r) {
      const s = S.rubroStats(o, r); const p = o.plan[r.id] || {};
      return `<div class="rubro-h" id="rh">
        <div class="rh-ring">${U.ring(s.pct, 92, 9)}</div>
        <div class="rh-t"><a class="link small" href="#/o/${o.id}/planillas">${I('back')} Planillas</a><span class="eyebrow">${esc(r.code)} · ${esc(S.capName(r.cap))}</span><h1>${esc(r.t)}</h1>
          <div class="rh-stats"><span class="dot st-ok"></span>${s.ok} conformes <span class="dot st-obs"></span>${s.obs} observados <span class="dot st-proc"></span>${s.proc} en proceso <span class="dot st-pend"></span>${s.pend} pendientes${s.na ? ` <span class="dot st-na"></span>${s.na} N/A` : ''}</div></div>
        <div class="rh-plan"><label class="fld sm"><span>Inicio previsto</span><input type="date" data-bind="plan.${r.id}.ini" value="${esc(p.ini || '')}"></label><label class="fld sm"><span>Fin previsto</span><input type="date" data-bind="plan.${r.id}.fin" value="${esc(p.fin || '')}"></label></div>
      </div>`;
    },
    row(o, r, si, ii) {
      const k = S.key(r.id, si, ii); const it = r.secs[si].items[ii]; const v = o.items[k] || {};
      const open = this.state.open[k] || v.estado === 'obs';
      const nf = this._fotos ? this._fotos.filter((f) => f.ref === 'item:' + k) : [];
      return `<div class="irow ${v.estado ? 'est-' + v.estado : ''} ${open ? 'open' : ''}" data-row="${k}">
        <div class="i-main">
          <button class="i-txt" data-act="exp" data-k="${k}"><span class="inum">${ii + 1}</span><span>${esc(it.t.replace(/_{2,}/g, '___'))}</span>${v.val ? `<span class="ival">${esc(v.val)}</span>` : ''}${v.obs && !open ? `<span class="ihas" title="Tiene observaciones">${I('edit')}</span>` : ''}${nf.length ? `<span class="ihas">${I('camera')}${nf.length}</span>` : ''}</button>
          <div class="sbs">${V._statusBtns(v.estado, `data-k="${k}"`)}</div>
        </div>
        <div class="i-more">
          <div class="i-fields">
            ${it.f ? `<label class="fld sm"><span>Valor / medida</span><input data-k="${k}" data-fld="val" value="${esc(v.val || '')}" placeholder="Ej: 1:3:3, 25 cm, H-21"></label>` : ''}
            <label class="fld sm"><span>Fecha</span><input type="date" data-k="${k}" data-fld="fecha" value="${esc(v.fecha || '')}"></label>
            <label class="tg"><input type="checkbox" data-k="${k}" data-fld="plano" ${v.plano ? 'checked' : ''}><span>${I('plan')} S/Plano</span></label>
            <label class="tg"><input type="checkbox" data-k="${k}" data-fld="seg" ${v.seg ? 'checked' : ''}><span>${I('shield')} Seguridad</span></label>
          </div>
          <label class="fld sm"><span>Observaciones</span><textarea rows="2" data-k="${k}" data-fld="obs" placeholder="Detalle de lo observado, corrección indicada…">${esc(v.obs || '')}</textarea></label>
          <div class="i-photos">${nf.map((f) => `<img src="${f.data}" alt="" data-act="viewFoto" data-id="${f.id}">`).join('')}<label class="addph">${I('camera')}<span>Foto</span><input type="file" accept="image/*" capture="environment" data-k="${k}" data-fld="foto" hidden></label></div>
        </div>
      </div>`;
    },
    render(o, rid) {
      const r = S.rubro(o, rid);
      if (!r) return '<div class="empty"><p>Rubro no encontrado.</p></div>';
      this._r = r;
      const f = this.state.f;
      const secs = r.secs.map((s, si) => {
        const rows = s.items.map((it, ii) => {
          const e = (o.items[S.key(r.id, si, ii)] || {}).estado || '';
          if (f === 'pend' && (e === 'ok' || e === 'na')) return '';
          if (f === 'obs' && e !== 'obs') return '';
          return this.row(o, r, si, ii);
        }).join('');
        if (!rows) return '';
        return `<section class="isec">${s.t ? `<h3 class="isec-h">${esc(s.t)}</h3>` : ''}<div class="irows">${rows}</div></section>`;
      }).join('') || '<div class="empty"><p class="muted">No hay ítems con este filtro.</p></div>';
      const table = r.table ? this.table(o, r) : '';
      const chips = [['all', 'Todos'], ['pend', 'Pendientes'], ['obs', 'Observados']].map(([k, l]) => `<button class="fchip ${f === k ? 'on' : ''}" data-act="rfilter" data-f="${k}">${l}</button>`).join('');
      return this.head(o, r) + `
        <div class="toolbar sticky"><div class="chips">${chips}</div><div class="grow"></div>
          <button class="btn ghost sm" data-act="allOk">${I('check')} <span class="hide-s">Pendientes → conformes</span></button>
          <button class="btn ghost sm" data-act="printR">${I('print')} <span class="hide-s">Imprimir planilla</span></button></div>
        <div class="legend-st"><span><i class="dot st-ok"></i>Conforme</span><span><i class="dot st-obs"></i>Observado</span><span><i class="dot st-proc"></i>En proceso</span><span><i class="dot st-na"></i>No aplica</span><span class="muted">Tocá un ítem para fecha, medidas, observaciones y fotos.</span></div>
        ${table}${secs}`;
    },
    table(o, r) {
      const rows = o.tablas[r.id] || [];
      return `<section class="card ttable"><div class="card-h"><h3>${I('plan')} ${esc(r.table.hint)}</h3><button class="btn xs primary" data-act="addTRow">${I('plus')} Fila</button></div>
        <div class="tscroll"><table><thead><tr>${r.table.cols.map((c) => `<th>${esc(c)}</th>`).join('')}<th></th></tr></thead>
        <tbody>${rows.map((row, i) => `<tr>${r.table.cols.map((c, j) => `<td><input data-bind="tablas.${r.id}.${i}.${j}" value="${esc(row[j] || '')}" aria-label="${esc(c)}"></td>`).join('')}<td><button class="icon-btn sm" data-act="delTRow" data-i="${i}" aria-label="Quitar">${I('trash')}</button></td></tr>`).join('') || `<tr><td colspan="${r.table.cols.length + 1}" class="muted small">Agregá las designaciones propias de la obra.</td></tr>`}</tbody></table></div></section>`;
    },
    async mount(root, o, rid) {
      this._fotos = await S.listFotos(o.id);
      const r = S.rubro(o, rid); if (!r) return;
      // re-render filas con conteo de fotos
      root.querySelectorAll('[data-row]').forEach((el) => { const [, si, ii] = el.dataset.row.split('|'); if (this._fotos.some((f) => f.ref === 'item:' + el.dataset.row)) el.outerHTML = this.row(o, r, +si, +ii); });
    },
    refresh(o, k) {
      const r = this._r; const [, si, ii] = k.split('|');
      const el = document.querySelector(`[data-row="${CSS.escape(k)}"]`); if (el) el.outerHTML = this.row(o, r, +si, +ii);
      const h = document.getElementById('rh'); if (h) { const tmp = document.createElement('div'); tmp.innerHTML = this.head(o, r); h.replaceWith(tmp.firstElementChild); }
      const sb = document.querySelector('.side-obra .mini-ring'); if (sb) sb.innerHTML = U.ring(S.obraStats(o).pct, 46, 6);
    },
    actions: {
      rfilter: (el) => { V.rubro.state.f = el.dataset.f; App.render(); },
      exp: (el) => { const k = el.dataset.k; V.rubro.state.open[k] = !el.closest('.irow').classList.contains('open'); el.closest('.irow').classList.toggle('open'); },
      st: (el, o) => {
        const k = el.dataset.k; const v = S.item(o, k);
        v.estado = v.estado === el.dataset.v ? '' : el.dataset.v;
        if (v.estado && !v.fecha) v.fecha = U.today();
        if (v.estado === 'obs') V.rubro.state.open[k] = true;
        S.save(); V.rubro.refresh(o, k);
        if (v.estado === 'obs') setTimeout(() => document.querySelector(`[data-row="${CSS.escape(k)}"] textarea`)?.focus(), 30);
        if (navigator.vibrate) navigator.vibrate(12);
      },
      allOk: async (el, o) => {
        const r = V.rubro._r; let n = 0;
        if (!(await U.confirm('Marcar conformes', 'Todos los ítems <b>pendientes o en proceso</b> de esta planilla se marcarán como conformes con fecha de hoy.', 'Marcar'))) return;
        r.secs.forEach((s, si) => s.items.forEach((it, ii) => { const v = S.item(o, S.key(r.id, si, ii)); if (!v.estado || v.estado === 'proc') { v.estado = 'ok'; v.fecha = v.fecha || U.today(); n++; } }));
        await S.saveNow(); App.render(); U.toast(`${n} ítems marcados como conformes`);
      },
      printR: (el, o) => window.printBook(o, { only: V.rubro._r.id }),
      addTRow: (el, o) => { const id = V.rubro._r.id; (o.tablas[id] = o.tablas[id] || []).push([]); S.saveNow(); App.render(); },
      delTRow: (el, o) => { o.tablas[V.rubro._r.id].splice(+el.dataset.i, 1); S.saveNow(); App.render(); },
      viewFoto: (el) => V.fotos.lightbox(el.dataset.id)
    },
    onInput(el, o) {
      if (!el.dataset.fld || el.dataset.fld === 'foto') return;
      const k = el.dataset.k; const v = S.item(o, k);
      v[el.dataset.fld] = el.type === 'checkbox' ? el.checked : el.value; S.save();
      if (el.dataset.fld === 'val') { const t = el.closest('.irow').querySelector('.ival'); if (t) t.textContent = el.value; }
    },
    async onChange(el, o) {
      if (el.dataset.fld === 'foto' && el.files[0]) {
        const k = el.dataset.k; const r = this._r; const [, si, ii] = k.split('|');
        const data = await U.compressImage(el.files[0]);
        const f = { id: U.uid(), obraId: o.id, data, fecha: U.today(), caption: r.secs[si].items[ii].t, rubro: r.id, ref: 'item:' + k };
        await S.putFoto(f); this._fotos.push(f); this.state.open[k] = true; this.refresh(o, k); U.toast('Foto agregada');
      }
      if (el.dataset.bind && el.dataset.bind.startsWith('plan.')) App.render();
    }
  };

  /* ================= PLANIFICACIÓN (GANTT) ================= */
  V.gantt = {
    render(o) {
      const rs = S.active(o);
      const planned = rs.filter((r) => o.plan[r.id]?.ini && o.plan[r.id]?.fin);
      const hoy = U.today();
      let body = '<div class="empty"><p class="muted">Todavía no hay planificación. Usá “Planificación automática” para generar una propuesta según la fecha de inicio y el plazo.</p></div>';
      if (planned.length) {
        const t0 = Math.min(...planned.map((r) => +U.parseDate(o.plan[r.id].ini)));
        const t1 = Math.max(...planned.map((r) => +U.parseDate(o.plan[r.id].fin))) + 86400000;
        const span = t1 - t0; const pos = (t) => ((t - t0) / span) * 100;
        const months = []; const d = new Date(t0); d.setDate(1);
        while (+d < t1) { const a = Math.max(+d, t0); const nx = new Date(d); nx.setMonth(nx.getMonth() + 1); months.push({ l: U.MESES[d.getMonth()].slice(0, 3) + ' ' + String(d.getFullYear()).slice(2), left: pos(a), w: pos(Math.min(+nx, t1)) - pos(a) }); d.setMonth(d.getMonth() + 1); }
        const tpos = pos(+U.parseDate(hoy));
        let lastCap = null;
        const rows = rs.map((r) => {
          const p = o.plan[r.id] || {}; const s = S.rubroStats(o, r);
          let capRow = '';
          if (r.cap !== lastCap) { lastCap = r.cap; capRow = `<div class="g-cap">${r.cap}. ${esc(S.capName(r.cap))}</div>`; }
          let bar = '';
          if (p.ini && p.fin) {
            const a = pos(+U.parseDate(p.ini)), b = pos(+U.parseDate(p.fin) + 86400000);
            const late = p.fin < hoy && s.pct < 100;
            bar = `<a href="#/o/${o.id}/rubro/${r.id}" class="g-bar ${late ? 'late' : ''} ${s.pct >= 100 ? 'done' : ''} ${b - a < 7 ? 'narrow' : ''}" style="left:${a}%;width:${Math.max(0.8, b - a)}%" title="${esc(r.t)} · ${U.fmtDate(p.ini)} → ${U.fmtDate(p.fin)} · ${Math.round(s.pct)}%"><span style="width:${s.pct}%"></span><em>${Math.round(s.pct)}%</em></a>`;
          }
          return `${capRow}<div class="g-row"><div class="g-name"><a href="#/o/${o.id}/rubro/${r.id}"><span class="code">${esc(r.code)}</span> ${esc(r.t)}</a>
            <div class="g-dates"><input type="date" aria-label="Inicio" data-bind="plan.${r.id}.ini" value="${esc(p.ini || '')}"><input type="date" aria-label="Fin" data-bind="plan.${r.id}.fin" value="${esc(p.fin || '')}"></div></div>
            <div class="g-track">${bar}</div></div>`;
        }).join('');
        body = `<div class="gantt"><div class="g-head"><div class="g-name"></div><div class="g-track">${months.map((m) => `<span style="left:${m.left}%;width:${m.w}%">${m.w > 5 ? m.l : ''}</span>`).join('')}</div></div>
          <div class="g-body">${rows}<div class="g-today" style="--t:${tpos}"></div></div></div>`;
      }
      return pageH('Planificación de obra', 'Diagrama de Gantt por rubro con el avance real de cada planilla.', `<button class="btn primary sm" data-act="auto">${I('spark')} Planificación automática</button>`) +
        `<section class="card">${U.lineChart(S.sCurve(o), { today: Date.now(), height: 200 })}</section>
         <section class="card nopad gcard">${body}</section>
         <p class="muted small">Las barras rojas indican rubros con fecha de fin vencida y avance incompleto. La línea vertical marca el día de hoy.</p>`;
    },
    actions: {
      auto: async (el, o) => {
        if (Object.keys(o.plan).length && !(await U.confirm('Planificación automática', 'Se reemplazarán las fechas actuales por una propuesta basada en la fecha de inicio y el plazo de obra. ¿Continuar?', 'Generar'))) return;
        S.autoPlan(o); await S.saveNow(); App.render(); U.toast('Planificación generada');
      }
    },
    onChange(el) { if (el.dataset.bind && el.dataset.bind.startsWith('plan.')) App.render(); }
  };
})();
