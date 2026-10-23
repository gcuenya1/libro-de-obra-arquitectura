/* ===== Obra de demostración (para presentaciones) ===== */
(function () {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // Ilustración procedural de "foto" de obra según la etapa (0..1)
  function fakePhoto(stage, caption, hue = 205) {
    const c = document.createElement('canvas'); c.width = 960; c.height = 640; const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 420); sky.addColorStop(0, `hsl(${hue},70%,62%)`); sky.addColorStop(1, `hsl(${hue - 10},60%,86%)`);
    g.fillStyle = sky; g.fillRect(0, 0, 960, 640);
    g.fillStyle = 'rgba(255,255,255,.8)'; [[160, 90, 60], [220, 80, 45], [700, 120, 70], [770, 110, 50]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    g.fillStyle = '#8a6a4a'; g.fillRect(0, 470, 960, 170);
    g.fillStyle = '#7a5c3e'; for (let i = 0; i < 90; i++) g.fillRect(rnd() * 960, 470 + rnd() * 170, 6, 3);
    const x0 = 180, w = 600, base = 470;
    if (stage < 0.15) { // replanteo
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([10, 8]);
      g.strokeRect(x0, base + 30, w, 90); g.beginPath(); g.moveTo(x0 + w / 2, base + 30); g.lineTo(x0 + w / 2, base + 120); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#d9c39a'; [x0, x0 + w].forEach((x) => g.fillRect(x - 4, base - 30, 8, 60));
    } else {
      const h = Math.min(1, (stage - 0.15) / 0.5) * 260;
      g.fillStyle = '#9aa0a6'; g.fillRect(x0 - 10, base - 12, w + 20, 14);
      for (let y = 0; y < h; y += 18) for (let x = 0; x < w; x += 46) {
        const off = (y / 18) % 2 ? 23 : 0; g.fillStyle = `hsl(${12 + rnd() * 8},${55 + rnd() * 10}%,${42 + rnd() * 8}%)`;
        g.fillRect(x0 + x + off - (off ? 23 : 0), base - 12 - y - 16, 44, 16);
      }
      g.fillStyle = '#b8bcc0'; [0, w / 2, w - 22].forEach((x) => g.fillRect(x0 + x, base - 12 - h - 10, 22, h + 10));
      if (stage > 0.65) { g.fillStyle = '#c7cbcf'; g.fillRect(x0 - 30, base - 12 - h - 34, w + 60, 26); }
      if (stage > 0.8) { g.fillStyle = '#efe7da'; g.fillRect(x0, base - 12 - h, w, h); g.fillStyle = '#5b7083'; g.fillRect(x0 + 90, base - 200, 120, 90); g.fillRect(x0 + 380, base - 200, 120, 90); g.fillStyle = '#6d4c33'; g.fillRect(x0 + 260, base - 170, 80, 158); }
    }
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 590, 960, 50); g.fillStyle = '#fff'; g.font = '600 22px Archivo, sans-serif'; g.fillText(caption, 24, 622);
    return c.toDataURL('image/jpeg', 0.8);
  }

  window.createDemoObra = async function () {
    seed = 7;
    const hoy = U.today();
    const o = S.newObra('Vivienda unifamiliar · Banda Norte');
    o.color = '#1f4e79';
    o.datos = {
      domicilio: 'Av. Sabattini 2450', barrio: 'Banda Norte', ciudad: 'Río Cuarto', provincia: 'Córdoba',
      catC: '01', catS: '04', catM: '112', catP: '017', mzOf: '23', loteOf: '8',
      tipoObra: 'Vivienda unifamiliar — obra nueva, 142 m²', superficie: 142, tipoAdmin: 'Contrato por ajuste alzado', empresa: 'Construcciones del Sur S.R.L. (ficticia)',
      expColegio: '12345/2026', fechaColegio: U.addDays(hoy, -150), expMunicipal: 'OP-0789/2026', fechaMunicipal: U.addDays(hoy, -135),
      fechaInicio: U.addDays(hoy, -118), plazoDias: 240
    };
    o.actores = {
      comitente: { nombre: 'Martín Pérez', dni: '28.111.222', dom: 'Belgrano 120, Río Cuarto', tel: '358 400-1111' },
      proyectista: { nombre: 'Lucía Fernández', dni: '30.222.333', mp: '1-2345', dom: 'Constitución 845', tel: '358 400-2222' },
      director: { nombre: 'Lucía Fernández', dni: '30.222.333', mp: '1-2345', dom: 'Constitución 845', tel: '358 400-2222' },
      representante: { nombre: 'Tomás Giménez', dni: '33.444.555', mp: '1-6789', dom: 'San Martín 77', tel: '358 400-3333' },
      administrador: { nombre: 'Martín Pérez', dni: '28.111.222' }
    };
    o.manoObra = [
      { id: U.uid(), nombre: 'Ramón Quiroga', dni: '22.333.444', rubro: 'Constructor', tel: '358 411-0001', inscripcion: 'IERIC 55012', art: 'ART Ejemplo S.A.', artVto: U.addDays(hoy, 120) },
      { id: U.uid(), nombre: 'Diego Ledesma', dni: '31.555.666', rubro: 'Sanitarista', tel: '358 411-0002', inscripcion: 'Mat. 3321', art: 'ART Ejemplo S.A.', artVto: U.addDays(hoy, 7) },
      { id: U.uid(), nombre: 'Sergio Arias', dni: '27.666.777', rubro: 'Electricista', tel: '358 411-0003', inscripcion: 'Mat. 1187', art: 'Seguros Demo', artVto: U.addDays(hoy, 200) },
      { id: U.uid(), nombre: 'Hugo Benítez', dni: '25.777.888', rubro: 'Pintor', tel: '358 411-0004', inscripcion: '—', art: 'Seguros Demo', artVto: U.addDays(hoy, -3) }
    ];
    o.rubros = ['r1', 'r2', 'r3', 'r4', 'r5', 'r8', 'r14', 'r15', 'r18', 'r20', 'r21', 'r22', 'r27', 'r36', 'r37', 'r38', 'r39', 'r40', 'r41', 'r42', 'r44', 'r45', 'r47', 'r51', 'r53', 'r54', 'r56', 'r57'];
    S.autoPlan(o);
    o.tablas = {
      r3: [['Z1', '1', '-0.60', '0.40 x 0.60'], ['Z2', '2', '-0.60', '0.40 x 0.60'], ['Z3', '3', '-0.80', '0.60 x 0.80'], ['Z4', '4', '-0.60', '0.40 x 0.60']],
      r4: [['C1', '1', '-0.40', '1:60'], ['P1', '2', '-0.30', '1:100']],
      r5: [['CI-1', '1', '-0.60', '0.60 x 0.60'], ['CS-1', '2', '-1.20', '1.00 x 2.00']]
    };
    // previas
    S.previasList().forEach((p, i) => { o.previas[p.k] = { estado: 'ok', fecha: U.addDays(o.datos.fechaInicio, -40 + i * 2), conformidad: 'L. Fernández' }; });
    o.previas['p5.3'] = { estado: 'na', obs: 'No requerido por el comitente' };
    // ítems según planificación
    const obsTxt = ['Recubrimiento insuficiente en sector norte, corregir antes de hormigonar.', 'Desplome de 1,5 cm detectado, rehacer hiladas.', 'Falta separador en armadura, reponer.', 'Mortero con exceso de agua, ajustar dosaje.'];
    S.active(o).forEach((r) => {
      const p = o.plan[r.id]; if (!p) return;
      const dur = Math.max(1, U.daysBetween(p.ini, p.fin));
      const frac = Math.max(0, Math.min(1, U.daysBetween(p.ini, hoy) / dur));
      const flat = []; r.secs.forEach((s, si) => s.items.forEach((it, ii) => flat.push(S.key(r.id, si, ii))));
      const n = Math.round(flat.length * frac);
      flat.forEach((k, i) => {
        if (i >= n) { if (i === n && frac > 0 && frac < 1) o.items[k] = { estado: 'proc', fecha: hoy }; return; }
        const fecha = U.addDays(p.ini, Math.round((i / flat.length) * dur));
        const x = rnd();
        const canObs = frac < 1 || ['r22', 'r27', 'r14'].includes(r.id);
        if (x < (canObs ? 0.06 : 0) ) o.items[k] = { estado: 'obs', fecha, obs: obsTxt[Math.floor(rnd() * obsTxt.length)], plano: true };
        else if (x < 0.08) o.items[k] = { estado: 'na', fecha };
        else o.items[k] = { estado: 'ok', fecha, plano: rnd() > 0.3, seg: rnd() > 0.4 };
      });
    });
    // valores medidos
    Object.assign(o.items[S.key('r36', 0, 0)] || {}, { val: '3,80 m' });
    // bitácora
    const B = [
      [-118, 'Inicio de obra. Se firma acta de inicio. Limpieza del terreno y armado de obrador.', 4, ['r1']],
      [-110, 'Replanteo general con nivel óptico. Cota ±0,00 materializada en cordón vereda + 0,25 m.', 3, ['r2']],
      [-101, 'Excavación de zanjas Z1 a Z4. Suelo firme a -0,60 m según estudio de suelo.', 5, ['r3']],
      [-90, 'Hormigonado de cimiento ciclópeo y viga de encadenado inferior. Se toman probetas.', 6, ['r8', 'r14']],
      [-72, 'Capa aisladora horizontal ejecutada con hidrófugo 1:10. Inicio de mampostería.', 5, ['r20', 'r22']],
      [-50, 'Mampostería de cerámico 18 cm en avance. Se observa desplome en muro medianero.', 6, ['r27']],
      [-30, 'Colocación de viguetas pretensadas y bloques. Instalación eléctrica embutida en losa.', 7, ['r36', 'r56']],
      [-12, 'Hormigonado de losa con hormigón elaborado H-21 (7 m³). Curado húmedo por 7 días.', 8, ['r37']],
      [-3, 'Inicio de revoques gruesos interiores. Visita del comitente.', 5, ['r40']]
    ];
    const climas = [{ code: 1, tmax: 27, tmin: 14 }, { code: 0, tmax: 24, tmin: 10 }, { code: 3, tmax: 19, tmin: 9 }, { code: 2, tmax: 22, tmin: 11 }, { code: 61, tmax: 17, tmin: 12, lluvia: 8 }];
    o.bitacora = B.map(([d, texto, personal, rubros], i) => ({ id: U.uid(), fecha: U.addDays(hoy, d), texto, personal, rubros, clima: climas[i % climas.length] })).reverse();
    o.ordenes = [
      { id: U.uid(), tipo: 'OS', numero: 1, fecha: U.addDays(hoy, -112), asunto: 'Cerco perimetral y cartel de obra', texto: 'Se ordena completar el cierre perimetral y colocar el cartel de obra reglamentario antes del inicio de excavaciones.', plazo: U.addDays(hoy, -105), estado: 'cumplida', emisor: 'Dirección de obra' },
      { id: U.uid(), tipo: 'OS', numero: 2, fecha: U.addDays(hoy, -49), asunto: 'Corrección de desplome en muro medianero', texto: 'Se detecta desplome de 1,5 cm en muro medianero eje 1. Se ordena demoler y rehacer las hiladas afectadas.', plazo: U.addDays(hoy, -40), estado: 'cumplida', emisor: 'Dirección de obra' },
      { id: U.uid(), tipo: 'NP', numero: 1, fecha: U.addDays(hoy, -20), asunto: 'Definición de carpinterías', texto: 'Se solicita a la Dirección de obra la definición de la línea de aberturas de aluminio para coordinar premarcos.', plazo: U.addDays(hoy, -5), estado: 'pendiente', emisor: 'Contratista' },
      { id: U.uid(), tipo: 'OS', numero: 3, fecha: U.addDays(hoy, -2), asunto: 'Protección de losa', texto: 'Mantener curado húmedo de la losa y no acopiar materiales sobre la misma hasta los 14 días.', plazo: U.addDays(hoy, 10), estado: 'pendiente', emisor: 'Dirección de obra' }
    ];
    if (window.demoEconomia) window.demoEconomia(o);
    o.actas.inicio = { fecha: o.datos.fechaInicio, lugar: 'Av. Sabattini 2450, Río Cuarto', contratista: 'Ramón Quiroga', entrega: 'el terreno libre de ocupantes y de obstáculos, con los puntos fijos de referencia, la documentación técnica aprobada (planos y pliego) y la llave del obrador.' };
    await S.putObra(o);
    const fotos = [[0.05, 'Replanteo general', 'r2', -110], [0.3, 'Mampostería en elevación', 'r27', -50], [0.7, 'Losa de viguetas hormigonada', 'r37', -12], [0.6, 'Encadenado superior', 'r15', -35]];
    for (const [st, cap, rid, d] of fotos) {
      const id = U.uid();
      await S.putFoto({ id, obraId: o.id, data: fakePhoto(st, cap), fecha: U.addDays(hoy, d), caption: cap, rubro: rid, ref: 'gal' });
      if (st === 0.7) o.portada = id;
    }
    await S.putObra(o);
    return o;
  };
})();
