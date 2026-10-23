/* ===== Módulo económico: presupuesto y certificados de avance ===== */
(function () {
  const V = window.VIEWS = window.VIEWS || {};
  const esc = U.esc, I = U.icon;
  const pageH = (...a) => V._pageH(...a);

  /* ---- Helpers numéricos ---- */
  const num = (v) => { const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const numIn = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const $$ = (v, d = 0) => '$ ' + (Number(v) || 0).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (v, d = 1) => (Number(v) || 0).toLocaleString('es-AR', { maximumFractionDigits: d }) + '%';
  const monthEnd = (ym) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m, 0); return `${y}-${String(m).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const monthLabel = (ym) => { if (!ym) return '—'; const [y, m] = ym.split('-').map(Number); return U.MESES[m - 1] + ' ' + y; };
  const E = {};
  E.num = num; E.money = $$;

  /* ---- Modelo ---- */
  E.ensure = (o) => {
    if (!o.presupuesto) o.presupuesto = { items: [], gg: 12, beneficio: 10, iva: 0, anticipo: 0, fondoReparo: 5, redeterminar: true, indiceBase: '', mesBase: (o.datos.fechaInicio || U.today()).slice(0, 7) };
    if (!o.certificados) o.certificados = [];
    return o.presupuesto;
  };
  E.K = (p) => (1 + numIn(p.gg) / 100) * (1 + numIn(p.beneficio) / 100) * (1 + numIn(p.iva) / 100);
  E.itemCD = (it) => numIn(it.cant) * numIn(it.pu);
  E.itemTotal = (p, it) => E.itemCD(it) * E.K(p);
  E.capOf = (o, it) => { const r = it.rid && S.rubro(o, it.rid); return r ? r.cap : (it.cap || 17); };
  E.totals = (o) => {
    const p = E.ensure(o); const cd = p.items.reduce((a, it) => a + E.itemCD(it), 0);
    return { cd, total: cd * E.K(p), K: E.K(p) };
  };
  E.rubroPctAt = (o, r, fecha) => {
    let total = 0, ok = 0;
    r.secs.forEach((s, si) => s.items.forEach((it, ii) => {
      const v = o.items[S.key(r.id, si, ii)] || {};
      if (v.estado === 'na') return;
      total++; if (v.estado === 'ok' && (!v.fecha || v.fecha <= fecha)) ok++;
    }));
    return total ? ok / total * 100 : 0;
  };
  // Avance físico de las planillas ponderado por el peso económico de cada ítem del presupuesto
  E.fisicoPonderado = (o) => {
    const p = E.ensure(o); let tot = 0, av = 0;
    p.items.forEach((it) => { const w = E.itemTotal(p, it); const r = it.rid && S.rubro(o, it.rid); tot += w; if (r) av += w * S.rubroStats(o, r).pct / 100; });
    return tot ? av / tot * 100 : 0;
  };
  E.sortedCerts = (o) => (o.certificados || []).slice().sort((a, b) => a.numero - b.numero);
  E.prevOf = (o, c) => E.sortedCerts(o).filter((x) => x.numero < c.numero).pop();
  E.calcCert = (o, c) => {
    const p = E.ensure(o); const prev = E.prevOf(o, c);
    const rows = p.items.map((it) => {
      const tot = E.itemTotal(p, it);
      const ant = prev ? numIn(prev.acum[it.id]) : 0;
      const acu = c.acum[it.id] != null && c.acum[it.id] !== '' ? numIn(c.acum[it.id]) : ant;
      return { it, tot, ant, acu, per: acu - ant, monto: tot * (acu - ant) / 100 };
    });
    const base = rows.reduce((a, r) => a + r.monto, 0);
    const total = rows.reduce((a, r) => a + r.tot, 0) || 1;
    const avanceAcum = rows.reduce((a, r) => a + r.tot * r.acu / 100, 0) / total * 100;
    const factor = p.redeterminar && numIn(p.indiceBase) > 0 && numIn(c.indice) > 0 ? numIn(c.indice) / numIn(p.indiceBase) : 1;
    const ajuste = base * (factor - 1);
    const amort = base * numIn(p.anticipo) / 100;
    const fr = (base + ajuste) * numIn(p.fondoReparo) / 100;
    return { rows, base, factor, ajuste, amort, fr, pagar: base + ajuste - amort - fr, avanceAcum, total };
  };
  E.certificadoAcum = (o) => {
    const cs = E.sortedCerts(o); if (!cs.length) return { pct: 0, monto: 0, pagar: 0 };
    let monto = 0, pagar = 0; cs.forEach((c) => { const r = E.calcCert(o, c); monto += r.base + r.ajuste; pagar += r.pagar; });
    return { pct: E.calcCert(o, cs[cs.length - 1]).avanceAcum, monto, pagar };
  };
  window.ECON = E;

  /* ================= PRESUPUESTO ================= */
  V.presupuesto = {
    render(o) {
      const p = E.ensure(o); const t = E.totals(o); const sup = numIn(o.datos.superficie);
      const cert = E.certificadoAcum(o);
      const caps = {};
      p.items.forEach((it, i) => { const c = E.capOf(o, it); (caps[c] = caps[c] || []).push(i); });
      const capTot = Object.entries(caps).map(([c, idx]) => ({ c: +c, v: idx.reduce((a, i) => a + E.itemCD(p.items[i]), 0) })).sort((a, b) => b.v - a.v);
      const rs = S.allRubros(o).slice().sort((a, b) => a.cap - b.cap);
      const rubroOpts = (sel) => `<option value="">— Sin vincular —</option>` + rs.map((r) => `<option value="${r.id}" ${sel === r.id ? 'selected' : ''}>${esc(r.code)} ${esc(r.t)}</option>`).join('');
      const groups = Object.keys(caps).map(Number).sort((a, b) => a - b).map((c) => {
        const sub = caps[c].reduce((a, i) => a + E.itemCD(p.items[i]), 0);
        return `<tbody class="pgroup"><tr class="pcap"><td colspan="5"><span class="capnum sm">${c}</span>${esc(S.capName(c))}</td><td class="r" data-capsub="${c}">${$$(sub)}</td><td class="r">${t.cd ? pct(sub / t.cd * 100) : ''}</td><td></td></tr>
          ${caps[c].map((i) => { const it = p.items[i]; return `<tr data-pi="${i}">
            <td><input data-bind="presupuesto.items.${i}.desc" value="${esc(it.desc || '')}" placeholder="Descripción" aria-label="Descripción"></td>
            <td><select data-bind="presupuesto.items.${i}.rid" aria-label="Rubro vinculado">${rubroOpts(it.rid)}</select></td>
            <td><input class="c" data-bind="presupuesto.items.${i}.u" value="${esc(it.u || '')}" list="dl-un" aria-label="Unidad"></td>
            <td><input class="r" type="number" step="any" data-bind="presupuesto.items.${i}.cant" value="${esc(it.cant ?? '')}" aria-label="Cantidad"></td>
            <td><input class="r" type="number" step="any" data-bind="presupuesto.items.${i}.pu" value="${esc(it.pu ?? '')}" aria-label="Precio unitario"></td>
            <td class="r mono" data-sub="${i}">${$$(E.itemCD(it))}</td>
            <td class="r muted" data-inc="${i}">${t.cd ? pct(E.itemCD(it) / t.cd * 100) : ''}</td>
            <td><button class="icon-btn sm" data-act="delItem" data-i="${i}" aria-label="Quitar">${I('trash')}</button></td></tr>`; }).join('')}</tbody>`;
      }).join('');
      return pageH('Cómputo y presupuesto', 'Presupuesto por rubro vinculado a las planillas de control. Base para los certificados de avance.',
        `${p.items.length ? '' : `<button class="btn primary sm" data-act="genItems">${I('spark')} Generar desde rubros activos</button>`}<button class="btn ${p.items.length ? 'primary' : 'ghost'} sm" data-act="addItem">${I('plus')} Agregar ítem</button><a class="btn ghost sm" href="#/o/${o.id}/certificados">${I('order')} Certificados</a>`) +
        `<section class="kpis money">
          <div class="kpi"><span class="kpi-ic">${I('calc')}</span><div><b id="k-cd">${$$(t.cd)}</b><small>Costo directo</small></div></div>
          <div class="kpi"><span class="kpi-ic">${I('file')}</span><div><b id="k-tot">${$$(t.total)}</b><small>Presupuesto total (K = <span id="k-k">${t.K.toFixed(3)}</span>)</small></div></div>
          <div class="kpi"><span class="kpi-ic">${I('hard')}</span><div><b id="k-m2">${sup ? $$(t.total / sup) : '—'}</b><small>Costo por m² ${sup ? `(${sup} m²)` : '(cargá la superficie)'}</small></div></div>
          <a class="kpi" href="#/o/${o.id}/certificados"><span class="kpi-ic">${I('check')}</span><div><b>${pct(cert.pct)}</b><small>Certificado acumulado · ${$$(cert.monto)}</small></div></a>
        </section>
        <div class="grid2">
          <section class="card"><div class="card-h"><h3>${I('spark')} Coeficiente de pase y condiciones</h3></div>
            <div class="fields f3">
              ${V._fld(o, 'Gastos generales (%)', 'presupuesto.gg', { type: 'number' })}${V._fld(o, 'Beneficio (%)', 'presupuesto.beneficio', { type: 'number' })}${V._fld(o, 'IVA (%)', 'presupuesto.iva', { type: 'number' })}
              ${V._fld(o, 'Anticipo financiero (%)', 'presupuesto.anticipo', { type: 'number' })}${V._fld(o, 'Fondo de reparo (%)', 'presupuesto.fondoReparo', { type: 'number' })}
              <label class="tg as-fld"><input type="checkbox" data-bind="presupuesto.redeterminar" ${p.redeterminar ? 'checked' : ''}><span>Redeterminar por índice</span></label>
              ${V._fld(o, 'Índice base (ej. CAC)', 'presupuesto.indiceBase', { type: 'number', ph: 'Valor del mes base' })}${V._fld(o, 'Mes base', 'presupuesto.mesBase', { type: 'month' })}
            </div>
            <p class="muted xs">El índice (por ejemplo, el Índice del Costo de la Construcción o el índice CAC) se carga a mano cada mes en el certificado. La redeterminación aplica índice del mes ÷ índice base.</p>
          </section>
          <section class="card"><div class="card-h"><h3>${I('dash')} Incidencia por capítulo</h3></div>
            ${capTot.length ? capTot.map((x) => `<div class="capbar"><span class="capn">${x.c}. ${esc(S.capName(x.c))}</span>${U.bar(t.cd ? x.v / t.cd * 100 : 0)}<b>${t.cd ? pct(x.v / t.cd * 100, 0) : ''}</b></div>`).join('') : '<p class="muted">Agregá ítems para ver la incidencia.</p>'}
          </section>
        </div>
        <datalist id="dl-un"><option>gl</option><option>m²</option><option>m³</option><option>ml</option><option>u</option><option>kg</option><option>día</option></datalist>
        ${p.items.length ? `<section class="card nopad ptable-card"><div class="tscroll"><table class="ptable">
          <thead><tr><th>Descripción</th><th>Rubro (planilla)</th><th class="c">Un.</th><th class="r">Cantidad</th><th class="r">Precio unit.</th><th class="r">Subtotal</th><th class="r">Inc.</th><th></th></tr></thead>
          ${groups}
          <tfoot><tr><td colspan="5">Costo directo</td><td class="r" id="f-cd">${$$(t.cd)}</td><td></td><td></td></tr>
          <tr><td colspan="5">Gastos generales, beneficio e impuestos (K = <span id="f-k">${t.K.toFixed(3)}</span>)</td><td class="r" id="f-k2">${$$(t.total - t.cd)}</td><td></td><td></td></tr>
          <tr class="big"><td colspan="5">TOTAL PRESUPUESTO</td><td class="r" id="f-tot">${$$(t.total)}</td><td></td><td></td></tr></tfoot>
        </table></div></section>
        <p class="muted xs">Vinculá cada ítem con su planilla para que los certificados sugieran el avance automáticamente desde los ítems marcados como conformes.</p>`
        : `<div class="empty">${I('calc', 'big')}<h3>Todavía no hay presupuesto</h3><p class="muted">Generá un ítem por cada rubro activo y completá cantidades y precios, o cargalos uno por uno.</p></div>`}`;
    },
    onInput(el, o) {
      const b = el.dataset.bind || '';
      if (!b.startsWith('presupuesto.')) return;
      if (/items\.\d+\.rid$/.test(b) || b === 'presupuesto.redeterminar') { App.render(); return; }
      const p = o.presupuesto; const t = E.totals(o); const sup = numIn(o.datos.superficie);
      const m = b.match(/items\.(\d+)\./);
      if (m) { const c = document.querySelector(`[data-sub="${m[1]}"]`); if (c) c.textContent = $$(E.itemCD(p.items[m[1]])); }
      p.items.forEach((it, i) => { const c = document.querySelector(`[data-inc="${i}"]`); if (c) c.textContent = t.cd ? pct(E.itemCD(it) / t.cd * 100) : ''; });
      document.querySelectorAll('[data-capsub]').forEach((c) => { const cap = +c.dataset.capsub; c.textContent = $$(p.items.filter((it) => E.capOf(o, it) === cap).reduce((a, it) => a + E.itemCD(it), 0)); });
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      set('k-cd', $$(t.cd)); set('k-tot', $$(t.total)); set('k-k', t.K.toFixed(3)); set('k-m2', sup ? $$(t.total / sup) : '—');
      set('f-cd', $$(t.cd)); set('f-k', t.K.toFixed(3)); set('f-k2', $$(t.total - t.cd)); set('f-tot', $$(t.total));
    },
    actions: {
      genItems: async (el, o) => {
        const p = E.ensure(o);
        S.active(o).forEach((r) => p.items.push({ id: U.uid(), rid: r.id, desc: r.t, u: 'gl', cant: 1, pu: '' }));
        await S.saveNow(); App.render(); U.toast('Se creó un ítem por rubro: completá unidades, cantidades y precios');
      },
      addItem: async (el, o) => {
        const p = E.ensure(o); p.items.push({ id: U.uid(), rid: '', desc: '', u: 'u', cant: 1, pu: '' });
        await S.saveNow(); App.render();
        setTimeout(() => { const inp = document.querySelector(`[data-bind="presupuesto.items.${p.items.length - 1}.desc"]`); if (inp) { inp.scrollIntoView({ block: 'center' }); inp.focus(); } }, 50);
      },
      delItem: async (el, o) => {
        const it = o.presupuesto.items[+el.dataset.i];
        if (o.certificados.some((c) => numIn(c.acum[it.id]) > 0) && !(await U.confirm('Quitar ítem', 'Este ítem ya figura en certificados. Si lo quitás, esos certificados se recalculan sin él. ¿Continuar?', 'Quitar', true))) return;
        o.presupuesto.items.splice(+el.dataset.i, 1); await S.saveNow(); App.render();
      }
    }
  };

  /* ================= CERTIFICADOS ================= */
  V.certificados = {
    state: { sel: null },
    render(o) {
      const p = E.ensure(o); const t = E.totals(o); const cs = E.sortedCerts(o);
      if (!p.items.length) return pageH('Certificados de avance', 'Certificación mensual de obra según el avance real.') + `<div class="empty">${I('order', 'big')}<h3>Primero cargá el presupuesto</h3><p class="muted">Los certificados se calculan a partir de los ítems del presupuesto.</p><a class="btn primary" href="#/o/${o.id}/presupuesto">${I('calc')} Ir al presupuesto</a></div>`;
      let sel = cs.find((c) => c.id === this.state.sel) || cs[cs.length - 1];
      const calcs = cs.map((c) => ({ c, r: E.calcCert(o, c) }));
      let acum = 0;
      const maxV = t.total || 1;
      const bars = calcs.map(({ c, r }) => { acum += r.base; return `<div class="cbar ${sel && sel.id === c.id ? 'on' : ''}" data-act="selCert" data-id="${c.id}" title="${monthLabel(c.periodo)}"><span class="cb-acc" style="height:${acum / maxV * 100}%"></span><span class="cb-per" style="height:${r.base / maxV * 100}%"></span><small>Nº ${c.numero}</small></div>`; }).join('');
      const list = calcs.slice().reverse().map(({ c, r }) => `<button class="cert-row ${sel && sel.id === c.id ? 'on' : ''}" data-act="selCert" data-id="${c.id}">
          <span class="cert-n">${String(c.numero).padStart(2, '0')}</span><div><b>${monthLabel(c.periodo)}</b><small>Avance acumulado ${pct(r.avanceAcum)}</small></div>
          <div class="r"><b>${$$(r.pagar)}</b><small>${c.estado === 'pagado' ? '<span class="chip ok xs">Pagado</span>' : c.estado === 'emitido' ? '<span class="chip warn xs">Emitido</span>' : '<span class="chip xs">Borrador</span>'}</small></div></button>`).join('');
      return pageH('Certificados de avance', 'Certificación mensual: el avance se puede tomar directamente de las planillas de control.',
        `<button class="btn primary sm" data-act="newCert">${I('plus')} Nuevo certificado</button><a class="btn ghost sm" href="#/o/${o.id}/presupuesto">${I('calc')} Presupuesto</a>`) +
        `<div class="cert-layout">
          <aside>
            <section class="card"><div class="card-h"><h3>Curva de inversión</h3><span class="muted xs">acumulado vs. presupuesto</span></div>
              ${cs.length ? `<div class="cbars">${bars}</div><div class="legend"><span class="lg"><i style="background:var(--primary-soft);border:1px solid var(--primary)"></i>Acumulado</span><span class="lg"><i style="background:var(--accent)"></i>Período</span></div>` : '<p class="muted small">Sin certificados todavía.</p>'}
            </section>
            <div class="cert-list">${list || ''}</div>
          </aside>
          <div>${sel ? this.detail(o, sel) : `<div class="empty">${I('order', 'big')}<h3>Sin certificados</h3><p class="muted">Creá el primer certificado: el sistema propone el avance según los ítems conformes de cada planilla.</p></div>`}</div>
        </div>`;
    },
    detail(o, c) {
      const p = o.presupuesto; const r = E.calcCert(o, c); const ci = o.certificados.indexOf(c);
      const locked = c.estado !== 'borrador'; const last = E.sortedCerts(o).pop() === c;
      const rows = r.rows.map(({ it, tot, ant, acu, per, monto }) => {
        const rub = it.rid && S.rubro(o, it.rid);
        const bad = acu < ant - 0.001 || acu > 100.001;
        return `<tr class="${bad ? 'bad' : ''}"><td><b>${esc(it.desc || 'Ítem')}</b>${rub ? `<small class="muted">${esc(rub.code)} · avance en planilla ${pct(S.rubroStats(o, rub).pct, 0)}</small>` : ''}</td>
          <td class="r mono">${$$(tot)}</td><td class="r">${pct(ant)}</td>
          <td class="r"><input class="r pin" type="number" step="any" min="0" max="100" ${locked ? 'disabled' : ''} data-bind="certificados.${ci}.acum.${it.id}" value="${c.acum[it.id] != null && c.acum[it.id] !== '' ? esc(c.acum[it.id]) : ant}" aria-label="Avance acumulado"></td>
          <td class="r" data-per="${it.id}">${pct(per)}</td><td class="r mono" data-mon="${it.id}">${$$(monto)}</td></tr>`;
      }).join('');
      return `<section class="card cert-detail">
        <div class="cert-head"><div><span class="eyebrow">Certificado Nº ${c.numero} · ${c.estado}</span><h2>${esc(monthLabel(c.periodo))}</h2></div>
          <div class="page-actions">
            ${!locked ? `<button class="btn ghost sm" data-act="fromPlanillas">${I('spark')} Tomar avance de planillas</button>` : ''}
            <button class="btn ghost sm" data-act="printCert">${I('print')} PDF</button>
            ${c.estado === 'borrador' ? `<button class="btn primary sm" data-act="estado" data-v="emitido">${I('check')} Emitir</button>` : c.estado === 'emitido' ? `<button class="btn primary sm" data-act="estado" data-v="pagado">${I('check')} Marcar pagado</button><button class="btn ghost sm" data-act="estado" data-v="borrador">Reabrir</button>` : `<button class="btn ghost sm" data-act="estado" data-v="emitido">Desmarcar pago</button>`}
            ${last ? `<button class="icon-btn sm" data-act="delCert" aria-label="Eliminar">${I('trash')}</button>` : ''}
          </div></div>
        <div class="fields f3">
          <label class="fld"><span>Período</span><input type="month" data-bind="certificados.${ci}.periodo" value="${esc(c.periodo)}" ${locked ? 'disabled' : ''}></label>
          <label class="fld"><span>Fecha de emisión</span><input type="date" data-bind="certificados.${ci}.fecha" value="${esc(c.fecha || '')}" ${locked ? 'disabled' : ''}></label>
          <label class="fld"><span>Índice del mes ${p.redeterminar ? '' : '(no se redetermina)'}</span><input type="number" step="any" data-bind="certificados.${ci}.indice" value="${esc(c.indice ?? '')}" ${locked || !p.redeterminar ? 'disabled' : ''} placeholder="${p.indiceBase ? 'Base: ' + p.indiceBase : 'Cargá el índice base en Presupuesto'}"></label>
        </div>
        ${locked ? `<p class="muted xs">${I('info')} Certificado ${c.estado}: reabrilo para editar.</p>` : ''}
        <div class="tscroll"><table class="ptable ctable"><thead><tr><th>Ítem</th><th class="r">Monto ítem</th><th class="r">% anterior</th><th class="r">% acumulado</th><th class="r">% período</th><th class="r">Monto período</th></tr></thead>
          <tbody>${rows}</tbody></table></div>
        <div class="cert-sum" id="cert-sum">${this.summary(o, c, r)}</div>
        <label class="fld"><span>Observaciones</span><textarea rows="2" data-bind="certificados.${ci}.obs" ${locked ? 'disabled' : ''}>${esc(c.obs || '')}</textarea></label>
      </section>`;
    },
    summary(o, c, r) {
      const p = o.presupuesto;
      return `<div><span>Monto certificado del período (a valores básicos)</span><b>${$$(r.base)}</b></div>
        ${p.redeterminar ? `<div><span>Redeterminación (factor ${r.factor.toFixed(4)})</span><b>${$$(r.ajuste)}</b></div>` : ''}
        ${numIn(p.anticipo) ? `<div><span>Amortización de anticipo (${pct(p.anticipo)})</span><b>− ${$$(r.amort)}</b></div>` : ''}
        ${numIn(p.fondoReparo) ? `<div><span>Fondo de reparo (${pct(p.fondoReparo)})</span><b>− ${$$(r.fr)}</b></div>` : ''}
        <div class="tot"><span>TOTAL A PAGAR</span><b>${$$(r.pagar)}</b></div>
        <div class="muted"><span>Avance acumulado de obra (económico)</span><b>${pct(r.avanceAcum)}</b></div>`;
    },
    onInput(el, o) {
      const b = el.dataset.bind || ''; if (!b.startsWith('certificados.')) return;
      if (/\.periodo$/.test(b)) return;
      const c = o.certificados[+b.split('.')[1]]; const r = E.calcCert(o, c);
      r.rows.forEach(({ it, per, monto, ant, acu }) => {
        const a = document.querySelector(`[data-per="${it.id}"]`); if (a) a.textContent = pct(per);
        const m = document.querySelector(`[data-mon="${it.id}"]`); if (m) m.textContent = $$(monto);
        if (a) a.closest('tr').classList.toggle('bad', acu < ant - 0.001 || acu > 100.001);
      });
      document.getElementById('cert-sum').innerHTML = this.summary(o, c, r);
    },
    onChange(el) { if ((el.dataset.bind || '').endsWith('.periodo')) App.render(); },
    actions: {
      selCert: (el) => { V.certificados.state.sel = el.dataset.id; App.render(); },
      newCert: async (el, o) => {
        const cs = E.sortedCerts(o); const prev = cs[cs.length - 1];
        if (prev && prev.estado === 'borrador' && !(await U.confirm('Certificado en borrador', `El certificado Nº ${prev.numero} sigue en borrador. ¿Crear otro igualmente?`, 'Crear'))) return;
        let periodo = U.today().slice(0, 7);
        if (prev) { const [y, m] = prev.periodo.split('-').map(Number); const d = new Date(y, m, 1); periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
        const c = { id: U.uid(), numero: (prev ? prev.numero : 0) + 1, periodo, fecha: U.today(), indice: prev ? prev.indice : '', acum: {}, estado: 'borrador' };
        o.certificados.push(c); V.certificados.fill(o, c);
        V.certificados.state.sel = c.id; await S.saveNow(); App.render(); U.toast('Certificado creado con el avance de las planillas');
      },
      fromPlanillas: async (el, o) => { const c = o.certificados.find((x) => x.id === V.certificados.state.sel) || E.sortedCerts(o).pop(); V.certificados.fill(o, c); await S.saveNow(); App.render(); U.toast('Avance tomado de las planillas al cierre del período'); },
      estado: async (el, o) => { const c = o.certificados.find((x) => x.id === V.certificados.state.sel) || E.sortedCerts(o).pop(); c.estado = el.dataset.v; await S.saveNow(); App.render(); },
      delCert: async (el, o) => { const c = E.sortedCerts(o).pop(); if (!(await U.confirm('Eliminar certificado', `¿Eliminar el certificado Nº ${c.numero}?`, 'Eliminar', true))) return; o.certificados = o.certificados.filter((x) => x !== c); V.certificados.state.sel = null; await S.saveNow(); App.render(); },
      printCert: (el, o) => window.printCert(o, o.certificados.find((x) => x.id === V.certificados.state.sel) || E.sortedCerts(o).pop())
    },
    // Propone % acumulado por ítem según las planillas al cierre del período
    fill(o, c) {
      const prev = E.prevOf(o, c); const fin = monthEnd(c.periodo);
      o.presupuesto.items.forEach((it) => {
        const ant = prev ? numIn(prev.acum[it.id]) : 0;
        const r = it.rid && S.rubro(o, it.rid);
        c.acum[it.id] = r ? Math.round(Math.max(ant, E.rubroPctAt(o, r, fin)) * 10) / 10 : ant;
      });
    }
  };

  /* ---- Impresión de certificado ---- */
  window.printCert = async function (o, c) {
    const root = document.getElementById('print-root'); const r = E.calcCert(o, c); const p = o.presupuesto; const d = o.datos;
    const dt = o.actores.director || {}; const cm = o.actores.comitente || {};
    root.innerHTML = `<section><header class="p-head"><span>LIBRO DE OBRA · ${esc(o.nombre)}</span><span>${esc([d.domicilio, d.ciudad].filter(Boolean).join(', '))}</span></header>
      <h2 class="p-title">Certificado de avance de obra Nº ${c.numero}</h2>
      <table class="p-kv"><tr><th>Obra</th><td>${esc(o.nombre)}</td></tr><tr><th>Período</th><td>${esc(monthLabel(c.periodo))}</td></tr><tr><th>Fecha de emisión</th><td>${U.fmtDate(c.fecha)}</td></tr>
      <tr><th>Comitente</th><td>${esc(cm.nombre || '—')}</td></tr><tr><th>Contratista</th><td>${esc(d.empresa || '—')}</td></tr><tr><th>Director técnico</th><td>${dt.nombre ? 'Arq. ' + esc(dt.nombre) : '—'}</td></tr>
      ${p.redeterminar ? `<tr><th>Índice base / del mes</th><td>${esc(p.indiceBase || '—')} / ${esc(c.indice || '—')} (factor ${r.factor.toFixed(4)})</td></tr>` : ''}</table>
      <h3>Detalle</h3>
      <table class="p-t"><thead><tr><th>Ítem</th><th>Monto ítem</th><th>% anterior</th><th>% acumulado</th><th>% período</th><th>Monto período</th></tr></thead>
      <tbody>${r.rows.map((x) => `<tr><td>${esc(x.it.desc || '')}</td><td class="c">${$$(x.tot)}</td><td class="c">${pct(x.ant)}</td><td class="c">${pct(x.acu)}</td><td class="c">${pct(x.per)}</td><td class="c">${$$(x.monto)}</td></tr>`).join('')}</tbody></table>
      <table class="p-kv" style="width:60%;margin-left:auto"><tr><th>Monto del período</th><td>${$$(r.base, 2)}</td></tr>
      ${p.redeterminar ? `<tr><th>Redeterminación</th><td>${$$(r.ajuste, 2)}</td></tr>` : ''}
      ${numIn(p.anticipo) ? `<tr><th>Amortización anticipo (${pct(p.anticipo)})</th><td>− ${$$(r.amort, 2)}</td></tr>` : ''}
      ${numIn(p.fondoReparo) ? `<tr><th>Fondo de reparo (${pct(p.fondoReparo)})</th><td>− ${$$(r.fr, 2)}</td></tr>` : ''}
      <tr><th>TOTAL A PAGAR</th><td><b>${$$(r.pagar, 2)}</b></td></tr><tr><th>Avance acumulado</th><td>${pct(r.avanceAcum)}</td></tr></table>
      ${c.obs ? `<p><b>Observaciones:</b> ${esc(c.obs)}</p>` : ''}
      <div class="sigs"><div class="sig">${dt.firma ? `<img src="${dt.firma}">` : '<div class="sig-blank"></div>'}<span>Dirección técnica</span></div><div class="sig"><div class="sig-blank"></div><span>Contratista</span></div></div></section>`;
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 60);
  };

  /* ---- Exportación a Excel (la llama exportXlsx) ---- */
  window.econXlsx = (o, add) => {
    const p = E.ensure(o); if (!p.items.length) return;
    add('Presupuesto', [['Capítulo', 'Rubro', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario', 'Subtotal costo directo', 'Total con K'],
      ...p.items.map((it) => [S.capName(E.capOf(o, it)), it.rid ? S.rubro(o, it.rid)?.t : '', it.desc, it.u, numIn(it.cant), numIn(it.pu), E.itemCD(it), E.itemTotal(p, it)]),
      [], ['', '', 'Costo directo', '', '', '', E.totals(o).cd], ['', '', 'Coeficiente K', '', '', '', E.K(p)], ['', '', 'TOTAL', '', '', '', E.totals(o).total]], [20, 30, 36, 8, 10, 14, 18, 18]);
    const cs = E.sortedCerts(o);
    if (cs.length) add('Certificados', [['Nº', 'Período', 'Fecha', 'Estado', 'Índice', 'Monto período', 'Redeterminación', 'Amortización', 'Fondo de reparo', 'A pagar', 'Avance acumulado %'],
      ...cs.map((c) => { const r = E.calcCert(o, c); return [c.numero, c.periodo, c.fecha, c.estado, numIn(c.indice), Math.round(r.base), Math.round(r.ajuste), Math.round(r.amort), Math.round(r.fr), Math.round(r.pagar), Math.round(r.avanceAcum * 10) / 10]; })], [5, 10, 12, 10, 9, 15, 15, 13, 14, 15, 12]);
  };

  /* ---- Tarjeta para el panel ---- */
  V._econCard = (o) => {
    const p = o.presupuesto; if (!p || !p.items.length) return '';
    const t = E.totals(o); const cert = E.certificadoAcum(o); const fis = E.fisicoPonderado(o);
    const diff = cert.pct - fis;
    return `<section class="card"><div class="card-h"><h3>Avance físico vs. económico</h3><a class="link" href="#/o/${o.id}/certificados">Certificados ${I('chevron')}</a></div>
      <div class="fe"><div><small>Presupuesto</small><b>${$$(t.total)}</b></div><div><small>Certificado</small><b>${$$(cert.monto)}</b></div><div><small>Saldo de obra</small><b>${$$(Math.max(0, t.total - cert.monto))}</b></div></div>
      <div class="capbar"><span class="capn" title="Avance de las planillas ponderado por el monto de cada ítem">Avance físico verificado</span>${U.bar(fis)}<b>${Math.round(fis)}%</b></div>
      <div class="capbar"><span class="capn">Avance certificado</span>${U.bar(cert.pct, 'time')}<b>${Math.round(cert.pct)}%</b></div>
      ${Math.abs(diff) >= 5 ? `<p class="adv ${diff > 0 ? 'adv-warn' : 'adv-ok'}">${diff > 0 ? `Se certificó ${Math.round(diff)} puntos por encima del avance físico verificado.` : `Hay ${Math.round(-diff)} puntos de avance verificado sin certificar.`}</p>` : ''}
    </section>`;
  };

  /* ---- Datos de ejemplo para la obra de demostración ---- */
  window.demoEconomia = (o) => {
    const P = { r1: ['gl', 1, 2800000], r2: ['m²', 142, 6500], r3: ['m³', 18, 38000], r4: ['ml', 35, 14000], r5: ['u', 3, 95000], r8: ['m³', 14, 210000], r14: ['m³', 4.5, 980000], r15: ['m³', 4, 1050000], r18: ['m³', 2.2, 1150000], r20: ['ml', 95, 12500], r21: ['m²', 40, 15000], r22: ['m²', 60, 52000], r27: ['m²', 220, 38000], r36: ['m²', 150, 115000], r37: ['m³', 9, 260000], r38: ['m²', 210, 22000], r39: ['m²', 210, 14000], r40: ['m²', 420, 18000], r41: ['m²', 420, 12000], r42: ['m²', 150, 48000], r44: ['m²', 130, 21000], r45: ['m²', 142, 19000], r47: ['m²', 135, 42000], r51: ['m²', 45, 46000], r53: ['u', 8, 160000], r54: ['u', 7, 420000], r56: ['gl', 1, 19000000], r57: ['gl', 1, 1200000] };
    const p = E.ensure(o);
    Object.assign(p, { gg: 12, beneficio: 10, iva: 0, anticipo: 10, fondoReparo: 5, redeterminar: true, indiceBase: 100, mesBase: o.datos.fechaInicio.slice(0, 7) });
    p.items = S.active(o).filter((r) => P[r.id]).map((r) => ({ id: U.uid(), rid: r.id, desc: r.t, u: P[r.id][0], cant: P[r.id][1], pu: P[r.id][2] }));
    o.certificados = [];
    const [y0, m0] = o.datos.fechaInicio.split('-').map(Number); const hoy = U.today();
    for (let k = 0; k < 6; k++) {
      const d = new Date(y0, m0 - 1 + k, 1); const per = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthEnd(per) >= hoy) break;
      const c = { id: U.uid(), numero: k + 1, periodo: per, fecha: U.addDays(monthEnd(per), 5), indice: Math.round(100 * Math.pow(1.028, k + 1) * 10) / 10, acum: {}, estado: 'pagado' };
      o.certificados.push(c); V.certificados.fill(o, c);
    }
    const last = o.certificados[o.certificados.length - 1]; if (last) last.estado = 'emitido';
  };
})();
