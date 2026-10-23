/* ===== Almacenamiento local (IndexedDB) y modelo de datos ===== */
(function () {
  const T = window.LO_TEMPLATE;
  const S = {};
  let dbp = null;

  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open('libro-de-obra', 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('obras')) d.createObjectStore('obras', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('fotos')) { const s = d.createObjectStore('fotos', { keyPath: 'id' }); s.createIndex('obraId', 'obraId'); }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  const tx = async (store, mode, fn) => {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(store, mode); const s = t.objectStore(store);
      const r = fn(s);
      t.oncomplete = () => resolve(r && 'result' in r ? r.result : r);
      t.onerror = () => reject(t.error);
    });
  };

  S.listObras = () => tx('obras', 'readonly', (s) => s.getAll());
  S.getObra = (id) => tx('obras', 'readonly', (s) => s.get(id));
  S.putObra = (o) => { o.updatedAt = new Date().toISOString(); return tx('obras', 'readwrite', (s) => s.put(o)); };
  S.deleteObra = async (id) => {
    const fotos = await S.listFotos(id);
    await tx('fotos', 'readwrite', (s) => fotos.forEach((f) => s.delete(f.id)));
    return tx('obras', 'readwrite', (s) => s.delete(id));
  };
  S.listFotos = (obraId) => tx('fotos', 'readonly', (s) => s.index('obraId').getAll(obraId));
  S.getFoto = (id) => tx('fotos', 'readonly', (s) => s.get(id));
  S.putFoto = (f) => tx('fotos', 'readwrite', (s) => s.put(f));
  S.deleteFoto = (id) => tx('fotos', 'readwrite', (s) => s.delete(id));

  /* ---- Obra actual con guardado automático ---- */
  S.current = null;
  const saveNow = async () => { if (S.current) { await S.putObra(S.current); flash(); } };
  const flash = () => { const el = document.getElementById('save-state'); if (el) { el.textContent = 'Guardado'; el.classList.add('on'); clearTimeout(flash.t); flash.t = setTimeout(() => el.classList.remove('on'), 1200); } };
  S.save = U.debounce(saveNow, 350);
  S.saveNow = saveNow;

  /* ---- Nueva obra ---- */
  S.newObra = (nombre = 'Nueva obra') => ({
    id: U.uid(), createdAt: new Date().toISOString(), nombre, color: '#1f4e79', portada: null,
    datos: { provincia: 'Córdoba', ciudad: '', fechaInicio: U.today(), plazoDias: 240 },
    actores: { comitente: {}, proyectista: {}, director: {}, representante: {}, administrador: {} },
    manoObra: [
      { id: U.uid(), rubro: 'Constructor' }, { id: U.uid(), rubro: 'Sanitarista' }, { id: U.uid(), rubro: 'Electricista' }, { id: U.uid(), rubro: 'Pintor' }
    ],
    previas: {}, rubros: T.rubros.map((r) => r.id), custom: [], plan: {}, items: {}, tablas: {},
    bitacora: [], ordenes: [], actas: { inicio: {}, provisoria: {}, definitiva: {} }
  });

  /* ---- Rubros / ítems ---- */
  S.allRubros = (o) => T.rubros.concat(o.custom || []);
  S.rubro = (o, rid) => S.allRubros(o).find((r) => r.id === rid);
  S.active = (o) => S.allRubros(o).filter((r) => o.rubros.includes(r.id)).sort((a, b) => a.cap - b.cap || codeCmp(a.code, b.code));
  const codeCmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  S.capName = (c) => T.caps[c] || 'Otros';
  S.key = (rid, si, ii) => `${rid}|${si}|${ii}`;
  S.item = (o, k) => o.items[k] || (o.items[k] = {});

  S.ESTADOS = {
    '': { label: 'Pendiente', short: '—', cls: 'st-pend' },
    proc: { label: 'En proceso', short: '◐', cls: 'st-proc' },
    ok: { label: 'Conforme', short: '✓', cls: 'st-ok' },
    obs: { label: 'Observado', short: '!', cls: 'st-obs' },
    na: { label: 'No aplica', short: 'N/A', cls: 'st-na' }
  };

  S.rubroStats = (o, r) => {
    const st = { total: 0, ok: 0, obs: 0, proc: 0, na: 0, pend: 0, last: null };
    r.secs.forEach((s, si) => s.items.forEach((it, ii) => {
      st.total++;
      const v = o.items[S.key(r.id, si, ii)];
      const e = v && v.estado;
      if (e === 'ok') st.ok++; else if (e === 'obs') st.obs++; else if (e === 'proc') st.proc++; else if (e === 'na') st.na++; else st.pend++;
      if (v && v.fecha && (!st.last || v.fecha > st.last)) st.last = v.fecha;
    }));
    const base = st.total - st.na;
    st.pct = base > 0 ? (st.ok / base) * 100 : (st.total ? 100 : 0);
    return st;
  };
  S.obraStats = (o) => {
    const rs = S.active(o); let total = 0, ok = 0, obs = 0, proc = 0, na = 0;
    const caps = {};
    rs.forEach((r) => {
      const st = S.rubroStats(o, r);
      total += st.total; ok += st.ok; obs += st.obs; proc += st.proc; na += st.na;
      const c = caps[r.cap] || (caps[r.cap] = { cap: r.cap, total: 0, ok: 0, na: 0, obs: 0 });
      c.total += st.total; c.ok += st.ok; c.na += st.na; c.obs += st.obs;
    });
    Object.values(caps).forEach((c) => { c.pct = c.total - c.na > 0 ? c.ok / (c.total - c.na) * 100 : 100; });
    const pct = total - na > 0 ? ok / (total - na) * 100 : 0;
    return { total, ok, obs, proc, na, pct, caps: Object.values(caps).sort((a, b) => a.cap - b.cap) };
  };
  S.previasList = () => {
    const out = [];
    T.previas.forEach((p, i) => { out.push({ k: 'p' + i, t: p.t, lvl: 0 }); p.sub.forEach((s, j) => out.push({ k: `p${i}.${j}`, t: s, lvl: 1 })); });
    return out;
  };

  /* ---- Curva de avance plan vs real ---- */
  S.sCurve = (o) => {
    const rs = S.active(o).filter((r) => o.plan[r.id] && o.plan[r.id].ini && o.plan[r.id].fin);
    if (!rs.length) return [];
    const totals = rs.map((r) => S.rubroStats(o, r));
    const totalItems = totals.reduce((a, s) => a + s.total - s.na, 0) || 1;
    const t0 = Math.min(...rs.map((r) => +U.parseDate(o.plan[r.id].ini)));
    const t1 = Math.max(...rs.map((r) => +U.parseDate(o.plan[r.id].fin)));
    const step = Math.max(86400000, Math.round((t1 - t0) / 60));
    const plan = [], real = [];
    const done = [];
    rs.forEach((r) => r.secs.forEach((s, si) => s.items.forEach((it, ii) => { const v = o.items[S.key(r.id, si, ii)]; if (v && v.estado === 'ok' && v.fecha) done.push(+U.parseDate(v.fecha)); })));
    done.sort((a, b) => a - b);
    const now = Date.now();
    for (let t = t0; t <= t1 + step / 2; t += step) {
      let p = 0;
      rs.forEach((r, i) => {
        const a = +U.parseDate(o.plan[r.id].ini), b = +U.parseDate(o.plan[r.id].fin) + 86400000;
        const f = Math.max(0, Math.min(1, (t - a) / Math.max(1, b - a)));
        p += f * (totals[i].total - totals[i].na);
      });
      plan.push({ x: t, y: (p / totalItems) * 100 });
      if (t <= now + step) real.push({ x: Math.min(t, now), y: (done.filter((d) => d <= t).length / totalItems) * 100 });
    }
    return [{ name: 'Planificado', color: 'var(--primary)', points: plan, dash: true }, { name: 'Real (ítems conformes)', color: 'var(--accent)', points: real, fill: true }];
  };

  /* ---- Planificación automática ---- */
  const DUR = { 1: 10, 2: 4, 3: 8, 4: 25, 5: 30, 6: 6, 7: 20, 8: 25, 9: 12, 10: 12, 11: 10, 12: 18, 13: 12, 14: 10, 15: 30, 16: 5 };
  const START_OFF = { 1: 0, 2: 8, 3: 11, 4: 17, 5: 40, 6: 38, 7: 62, 8: 85, 9: 82, 10: 105, 11: 100, 12: 115, 13: 118, 14: 125, 15: 70, 16: 140 };
  S.autoPlan = (o) => {
    const ini = o.datos.fechaInicio || U.today();
    const total = Number(o.datos.plazoDias) || 150;
    const k = total / 150;
    const byCap = {};
    S.active(o).forEach((r) => (byCap[r.cap] = byCap[r.cap] || []).push(r));
    Object.entries(byCap).forEach(([cap, rs]) => {
      const off = Math.round((START_OFF[cap] ?? 0) * k), dur = Math.max(2, Math.round((DUR[cap] || 10) * k));
      const each = Math.max(2, Math.round(dur / Math.min(rs.length, 3)));
      rs.forEach((r, i) => { const a = U.addDays(ini, off + Math.round(i * each * 0.5)); o.plan[r.id] = { ini: a, fin: U.addDays(a, each) }; });
    });
  };

  /* ---- Alertas ---- */
  S.alerts = (o) => {
    const out = []; const hoy = U.today();
    (o.manoObra || []).forEach((m) => {
      if (!m.nombre || !m.artVto) return;
      const d = U.daysBetween(hoy, m.artVto);
      if (d < 0) out.push({ lvl: 'bad', icon: 'shield', t: `ART vencida: ${m.nombre} (${m.rubro || 'personal'})`, s: `Venció el ${U.fmtDate(m.artVto)}. No debe ingresar a obra.`, go: 'actores' });
      else if (d <= 15) out.push({ lvl: 'warn', icon: 'shield', t: `ART por vencer: ${m.nombre}`, s: `Vence en ${d} días (${U.fmtDate(m.artVto)}).`, go: 'actores' });
    });
    S.active(o).forEach((r) => {
      const st = S.rubroStats(o, r); const p = o.plan[r.id];
      if (st.obs) out.push({ lvl: 'warn', icon: 'alert', t: `${st.obs} observación${st.obs > 1 ? 'es' : ''} en ${r.t}`, s: `${r.code} · ${S.capName(r.cap)}`, go: 'rubro/' + r.id });
      if (p && p.fin && p.fin < hoy && st.pct < 100) out.push({ lvl: 'bad', icon: 'clock', t: `Atraso: ${r.t}`, s: `Fin previsto ${U.fmtDate(p.fin)} · avance ${Math.round(st.pct)}%`, go: 'gantt' });
    });
    (o.ordenes || []).filter((x) => x.estado !== 'cumplida' && x.plazo && x.plazo < hoy).forEach((x) => out.push({ lvl: 'bad', icon: 'order', t: `${x.tipo === 'OS' ? 'Orden de servicio' : 'Nota de pedido'} Nº ${x.numero} vencida`, s: x.asunto || '', go: 'ordenes' }));
    const pend = (o.ordenes || []).filter((x) => x.estado !== 'cumplida').length;
    if (pend) out.push({ lvl: 'info', icon: 'order', t: `${pend} orden${pend > 1 ? 'es/notas' : '/nota'} sin cumplir`, s: 'Revisá el registro de órdenes de servicio y notas de pedido.', go: 'ordenes' });
    const order = { bad: 0, warn: 1, info: 2 };
    return out.sort((a, b) => order[a.lvl] - order[b.lvl]);
  };

  /* ---- Clima (Open-Meteo, sin API key) ---- */
  const wcache = {};
  S.WMO = (c) => {
    if (c === 0) return ['☀️', 'Despejado'];
    if (c <= 2) return ['🌤️', 'Parcialmente nublado'];
    if (c === 3) return ['☁️', 'Nublado'];
    if (c <= 48) return ['🌫️', 'Niebla'];
    if (c <= 57) return ['🌦️', 'Llovizna'];
    if (c <= 67) return ['🌧️', 'Lluvia'];
    if (c <= 77) return ['🌨️', 'Nieve'];
    if (c <= 82) return ['🌧️', 'Chaparrones'];
    if (c <= 86) return ['🌨️', 'Nevadas'];
    return ['⛈️', 'Tormenta'];
  };
  S.geocode = async (o) => {
    if (o.datos.lat && o.datos.lon) return { lat: o.datos.lat, lon: o.datos.lon };
    const q = o.datos.ciudad; if (!q) throw new Error('Cargá la ciudad de la obra en "Datos de la obra".');
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=es&format=json`);
    const j = await r.json();
    const res = (j.results || []).find((x) => x.country_code === 'AR') || (j.results || [])[0];
    if (!res) throw new Error('No se encontró la ciudad "' + q + '".');
    o.datos.lat = +res.latitude.toFixed(4); o.datos.lon = +res.longitude.toFixed(4); S.save();
    return { lat: o.datos.lat, lon: o.datos.lon };
  };
  S.forecast = async (o) => {
    const { lat, lon } = await S.geocode(o);
    const k = `f${lat},${lon}`;
    if (wcache[k] && Date.now() - wcache[k].t < 30 * 60000) return wcache[k].d;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`);
    const j = await r.json(); if (!j.daily) throw new Error('Servicio de clima no disponible');
    const d = j.daily.time.map((t, i) => ({ fecha: t, code: j.daily.weather_code[i], tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i], lluvia: j.daily.precipitation_sum[i], prob: j.daily.precipitation_probability_max[i], viento: j.daily.wind_speed_10m_max[i] }));
    wcache[k] = { t: Date.now(), d }; return d;
  };
  S.weatherOn = async (o, fecha) => {
    const { lat, lon } = await S.geocode(o);
    const diff = U.daysBetween(U.today(), fecha);
    const base = diff < -80 ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
    const r = await fetch(`${base}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&start_date=${fecha}&end_date=${fecha}`);
    const j = await r.json(); if (!j.daily) throw new Error('Sin datos de clima para esa fecha');
    return { code: j.daily.weather_code[0], tmax: j.daily.temperature_2m_max[0], tmin: j.daily.temperature_2m_min[0], lluvia: j.daily.precipitation_sum[0], viento: j.daily.wind_speed_10m_max[0] };
  };
  S.weatherAdvice = (d) => {
    const a = [];
    if (d.tmin != null && d.tmin <= 5) a.push({ lvl: 'bad', t: 'Riesgo de helada: no hormigonar sin protección; cubrir elementos frescos.' });
    if ((d.prob != null && d.prob >= 60) || d.lluvia >= 5) a.push({ lvl: 'warn', t: 'Lluvia probable: reprogramar hormigonados y revoques exteriores, proteger acopios.' });
    if (d.tmax >= 32) a.push({ lvl: 'warn', t: 'Calor intenso: curado húmedo intensivo, hormigonar a primera hora.' });
    if (d.viento >= 40) a.push({ lvl: 'warn', t: 'Viento fuerte: revisar andamios y suspender trabajos en altura.' });
    if (!a.length) a.push({ lvl: 'ok', t: 'Condiciones favorables para trabajos exteriores.' });
    return a;
  };

  /* ---- Respaldo ---- */
  S.exportObra = async (o) => ({ app: 'libro-de-obra', version: 1, exportedAt: new Date().toISOString(), obra: o, fotos: await S.listFotos(o.id) });
  S.importData = async (data) => {
    if (!data || data.app !== 'libro-de-obra' || !data.obra) throw new Error('Archivo no válido');
    const o = data.obra; const exists = await S.getObra(o.id);
    const fotos = data.fotos || [];
    if (exists) {
      o.id = U.uid(); o.nombre += ' (copia)';
      fotos.forEach((f) => { const nid = U.uid(); if (o.portada === f.id) o.portada = nid; f.id = nid; });
    }
    await S.putObra(o);
    for (const f of fotos) { f.obraId = o.id; await S.putFoto(f); }
    return o;
  };

  window.S = S;
})();
