/* ===== Vistas: bitácora, órdenes y notas, fotos, actas ===== */
(function () {
  const V = window.VIEWS = window.VIEWS || {};
  const esc = U.esc, I = U.icon;
  const pageH = (...a) => V._pageH(...a);

  const climaChip = (c) => { if (!c || c.code == null && c.tmax == null) return ''; const [ic, l] = S.WMO(c.code ?? 1); return `<span class="chip clima" title="${l}">${ic} ${c.tmax != null ? Math.round(c.tmax) + '°/' + Math.round(c.tmin) + '°' : l}${c.lluvia ? ` · ${c.lluvia} mm` : ''}</span>`; };
  V._climaChip = climaChip;

  /* ================= BITÁCORA ================= */
  V.bitacora = {
    render(o) {
      const groups = {};
      o.bitacora.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).forEach((b) => { const d = U.parseDate(b.fecha); const k = U.MESES[d.getMonth()] + ' ' + d.getFullYear(); (groups[k] = groups[k] || []).push(b); });
      const body = Object.entries(groups).map(([m, list]) => `<h2 class="month">${m}</h2>` + list.map((b) => `
        <article class="bentry" data-id="${b.id}">
          <div class="b-date"><b>${U.parseDate(b.fecha).getDate()}</b><small>${U.parseDate(b.fecha).toLocaleDateString('es-AR', { weekday: 'short' })}</small></div>
          <div class="b-body">
            <div class="b-meta">${climaChip(b.clima)}${b.personal ? `<span class="chip">${I('users')} ${b.personal} personas</span>` : ''}${(b.rubros || []).map((rid) => { const r = S.rubro(o, rid); return r ? `<a class="chip link-chip" href="#/o/${o.id}/rubro/${rid}">${esc(r.code)} ${esc(r.t)}</a>` : ''; }).join('')}</div>
            <p>${esc(b.texto).replace(/\n/g, '<br>')}</p>
            <div class="b-photos" data-bph="${b.id}"></div>
            <div class="b-actions"><label class="btn xs ghost">${I('camera')} Foto<input type="file" accept="image/*" capture="environment" data-bfoto="${b.id}" hidden></label><button class="btn xs ghost" data-act="editB" data-id="${b.id}">${I('edit')} Editar</button><button class="btn xs ghost" data-act="delB" data-id="${b.id}">${I('trash')}</button></div>
          </div>
        </article>`).join('')).join('');
      return pageH('Bitácora diaria', 'Registro cronológico de lo sucedido en obra, con el clima del día.', `<button class="btn primary sm" data-act="newB">${I('plus')} Nueva entrada</button>`) +
        (body ? `<div class="bitacora">${body}</div>` : `<div class="empty">${I('book', 'big')}<h3>La bitácora está vacía</h3><p class="muted">Registrá el primer día de obra.</p></div>`);
    },
    async mount(root, o) {
      const fotos = (await S.listFotos(o.id)).filter((f) => f.ref && f.ref.startsWith('bit:'));
      fotos.forEach((f) => { const c = root.querySelector(`[data-bph="${f.ref.slice(4)}"]`); if (c) c.insertAdjacentHTML('beforeend', `<img src="${f.data}" alt="" data-act="viewFoto" data-id="${f.id}">`); });
    },
    async form(o, b) {
      const isNew = !b; b = b || { fecha: U.today(), rubros: [], clima: {} };
      const rs = S.active(o);
      const res = await U.modal({
        title: isNew ? 'Nueva entrada de bitácora' : 'Editar entrada', wide: true,
        body: `<div class="fields">
          <label class="fld"><span>Fecha</span><input type="date" id="bf" value="${esc(b.fecha)}"></label>
          <label class="fld"><span>Personal en obra</span><input type="number" min="0" id="bp" value="${esc(b.personal || '')}"></label>
          <div class="fld span2"><span>Clima</span><div class="clima-row" id="bc">
            <select id="bcc">${[[0, 'Despejado'], [2, 'Parcialmente nublado'], [3, 'Nublado'], [45, 'Niebla'], [61, 'Lluvia'], [95, 'Tormenta'], [71, 'Nieve']].map(([c, l]) => `<option value="${c}" ${String(b.clima?.code) === String(c) ? 'selected' : ''}>${S.WMO(c)[0]} ${l}</option>`).join('')}</select>
            <input type="number" id="btx" placeholder="Máx °C" value="${esc(b.clima?.tmax ?? '')}"><input type="number" id="btn" placeholder="Mín °C" value="${esc(b.clima?.tmin ?? '')}"><input type="number" id="bll" placeholder="Lluvia mm" value="${esc(b.clima?.lluvia ?? '')}">
            <button type="button" class="btn sm ghost" id="bauto">${I('spark')} Traer clima real</button></div></div>
          <div class="fld span2"><span>Rubros trabajados</span><div class="pick">${rs.map((r) => `<label class="pk"><input type="checkbox" value="${r.id}" ${(b.rubros || []).includes(r.id) ? 'checked' : ''}><span>${esc(r.code)} ${esc(r.t)}</span></label>`).join('')}</div></div>
          <label class="fld span2"><span>Novedades del día</span><textarea id="bt" rows="5" placeholder="Trabajos realizados, visitas, materiales recibidos, indicaciones…">${esc(b.texto || '')}</textarea></label>
        </div>`,
        actions: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Guardar', cls: 'primary', onClick: (w) => {
          const q = (s) => w.querySelector(s);
          if (!q('#bt').value.trim()) { U.toast('Escribí las novedades del día', 'bad'); return false; }
          const num = (s) => (q(s).value === '' ? null : Number(q(s).value));
          return { fecha: q('#bf').value || U.today(), personal: q('#bp').value, texto: q('#bt').value.trim(), rubros: U.$$('.pick input:checked', w).map((x) => x.value), clima: { code: Number(q('#bcc').value), tmax: num('#btx'), tmin: num('#btn'), lluvia: num('#bll') } };
        } }],
        onOpen: (w) => {
          w.querySelector('#bauto').onclick = async (e) => {
            const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Consultando…';
            try {
              const c = await S.weatherOn(o, w.querySelector('#bf').value || U.today());
              const sel = w.querySelector('#bcc'); const opts = [...sel.options].map((x) => +x.value);
              sel.value = opts.reduce((best, v) => (Math.abs(v - c.code) < Math.abs(best - c.code) && v <= c.code ? v : best), 0);
              w.querySelector('#btx').value = Math.round(c.tmax); w.querySelector('#btn').value = Math.round(c.tmin); w.querySelector('#bll').value = c.lluvia ?? 0;
              U.toast('Clima cargado');
            } catch (err) { U.toast(err.message || 'Sin conexión', 'bad'); }
            btn.disabled = false; btn.innerHTML = I('spark') + ' Traer clima real';
          };
        }
      });
      if (!res) return;
      if (isNew) o.bitacora.unshift({ id: U.uid(), ...res }); else Object.assign(b, res);
      await S.saveNow(); App.render(); U.toast('Bitácora actualizada');
    },
    actions: {
      newB: (el, o) => V.bitacora.form(o),
      editB: (el, o) => V.bitacora.form(o, o.bitacora.find((b) => b.id === el.dataset.id)),
      delB: async (el, o) => { if (await U.confirm('Eliminar entrada', '¿Eliminar esta entrada de la bitácora?', 'Eliminar', true)) { o.bitacora = o.bitacora.filter((b) => b.id !== el.dataset.id); await S.saveNow(); App.render(); } },
      viewFoto: (el) => V.fotos.lightbox(el.dataset.id)
    },
    async onChange(el, o) {
      if (el.dataset.bfoto && el.files[0]) {
        const b = o.bitacora.find((x) => x.id === el.dataset.bfoto);
        await S.putFoto({ id: U.uid(), obraId: o.id, data: await U.compressImage(el.files[0]), fecha: b.fecha, caption: b.texto.slice(0, 80), rubro: (b.rubros || [])[0], ref: 'bit:' + b.id });
        App.render(); U.toast('Foto agregada');
      }
    }
  };

  /* ================= ÓRDENES DE SERVICIO / NOTAS DE PEDIDO ================= */
  const TIPOS = { OS: { l: 'Orden de servicio', short: 'OS', de: 'Dirección de obra', a: 'Contratista' }, NP: { l: 'Nota de pedido', short: 'NP', de: 'Contratista', a: 'Dirección de obra' } };
  V.TIPOS = TIPOS;
  V.ordenes = {
    state: { tab: 'all' },
    render(o) {
      const tab = this.state.tab; const hoy = U.today();
      const list = o.ordenes.filter((x) => tab === 'all' || x.tipo === tab).slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero - a.numero);
      const cards = list.map((x) => {
        const t = TIPOS[x.tipo]; const vencida = x.estado !== 'cumplida' && x.plazo && x.plazo < hoy;
        return `<article class="orden ${x.tipo.toLowerCase()} ${x.estado}">
          <div class="o-num"><small>${t.short}</small><b>${String(x.numero).padStart(3, '0')}</b></div>
          <div class="o-body">
            <div class="o-top"><span class="eyebrow">${t.l} · ${U.fmtDate(x.fecha)}</span>
              ${x.estado === 'cumplida' ? `<span class="chip ok">${I('check')} Cumplida</span>` : vencida ? `<span class="chip bad">${I('alert')} Vencida</span>` : `<span class="chip warn">${I('clock')} Pendiente</span>`}</div>
            <h3>${esc(x.asunto || 'Sin asunto')}</h3>
            <p>${esc(x.texto || '').replace(/\n/g, '<br>')}</p>
            ${x.respuesta ? `<div class="o-resp"><small>Respuesta / notificación</small><p>${esc(x.respuesta)}</p></div>` : ''}
            <div class="o-foot"><span class="muted small">De: ${esc(x.emisor || t.de)} → ${esc(t.a)}${x.plazo ? ` · Plazo: ${U.fmtDate(x.plazo)}` : ''}</span>
              <div class="o-sigs">${x.firmaE ? `<img src="${x.firmaE}" alt="Firma emisor" title="Firma emisor">` : ''}${x.firmaN ? `<img src="${x.firmaN}" alt="Firma notificado" title="Notificado">` : ''}</div></div>
            <div class="o-actions">
              ${x.estado !== 'cumplida' ? `<button class="btn xs primary" data-act="cumplir" data-id="${x.id}">${I('check')} Marcar cumplida</button>` : `<button class="btn xs ghost" data-act="reabrir" data-id="${x.id}">Reabrir</button>`}
              <button class="btn xs ghost" data-act="firmar" data-id="${x.id}" data-w="E">${I('pen')} Firma emisor</button>
              <button class="btn xs ghost" data-act="firmar" data-id="${x.id}" data-w="N">${I('pen')} Notificado</button>
              <button class="btn xs ghost" data-act="printO" data-id="${x.id}">${I('print')}</button>
              <button class="btn xs ghost" data-act="editO" data-id="${x.id}">${I('edit')}</button>
              <button class="btn xs ghost" data-act="delO" data-id="${x.id}">${I('trash')}</button>
            </div>
          </div></article>`;
      }).join('');
      const cnt = (t) => o.ordenes.filter((x) => t === 'all' || x.tipo === t).length;
      return pageH('Órdenes de servicio y notas de pedido', 'Comunicaciones formales numeradas entre la Dirección de obra y el Contratista.',
        `<button class="btn primary sm" data-act="newO" data-t="OS">${I('plus')} Orden de servicio</button><button class="btn ghost sm" data-act="newO" data-t="NP">${I('plus')} Nota de pedido</button>`) +
        `<div class="tabs">${[['all', 'Todas'], ['OS', 'Órdenes de servicio'], ['NP', 'Notas de pedido']].map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="tab" data-t="${k}">${l} <span>${cnt(k)}</span></button>`).join('')}</div>
        <div class="ordenes">${cards || `<div class="empty">${I('order', 'big')}<p class="muted">No hay registros.</p></div>`}</div>`;
    },
    async form(o, tipo, x) {
      const isNew = !x;
      const next = Math.max(0, ...o.ordenes.filter((y) => y.tipo === tipo).map((y) => y.numero)) + 1;
      x = x || { tipo, numero: next, fecha: U.today(), estado: 'pendiente', emisor: TIPOS[tipo].de };
      const res = await U.modal({
        title: `${isNew ? 'Nueva' : 'Editar'} ${TIPOS[x.tipo].l.toLowerCase()} Nº ${x.numero}`, wide: true,
        body: `<div class="fields">
          <label class="fld"><span>Fecha</span><input type="date" id="of" value="${esc(x.fecha)}"></label>
          <label class="fld"><span>Plazo de cumplimiento</span><input type="date" id="op" value="${esc(x.plazo || '')}"></label>
          <label class="fld span2"><span>Asunto</span><input id="oa" value="${esc(x.asunto || '')}" placeholder="Ej: Corrección de recubrimientos en losa"></label>
          <label class="fld span2"><span>Texto</span><textarea id="ot" rows="6">${esc(x.texto || '')}</textarea></label>
          <label class="fld"><span>Emitida por</span><input id="oe" value="${esc(x.emisor || '')}"></label>
          <label class="fld"><span>Respuesta / notificación</span><input id="or" value="${esc(x.respuesta || '')}"></label>
        </div>`,
        actions: [{ label: 'Cancelar', cls: 'ghost', value: null }, { label: 'Guardar', cls: 'primary', onClick: (w) => {
          const q = (s) => w.querySelector(s).value.trim();
          if (!q('#oa')) { U.toast('Completá el asunto', 'bad'); return false; }
          return { fecha: q('#of') || U.today(), plazo: q('#op'), asunto: q('#oa'), texto: q('#ot'), emisor: q('#oe'), respuesta: q('#or') };
        } }]
      });
      if (!res) return;
      if (isNew) o.ordenes.push({ id: U.uid(), ...x, ...res }); else Object.assign(x, res);
      await S.saveNow(); App.render(); U.toast('Registro guardado');
    },
    actions: {
      tab: (el) => { V.ordenes.state.tab = el.dataset.t; App.render(); },
      newO: (el, o) => V.ordenes.form(o, el.dataset.t),
      editO: (el, o) => { const x = o.ordenes.find((y) => y.id === el.dataset.id); V.ordenes.form(o, x.tipo, x); },
      delO: async (el, o) => { if (await U.confirm('Eliminar registro', 'Se eliminará este registro. La numeración no se reutiliza automáticamente.', 'Eliminar', true)) { o.ordenes = o.ordenes.filter((y) => y.id !== el.dataset.id); await S.saveNow(); App.render(); } },
      cumplir: async (el, o) => { const x = o.ordenes.find((y) => y.id === el.dataset.id); x.estado = 'cumplida'; x.fechaCumplida = U.today(); await S.saveNow(); App.render(); U.toast('Marcada como cumplida'); },
      reabrir: async (el, o) => { const x = o.ordenes.find((y) => y.id === el.dataset.id); x.estado = 'pendiente'; await S.saveNow(); App.render(); },
      firmar: async (el, o) => { const x = o.ordenes.find((y) => y.id === el.dataset.id); const sig = await U.askSignature(el.dataset.w === 'E' ? 'Firma del emisor' : 'Firma de notificación'); if (sig) { x['firma' + el.dataset.w] = sig; await S.saveNow(); App.render(); } },
      printO: (el, o) => window.printBook(o, { orden: el.dataset.id })
    }
  };

  /* ================= FOTOS ================= */
  V.fotos = {
    state: { r: '' },
    render(o) {
      const rs = S.active(o);
      return pageH('Registro fotográfico', 'Todas las fotos de la obra: de planillas, bitácora y galería.',
        `<label class="btn primary sm">${I('camera')} Subir fotos<input type="file" accept="image/*" multiple data-act="upFotos" hidden></label>`) +
        `<div class="toolbar"><select id="fr" aria-label="Filtrar por rubro"><option value="">Todos los rubros</option>${rs.map((r) => `<option value="${r.id}" ${this.state.r === r.id ? 'selected' : ''}>${esc(r.code)} · ${esc(r.t)}</option>`).join('')}</select><span class="muted small" id="fcount"></span></div>
        <div class="gallery" id="gal"><div class="skeleton"></div></div>`;
    },
    async mount(root, o) {
      let fotos = (await S.listFotos(o.id)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      if (this.state.r) fotos = fotos.filter((f) => f.rubro === this.state.r);
      root.querySelector('#fcount').textContent = `${fotos.length} foto${fotos.length === 1 ? '' : 's'}`;
      root.querySelector('#gal').innerHTML = fotos.map((f) => { const r = f.rubro && S.rubro(o, f.rubro); return `<figure class="ph" data-act="viewFoto" data-id="${f.id}"><img src="${f.data}" alt="${esc(f.caption || '')}" loading="lazy"><figcaption><b>${esc(f.caption || 'Sin descripción')}</b><small>${U.fmtDate(f.fecha)}${r ? ' · ' + esc(r.code) : ''}</small></figcaption></figure>`; }).join('') || `<div class="empty">${I('camera', 'big')}<p class="muted">Sin fotos. Subí fotos desde aquí, desde cada ítem de las planillas o desde la bitácora.</p></div>`;
      root.querySelector('#fr').onchange = (e) => { this.state.r = e.target.value; App.render(); };
    },
    async lightbox(id) {
      const f = await S.getFoto(id); if (!f) return;
      const o = S.current; const rs = S.active(o);
      const res = await U.modal({
        title: f.caption || 'Foto', wide: true,
        body: `<img class="lb-img" src="${f.data}" alt=""><div class="fields">
          <label class="fld span2"><span>Descripción</span><input id="lc" value="${esc(f.caption || '')}"></label>
          <label class="fld"><span>Fecha</span><input type="date" id="lf" value="${esc(f.fecha || '')}"></label>
          <label class="fld"><span>Rubro</span><select id="lr"><option value="">—</option>${rs.map((r) => `<option value="${r.id}" ${f.rubro === r.id ? 'selected' : ''}>${esc(r.code)} · ${esc(r.t)}</option>`).join('')}</select></label></div>`,
        actions: [
          { label: I('trash') + ' Eliminar', cls: 'ghost danger-t', value: 'del' },
          { label: I('download') + ' Descargar', cls: 'ghost', onClick: () => { U.download(U.slug(f.caption || 'foto') + '.jpg', dataURLtoBlob(f.data)); return false; } },
          { label: I('star') + ' Usar de portada', cls: 'ghost', value: 'cover' },
          { label: 'Guardar', cls: 'primary', onClick: (w) => ({ caption: w.querySelector('#lc').value, fecha: w.querySelector('#lf').value, rubro: w.querySelector('#lr').value }) }
        ]
      });
      if (!res) return;
      if (res === 'del') { if (await U.confirm('Eliminar foto', '¿Eliminar esta foto?', 'Eliminar', true)) { await S.deleteFoto(id); if (o.portada === id) { o.portada = null; S.saveNow(); } App.render(); } return; }
      if (res === 'cover') { o.portada = id; await S.saveNow(); U.toast('Portada actualizada'); return; }
      Object.assign(f, res); await S.putFoto(f); App.render(); U.toast('Foto actualizada');
    },
    actions: { viewFoto: (el) => V.fotos.lightbox(el.dataset.id) },
    async onChange(el, o) {
      if (el.dataset.act === 'upFotos' && el.files.length) {
        U.toast(`Procesando ${el.files.length} foto(s)…`);
        for (const file of el.files) await S.putFoto({ id: U.uid(), obraId: o.id, data: await U.compressImage(file), fecha: U.today(), caption: file.name.replace(/\.[^.]+$/, ''), rubro: this.state.r || '', ref: 'gal' });
        App.render(); U.toast('Fotos agregadas');
      }
    }
  };
  function dataURLtoBlob(d) { const [h, b] = d.split(','); const bin = atob(b); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: h.match(/:(.*?);/)[1] }); }

  /* ================= ACTAS ================= */
  const ACTAS = { inicio: 'Acta de inicio de obra', provisoria: 'Acta de recepción provisoria', definitiva: 'Acta de recepción definitiva' };
  V.ACTAS = ACTAS;
  const blank = (v, w = 'texto') => (v ? `<b>${esc(v)}</b>` : `<span class="blank">${w}</span>`);
  V.actaText = (o, tipo) => {
    const a = o.actas[tipo] || {}; const d = o.datos; const ac = o.actores;
    const f = U.parseDate(a.fecha);
    const fechaTxt = f ? `a los ${blank(f.getDate())} días del mes de ${blank(U.MESES[f.getMonth()])} de ${blank(f.getFullYear())}` : `a los ${blank('', '…')} días del mes de ${blank('', '…')} de ${blank('', '…')}`;
    if (tipo === 'inicio') {
      return `<p>En ${blank(a.lugar || [d.domicilio, d.ciudad].filter(Boolean).join(', '), 'lugar')}, lugar de ejecución de los trabajos objeto del contrato, con fecha ${blank(a.fecha ? U.fmtDate(a.fecha) : '', 'fecha')}, se reúnen las siguientes personas: ${blank(a.contratista || d.empresa, 'contratista')} por el Contratista, y ${blank(ac.director?.nombre ? 'Arq. ' + ac.director.nombre : '', 'director de obra')} por la Dirección de Obra, quienes suscriben la presente ACTA a los efectos de dejar constancia de lo que figura en los puntos que siguen.</p>
        <p>1. La Dirección de Obra, en representación del Comitente, procede a entregar al Contratista ${blank(a.entrega, 'detalle de lo entregado')}</p>
        <p>2. La fecha del Acta constituirá la fecha cierta a partir de la cual se contarán los plazos para la ejecución de los trabajos a cargo del Contratista${d.plazoDias ? `, fijándose un plazo de ${blank(d.plazoDias)} días corridos` : ''}.</p>
        ${a.obs ? `<p>3. ${esc(a.obs)}</p>` : ''}
        <p>En prueba de conformidad las personas mencionadas suscriben el Acta, en la Ciudad de ${blank(d.ciudad, 'ciudad')}, ${fechaTxt}.</p>`;
    }
    const c = ac.comitente || {}, dt = ac.director || {};
    return `<table class="acta-data"><tr><th>Designación de la obra</th><td>${esc(o.nombre)}${d.tipoObra ? ' — ' + esc(d.tipoObra) : ''}</td></tr><tr><th>Ubicación de la obra</th><td>${esc([d.domicilio, d.barrio, d.ciudad].filter(Boolean).join(', ')) || '—'}</td></tr><tr><th>Fecha</th><td>${a.fecha ? U.fmtDate(a.fecha) : '—'}</td></tr></table>
      <p>En la ciudad de ${blank(d.ciudad, 'ciudad')}, Departamento ${blank(a.depto, 'departamento')}, Provincia de ${blank(d.provincia || 'Córdoba')}, se reúnen los señores ${blank(c.nombre, 'comitente')}, DNI Nº ${blank(c.dni, 'DNI')}, en carácter de COMITENTE, domiciliado en ${blank(c.dom, 'domicilio')}, y el/la Arq. ${blank(dt.nombre, 'profesional')}, MP Nº ${blank(dt.mp, 'MP')}, DNI Nº ${blank(dt.dni, 'DNI')}, en carácter de ${blank(a.caracter || 'Director Técnico')}, para realizar la Recepción ${tipo === 'provisoria' ? 'Provisoria' : 'Definitiva'} de la obra en cuestión, en un todo de acuerdo con ${blank(a.legal || 'el Art. 1646 y 1647 bis del Código Civil')}.</p>
      ${tipo === 'provisoria' && a.garantia ? `<p>Se establece un plazo de garantía de ${blank(a.garantia)} días a partir de la presente, al cabo del cual se procederá a la recepción definitiva.</p>` : ''}
      <p><b>Observaciones / trabajos pendientes:</b> ${a.obs ? esc(a.obs) : 'Sin observaciones.'}</p>`;
  };
  V.actaSigs = (o, tipo) => {
    const a = o.actas[tipo] || {}; const fs = a.firmas || {};
    const labels = tipo === 'inicio' ? ['Dirección de obra', 'Contratista'] : ['Firma del comitente', 'Firma del profesional'];
    return labels.map((l, i) => `<div class="sig">${fs[i] ? `<img src="${fs[i]}" alt="">` : '<div class="sig-blank"></div>'}<span>${l}</span></div>`).join('');
  };
  V.actas = {
    state: { tab: 'inicio' },
    render(o) {
      const t = this.state.tab; const a = o.actas[t] || (o.actas[t] = {});
      const f = V._fld;
      const fields = t === 'inicio'
        ? `${f(o, 'Fecha del acta', `actas.${t}.fecha`, { type: 'date' })}${f(o, 'Lugar', `actas.${t}.lugar`, { ph: 'Domicilio de la obra' })}
           ${f(o, 'Contratista', `actas.${t}.contratista`, { list: 'dl-contr' })}
           ${f(o, 'Se entrega al Contratista…', `actas.${t}.entrega`, { type: 'textarea', cls: 'span2', ph: 'el terreno libre de ocupantes, los puntos fijos de referencia, la documentación aprobada…' })}
           ${f(o, 'Observaciones adicionales', `actas.${t}.obs`, { type: 'textarea', cls: 'span2' })}`
        : `${f(o, 'Fecha del acta', `actas.${t}.fecha`, { type: 'date' })}${f(o, 'Departamento', `actas.${t}.depto`, { ph: 'Río Cuarto' })}
           ${f(o, 'Carácter del profesional', `actas.${t}.caracter`, { list: 'dl-car', ph: 'Director Técnico' })}
           ${t === 'provisoria' ? f(o, 'Plazo de garantía (días)', `actas.${t}.garantia`, { type: 'number' }) : '<span></span>'}
           ${f(o, 'Fundamento legal', `actas.${t}.legal`, { cls: 'span2', ph: 'el Art. 1646 y 1647 bis del Código Civil' })}
           ${f(o, 'Observaciones / trabajos pendientes', `actas.${t}.obs`, { type: 'textarea', cls: 'span2' })}`;
      const pend = S.obraStats(o);
      return pageH('Actas', 'Se completan automáticamente con los datos de la obra y los actores.', `<button class="btn primary sm" data-act="printA">${I('print')} Imprimir / PDF</button>`) +
        `<div class="tabs">${Object.entries(ACTAS).map(([k, l]) => `<button class="tab ${t === k ? 'on' : ''}" data-act="tabA" data-t="${k}">${l}</button>`).join('')}</div>
        ${t !== 'inicio' && pend.pct < 100 ? `<div class="notice">${I('alert')} La obra tiene ${Math.round(pend.pct)}% de avance y ${pend.obs} observación(es) abiertas. Revisalas antes de la recepción.</div>` : ''}
        <div class="acta-grid">
          <section class="card"><div class="card-h"><h3>Datos del acta</h3></div><div class="fields">${fields}</div>
            <datalist id="dl-contr">${o.manoObra.filter((m) => m.nombre).map((m) => `<option>${esc(m.nombre)}</option>`).join('')}${o.datos.empresa ? `<option>${esc(o.datos.empresa)}</option>` : ''}</datalist>
            <datalist id="dl-car"><option>Director Técnico</option><option>Conductor Técnico</option></datalist>
            <div class="sig-btns"><button class="btn sm ghost" data-act="sigA" data-i="0">${I('pen')} ${t === 'inicio' ? 'Firma Dirección' : 'Firma comitente'}</button><button class="btn sm ghost" data-act="sigA" data-i="1">${I('pen')} ${t === 'inicio' ? 'Firma Contratista' : 'Firma profesional'}</button><button class="btn sm ghost" data-act="sigReg">${I('copy')} Usar firmas registradas</button></div>
          </section>
          <section class="paper" id="acta-prev"><h2>${ACTAS[t].toUpperCase()}</h2>${V.actaText(o, t)}<div class="sigs">${V.actaSigs(o, t)}</div></section>
        </div>`;
    },
    onInput(el, o) { if (el.dataset.bind && el.dataset.bind.startsWith('actas.')) { const t = this.state.tab; document.getElementById('acta-prev').innerHTML = `<h2>${ACTAS[t].toUpperCase()}</h2>${V.actaText(o, t)}<div class="sigs">${V.actaSigs(o, t)}</div>`; } },
    actions: {
      tabA: (el) => { V.actas.state.tab = el.dataset.t; App.render(); },
      printA: (el, o) => window.printBook(o, { acta: V.actas.state.tab }),
      sigA: async (el, o) => { const t = V.actas.state.tab; const sig = await U.askSignature('Firma'); if (sig) { const a = o.actas[t]; a.firmas = a.firmas || {}; a.firmas[el.dataset.i] = sig; await S.saveNow(); App.render(); } },
      sigReg: async (el, o) => {
        const t = V.actas.state.tab; const a = o.actas[t]; a.firmas = a.firmas || {};
        if (t === 'inicio') { if (o.actores.director?.firma) a.firmas[0] = o.actores.director.firma; }
        else { if (o.actores.comitente?.firma) a.firmas[0] = o.actores.comitente.firma; if (o.actores.director?.firma) a.firmas[1] = o.actores.director.firma; }
        await S.saveNow(); App.render(); U.toast('Se aplicaron las firmas registradas en Actores');
      }
    }
  };
})();
