// En vivo / repetición de sesiones con datos de OpenF1 (api.openf1.org).
// Durante una sesión se actualiza cada 20 s; fuera de sesión se puede repetir con la línea de tiempo.
(() => {
  'use strict';
  const root = document.getElementById('live');
  if (!root) return;

  const API = 'https://api.openf1.org/v1/';
  const $ = id => document.getElementById(id);
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // OpenF1 permite 30 peticiones por minuto: van en serie, con caché y reintento si responde 429
  let queue = Promise.resolve();
  const cache = new Map();
  async function get(url) {
    for (let i = 0; i < 6; i++) {
      const r = await fetch(url);
      if (r.status === 429) { setStatus('Esperando a la fuente de datos…'); await sleep(4000 + i * 3000); continue; }
      if (r.status === 404) return [];
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    }
    throw new Error('429');
  }
  const api = (path, q, fresh) => {
    const url = API + path + '?' + new URLSearchParams(q);
    if (!fresh && cache.has(url)) return cache.get(url);
    const p = (queue = queue.then(() => sleep(250)).then(() => get(url)));
    if (!fresh) { cache.set(url, p); p.catch(() => cache.delete(url)); }
    return p;
  };
  const T = s => Date.parse(s);
  const pad = n => String(n).padStart(2, '0');
  const fmtLap = s => { if (s == null) return '—'; const m = Math.floor(s / 60); const r = (s - m * 60).toFixed(3); return (m ? m + ':' + (r < 10 ? '0' : '') : '') + r; };
  const fmtClock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 3600) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60); };
  const fmtGap = g => g == null ? '—' : typeof g === 'string' ? g.replace('LAP', 'V').replace('S', '') : '+' + g.toFixed(3);

  // ---------- traducciones ----------
  const SES = { 'Practice 1': 'Práctica 1', 'Practice 2': 'Práctica 2', 'Practice 3': 'Práctica 3', Qualifying: 'Clasificación', 'Sprint Qualifying': 'Clasificación sprint', 'Sprint Shootout': 'Clasificación sprint', Sprint: 'Sprint', Race: 'Carrera' };
  const GP = { Australian: 'Australia', Chinese: 'China', Japanese: 'Japón', Bahrain: 'Baréin', 'Saudi Arabian': 'Arabia Saudita', Miami: 'Miami', Canadian: 'Canadá', Monaco: 'Mónaco', Barcelona: 'Barcelona', Spanish: 'España', Austrian: 'Austria', British: 'Gran Bretaña', Belgian: 'Bélgica', Hungarian: 'Hungría', Dutch: 'Países Bajos', Italian: 'Italia', Azerbaijan: 'Azerbaiyán', Singapore: 'Singapur', 'United States': 'Estados Unidos', 'Mexico City': 'México', 'São Paulo': 'São Paulo', 'Las Vegas': 'Las Vegas', Qatar: 'Catar', 'Abu Dhabi': 'Abu Dabi' };
  const gpName = m => { const k = m.meeting_name.replace(/ Grand Prix.*$/, ''); return 'GP de ' + (GP[k] || k) + (m.location && /Bahrain/.test(m.meeting_name) && m.location !== 'Sakhir' ? ' (en ' + m.location + ')' : ''); };
  const MSG = [
    [/^VSC DEPLOYED|VIRTUAL SAFETY CAR DEPLOYED/, 'Auto de seguridad virtual (VSC) activado'],
    [/^VSC ENDING|VIRTUAL SAFETY CAR ENDING/, 'El VSC termina'],
    [/^SAFETY CAR DEPLOYED/, 'Auto de seguridad en pista'],
    [/^SAFETY CAR IN THIS LAP/, 'El auto de seguridad entra en esta vuelta'],
    [/^SAFETY CAR LIGHTS (ON|OFF)/, m => 'Luces del auto de seguridad ' + (/ON/.test(m) ? 'encendidas' : 'apagadas')],
    [/^CHEQUERED FLAG/, 'Bandera a cuadros'],
    [/^FIRST CAR TO TAKE THE FLAG/, m => { const x = m.match(/CAR (\d+) \((\w+)\)/); return 'Primero en recibir la bandera' + (x ? ': ' + x[2] : ''); }],
    [/^RED FLAG/, 'Bandera roja: sesión detenida'],
    [/^GREEN LIGHT - PIT EXIT OPEN/, 'Luz verde: salida de boxes abierta'],
    [/^PIT EXIT CLOSED/, 'Salida de boxes cerrada'],
    [/^TRACK CLEAR/, 'Pista despejada'],
    [/^DELAYED START/, 'Salida retrasada'],
    [/^STARTING PROCEDURE SUSPENDED/, 'Procedimiento de salida suspendido'],
    [/^RACE START$/, 'Arranca la carrera'],
    [/^SESSION STARTED/, 'Comienza la sesión'], [/^SESSION FINISHED/, 'Termina la sesión'],
    [/^DRS ENABLED/, 'DRS habilitado'], [/^DRS DISABLED/, 'DRS deshabilitado'],
    [/^RECOVERY VEHICLE ON TRACK AT TURN (\d+)/, m => 'Grúa en pista en la curva ' + m.match(/TURN (\d+)/)[1]],
    [/^MARSHALS ON TRACK AT TURN (\d+)/, m => 'Comisarios de pista en la curva ' + m.match(/TURN (\d+)/)[1]],
    [/^MEDICAL CAR/, 'Auto médico en pista'],
    [/^PIT ENTRY CLOSED/, 'Entrada de boxes cerrada'], [/^PIT ENTRY OPEN/, 'Entrada de boxes abierta'],
    [/^INCIDENT INVOLVING CAR.*NOTED/, m => { const x = m.match(/CAR (\d+) \((\w+)\)/); return 'Incidente anotado' + (x ? ': ' + x[2] : ''); }],
    [/^FORMATION LAP WILL START AT/, 'Hora de la vuelta de formación confirmada'],
    [/^FORMATION LAP\(S\) BEHIND SAFETY CAR/, 'Vuelta de formación detrás del auto de seguridad'],
    [/^RACE WILL START AT/, 'Nueva hora de salida confirmada'],
    [/^START ORDER: ORIGINAL GRID/, 'Se larga con la parrilla original'],
    [/^STANDING START/, 'Salida detenida'],
    [/^Q(\d) WILL (START|RESUME)/i, m => 'Comienza la Q' + m.match(/Q(\d)/)[1]],
    [/^RISK OF RAIN FOR THE F1 RACE IS (\d+)%/, m => 'Probabilidad de lluvia para la carrera: ' + m.match(/(\d+)%/)[1] + '%'],
    [/^LAPPED CARS MAY NOW OVERTAKE THE SAFETY CAR/, m => 'Los autos doblados ya pueden pasar al auto de seguridad' + (m.split(':')[1] ? ': ' + m.split(':')[1].trim() : '')],
    [/^BLACK AND WHITE FLAG FOR CAR (\d+) \((\w+)\)/, m => { const x = m.match(/CAR (\d+) \((\w+)\)(?: - (.*))?/); return 'Bandera blanca y negra para ' + x[2] + ' (n.º ' + x[1] + ')' + (/TRACK LIMITS/.test(m) ? ': límites de pista' : ''); }],
    [/DELETED - TRACK LIMITS/, m => { const x = m.match(/CAR (\d+) \((\w+)\)/); return x ? 'Tiempo anulado a ' + x[2] + ' por límites de pista' : null; }],
    [/^FIA STEWARDS: .*NO FURTHER (INVESTIGATION|ACTION)/, m => { const x = m.match(/CAR (\d+) \((\w+)\)/); return 'Comisarios: sin más acciones' + (x ? ' para ' + x[2] : ''); }],
    [/WILL BE INVESTIGATED AFTER THE (RACE|SESSION)/, m => { const x = m.match(/CAR (\d+) \((\w+)\)/); return 'Se investigará al terminar' + (x ? ': ' + x[2] : '') + (/UNSAFE RELEASE/.test(m) ? ' (salida insegura de boxes)' : ''); }],
    [/UNDER INVESTIGATION/, m => { const x = m.match(/CAR (\d+) \((\w+)\)/); return 'En investigación' + (x ? ': ' + x[2] : ''); }],
    [/^FIA STEWARDS: .*PENALTY/, m => { const x = m.match(/(\d+) SECOND TIME PENALTY FOR CAR (\d+) \((\w+)\)/); return x ? 'Sanción de ' + x[1] + ' s para ' + x[3] : null; }],
  ];
  function msgEs(m) { for (const [re, out] of MSG) if (re.test(m)) { const r = typeof out === 'function' ? out(m) : out; if (r) return r; } return null; }
  const TYRE = { SOFT: ['S', 'Blando'], MEDIUM: ['M', 'Medio'], HARD: ['H', 'Duro'], INTERMEDIATE: ['I', 'Intermedio'], WET: ['W', 'Lluvia'] };

  // fotos del sitio (mismo archivo que usa Posiciones) por apellido
  const ALIAS = { verstappen: 'max_verstappen', lindblad: 'arvid_lindblad' };
  const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let PH = {};
  fetch('data/pilotos.json').then(r => r.json()).then(d => { PH = d; }).catch(() => {});

  // ---------- estado ----------
  const S = { meetings: [], sessions: [], ses: null, D: null, t: 0, t0: 0, t1: 0, playing: false, speed: 30, live: false, timer: null, lastFrame: 0 };

  function lapTimes(laps) {
    const by = {};
    laps.forEach(l => { l._s = l.date_start ? T(l.date_start) : null; (by[l.driver_number] = by[l.driver_number] || []).push(l); });
    Object.values(by).forEach(a => {
      a.sort((x, y) => x.lap_number - y.lap_number);
      a.forEach((l, i) => {
        const next = a[i + 1];
        l._t = l._s == null ? Infinity : l.lap_duration ? l._s + l.lap_duration * 1000 : next && next._s != null ? next._s : l._s + 180e3;
      });
    });
  }
  // búsqueda binaria: último elemento con tiempo <= t
  function lastAt(arr, t, key = '_t') { let lo = 0, hi = arr.length - 1, ans = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m][key] <= t) { ans = m; lo = m + 1; } else hi = m - 1; } return ans < 0 ? null : arr[ans]; }
  const byDriver = rows => { const m = {}; rows.forEach(r => (m[r.driver_number] = m[r.driver_number] || []).push(r)); Object.values(m).forEach(a => a.sort((x, y) => x._t - y._t)); return m; };

  async function loadSession(ses) {
    $('lvChrono').dataset.k = ''; $('lvChrono').replaceChildren(el('p', 'muted', 'Cargando…'));
    S.ses = ses; stop(); clearInterval(S.wTimer); clearTimeout(S.rTimer); $('lvReplay').hidden = false; setStatus('Cargando datos de la sesión…'); MAP.ref = null; MAP.g = null; $('lvMap').replaceChildren(el('p', 'lv-mapmsg', 'Cargando el trazado…'));
    $('lvBoard').replaceChildren(el('div', 'lv-skel'));
    const k = { session_key: ses.session_key };
    const isRace = /Race|Sprint$/.test(ses.session_name) && ses.session_type === 'Race';
    const [drivers, result, position, laps, stints, rc, weather] = [
      await api('drivers', k), await api('session_result', k), await api('position', k), await api('laps', k),
      await api('stints', k), await api('race_control', k), await api('weather', k)];
    const intervals = isRace ? await api('intervals', k) : [];
    if (S.ses !== ses) return; // el usuario cambió de sesión mientras cargaba
    [position, intervals, rc, weather].forEach(a => a.forEach(r => r._t = T(r.date)));
    lapTimes(laps);
    rc.sort((a, b) => a._t - b._t); weather.sort((a, b) => a._t - b._t);
    const D = S.D = { isRace, drivers: {}, result, pos: byDriver(position), int: byDriver(intervals), laps: {}, stints: {}, rc, weather };
    drivers.forEach(d => D.drivers[d.driver_number] = d);
    laps.forEach(l => (D.laps[l.driver_number] = D.laps[l.driver_number] || []).push(l));
    Object.values(D.laps).forEach(a => a.sort((x, y) => x.lap_number - y.lap_number));
    stints.forEach(s => (D.stints[s.driver_number] = D.stints[s.driver_number] || []).push(s));
    D.totalLaps = Math.max(0, ...result.map(r => r.number_of_laps || 0));
    // ventana de tiempo: inicio y fin reales de la sesión según dirección de carrera
    const st = rc.find(r => /^SESSION STARTED/.test(r.message)), fin = [...rc].reverse().find(r => /^SESSION FINISHED|^CHEQUERED FLAG/.test(r.message));
    const firstLap = Math.min(...laps.map(l => l._s).filter(x => x != null));
    S.t0 = st ? st._t : (isFinite(firstLap) ? firstLap : T(ses.date_start));
    const lastData = Math.max(S.t0, ...laps.map(l => l._t).filter(isFinite), ...position.map(p => p._t));
    S.t1 = fin ? Math.max(fin._t + 90e3, Math.min(lastData, fin._t + 300e3)) : lastData;
    const now = Date.now();
    S.live = now >= T(ses.date_start) - 15 * 60e3 && now <= T(ses.date_end) + 30 * 60e3;
    $('lvSlider').max = S.t1 - S.t0;
    if (!result.length && !laps.length) { waiting(ses); return; }
    if (S.live) { seek(Math.min(now, S.t1)); poll(); }
    else seek(new URLSearchParams(location.search).get('t') === 'fin' ? S.t1 : S.t0);
    updateMode();
    loadTrack(ses).catch(() => $('lvMap').replaceChildren(el('p', 'lv-mapmsg', 'No se pudo cargar el trazado.')));
  }

  // ---------- sesión sin datos todavía: pantalla de espera ----------
  // El plan gratuito de OpenF1 publica los datos unos 30 min después de terminar la sesión.
  const fmtWhen = ms => new Date(ms).toLocaleString('es', { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtHour = ms => new Date(ms).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const fmtLeft = ms => { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; return (d ? d + ' d ' : '') + (d || h ? h + ' h ' : '') + m + ' min' + (d ? '' : ' ' + pad(s % 60) + ' s'); };
  function purge(key) { for (const k of [...cache.keys()]) if (k.includes('session_key=' + key)) cache.delete(k); }
  function waiting(ses) {
    stop(); clearInterval(S.wTimer); clearTimeout(S.rTimer);
    S.D = null; MAP.ref = null; MAP.g = null;
    const st = T(ses.date_start), en = T(ses.date_end), ready = en + 30 * 60e3, name = SES[ses.session_name] || ses.session_name;
    $('lvReplay').hidden = true;
    $('lvTrack').className = 'lv-track n'; $('lvTrack').textContent = name; $('lvLap').textContent = ''; $('lvWx').textContent = '';
    const box = el('div', 'lv-wait'), h = el('h3'), p = el('p'), cd = el('div', 'lv-cd'), cdl = el('span', 'lv-cdl');
    box.append(h, p, cdl, cd);
    const prev = S.sessions.filter(s => T(s.date_end) + 30 * 60e3 < Date.now() && s.session_key !== ses.session_key).pop();
    if (prev) { const b = el('button', 'btn-s ghost', 'Mientras, ver ' + (SES[prev.session_name] || prev.session_name).toLowerCase()); b.type = 'button'; b.onclick = () => selectSession(prev); box.appendChild(b); }
    $('lvBoard').replaceChildren(box);
    $('lvMap').replaceChildren(el('p', 'lv-mapmsg', 'El mapa aparece con la repetición.'));
    $('lvRc').replaceChildren(el('li', 'muted', 'Sin mensajes todavía.'));
    $('lvChrono').dataset.k = ''; $('lvChrono').replaceChildren(el('p', 'muted', 'La cronología se arma sola cuando lleguen los datos de la sesión.'));
    const tick = () => {
      const now = Date.now(), b = $('lvBadge');
      if (now < st) {
        b.className = 'lv-badge replay'; b.textContent = 'Próxima';
        h.textContent = name + ': ' + fmtWhen(st) + ' (tu hora)';
        p.textContent = 'La repetición vuelta a vuelta, con tabla y mapa del circuito, estará lista unos 30 minutos después de la bandera a cuadros. Esta página se actualiza sola.';
        cdl.textContent = 'Empieza en'; cd.textContent = fmtLeft(st - now);
      } else if (now <= en) {
        b.className = 'lv-badge live'; b.textContent = 'En curso';
        h.textContent = name + ' en curso';
        p.textContent = 'Los tiempos se publican al terminar la sesión. La repetición completa estará lista hacia las ' + fmtHour(ready) + ' (tu hora). No hace falta recargar: la página la abre sola.';
        cdl.textContent = 'Repetición disponible en'; cd.textContent = fmtLeft(ready - now);
      } else {
        b.className = 'lv-badge replay'; b.textContent = 'Procesando';
        h.textContent = 'Terminó: ' + name;
        p.textContent = 'Estamos esperando los datos oficiales. Si la sesión se alargó, pueden tardar un poco más. La página revisa cada minuto y medio.';
        cdl.textContent = now < ready ? 'Repetición disponible en' : 'Revisando…'; cd.textContent = now < ready ? fmtLeft(ready - now) : '';
      }
    };
    tick(); S.wTimer = setInterval(tick, 1000);
    // revisa si ya hay datos: desde el final previsto, cada 90 s
    const check = async () => {
      if (S.ses !== ses) return;
      const r = await api('session_result', { session_key: ses.session_key }, true).catch(() => []);
      if (S.ses !== ses) return;
      if (r.length) { clearInterval(S.wTimer); purge(ses.session_key); loadSession(ses); }
      else S.rTimer = setTimeout(check, 90e3);
    };
    S.rTimer = setTimeout(check, Math.min(2 ** 31 - 1, Math.max(5e3, en - Date.now())));
    setStatus('');
  }
  function selectSession(s) {
    $('lvSes').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.k == s.session_key));
    history.replaceState(null, '', '?session=' + s.session_key); loadSession(s);
  }

  // ---------- en vivo: pide solo lo nuevo cada 20 s ----------
  async function poll() {
    if (!S.live || !S.ses) return;
    const k = { session_key: S.ses.session_key }, D = S.D;
    const since = arr => { let m = 0; Object.values(arr).forEach(a => a.length && (m = Math.max(m, a[a.length - 1]._t))); return m ? new Date(m).toISOString() : null; };
    try {
      const add = (rows, into) => rows.forEach(r => { r._t = T(r.date); (into[r.driver_number] = into[r.driver_number] || []).push(r); });
      const sp = since(D.pos); add(await api('position', sp ? { ...k, 'date>': sp } : k, true), D.pos);
      if (D.isRace) { const si = since(D.int); add(await api('intervals', si ? { ...k, 'date>': si } : k, true), D.int); }
      const laps = await api('laps', k, true); lapTimes(laps); D.laps = {};
      laps.forEach(l => (D.laps[l.driver_number] = D.laps[l.driver_number] || []).push(l));
      Object.values(D.laps).forEach(a => a.sort((x, y) => x.lap_number - y.lap_number));
      const stints = await api('stints', k, true); D.stints = {}; stints.forEach(s => (D.stints[s.driver_number] = D.stints[s.driver_number] || []).push(s));
      const rc = await api('race_control', k, true); rc.forEach(r => r._t = T(r.date)); D.rc = rc.sort((a, b) => a._t - b._t);
      S.t1 = Math.max(S.t1, Date.now()); $('lvSlider').max = S.t1 - S.t0;
      if (S.follow !== false) seek(Date.now());
    } catch (e) { setStatus('Sin conexión con los datos en vivo; se reintenta en 30 s.'); }
    S.timer = setTimeout(poll, 30000);
  }

  // ---------- cálculo del tablero en el instante t ----------
  function snapshot(t) {
    const D = S.D, rows = [];
    let leaderLap = 0;
    for (const num in D.drivers) {
      const dr = D.drivers[num], laps = D.laps[num] || [];
      let done = null, best = null;
      for (const l of laps) { if (l._t <= t && l.lap_duration) { done = l; if (!l.is_pit_out_lap && (!best || l.lap_duration < best.lap_duration)) best = l; } }
      const cur = laps.find(l => l._s != null && l._s <= t && l._t > t);
      const lapNo = cur ? cur.lap_number : done ? done.lap_number : 0;
      leaderLap = Math.max(leaderLap, lapNo);
      const p = lastAt(D.pos[num] || [], t), iv = lastAt(D.int[num] || [], t);
      const st = (D.stints[num] || []).filter(s => s.lap_start <= Math.max(1, lapNo)).pop();
      const pits = st ? st.stint_number - 1 : 0;
      const res = D.result.find(r => r.driver_number == num);
      // abandono: a partir de su última vuelta registrada (+1 min)
      const lastL = laps[laps.length - 1], endT = lastL ? (isFinite(lastL._t) ? lastL._t : lastL._s) : S.t0;
      const out = D.isRace && res && (res.dnf || res.dns) && t > endT + 60e3;
      rows.push({ num, dr, pos: p ? p.position : 99, gap: iv ? iv.gap_to_leader : null, int: iv ? iv.interval : null, last: done && done.lap_duration, best: best && best.lap_duration, lap: lapNo,
        tyre: st && st.compound, age: st ? st.tyre_age_at_start + Math.max(0, lapNo - st.lap_start) : null, pits, out: out ? (res.dns ? 'No largó' : 'Abandono') : null, pit: cur && cur.is_pit_out_lap && t - cur._s < 60e3 && t < S.t1 - 90e3 });
    }
    if (D.isRace) rows.sort((a, b) => (a.out ? 1 : 0) - (b.out ? 1 : 0) || a.pos - b.pos);
    else {
      rows.sort((a, b) => a.pos - b.pos || (a.best || 1e9) - (b.best || 1e9));
      const top = Math.min(...rows.map(r => r.best || 1e9)); rows.forEach(r => r.gap = r.best && top < 1e9 ? (r.best === top ? 0 : r.best - top) : null);
    }
    // estado de pista según dirección de carrera
    let track = 'green', msgs = [];
    for (const r of D.rc) {
      if (r._t > t) break;
      const m = r.message;
      if (/VSC DEPLOYED|VIRTUAL SAFETY CAR DEPLOYED/.test(m)) track = 'vsc';
      else if (/^SAFETY CAR DEPLOYED/.test(m)) track = 'sc';
      else if (/SAFETY CAR IN THIS LAP|VSC ENDING|VIRTUAL SAFETY CAR ENDING/.test(m)) track = 'ending';
      else if (r.flag === 'RED') track = 'red';
      else if (r.flag === 'CHEQUERED') track = 'chequered';
      else if (r.flag === 'GREEN' && r.scope === 'Track' || /SAFETY CAR LIGHTS OFF|TRACK CLEAR/.test(m) && track === 'ending') track = 'green';
      if (r.category !== 'Flag' || /BLACK|RED|CHEQUERED/.test(r.flag || '')) msgs.push(r);
    }
    if (t < S.t0) track = 'pre';
    const qp = D.rc.filter(r => r._t <= t && r.qualifying_phase).pop();
    return { rows, leaderLap, track, msgs: msgs.slice(-8).reverse(), w: lastAt(D.weather, t), phase: qp ? qp.qualifying_phase : null };
  }

  // ---------- mapa del circuito ----------
  // El trazado sale del GPS de una vuelta de referencia (la más rápida). Cada auto se ubica según
  // su tiempo en cada sector de la vuelta en curso, siguiendo el perfil de velocidad de esa referencia.
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (t, at) => { const e = document.createElementNS(SVGNS, t); for (const k in at) e.setAttribute(k, at[k]); return e; };
  const MAP = { ref: null, dots: {}, hl: null };

  async function loadTrack(ses) {
    const D = S.D; MAP.ref = null; MAP.dots = {};
    const box = $('lvMap'); box.replaceChildren(el('p', 'lv-mapmsg', 'Cargando el trazado…'));
    let best = null;
    for (const num in D.laps) for (const l of D.laps[num])
      if (l.lap_duration && !l.is_pit_out_lap && l.duration_sector_1 && l.duration_sector_2 && l.duration_sector_3 && l._s != null && (!best || l.lap_duration < best.lap_duration)) best = l;
    if (!best) { box.replaceChildren(el('p', 'lv-mapmsg', 'El mapa aparece cuando hay al menos una vuelta completa.')); return; }
    const iso = ms => new Date(ms).toISOString();
    const pts = await api('location', { session_key: ses.session_key, driver_number: best.driver_number, 'date>': iso(best._s - 500), 'date<': iso(best._t + 500) });
    if (S.ses !== ses) return;
    const P = pts.map(p => ({ t: T(p.date) - best._s, x: p.x, y: -p.y })).filter(p => p.t >= 0 && p.t <= best.lap_duration * 1000 && (p.x || p.y));
    if (P.length < 50) { box.replaceChildren(el('p', 'lv-mapmsg', 'No hay datos de GPS para dibujar este circuito.')); return; }
    const xs = P.map(p => p.x), ys = P.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const ext = Math.max(maxX - minX, maxY - minY), pad = ext * 0.07;
    MAP.ref = { P, dur: best.lap_duration * 1000, s: [best.duration_sector_1, best.duration_sector_2, best.duration_sector_3].map(x => x * 1000), r: ext * 0.03 };
    const svg = svgEl('svg', { viewBox: [minX - pad, minY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad].join(' '), class: 'lv-svg', role: 'img', 'aria-label': 'Posición de cada auto en el circuito' });
    const d = 'M' + P.map(p => p.x + ',' + p.y).join('L') + 'Z';
    svg.append(svgEl('path', { d, class: 'trk-o' }), svgEl('path', { d, class: 'trk' }));
    // línea de meta: perpendicular al trazado en el primer punto
    const a = P[0], b = P[Math.min(4, P.length - 1)], ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2, L = ext * 0.03;
    svg.append(svgEl('line', { x1: a.x - Math.cos(ang) * L, y1: a.y - Math.sin(ang) * L, x2: a.x + Math.cos(ang) * L, y2: a.y + Math.sin(ang) * L, class: 'fin' }));
    const g = svgEl('g', { class: 'cars' }); svg.appendChild(g); MAP.g = g;
    box.replaceChildren(svg);
    drawMap(S.t);
  }

  // tiempo equivalente en la vuelta de referencia para un auto que lleva `e` ms en su vuelta
  function refTime(lap, prev, e) {
    const R = MAP.ref;
    let d = [lap.duration_sector_1, lap.duration_sector_2, lap.duration_sector_3];
    if (d.some(x => !x)) {
      const base = prev && prev.lap_duration && !prev.is_pit_out_lap ? prev.lap_duration * 1000 : R.dur;
      const k = (lap.lap_duration ? lap.lap_duration * 1000 : base) / R.dur;
      d = R.s.map((x, i) => d[i] ? d[i] * 1000 : x * k);
    } else d = d.map(x => x * 1000);
    let acc = 0;
    for (let i = 0; i < 3; i++) {
      if (e <= acc + d[i] || i === 2) { const f = Math.min(1, Math.max(0, (e - acc) / d[i])); return R.s.slice(0, i).reduce((a, b) => a + b, 0) + f * R.s[i]; }
      acc += d[i];
    }
    return R.dur;
  }
  function pointAt(rt) {
    const P = MAP.ref.P; let lo = 0, hi = P.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m].t <= rt) lo = m; else hi = m; }
    const A = P[lo], B = P[hi], f = B.t > A.t ? Math.min(1, Math.max(0, (rt - A.t) / (B.t - A.t))) : 0;
    return [A.x + (B.x - A.x) * f, A.y + (B.y - A.y) * f];
  }

  function drawMap(t, order) {
    if (!MAP.ref || !MAP.g) return;
    const D = S.D, R = MAP.ref;
    order = order || MAP.order || {};
    const seen = {};
    for (const num in D.drivers) {
      const laps = D.laps[num] || [];
      const i = laps.findIndex(l => l._s != null && l._s <= t && l._t > t);
      let dot = MAP.dots[num];
      const res = D.result.find(r => r.driver_number == num);
      const lastL = laps[laps.length - 1], endT = lastL ? (isFinite(lastL._t) ? lastL._t : lastL._s) : 0;
      if (i < 0 || (res && (res.dnf || res.dns) && D.isRace && t > endT + 60e3)) { if (dot) dot.style.display = 'none'; continue; }
      const lap = laps[i], [x, y] = pointAt(refTime(lap, laps[i - 1], t - lap._s));
      if (!dot) {
        const dr = D.drivers[num];
        dot = svgEl('g', { class: 'car' });
        dot.style.setProperty('--c', '#' + (dr.team_colour || '888'));
        const tt = svgEl('title', {}); tt.textContent = dr.full_name.replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase()) + ' · ' + dr.team_name;
        const c = svgEl('circle', { r: R.r }), tx = svgEl('text', { 'text-anchor': 'middle', dy: '0.35em', 'font-size': R.r * 1.05 }),
          lb = svgEl('text', { class: 'lbl', x: R.r * 1.4, dy: '0.35em', 'font-size': R.r * 1.1 });
        lb.textContent = dr.name_acronym;
        dot.append(tt, c, tx, lb); MAP.g.appendChild(dot); MAP.dots[num] = dot;
      }
      dot.style.display = '';
      dot.setAttribute('transform', 'translate(' + x.toFixed(0) + ' ' + y.toFixed(0) + ')');
      const p = order[num];
      dot.children[2].textContent = p || '';
      dot.classList.toggle('top', p && p <= 3 || MAP.hl == num);
      dot.classList.toggle('hl', MAP.hl == num);
      seen[num] = p || 99;
    }
    // los primeros se dibujan encima
    Object.keys(seen).sort((a, b) => seen[b] - seen[a]).forEach(n => MAP.g.appendChild(MAP.dots[n]));
  }

  // ---------- cronología automática de la sesión ----------
  // Se arma con los datos de OpenF1. En la repetición solo muestra lo que ya pasó (sin spoilers).
  function buildTimeline() {
    const D = S.D, ev = [], ac = n => (D.drivers[n] || {}).name_acronym || '#' + n;
    const allLaps = Object.values(D.laps).flat().filter(l => l._s != null).sort((a, b) => a._s - b._s);
    const lapAt = t => { let n = 0; for (const l of allLaps) { if (l._s > t) break; n = Math.max(n, l.lap_number); } return n; };
    const add = (t, kind, text) => { if (isFinite(t)) ev.push({ t, lap: D.isRace ? lapAt(t) : 0, kind, text }); };
    const res = [...D.result].sort((a, b) => (a.position || 99) - (b.position || 99));

    if (D.isRace) {
      // salida: puestos ganados o perdidos en la vuelta 1
      const lap1 = (D.laps[res[0] && res[0].driver_number] || []).find(l => l.lap_number === 1);
      if (lap1 && isFinite(lap1._t)) {
        const moves = Object.keys(D.drivers).map(n => {
          const g = lastAt(D.pos[n] || [], S.t0), a = lastAt(D.pos[n] || [], lap1._t + 5e3);
          return g && a ? { n, d: g.position - a.position, a: a.position } : null;
        }).filter(Boolean).sort((x, y) => y.d - x.d);
        const lead = moves.find(m => m.a === 1);
        add(S.t0, 'start', 'Largada' + (lead ? ': ' + ac(lead.n) + ' queda al frente' : '') + '.');
        const up = moves.filter(m => m.d >= 3).slice(0, 3), down = moves.filter(m => m.d <= -3).slice(-2);
        if (up.length) add(lap1._t, 'move', 'Vuelta 1: ' + up.map(m => ac(m.n) + ' gana ' + m.d).join(', ') + (down.length ? '; ' + down.map(m => ac(m.n) + ' pierde ' + -m.d).join(', ') : '') + '.');
      }
      // cambios de líder
      const p1 = Object.values(D.pos).flat().filter(p => p.position === 1 && p._t >= S.t0).sort((a, b) => a._t - b._t);
      let cur = null;
      p1.forEach(p => { if (cur !== null && p.driver_number !== cur) add(p._t, 'lead', ac(p.driver_number) + ' pasa a liderar.'); cur = p.driver_number; });
      // paradas: se agrupan las que caen en la misma vuelta; se detallan las de los cinco primeros
      const top5 = new Set(res.slice(0, 5).map(r => String(r.driver_number)));
      const byLap = {};
      Object.entries(D.stints).forEach(([n, ss]) => ss.forEach(s => {
        if (s.stint_number < 2) return;
        const lp = (D.laps[n] || []).find(l => l.lap_number === s.lap_start);
        if (!lp || lp._s == null) return;
        (byLap[s.lap_start] = byLap[s.lap_start] || []).push({ n, t: lp._s, c: s.compound });
      }));
      const TY = c => TYRE[c] ? TYRE[c][1].toLowerCase() : c ? c.toLowerCase() : '';
      Object.values(byLap).forEach(list => {
        list.sort((a, b) => a.t - b.t);
        if (list.length >= 5) add(list[0].t, 'pit', list.length + ' autos paran en la misma vuelta' + (list.some(x => top5.has(x.n)) ? ', entre ellos ' + list.filter(x => top5.has(x.n)).map(x => ac(x.n)).join(', ') : '') + '.');
        else list.filter(x => top5.has(x.n)).forEach(x => add(x.t, 'pit', ac(x.n) + ' para en boxes' + (x.c ? ' y monta ' + TY(x.c) : '') + '.'));
      });
      // abandonos
      res.filter(r => r.dnf || r.dns).forEach(r => {
        const ls = D.laps[r.driver_number] || [], l = ls[ls.length - 1];
        add(l ? (isFinite(l._t) ? l._t : l._s) : S.t0, 'out', ac(r.driver_number) + (r.dns ? ' no toma la salida.' : ' abandona' + (r.number_of_laps ? ' tras ' + r.number_of_laps + ' vueltas' : '') + '.'));
      });
    }
    // dirección de carrera: neutralizaciones, banderas rojas, sanciones e investigaciones
    D.rc.forEach(r => {
      const m = r.message, es = msgEs(m);
      if (/^SAFETY CAR DEPLOYED|VSC DEPLOYED|VIRTUAL SAFETY CAR DEPLOYED|SAFETY CAR IN THIS LAP|VSC ENDING|VIRTUAL SAFETY CAR ENDING/.test(m)) add(r._t, 'sc', es + '.');
      else if (r.flag === 'RED') add(r._t, 'red', 'Bandera roja.');
      else if (/PENALTY|WILL BE INVESTIGATED|UNDER INVESTIGATION/.test(m) && /CAR \d+ \(\w+\)/.test(m) && es) add(r._t, 'pen', es + '.');
    });
    // vuelta rápida
    let fl = null;
    Object.values(D.laps).flat().forEach(l => { if (l.lap_duration && !l.is_pit_out_lap && (!fl || l.lap_duration < fl.lap_duration)) fl = l; });
    if (fl && D.isRace) add(fl._t, 'fast', 'Vuelta rápida de ' + ac(fl.driver_number) + ': ' + fmtLap(fl.lap_duration) + ' (vuelta ' + fl.lap_number + ').');
    // resultado
    const fin = [...D.rc].reverse().find(r => r.flag === 'CHEQUERED');
    const tEnd = Math.max(fin ? fin._t : S.t1, fl && isFinite(fl._t) ? fl._t : 0) + 1;
    const podium = res.filter(r => r.position && r.position <= 3);
    if (D.isRace && podium.length) {
      add(tEnd, 'end', 'Bandera a cuadros. Gana ' + ac(podium[0].driver_number) + (podium[1] ? '; ' + ac(podium[1].driver_number) + ' a ' + (+podium[1].gap_to_leader || 0).toFixed(3) + ' s' : '') + (podium[2] ? ' y ' + ac(podium[2].driver_number) + ' completa el podio' : '') + '.');
    } else if (!D.isRace && res.length) {
      const best = r => Array.isArray(r.duration) ? r.duration.filter(Boolean).slice(-1)[0] : r.duration;
      const isQ = res.some(r => Array.isArray(r.duration));
      if (isQ) {
        // eliminados de cada fase, al empezar la siguiente
        const phaseStart = ph => (D.rc.find(r => r.qualifying_phase === ph) || {})._t;
        const outQ1 = res.filter(r => Array.isArray(r.duration) && r.duration[1] == null && r.position);
        const outQ2 = res.filter(r => Array.isArray(r.duration) && r.duration[1] != null && r.duration[2] == null && r.position);
        if (outQ1.length) add(phaseStart(2) || tEnd, 'out', 'Quedan fuera en Q1: ' + outQ1.map(r => ac(r.driver_number)).join(', ') + '.');
        if (outQ2.length) add(phaseStart(3) || tEnd, 'out', 'Quedan fuera en Q2: ' + outQ2.map(r => ac(r.driver_number)).join(', ') + '.');
        const p = res[0], s2 = res[1];
        add(tEnd, 'end', 'Pole para ' + ac(p.driver_number) + ' con ' + fmtLap(best(p)) + (s2 ? '; ' + ac(s2.driver_number) + ' a ' + (best(s2) - best(p)).toFixed(3) + ' s' : '') + '.');
      } else {
        const top = res.slice(0, 3).map(r => ac(r.driver_number) + ' ' + fmtLap(best(r))).join(', ');
        add(tEnd, 'end', 'Lo más rápido: ' + top + '.');
      }
    }
    return ev.sort((a, b) => a.t - b.t);
  }
  const KIND = { start: 'Salida', move: 'Vuelta 1', lead: 'Liderato', pit: 'Boxes', out: 'Fuera', sc: 'Neutralizada', red: 'Roja', pen: 'Comisarios', fast: 'Vuelta rápida', end: 'Final' };
  function renderTimeline(t) {
    const box = $('lvChrono'); if (!box || !S.D) return;
    if (!S.D.tl) S.D.tl = buildTimeline();
    const shown = S.D.tl.filter(e => e.t <= t);
    const key = shown.length + ':' + S.D.tl.length;
    if (box.dataset.k === key) return; box.dataset.k = key;
    const ol = el('ol', 'tl');
    if (!shown.length) ol.appendChild(el('li', 'muted', 'Todavía no pasa nada destacado. Avanza la repetición.'));
    shown.slice().reverse().forEach(e => {
      const li = el('li', 'k-' + e.kind), b = el('button'); b.type = 'button';
      b.append(el('span', 'tl-tag', (e.lap ? 'V' + e.lap + ' · ' : '') + KIND[e.kind]), el('span', 'tl-txt', e.text));
      b.title = 'Ir a este momento'; b.onclick = () => { stop(); S.follow = false; seek(e.t); };
      li.appendChild(b); ol.appendChild(li);
    });
    const hidden = S.D.tl.length - shown.length;
    const foot = el('p', 'tl-foot', hidden ? hidden + ' momentos más adelante. Avanza la repetición o ' : 'Cronología completa.');
    if (hidden) { const a = el('button', 'tl-all', 've el resumen completo'); a.type = 'button'; a.onclick = () => { stop(); seek(S.t1); }; foot.appendChild(a); }
    box.replaceChildren(ol, foot);
  }

  // ---------- pintado ----------
  const TRACK = { green: ['Pista en verde', 'g'], sc: ['Auto de seguridad', 'y'], vsc: ['Auto de seguridad virtual', 'y'], ending: ['Termina el neutralizado', 'y'], red: ['Bandera roja', 'r'], chequered: ['Bandera a cuadros', 'c'], pre: ['Antes de la salida', 'n'] };
  function render() {
    if (!S.D) return;
    const t = S.t, s = snapshot(t), D = S.D;
    // barra de estado
    const [tl, tc] = TRACK[s.track];
    $('lvTrack').className = 'lv-track ' + tc; $('lvTrack').textContent = tl;
    $('lvLap').textContent = D.isRace ? 'Vuelta ' + Math.min(s.leaderLap, D.totalLaps || s.leaderLap) + (D.totalLaps ? ' / ' + D.totalLaps : '') : (s.phase ? 'Q' + s.phase + ' · ' : '') + 'Tiempo ' + fmtClock(t - S.t0);
    $('lvWx').textContent = s.w ? 'Aire ' + s.w.air_temperature.toFixed(0) + ' °C · Pista ' + s.w.track_temperature.toFixed(0) + ' °C' + (s.w.rainfall ? ' · Lluvia' : '') : '';
    $('lvClock').textContent = fmtClock(t - S.t0);
    $('lvSlider').value = t - S.t0;
    // tablero
    const tb = el('tbody');
    s.rows.forEach((r, i) => {
      const tr = el('tr', r.out ? 'out' : null); tr.style.setProperty('--c', '#' + (r.dr.team_colour || '666'));
      tr.onmouseenter = () => { MAP.hl = r.num; drawMap(S.t); }; tr.onmouseleave = () => { MAP.hl = null; drawMap(S.t); };
      const who = el('td', 'lvwho');
      const id = ALIAS[plain(r.dr.last_name)] || plain(r.dr.last_name), ph = PH[id];
      const av = el('span', 'av sm' + (ph ? '' : ' ini'));
      if (ph) { const im = new Image(); im.alt = ''; im.src = ph.img; if (ph.pos) im.style.objectPosition = ph.pos; av.appendChild(im); } else av.textContent = r.dr.name_acronym.slice(0, 2);
      who.append(av, el('b', null, r.dr.name_acronym), el('span', 'tm', r.dr.team_name.replace(/ F1 Team| Racing$/, '')));
      const tyre = el('td', 'ty');
      if (r.tyre && TYRE[r.tyre]) { const b = el('span', 'tyre ' + r.tyre.toLowerCase(), TYRE[r.tyre][0]); b.title = TYRE[r.tyre][1]; tyre.append(b, el('small', null, r.age != null ? r.age + ' v' : '')); }
      const gap = r.out ? r.out : i === 0 && D.isRace ? 'Líder' : D.isRace ? fmtGap(r.gap) : (r.gap === 0 ? fmtLap(r.best) : fmtGap(r.gap));
      tr.append(el('td', 'n p', r.out ? '—' : String(i + 1)), who, el('td', 'n', gap), el('td', 'n opt', D.isRace ? (i === 0 || r.out ? '' : fmtGap(r.int)) : r.lap ? r.lap + ' v' : ''),
        el('td', 'n', fmtLap(r.last)), el('td', 'n opt', fmtLap(r.best)), tyre, el('td', 'n opt', r.pit ? 'Boxes' : String(r.pits)));
      tb.appendChild(tr);
    });
    const th = el('thead'), hr = el('tr');
    [['P', ''], ['Piloto', ''], [D.isRace ? 'Al líder' : 'Mejor / dif.', ''], [D.isRace ? 'Intervalo' : 'Vueltas', 'opt'], ['Última', ''], ['Mejor', 'opt'], ['Neum.', ''], ['Paradas', 'opt']].forEach(([h, c]) => { const x = el('th', c || null, h); x.scope = 'col'; hr.appendChild(x); });
    th.appendChild(hr);
    const tbl = el('table', 'lv-tab'); tbl.append(th, tb);
    $('lvBoard').replaceChildren(tbl);
    MAP.order = {}; s.rows.forEach((r, i) => { if (!r.out) MAP.order[r.num] = i + 1; });
    drawMap(t);
    // dirección de carrera
    renderTimeline(t);
    $('lvRc').replaceChildren(...(s.msgs.length ? s.msgs.map(r => {
      const li = el('li'); const es = msgEs(r.message);
      li.append(el('time', null, (r.lap_number ? 'V' + r.lap_number + ' · ' : '') + fmtHour(r._t)), el('span', null, es || r.message));
      if (es) li.title = r.message; return li;
    }) : [el('li', 'muted', 'Sin mensajes todavía.')]));
  }

  // ---------- reproducción ----------
  function seek(t) { S.t = Math.max(S.t0, Math.min(S.t1, t)); render(); }
  function frame(ts) {
    if (!S.playing) return;
    const dt = S.lastFrame ? ts - S.lastFrame : 0; S.lastFrame = ts;
    // la tabla se repinta cada 250 ms; el mapa, en cada cuadro
    if (ts - (S.lastPaint || 0) > 250) { seek(S.t + dt * S.speed); S.lastPaint = ts; } else { S.t = Math.min(S.t1, S.t + dt * S.speed); drawMap(S.t); $('lvSlider').value = S.t - S.t0; $('lvClock').textContent = fmtClock(S.t - S.t0); }
    if (S.t >= S.t1) { stop(); return; }
    requestAnimationFrame(frame);
  }
  function play() { if (S.t >= S.t1) S.t = S.t0; S.playing = true; S.lastFrame = 0; $('lvPlay').textContent = 'Pausa'; $('lvPlay').setAttribute('aria-pressed', 'true'); requestAnimationFrame(frame); }
  function stop() { S.playing = false; clearTimeout(S.timer); $('lvPlay').textContent = 'Reproducir'; $('lvPlay').setAttribute('aria-pressed', 'false'); }
  function updateMode() {
    const b = $('lvBadge');
    b.className = 'lv-badge ' + (S.live ? 'live' : 'replay'); b.textContent = S.live ? 'En vivo' : 'Repetición';
    $('lvReplay').hidden = false;
    $('lvNote').textContent = S.live ? 'Se actualiza cada 30 segundos. Los datos pueden llegar con algunos segundos de retraso.' : 'Mueve la línea de tiempo o pulsa Reproducir para ver cómo cambió la sesión.';
  }
  function setStatus(t) { $('lvNote').textContent = t; }

  $('lvPlay').onclick = () => S.playing ? stop() : play();
  $('lvSlider').oninput = e => { S.follow = false; seek(S.t0 + +e.target.value); };
  $('lvEnd').onclick = () => { stop(); seek(S.t1); };
  $('lvSpeed').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.speed = +b.dataset.x; $('lvSpeed').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); });

  // aviso de la próxima sesión (si empieza en menos de 3 días)
  function nextBanner(all) {
    const nb = $('lvNext'); if (!nb) return;
    const now = Date.now(), nx = all.find(s => T(s.date_start) > now && T(s.date_start) - now < 3 * 864e5);
    if (!nx) { nb.hidden = true; return; }
    const m = S.meetings.find(x => x.meeting_key === nx.meeting_key);
    const txt = el('span'), go = el('button', 'btn-s', 'Ver');
    go.type = 'button'; go.onclick = async () => { $('lvGp').value = nx.meeting_key; await pickMeeting(nx.meeting_key, nx.session_key); };
    const upd = () => { txt.textContent = 'Próxima: ' + (SES[nx.session_name] || nx.session_name) + (m ? ' · ' + gpName(m) : '') + ' · ' + fmtWhen(T(nx.date_start)) + ' (tu hora) · faltan ' + fmtLeft(T(nx.date_start) - Date.now()).replace(/ \d+ s$/, ''); };
    upd(); setInterval(upd, 30e3);
    nb.replaceChildren(txt, go); nb.hidden = false;
  }
  // pantalla completa: tabla y mapa en grande (TV o celular en horizontal)
  const fsBtn = $('lvFull');
  if (fsBtn && root.requestFullscreen) {
    fsBtn.hidden = false;
    fsBtn.onclick = () => document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen().catch(() => {});
    document.addEventListener('fullscreenchange', () => { fsBtn.textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa'; if (S.D) render(); });
  }

  // ---------- selección de GP y sesión ----------
  function renderSessions() {
    const box = $('lvSes'); box.replaceChildren();
    S.sessions.forEach(s => {
      const b = el('button', 'chip', SES[s.session_name] || s.session_name); b.type = 'button';
      b.dataset.k = s.session_key; if (T(s.date_start) > Date.now()) b.title = 'Empieza ' + fmtWhen(T(s.date_start));
      b.setAttribute('aria-pressed', S.ses && S.ses.session_key === s.session_key);
      b.onclick = () => selectSession(s);
      box.appendChild(b);
    });
  }
  async function pickMeeting(mk, sessionKey) {
    S.sessions = (await api('sessions', { meeting_key: mk })).filter(s => !s.is_cancelled).sort((a, b) => T(a.date_start) - T(b.date_start));
    const now = Date.now();
    let ses = S.sessions.find(s => s.session_key == sessionKey)
      || S.sessions.find(s => now >= T(s.date_start) - 15 * 60e3 && now <= T(s.date_end) + 30 * 60e3)
      || [...S.sessions].reverse().find(s => T(s.date_start) <= now);
    S.ses = ses; renderSessions();
    if (ses) loadSession(ses);
  }

  (async () => {
    try {
      const q = new URLSearchParams(location.search);
      const year = new Date().getFullYear();
      S.meetings = (await api('meetings', { year })).filter(m => !/Testing/i.test(m.meeting_name) && T(m.date_start) <= Date.now() + 3 * 864e5);
      let mk = null, sk = q.get('session');
      if (sk) { const s = (await api('sessions', { session_key: sk }))[0]; if (s) mk = s.meeting_key; }
      const all = (await api('sessions', { year })).filter(s => !s.is_cancelled).sort((a, b) => T(a.date_start) - T(b.date_start));
      nextBanner(all);
      if (!mk) {
        // por defecto: la sesión que se está corriendo; si no hay ninguna, la última que terminó
        const now = Date.now();
        const live = all.find(s => now >= T(s.date_start) - 15 * 60e3 && now <= T(s.date_end) + 30 * 60e3);
        const lastDone = all.filter(s => T(s.date_end) + 30 * 60e3 <= now).pop();
        const pick = live || lastDone;
        if (pick) { mk = pick.meeting_key; sk = pick.session_key; }
      }
      if (!mk) throw new Error('sin GP');
      const sel = $('lvGp');
      sel.replaceChildren(...S.meetings.map(m => { const o = el('option', null, gpName(m)); o.value = m.meeting_key; return o; }).reverse());
      sel.value = mk; sel.onchange = () => { history.replaceState(null, '', '?'); pickMeeting(sel.value); };
      await pickMeeting(mk, sk);
    } catch (e) {
      $('lvBoard').replaceChildren(el('p', 'lv-empty', 'No se pudieron cargar los datos de OpenF1. Recarga la página en unos minutos.'));
    }
  })();
})();
