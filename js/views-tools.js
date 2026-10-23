/* ===== Vistas: imprimir/exportar, calculadoras, acerca + motor de impresión ===== */
(function () {
  const V = window.VIEWS = window.VIEWS || {};
  const esc = U.esc, I = U.icon, C = window.APP_CONFIG;
  const pageH = (...a) => V._pageH(...a);

  const SECCIONES = [
    ['caratula', 'Carátula'], ['datos', 'Datos de la obra'], ['actores', 'Actores intervinientes y mano de obra'], ['previas', 'Tareas previas de proyecto'],
    ['inicio', 'Acta de inicio de obra'], ['planillas', 'Planillas de control'], ['bitacora', 'Bitácora diaria'], ['ordenes', 'Órdenes de servicio y notas de pedido'],
    ['fotos', 'Registro fotográfico'], ['provisoria', 'Acta de recepción provisoria'], ['definitiva', 'Acta de recepción definitiva']
  ];

  /* ================= IMPRIMIR / EXPORTAR ================= */
  V.exportar = {
    sel: null,
    render(o) {
      this.sel = this.sel || Object.fromEntries(SECCIONES.map(([k]) => [k, !['fotos', 'definitiva'].includes(k)]));
      return pageH('Imprimir y exportar', 'Generá el Libro de Obra completo en PDF, exportá a Excel o guardá un respaldo.') + `
        <div class="grid2">
          <section class="card"><div class="card-h"><h3>${I('print')} Libro de Obra (PDF / impresión)</h3></div>
            <p class="muted small">Elegí las secciones. En el diálogo de impresión podés elegir “Guardar como PDF”.</p>
            <div class="checks">${SECCIONES.map(([k, l]) => `<label class="ck"><input type="checkbox" data-sec="${k}" ${this.sel[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
            <label class="ck"><input type="checkbox" id="onlyFilled" checked><span>En planillas, incluir solo ítems con registro</span></label>
            <button class="btn primary" data-act="print">${I('print')} Generar libro</button>
          </section>
          <section class="card"><div class="card-h"><h3>${I('download')} Exportar datos</h3></div>
            <div class="exp-list">
              <button class="exp" data-act="xlsx">${I('file')}<div><b>Planilla Excel (.xlsx)</b><small>Datos, actores, planillas de control, bitácora y órdenes en hojas separadas.</small></div></button>
              <button class="exp" data-act="json">${I('download')}<div><b>Respaldo completo (.json)</b><small>Incluye fotos. Sirve para pasar la obra a otro dispositivo o compartirla.</small></div></button>
              <label class="exp">${I('upload')}<div><b>Importar respaldo</b><small>Abre una obra exportada desde otro dispositivo.</small></div><input type="file" accept=".json" data-act="importFile" hidden></label>
            </div>
            <p class="muted xs">Los datos se guardan en este navegador. Exportá un respaldo periódicamente.</p>
          </section>
        </div>`;
    },
    onChange(el) { if (el.dataset.sec) this.sel[el.dataset.sec] = el.checked; },
    actions: {
      print: (el, o) => window.printBook(o, { sections: V.exportar.sel, onlyFilled: document.getElementById('onlyFilled').checked }),
      json: async (el, o) => { const data = await S.exportObra(o); U.download(`libro-de-obra_${U.slug(o.nombre)}_${U.today()}.json`, JSON.stringify(data)); U.toast('Respaldo descargado'); },
      xlsx: (el, o) => exportXlsx(o)
    }
  };

  function exportXlsx(o) {
    if (!window.XLSX) return U.toast('La librería de Excel aún se está cargando', 'bad');
    const wb = XLSX.utils.book_new(); const d = o.datos;
    const add = (name, rows, widths) => { const ws = XLSX.utils.aoa_to_sheet(rows); if (widths) ws['!cols'] = widths.map((w) => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, name); };
    add('Datos', [['DATOS DE LA OBRA', ''], ['Obra', o.nombre], ['Domicilio', d.domicilio], ['Barrio', d.barrio], ['Ciudad', d.ciudad], ['Provincia', d.provincia],
      ['Nomenclatura (C-S-M-P)', [d.catC, d.catS, d.catM, d.catP].filter(Boolean).join('-')], ['Mz. Of.', d.mzOf], ['Lote Of.', d.loteOf], ['Tipo de obra', d.tipoObra], ['Superficie m²', d.superficie],
      ['Tipo de administración', d.tipoAdmin], ['Empresa', d.empresa], ['Exp. Colegio de Arquitectos', d.expColegio], ['Fecha', d.fechaColegio], ['Exp. Municipal', d.expMunicipal], ['Fecha', d.fechaMunicipal],
      ['Fecha de inicio', d.fechaInicio], ['Plazo (días)', d.plazoDias], ['Avance (%)', Math.round(S.obraStats(o).pct)]], [32, 50]);
    add('Actores', [['Rol', 'Nombre', 'DNI', 'M.P.', 'Domicilio', 'Teléfono', 'Observaciones'], ...V.ROLES.map(([k, l]) => { const a = o.actores[k] || {}; return [l, a.nombre, a.dni, a.mp, a.dom, a.tel, a.obs]; })], [22, 28, 14, 10, 30, 16, 30]);
    add('Mano de obra', [['Nombre', 'DNI', 'Carácter', 'Domicilio/Teléfono', 'Inscripción', 'ART', 'Vencimiento ART'], ...o.manoObra.map((m) => [m.nombre, m.dni, m.rubro, m.tel, m.inscripcion, m.art, m.artVto])], [26, 14, 16, 26, 16, 22, 16]);
    add('Tareas previas', [['Tarea', 'Estado', 'Fecha', 'Conformidad', 'Observaciones'], ...S.previasList().map((p) => { const v = o.previas[p.k] || {}; return [(p.lvl ? '   ' : '') + p.t, S.ESTADOS[v.estado || ''].label, v.fecha, v.conformidad, v.obs]; })], [46, 14, 12, 18, 40]);
    const rows = [['Capítulo', 'Código', 'Rubro', 'Sección', 'Tarea', 'Valor', 'Fecha', 'Estado', 'S/Plano', 'Seguridad', 'Observaciones']];
    const res = [['Capítulo', 'Código', 'Rubro', 'Ítems', 'Conformes', 'Observados', 'N/A', 'Avance %', 'Inicio previsto', 'Fin previsto']];
    S.active(o).forEach((r) => {
      r.secs.forEach((s, si) => s.items.forEach((it, ii) => { const v = o.items[S.key(r.id, si, ii)] || {}; rows.push([S.capName(r.cap), r.code, r.t, s.t, it.t, v.val, v.fecha, S.ESTADOS[v.estado || ''].label, v.plano ? 'Sí' : '', v.seg ? 'Sí' : '', v.obs]); }));
      const st = S.rubroStats(o, r); const p = o.plan[r.id] || {};
      res.push([S.capName(r.cap), r.code, r.t, st.total, st.ok, st.obs, st.na, Math.round(st.pct), p.ini, p.fin]);
    });
    add('Resumen rubros', res, [22, 9, 40, 7, 10, 10, 6, 9, 14, 14]);
    add('Planillas', rows, [20, 9, 32, 22, 50, 14, 12, 12, 8, 9, 40]);
    add('Bitácora', [['Fecha', 'Clima', 'Máx °C', 'Mín °C', 'Lluvia mm', 'Personal', 'Rubros', 'Novedades'], ...o.bitacora.map((b) => [b.fecha, b.clima?.code != null ? S.WMO(b.clima.code)[1] : '', b.clima?.tmax, b.clima?.tmin, b.clima?.lluvia, b.personal, (b.rubros || []).map((id) => S.rubro(o, id)?.t).join(', '), b.texto])], [12, 18, 8, 8, 9, 9, 30, 70]);
    add('Órdenes y notas', [['Tipo', 'Nº', 'Fecha', 'Asunto', 'Texto', 'Emisor', 'Plazo', 'Estado', 'Respuesta'], ...o.ordenes.map((x) => [V.TIPOS[x.tipo].l, x.numero, x.fecha, x.asunto, x.texto, x.emisor, x.plazo, x.estado, x.respuesta])], [18, 5, 12, 30, 60, 18, 12, 11, 30]);
    if (window.econXlsx) window.econXlsx(o, add);
    XLSX.writeFile(wb, `libro-de-obra_${U.slug(o.nombre)}.xlsx`);
    U.toast('Excel generado');
  }

  /* ================= MOTOR DE IMPRESIÓN ================= */
  window.printBook = async function (o, opts = {}) {
    const root = document.getElementById('print-root');
    const d = o.datos, ac = o.actores; const fotos = await S.listFotos(o.id);
    const head = (t) => `<header class="p-head"><span>LIBRO DE OBRA · ${esc(o.nombre)}</span><span>${esc([d.domicilio, d.ciudad].filter(Boolean).join(', '))}</span></header><h2 class="p-title">${t}</h2>`;
    const estado = (e) => (e ? `<span class="pst ${S.ESTADOS[e].cls}">${S.ESTADOS[e].label}</span>` : '');
    const planilla = (r, onlyFilled) => {
      const st = S.rubroStats(o, r);
      const body = r.secs.map((s, si) => {
        const rows = s.items.map((it, ii) => { const v = o.items[S.key(r.id, si, ii)] || {}; if (onlyFilled && !v.estado && !v.obs && !v.val) return ''; return `<tr><td>${ii + 1}</td><td>${esc(it.t)}${v.val ? ` <b>[${esc(v.val)}]</b>` : ''}</td><td>${v.fecha ? U.fmtDate(v.fecha) : ''}</td><td>${estado(v.estado)}</td><td class="c">${v.plano ? '✓' : ''}</td><td class="c">${v.seg ? '✓' : ''}</td><td>${esc(v.obs || '')}</td></tr>`; }).join('');
        return rows ? `${s.t ? `<tr class="sec"><td colspan="7">${esc(s.t)}</td></tr>` : ''}${rows}` : '';
      }).join('');
      const tabla = r.table && (o.tablas[r.id] || []).length ? `<table class="p-t small"><thead><tr>${r.table.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${o.tablas[r.id].map((row) => `<tr>${r.table.cols.map((c, j) => `<td>${esc(row[j] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
      const fs = fotos.filter((f) => f.rubro === r.id).slice(0, 6);
      if (!body && !tabla && onlyFilled) return '';
      return `<section class="p-rubro"><h3>${esc(r.code)} · ${esc(r.t)} <small>${S.capName(r.cap)} — avance ${Math.round(st.pct)}%</small></h3>${tabla}
        <table class="p-t"><thead><tr><th>Nº</th><th>Tarea</th><th>Fecha</th><th>Estado</th><th>S/Plano</th><th>Seg.</th><th>Observaciones</th></tr></thead><tbody>${body || '<tr><td colspan="7" class="c">Sin registros</td></tr>'}</tbody></table>
        ${fs.length ? `<div class="p-fotos">${fs.map((f) => `<figure><img src="${f.data}"><figcaption>${esc(f.caption || '')} · ${U.fmtDate(f.fecha)}</figcaption></figure>`).join('')}</div>` : ''}</section>`;
    };
    const acta = (t) => `<section class="page">${head(V.ACTAS[t])}<div class="p-acta">${V.actaText(o, t)}</div><div class="sigs">${V.actaSigs(o, t)}</div></section>`;
    const orden = (x) => { const t = V.TIPOS[x.tipo]; return `<div class="p-orden"><div class="p-on"><b>${t.l} Nº ${String(x.numero).padStart(3, '0')}</b><span>${U.fmtDate(x.fecha)}</span></div><p><b>De:</b> ${esc(x.emisor || t.de)} · <b>Para:</b> ${t.a}${x.plazo ? ` · <b>Plazo:</b> ${U.fmtDate(x.plazo)}` : ''} · <b>Estado:</b> ${x.estado === 'cumplida' ? 'Cumplida' : 'Pendiente'}</p><p><b>Asunto:</b> ${esc(x.asunto)}</p><p>${esc(x.texto || '').replace(/\n/g, '<br>')}</p>${x.respuesta ? `<p><b>Respuesta:</b> ${esc(x.respuesta)}</p>` : ''}<div class="sigs">${['firmaE', 'firmaN'].map((k, i) => `<div class="sig">${x[k] ? `<img src="${x[k]}">` : '<div class="sig-blank"></div>'}<span>${i ? 'Notificado' : 'Emisor'}</span></div>`).join('')}</div></div>`; };

    let html = '';
    if (opts.only) html = `<section>${head('Planilla de control')}${planilla(S.rubro(o, opts.only), false)}</section>`;
    else if (opts.acta) html = acta(opts.acta);
    else if (opts.orden) html = `<section>${head('Registro de comunicaciones')}${orden(o.ordenes.find((x) => x.id === opts.orden))}</section>`;
    else {
      const s = opts.sections || {}; const st = S.obraStats(o);
      if (s.caratula) html += `<section class="page p-cover"><div class="pc-frame"><img src="assets/icon.svg" width="80" alt=""><p class="pc-k">LIBRO DE OBRA</p><h1>${esc(o.nombre)}</h1><p>${esc(d.tipoObra || '')}</p><p>${esc([d.domicilio, d.barrio, d.ciudad, d.provincia].filter(Boolean).join(' · '))}</p>
        <table class="p-kv"><tr><th>Comitente</th><td>${esc(ac.comitente?.nombre || '—')}</td></tr><tr><th>Director técnico</th><td>${ac.director?.nombre ? 'Arq. ' + esc(ac.director.nombre) + (ac.director.mp ? ' · M.P. ' + esc(ac.director.mp) : '') : '—'}</td></tr><tr><th>Exp. Colegio de Arquitectos</th><td>${esc(d.expColegio || '—')}</td></tr><tr><th>Exp. Municipal</th><td>${esc(d.expMunicipal || '—')}</td></tr><tr><th>Inicio / plazo</th><td>${U.fmtDate(d.fechaInicio)} · ${esc(d.plazoDias || '—')} días</td></tr><tr><th>Avance al ${U.fmtDate(U.today())}</th><td>${Math.round(st.pct)}%</td></tr></table>
        <p class="pc-foot">Generado con ${esc(C.nombre)} · ${esc(C.institucion)}</p></div></section>`;
      if (s.datos) html += `<section class="page">${head('Datos de la obra')}<table class="p-kv">${[['Domicilio', d.domicilio], ['Barrio', d.barrio], ['Ciudad', d.ciudad], ['Nomenclatura catastral', ['C ' + (d.catC || '…'), 'S ' + (d.catS || '…'), 'M ' + (d.catM || '…'), 'P ' + (d.catP || '…')].join(' - ')], ['Mz. Of. / Lote Of.', `${d.mzOf || '—'} / ${d.loteOf || '—'}`], ['Tipo de obra', d.tipoObra], ['Superficie', d.superficie ? d.superficie + ' m²' : ''], ['Tipo de administración', d.tipoAdmin], ['Empresa', d.empresa], ['Aprobación Colegio de Arquitectos · Expediente Nº', `${d.expColegio || '—'} · Fecha ${U.fmtDate(d.fechaColegio)}`], ['Aprobación municipal · Expediente Nº', `${d.expMunicipal || '—'} · Fecha ${U.fmtDate(d.fechaMunicipal)}`], ['Fecha de inicio', U.fmtDate(d.fechaInicio)], ['Plazo de obra', d.plazoDias ? d.plazoDias + ' días' : '']].map(([k, v]) => `<tr><th>${k}</th><td>${esc(v || '—')}</td></tr>`).join('')}</table></section>`;
      if (s.actores) html += `<section class="page">${head('Actores intervinientes en la obra')}<table class="p-t"><thead><tr><th>Rol</th><th>Nombre</th><th>Documento</th><th>M.P.</th><th>Domicilio</th><th>Firma</th></tr></thead><tbody>${V.ROLES.map(([k, l, tit]) => { const a = ac[k] || {}; return `<tr><td><b>${l}</b></td><td>${a.nombre ? esc(tit + ' ' + a.nombre) : ''}</td><td>${esc(a.dni || '')}</td><td>${esc(a.mp || '')}</td><td>${esc(a.dom || '')}</td><td class="sigc">${a.firma ? `<img src="${a.firma}">` : ''}</td></tr>`; }).join('')}</tbody></table>
        <h3>Mano de obra</h3><table class="p-t"><thead><tr><th>Constructor / personal</th><th>DNI</th><th>Domicilio / teléfono</th><th>Carácter</th><th>Inscripción</th><th>Aseguradora / ART</th><th>Firma</th></tr></thead><tbody>${o.manoObra.map((m) => `<tr><td>${esc(m.nombre ? 'Sr. ' + m.nombre : '')}</td><td>${esc(m.dni || '')}</td><td>${esc(m.tel || '')}</td><td>${esc(m.rubro || '')}</td><td>${esc(m.inscripcion || '')}</td><td>${esc(m.art || '')}${m.artVto ? ' (vto. ' + U.fmtDate(m.artVto) + ')' : ''}</td><td class="sigc"></td></tr>`).join('')}</tbody></table></section>`;
      if (s.previas) html += `<section class="page">${head('Tareas previas de proyecto')}<table class="p-t"><thead><tr><th>Nº</th><th>Tarea</th><th>Estado</th><th>Observaciones</th><th>Conformidad</th><th>Fecha</th></tr></thead><tbody>${S.previasList().map((p) => { const v = o.previas[p.k] || {}; return `<tr><td>${p.lvl ? '' : p.k.slice(1) * 1 + 1}</td><td style="padding-left:${p.lvl ? 18 : 6}px">${esc(p.t)}</td><td>${estado(v.estado)}</td><td>${esc(v.obs || '')}</td><td>${esc(v.conformidad || '')}</td><td>${v.fecha ? U.fmtDate(v.fecha) : ''}</td></tr>`; }).join('')}</tbody></table></section>`;
      if (s.inicio) html += acta('inicio');
      if (s.planillas) {
        const res = S.active(o).map((r) => { const x = S.rubroStats(o, r); return `<tr><td>${esc(r.code)}</td><td>${esc(r.t)}</td><td class="c">${x.ok}/${x.total - x.na}</td><td class="c">${x.obs}</td><td class="c">${Math.round(x.pct)}%</td></tr>`; }).join('');
        html += `<section class="page">${head('Índice de planillas de control')}<table class="p-t"><thead><tr><th>Código</th><th>Rubro</th><th>Conformes</th><th>Obs.</th><th>Avance</th></tr></thead><tbody>${res}</tbody></table></section>`;
        html += `<section class="page-flow">${S.active(o).map((r) => planilla(r, opts.onlyFilled)).join('')}</section>`;
      }
      if (s.bitacora && o.bitacora.length) html += `<section class="page">${head('Bitácora diaria')}<table class="p-t"><thead><tr><th>Fecha</th><th>Clima</th><th>Pers.</th><th>Novedades</th></tr></thead><tbody>${o.bitacora.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map((b) => `<tr><td>${U.fmtDate(b.fecha)}</td><td>${b.clima && b.clima.code != null ? S.WMO(b.clima.code)[1] + (b.clima.tmax != null ? ` ${Math.round(b.clima.tmax)}°/${Math.round(b.clima.tmin)}°` : '') : ''}</td><td class="c">${esc(b.personal || '')}</td><td>${esc(b.texto)}</td></tr>`).join('')}</tbody></table></section>`;
      if (s.ordenes && o.ordenes.length) html += `<section class="page">${head('Órdenes de servicio y notas de pedido')}${o.ordenes.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map(orden).join('')}</section>`;
      if (s.fotos && fotos.length) html += `<section class="page">${head('Registro fotográfico')}<div class="p-fotos big">${fotos.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).map((f) => `<figure><img src="${f.data}"><figcaption>${esc(f.caption || '')} · ${U.fmtDate(f.fecha)}</figcaption></figure>`).join('')}</div></section>`;
      if (s.provisoria) html += acta('provisoria');
      if (s.definitiva) html += acta('definitiva');
    }
    root.innerHTML = html;
    document.body.classList.add('printing');
    const imgs = [...root.querySelectorAll('img')];
    await Promise.all(imgs.map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
    const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 60);
  };

  /* ================= CALCULADORAS ================= */
  const MAMP = {
    comun15: ['Ladrillo común · muro 0,15', 60, 0.03], comun30: ['Ladrillo común · muro 0,30', 120, 0.075],
    cer8: ['Cerámico hueco 8×18×33', 16, 0.01], cer12: ['Cerámico hueco 12×18×33', 16, 0.013], cer18: ['Cerámico hueco 18×18×33', 16, 0.019],
    bloque: ['Bloque de hormigón 19×19×39', 12.5, 0.012], visto: ['Ladrillo visto · muro 0,15', 60, 0.03]
  };
  const DOS = { '1:2:3': 'H-17 aprox. (estructural)', '1:2:2': 'H-21 aprox. (estructural)', '1:3:3': 'H-13 aprox. (contrapisos, bases)', '1:3:5': 'Hormigón pobre / limpieza' };
  const n = (v) => (isFinite(v) ? v : 0);
  const f2 = (v, d = 2) => n(v).toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const CALCS = [
    { id: 'horm', t: 'Hormigón', ic: 'hard', fields: [['l', 'Largo (m)', 4], ['a', 'Ancho (m)', 3], ['e', 'Espesor / alto (m)', 0.12], ['dos', 'Dosaje (cem:arena:piedra)', '1:2:3', DOS], ['desp', 'Desperdicio (%)', 5]],
      calc: (v) => {
        const vol = v.l * v.a * v.e * (1 + v.desp / 100); const [c, ar, p] = v.dos.split(':').map(Number); const sum = c + ar + p;
        const kg = (1.54 / sum) * c * 1400 * vol;
        return [['Volumen', f2(vol), 'm³', 1], ['Cemento', f2(Math.ceil(kg / 50), 0), 'bolsas de 50 kg', 1], ['Arena', f2(1.54 / sum * ar * vol), 'm³'], ['Piedra / granza', f2(1.54 / sum * p * vol), 'm³'], ['Agua (a/c 0,5)', f2(kg * 0.5, 0), 'litros'], ['Pedido hormigón elaborado', f2(Math.ceil(vol * 2) / 2, 1), 'm³ (múltiplo de 0,5)']];
      }, note: 'Método volumétrico con factor de esponjamiento 1,54. Valores orientativos: verificar con el cálculo estructural.' },
    { id: 'mamp', t: 'Mampostería', ic: 'grid', fields: [['l', 'Largo del muro (m)', 10], ['h', 'Alto (m)', 2.7], ['ab', 'Aberturas a descontar (m²)', 3], ['tipo', 'Mampuesto', 'cer18', Object.fromEntries(Object.entries(MAMP).map(([k, v]) => [k, v[0]]))], ['desp', 'Desperdicio (%)', 5]],
      calc: (v) => { const m = MAMP[v.tipo]; const sup = Math.max(0, v.l * v.h - v.ab); const k = 1 + v.desp / 100; return [['Superficie neta', f2(sup), 'm²', 1], ['Mampuestos', f2(Math.ceil(sup * m[1] * k), 0), 'unidades', 1], ['Rendimiento', f2(m[1], 1), 'u/m²'], ['Mortero de asiento', f2(sup * m[2] * k, 3), 'm³']]; },
      note: 'Rendimientos promedio con juntas de 1–1,5 cm. Ajustar según medidas reales del mampuesto.' },
    { id: 'piso', t: 'Pisos y revestimientos', ic: 'grid', fields: [['l', 'Largo del local (m)', 5], ['a', 'Ancho (m)', 4], ['caja', 'm² por caja', 1.8], ['col', 'Colocación', 'recta', { recta: 'Recta (+10%)', diag: 'Diagonal (+15%)', esp: 'Espiga / especial (+20%)' }], ['pl', 'Largo pieza zócalo (cm)', 60]],
      calc: (v) => { const sup = v.l * v.a; const k = { recta: 1.1, diag: 1.15, esp: 1.2 }[v.col]; const per = 2 * (v.l + v.a); return [['Superficie', f2(sup), 'm²', 1], ['Cajas a comprar', f2(Math.ceil(sup * k / v.caja), 0), 'cajas', 1], ['Superficie con desperdicio', f2(sup * k), 'm²'], ['Adhesivo (≈5 kg/m²)', f2(Math.ceil(sup * 5 / 30), 0), 'bolsas de 30 kg'], ['Pastina (≈0,5 kg/m²)', f2(sup * 0.5, 1), 'kg'], ['Zócalos (perímetro ' + f2(per, 1) + ' m)', f2(Math.ceil(per * 1.05 / (v.pl / 100)), 0), 'piezas']]; },
      note: 'No descuenta vanos de puertas en zócalos. Consumo de adhesivo varía con la llana.' },
    { id: 'pint', t: 'Pintura', ic: 'pen', fields: [['s', 'Superficie a pintar (m²)', 80], ['m', 'Manos', 2], ['r', 'Rendimiento (m²/litro por mano)', 10]],
      calc: (v) => { const L = v.s * v.m / v.r; let rest = Math.ceil(L); const latas = []; [20, 10, 4, 1].forEach((t) => { const q = Math.floor(rest / t); if (q) { latas.push(q + '×' + t + ' L'); rest -= q * t; } }); return [['Pintura necesaria', f2(L, 1), 'litros', 1], ['Compra sugerida', latas.join(' + ') || '—', '', 1]]; },
      note: 'Consultar el rendimiento en la ficha técnica del producto.' },
    { id: 'esc', t: 'Escalera (Blondel)', ic: 'gantt', fields: [['H', 'Altura a salvar (cm)', 280], ['a', 'Alzada deseada (cm)', 17.5], ['k', 'Módulo 2a + h (cm)', 63]],
      calc: (v) => { const nA = Math.max(1, Math.round(v.H / v.a)); const a = v.H / nA; const h = v.k - 2 * a; const ok = a >= 15 && a <= 18.5 && h >= 25; return [['Cantidad de alzadas', nA, 'escalones', 1], ['Alzada real', f2(a, 1), 'cm', 1], ['Huella', f2(h, 1), 'cm', 1], ['Huellas (pedadas)', nA - 1, 'u'], ['Desarrollo horizontal', f2((nA - 1) * h / 100, 2), 'm'], ['Verificación', ok ? '✓ Cómoda' : '⚠ Revisar', ok ? 'alzada 15–18,5 cm, huella ≥ 25 cm' : 'fuera de rangos recomendados']]; },
      note: 'Fórmula de Blondel: 2 alzadas + 1 huella = 60 a 65 cm.' },
    { id: 'pend', t: 'Pendientes', ic: 'plan', fields: [['L', 'Longitud horizontal (m)', 6], ['p', 'Pendiente (%)', 2]],
      calc: (v) => [['Desnivel', f2(v.L * v.p, 1), 'cm', 1], ['Ángulo', f2(Math.atan(v.p / 100) * 180 / Math.PI, 2), '°', 1], ['Relación', v.p > 0 ? '1:' + f2(100 / v.p, 1) : '—', ''], ['Longitud inclinada', f2(Math.hypot(v.L, v.L * v.p / 100), 3), 'm']],
      note: 'Referencias orientativas: azoteas 1,5–2 %; cubiertas de chapa ≥ 10 %; verificar cañerías según reglamento local.' },
    { id: 'hier', t: 'Hierros', ic: 'list', fields: [['d', 'Diámetro (mm)', '8', { 6: 'Ø 6', 8: 'Ø 8', 10: 'Ø 10', 12: 'Ø 12', 16: 'Ø 16', 20: 'Ø 20', 25: 'Ø 25' }], ['q', 'Cantidad de piezas', 20], ['L', 'Largo por pieza (m)', 3.5]],
      calc: (v) => { const d = Number(v.d); const kgm = 0.00617 * d * d; const Lt = v.q * v.L; const porBarra = Math.floor(12 / v.L) || 0; return [['Peso total', f2(kgm * Lt, 1), 'kg', 1], ['Barras de 12 m', porBarra ? Math.ceil(v.q / porBarra) : Math.ceil(Lt / 12), 'barras', 1], ['Peso por metro', f2(kgm, 3), 'kg/m'], ['Longitud total', f2(Lt, 1), 'm'], ['Piezas por barra', porBarra || '—', porBarra ? 'u (sin empalmes)' : 'requiere empalmes']]; },
      note: 'Peso = 0,00617 × Ø² (kg/m). No incluye solapes ni ganchos.' }
  ];
  V.calc = {
    state: { c: 'horm' },
    render() {
      const c = CALCS.find((x) => x.id === this.state.c);
      return pageH('Calculadoras de obra', 'Herramientas rápidas para cómputo y verificación en obra.') +
        `<div class="calc-tabs">${CALCS.map((x) => `<button class="ctab ${x.id === c.id ? 'on' : ''}" data-act="calcTab" data-c="${x.id}">${I(x.ic === 'grid' ? 'dash' : x.ic)}<span>${x.t}</span></button>`).join('')}</div>
        <div class="calc-grid"><section class="card"><div class="card-h"><h3>${c.t}</h3></div><div class="fields" id="cf">${c.fields.map(([id, l, def, opts]) => opts
          ? `<label class="fld"><span>${l}</span><select data-c="${id}">${Object.entries(opts).map(([k, t]) => `<option value="${k}" ${String(k) === String(def) ? 'selected' : ''}>${opts === DOS ? k + ' — ' + t : t}</option>`).join('')}</select></label>`
          : `<label class="fld"><span>${l}</span><input type="number" step="any" inputmode="decimal" data-c="${id}" value="${def}"></label>`).join('')}</div><p class="muted xs">${c.note}</p></section>
        <section class="card calc-out" id="co"></section></div>`;
    },
    compute(root) {
      const c = CALCS.find((x) => x.id === this.state.c); const v = {};
      root.querySelectorAll('input[data-c], select[data-c]').forEach((el) => {
        const num = Number(el.value);
        v[el.dataset.c] = (el.tagName === 'SELECT' && isNaN(num)) || el.dataset.c === 'dos' ? el.value : num;
      });
      const out = c.calc(v);
      root.querySelector('#co').innerHTML = `<div class="res">${out.map(([l, val, u, big]) => `<div class="r ${big ? 'big' : ''}"><small>${l}</small><b>${val}</b><span>${u}</span></div>`).join('')}</div>`;
    },
    mount(root) {
      root = root || document.querySelector('.view');
      this.compute(root);
      root.addEventListener('input', (e) => { if (e.target.dataset.c) this.compute(root); });
      root.addEventListener('change', (e) => { if (e.target.dataset.c) this.compute(root); });
    },
    actions: { calcTab: (el) => { V.calc.state.c = el.dataset.c; App.render(); } }
  };

  /* ================= ACERCA ================= */
  V.acerca = {
    render() {
      const steps = [['Relevamiento', 'Análisis del Libro de Obra en Excel utilizado por los estudios de arquitectura: hojas, planillas y circuitos de firma.'], ['Modelado de datos', 'Cada hoja se transformó en datos estructurados: 16 capítulos, más de 50 planillas y más de 1.200 puntos de control.'], ['Diseño UX', 'Pensado para el celular en obra: estados de un toque, fotos con la cámara y uso sin conexión.'], ['Desarrollo', 'Aplicación web progresiva (PWA) en HTML, CSS y JavaScript, con base de datos local IndexedDB.'], ['Integraciones', 'Clima en tiempo real (Open-Meteo), exportación a Excel (SheetJS) y PDF imprimible.'], ['Despliegue', 'Publicado en Netlify con HTTPS: se instala como app en el teléfono.']];
      return `<section class="about-hero"><div class="hero-grid"></div><span class="pill">${I('grad')} ${esc(C.institucion)}</span><h1>Dos carreras,<br><span>un mismo proyecto.</span></h1><p class="lead">El ${esc(C.nombre)} nace del trabajo conjunto entre ${esc(C.carreras.map((c) => c.nombre).join(' y '))}: el conocimiento de la obra se encuentra con la tecnología para resolver un problema real de la práctica profesional.</p></section>
        <div class="careers">${C.carreras.map((c, i) => `<div class="career c${i}"><span class="career-ic">${I(i ? 'code' : 'plan')}</span><h3>${esc(c.nombre)}</h3><p>${esc(c.aporte)}</p></div>`).join('<div class="career-x">×</div>')}</div>
        <h2 class="center">Cómo se construyó</h2>
        <div class="steps">${steps.map(([t, d], i) => `<div class="step"><span>${i + 1}</span><h4>${t}</h4><p>${d}</p></div>`).join('')}</div>
        <h2 class="center">Tecnologías</h2>
        <div class="stack">${['HTML5', 'CSS3', 'JavaScript', 'IndexedDB', 'PWA / offline', 'API Open-Meteo', 'SheetJS', 'Netlify'].map((t) => `<span>${t}</span>`).join('')}</div>
        ${C.equipo && C.equipo.length ? `<h2 class="center">Equipo</h2><div class="team">${C.equipo.map((p) => `<div class="tm"><span class="avatar">${esc(p.nombre.split(' ').map((w) => w[0]).join('').slice(0, 2))}</span><b>${esc(p.nombre)}</b><small>${esc(p.rol)}</small></div>`).join('')}</div>` : ''}
        <div class="about-cta"><a class="btn primary lg" href="#/">${I('hard')} Probar el sistema</a></div>
        <p class="muted xs center">Versión ${esc(C.version)} · Los datos se guardan únicamente en el dispositivo del usuario.</p>`;
    }
  };
})();
