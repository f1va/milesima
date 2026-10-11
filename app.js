(() => {
  'use strict';

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // ---------- revelado al hacer scroll ----------
  const rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rv.forEach(n => io.observe(n));
  } else rv.forEach(n => n.classList.add('in'));

  // ---------- equipos: ficha con sede, motor y descripción; posición en vivo desde la API ----------
  const TEAMS = [
    { id: 'red_bull', name: 'Red Bull', c: '#3671C6', base: 'Milton Keynes, Inglaterra', motor: 'Red Bull Ford',
      desc: 'Desde 2026 fabrica su propio motor junto a Ford, y en Sepang ganó con él por primera vez. Suma seis títulos de constructores (2010 a 2013, 2022 y 2023). Verstappen ganó con el equipo cuatro títulos de pilotos, de 2021 a 2024.' },
    { id: 'ferrari', name: 'Ferrari', c: '#E8002D', base: 'Maranello, Italia', motor: 'Ferrari',
      desc: 'Es el único equipo que ha corrido todas las temporadas desde 1950. Tiene 16 títulos de constructores; el último llegó en 2008. Hamilton se unió en 2025 y hace pareja con Leclerc.' },
    { id: 'mercedes', name: 'Mercedes', c: '#27F4D2', base: 'Brackley, Inglaterra', motor: 'Mercedes',
      desc: 'Ganó ocho títulos de constructores seguidos, de 2014 a 2021. El motor se hace en Brixworth. Sus pilotos son Antonelli y Russell.' },
    { id: 'mclaren', name: 'McLaren', c: '#FF8000', base: 'Woking, Inglaterra', motor: 'Mercedes',
      desc: 'Bruce McLaren fundó el equipo, que debutó en 1966. Ganó los títulos de constructores de 2024 y 2025, y Norris fue campeón de pilotos en 2025. Corre con Norris y Piastri.' },
    { id: 'aston_martin', name: 'Aston Martin', c: '#229971', base: 'Silverstone, Inglaterra', motor: 'Honda',
      desc: 'Desde 2026 usa motores Honda, y Adrian Newey dirige el diseño del coche. Corre con Alonso y Stroll.' },
    { id: 'alpine', name: 'Alpine', c: '#FF87BC', base: 'Enstone, Inglaterra', motor: 'Mercedes',
      desc: 'Usa motor Mercedes desde 2026, cuando Renault dejó de fabricar motores. Su fábrica ganó títulos como Benetton en 1995 y como Renault en 2005 y 2006. Corre con Gasly y Colapinto.' },
    { id: 'williams', name: 'Williams', c: '#64C4FF', base: 'Grove, Inglaterra', motor: 'Mercedes',
      desc: 'Tiene nueve títulos de constructores; el último fue en 1997. Sainz llegó en 2025 y hace pareja con Albon.' },
    { id: 'rb', name: 'Racing Bulls', c: '#6692FF', base: 'Faenza, Italia', motor: 'Red Bull Ford',
      desc: 'Es el equipo hermano de Red Bull y prepara a sus pilotos jóvenes. Antes se llamó Minardi, Toro Rosso y AlphaTauri. Corre con Lawson y Lindblad.' },
    { id: 'audi', name: 'Audi', c: '#C8C8C8', base: 'Hinwil, Suiza', motor: 'Audi',
      desc: 'Debutó en 2026 sobre lo que era Sauber. El chasis se hace en Hinwil y el motor en Neuburg, Alemania. Corre con Hülkenberg y Bortoleto.' },
    { id: 'haas', name: 'Haas', c: '#B6BABD', base: 'Kannapolis, EE. UU.', motor: 'Ferrari',
      desc: 'Debutó en 2016 y hoy corre en alianza con Toyota. Su base técnica está en Banbury, Inglaterra. Corre con Ocon y Bearman.' },
    { id: 'cadillac', name: 'Cadillac', c: '#9aa0a6', base: 'Fishers, EE. UU.', motor: 'Ferrari',
      desc: 'Es el undécimo equipo de la parrilla, nuevo en 2026 y respaldado por General Motors. Tiene sedes en Fishers (Indiana) y Silverstone. Corre con Pérez y Bottas.' }
  ];
  // logos libres de Wikimedia Commons (dominio público o CC0; Aston Martin CC BY 4.0). Red Bull, Ferrari y Racing Bulls no tienen uno libre.
  const LOGOS = { mercedes: 'svg', mclaren: 'svg', alpine: 'svg', williams: 'png', haas: 'svg', cadillac: 'png', audi: 'svg', aston_martin: 'jpg' };
  const teamsEl = document.getElementById('teams');
  if (teamsEl) {
    const live = {};
    TEAMS.forEach((t, i) => {
      const a = el('article', 'team rv');
      a.style.setProperty('--c', t.c);
      a.style.setProperty('--i', i % 4);
      const top = el('div', 'tm-top');
      const img = new Image(); img.alt = ''; img.decoding = 'async';
      img.onload = () => top.prepend(img);
      img.src = 'img/equipos/' + t.name.toLowerCase().replace(/\s+/g, '-') + '.jpg';
      if (LOGOS[t.id]) {
        const lg = el('span', 'tm-logo'); const li = new Image(); li.alt = 'Logo de ' + t.name; li.decoding = 'async';
        li.onerror = () => lg.remove(); li.src = 'img/logos/' + t.id + '.' + LOGOS[t.id]; lg.appendChild(li); top.appendChild(lg);
      }
      top.appendChild(el('h3', null, t.name));
      const st = el('span', 'tm-st'); live[t.id] = st; top.appendChild(st);
      const facts = el('dl', 'tm-facts');
      [['Sede', t.base], ['Motor', t.motor]].forEach(([k, v]) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); facts.appendChild(d); });
      a.append(top, facts, el('p', 'tm-desc', t.desc));
      teamsEl.appendChild(a);
      requestAnimationFrame(() => a.classList.add('in'));
    });
    fetch('https://api.jolpi.ca/ergast/f1/current/constructorstandings.json').then(r => r.json()).then(d => {
      d.MRData.StandingsTable.StandingsLists[0].ConstructorStandings.forEach(x => {
        const s = live[x.Constructor.constructorId]; if (s) s.textContent = x.position + '.º · ' + x.points + ' pts';
      });
    }).catch(() => {});
  }

  // ---------- próximo GP ----------
  const nextName = document.getElementById('nextName');
  if (nextName) {
    fetch('https://api.jolpi.ca/ergast/f1/current/next.json')
      .then(r => r.json())
      .then(d => {
        const race = d.MRData.RaceTable.Races[0];
        if (!race) throw new Error('sin carrera');
        nextName.textContent = race.raceName.replace('Grand Prix', 'GP');
        document.getElementById('nextCircuit').textContent = race.Circuit.circuitName;
        const when = new Date(race.date + 'T' + (race.time || '12:00:00Z'));
        document.getElementById('nextDate').textContent = when.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
        const cd = document.getElementById('cd'); cd.hidden = false;
        const pad = n => String(n).padStart(2, '0');
        const tick = () => {
          let s = Math.max(0, Math.floor((when - Date.now()) / 1000));
          const dd = Math.floor(s / 86400); s -= dd * 86400;
          const hh = Math.floor(s / 3600); s -= hh * 3600;
          const mm = Math.floor(s / 60); s -= mm * 60;
          document.getElementById('cdD').textContent = pad(dd);
          document.getElementById('cdH').textContent = pad(hh);
          document.getElementById('cdM').textContent = pad(mm);
          document.getElementById('cdS').textContent = pad(s);
        };
        tick(); setInterval(tick, 1000);
      })
      .catch(() => { nextName.textContent = 'Por confirmar'; });
  }

  // ---------- posiciones (Jolpica/Ergast) + fotos de pilotos (data/pilotos.json) ----------
  const COL = { mercedes: '#27F4D2', ferrari: '#E8002D', red_bull: '#3671C6', mclaren: '#FF8000', aston_martin: '#229971', alpine: '#FF87BC', williams: '#64C4FF', rb: '#6692FF', racing_bulls: '#6692FF', audi: '#C8C8C8', haas: '#B6BABD', cadillac: '#9aa0a6' };
  const API = 'https://api.jolpi.ca/ergast/f1/current/';
  const getJSON = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const photosP = getJSON('data/pilotos.json').catch(() => ({}));
  const drvP = () => getJSON(API + 'driverstandings.json').then(d => d.MRData.StandingsTable.StandingsLists[0]);
  const conP = () => getJSON(API + 'constructorstandings.json').then(d => d.MRData.StandingsTable.StandingsLists[0]);
  // equipo actual de cada piloto = el de la última carrera (un piloto puede haber corrido en dos equipos)
  const curP = getJSON(API + 'last/results.json').then(d => { const m = {}; (d.MRData.RaceTable.Races[0] || { Results: [] }).Results.forEach(r => m[r.Driver.driverId] = r.Constructor); return m; }).catch(() => ({}));
  const curTeam = (x, cur) => cur[x.Driver.driverId] || x.Constructors[x.Constructors.length - 1] || {};
  const teamName = n => { n = n.replace(/ F1 Team$/, ''); return n === 'RB' ? 'Racing Bulls' : n; };
  const NAC = { Italian: 'Italia', British: 'Reino Unido', Monegasque: 'Mónaco', Dutch: 'Países Bajos', Australian: 'Australia', French: 'Francia', 'New Zealander': 'Nueva Zelanda', Argentine: 'Argentina', Argentinian: 'Argentina', Brazilian: 'Brasil', German: 'Alemania', Spanish: 'España', Thai: 'Tailandia', Japanese: 'Japón', Canadian: 'Canadá', Finnish: 'Finlandia', Mexican: 'México', American: 'Estados Unidos', Danish: 'Dinamarca', Chinese: 'China', Bulgarian: 'Bulgaria' };

  // miniatura del piloto: foto con su equipo actual (data/pilotos.json) o, si no hay, sus iniciales
  const initials = d => (d.givenName[0] + d.familyName[0]).toUpperCase();
  function thumb(p, cls, ini) {
    const w = el('span', (cls || 'av') + (p && p.img ? '' : ' ini'));
    if (p && p.img) {
      const im = new Image(); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.onerror = () => { im.remove(); w.classList.add('ini'); w.textContent = ini || ''; };
      if (p.pos) im.style.objectPosition = p.pos;
      im.src = p.img; w.appendChild(im);
    } else w.textContent = ini || '';
    return w;
  }

  function fillTable(id, rows) {
    const ol = document.getElementById(id); if (!ol) return;
    ol.replaceChildren(...rows.map(r => {
      const li = el('li'); const t = el('span', 't'); t.style.setProperty('--c', COL[r.team] || '#26262b');
      if ('ph' in r) { li.classList.add('wimg'); t.append(thumb(r.ph, 'av sm', r.ini)); }
      t.append(r.name);
      li.append(el('span', 'p', r.pos), t, el('span', 'pts', r.pts)); return li;
    }));
  }
  const fail = id => { const ol = document.getElementById(id); if (ol) ol.replaceChildren(el('li', null, 'No disponible por ahora.')); };
  if (document.getElementById('stDrv')) {
    Promise.all([drvP(), photosP, curP]).then(([l, ph, cur]) => {
      fillTable('stDrv', l.DriverStandings.map(x => ({ pos: x.position, name: x.Driver.givenName[0] + '. ' + x.Driver.familyName, team: curTeam(x, cur).constructorId, pts: x.points, ph: ph[x.Driver.driverId], ini: initials(x.Driver) })));
    }).catch(() => fail('stDrv'));
    conP().then(l => {
      fillTable('stCon', l.ConstructorStandings.map(x => ({ pos: x.position, name: teamName(x.Constructor.name), team: x.Constructor.constructorId, pts: x.points })));
    }).catch(() => fail('stCon'));
  }

  // ---------- carrera a carrera de un piloto (se carga al abrir su ficha) ----------
  const GPN = { Australian: 'Australia', Chinese: 'China', Japanese: 'Japón', Bahrain: 'Baréin', 'Saudi Arabian': 'Arabia Saudita', Miami: 'Miami', Canadian: 'Canadá', Monaco: 'Mónaco', Barcelona: 'Barcelona', Spanish: 'España', Austrian: 'Austria', British: 'Gran Bretaña', Belgian: 'Bélgica', Hungarian: 'Hungría', Dutch: 'Países Bajos', Italian: 'Italia', Azerbaijan: 'Azerbaiyán', Singapore: 'Singapur', 'United States': 'Estados Unidos', 'Mexico City': 'México', 'São Paulo': 'São Paulo', 'Las Vegas': 'Las Vegas', Qatar: 'Catar', 'Abu Dhabi': 'Abu Dabi', 'Emilia Romagna': 'Emilia-Romaña' };
  const gpName = n => { if (/Bahrain Grand Prix in Malaysia/.test(n)) return 'Baréin (Sepang)'; const k = n.replace(/ Grand Prix.*$/, ''); return GPN[k] || k; };
  const STATUS = { Finished: 'Terminó', Lapped: 'Doblado', Retired: 'Abandono', Disqualified: 'Descalificado', 'Did not start': 'No largó', 'Did not qualify': 'No clasificó', Withdrew: 'Retirado antes de largar', Accident: 'Accidente', Collision: 'Choque', 'Collision damage': 'Daño por choque', Engine: 'Motor', 'Power Unit': 'Unidad de potencia', Gearbox: 'Caja de cambios', Hydraulics: 'Hidráulica', Brakes: 'Frenos', Electrical: 'Eléctrico', Spun: 'Trompo', Overheating: 'Sobrecalentamiento', Suspension: 'Suspensión', Puncture: 'Pinchazo' };
  const statusEs = (s, pt) => /^\+\d+ Laps?$/.test(s) ? 'Doblado (' + s.replace(/Laps?/, 'v.') + ')' : (STATUS[s] || (pt === 'R' ? 'Abandono (' + s + ')' : s));
  const posEs = (pt, s) => /^\d+$/.test(pt) ? pt + '.º' : ({ R: 'Abandono', D: 'DSQ', W: 'No largó', N: 'Sin clasificar', E: 'Excluido', F: 'No clasificó' }[pt] || pt || s);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (t, at) => { const e = document.createElementNS(SVGNS, t); for (const k in at) e.setAttribute(k, at[k]); return e; };

  function driverRaces(id) {
    const all = u => getJSON(u + '?limit=100').then(d => d.MRData.RaceTable.Races);
    return Promise.all([all(API + 'drivers/' + id + '/results.json'), all(API + 'drivers/' + id + '/sprint.json').catch(() => [])]).then(([rs, ss]) => {
      const spr = {}; ss.forEach(r => spr[r.round] = r.SprintResults[0]);
      return rs.map(r => {
        const x = r.Results[0], s = spr[r.round];
        return { round: +r.round, gp: gpName(r.raceName), grid: x.grid === '0' ? 'Pits' : x.grid, pos: posEs(x.positionText, x.status), status: statusEs(x.status, x.positionText),
          dnf: !/^\d+$/.test(x.positionText), pts: +x.points, spts: s ? +s.points : 0, spos: s ? posEs(s.positionText, s.status) : null };
      });
    });
  }

  // un solo valor por fecha (carrera + sprint): barras finas, borde superior redondeado, tooltip al pasar
  function pointsChart(races, rounds) {
    const W = 640, H = 150, L = 26, B = 22, T = 10, cw = (W - L) / rounds;
    const max = Math.max(25, ...races.map(r => r.pts + r.spts));
    const y = v => T + (H - T - B) * (1 - v / max);
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'rchart', role: 'img', 'aria-label': 'Puntos por fecha' });
    [0, 10, 20].filter(v => v <= max).forEach(v => {
      svg.append(svgEl('line', { x1: L, x2: W, y1: y(v), y2: y(v), class: 'gl' }));
      const t = svgEl('text', { x: L - 6, y: y(v) + 3, class: 'ax', 'text-anchor': 'end' }); t.textContent = v; svg.append(t);
    });
    const byR = {}; races.forEach(r => byR[r.round] = r);
    const tip = el('div', 'rtip'); tip.hidden = true;
    for (let i = 1; i <= rounds; i++) {
      const r = byR[i], x = L + (i - 1) * cw, bw = Math.min(16, cw - 4), bx = x + (cw - bw) / 2, tot = r ? r.pts + r.spts : 0;
      if (tot > 0) {
        const h = y(0) - y(tot), rr = Math.min(4, h / 2, bw / 2);
        svg.append(svgEl('path', { class: 'bar-m', d: 'M' + bx + ',' + y(0) + 'V' + (y(tot) + rr) + 'Q' + bx + ',' + y(tot) + ' ' + (bx + rr) + ',' + y(tot) + 'H' + (bx + bw - rr) + 'Q' + (bx + bw) + ',' + y(tot) + ' ' + (bx + bw) + ',' + (y(tot) + rr) + 'V' + y(0) + 'Z' }));
      } else if (r) svg.append(svgEl('rect', { x: bx, y: y(0) - 2, width: bw, height: 2, class: 'zero' }));
      const lb = svgEl('text', { x: x + cw / 2, y: H - 6, class: 'ax', 'text-anchor': 'middle' }); lb.textContent = i; svg.append(lb);
      const hit = svgEl('rect', { x, y: 0, width: cw, height: H, class: 'hit' });
      hit.addEventListener('pointerenter', () => {
        if (!r) { tip.textContent = 'Fecha ' + i + ': no corrió'; }
        else tip.textContent = 'F' + i + ' ' + r.gp + ': ' + tot + ' pts · carrera ' + r.pos + ' (' + r.pts + ')' + (r.spos ? ' · sprint ' + r.spos + ' (' + r.spts + ')' : '');
        tip.hidden = false; tip.style.left = Math.min(Math.max((x + cw / 2) / W * 100, 15), 85) + '%';
      });
      hit.addEventListener('pointerleave', () => { tip.hidden = true; });
      svg.append(hit);
    }
    const wrap = el('div', 'rwrap'); wrap.append(svg, tip);
    return wrap;
  }

  function racesTable(races) {
    const t = el('table', 'rtab');
    const hr = el('tr'); ['F', 'Gran Premio', 'Salida', 'Llegada', 'Estado', 'Pts'].forEach((h, i) => { const th = el('th', i === 2 ? 'opt' : null, h); th.scope = 'col'; hr.appendChild(th); });
    const th = el('thead'); th.appendChild(hr); t.appendChild(th);
    const tb = el('tbody'); let acc = 0;
    races.forEach(r => {
      acc += r.pts + r.spts;
      const tr = el('tr', r.dnf ? 'dnf' : null);
      const pts = el('td', 'n', String(r.pts + r.spts)); pts.title = 'Acumulado: ' + acc;
      if (r.spos) pts.appendChild(el('small', null, ' (' + r.spts + ' S)'));
      tr.append(el('td', 'n', r.round), el('td', null, r.gp), el('td', 'n opt', r.grid), el('td', 'n', r.pos), el('td', 'stx', r.status), pts);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    const box = el('div', 'rtab-w'); box.appendChild(t);
    return box;
  }

  // página de posiciones: pestañas + filas desplegables
  const stand = document.getElementById('stand');
  if (stand) {
    const fmtPts = n => (Math.round(n * 10) / 10).toLocaleString('es-MX');
    const data = Promise.all([drvP(), conP(), photosP, curP]);
    let open = null;

    function row(i, r, leader, prev) {
      const li = el('li', 'srow'); li.style.setProperty('--c', COL[r.team] || '#26262b');
      const btn = el('button', 'shead'); btn.type = 'button'; btn.setAttribute('aria-expanded', 'false');
      const who = el('span', 'who'); who.append(el('strong', null, r.name), el('small', null, r.sub));
      const bar = el('span', 'bar'); const fill = el('i'); fill.style.setProperty('--w', leader ? (r.pts / leader * 100).toFixed(1) + '%' : '0%'); bar.appendChild(fill);
      btn.append(el('span', 'p', r.pos), r.badge, who, bar, el('span', 'pts', fmtPts(r.pts)), el('span', 'chev', '›'));
      const det = el('div', 'sdet'); det.hidden = true; det.id = 'sd-' + i; btn.setAttribute('aria-controls', det.id);
      const stats = el('dl', 'stats');
      const add = (k, v) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); stats.appendChild(d); };
      add('Victorias', r.wins);
      add('Al líder', i === 0 ? 'Líder' : '−' + fmtPts(leader - r.pts));
      add('Al de adelante', i === 0 ? '—' : '−' + fmtPts(prev - r.pts));
      r.extra.forEach(([k, v]) => add(k, v));
      det.appendChild(stats);
      let loadRaces = null;
      if (r.did) {
        const rc = el('div', 'races'); rc.append(el('h4', null, 'Carrera a carrera'), el('p', 'rload', 'Cargando resultados…')); det.appendChild(rc);
        loadRaces = () => { loadRaces = null; driverRaces(r.did).then(rs => { rc.lastChild.remove(); rc.append(pointsChart(rs, r.rounds), el('p', 'rnote', 'Puntos por fecha (carrera + sprint). Pasa el cursor o toca una barra para ver el detalle.'), racesTable(rs)); }).catch(() => { rc.lastChild.textContent = 'No se pudieron cargar los resultados.'; }); };
      }
      if (r.more) det.appendChild(r.more);
      btn.onclick = () => {
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        if (open && open !== li) { open.querySelector('.shead').setAttribute('aria-expanded', 'false'); open.querySelector('.sdet').hidden = true; open.classList.remove('on'); }
        if (!isOpen && loadRaces) loadRaces();
        btn.setAttribute('aria-expanded', String(!isOpen)); det.hidden = isOpen; li.classList.toggle('on', !isOpen); open = isOpen ? null : li;
      };
      li.append(btn, det);
      return li;
    }

    function render(t) {
      open = null;
      data.then(([dl, cl, ph, cur]) => {
        const lead = document.getElementById('stLead');
        if (lead) lead.textContent = 'Temporada ' + dl.season + ', tras la fecha ' + dl.round + '. Toca un piloto o equipo para ver el detalle.';
        let rows;
        if (t === 'drv') {
          rows = dl.DriverStandings.map(x => {
            const p = ph[x.Driver.driverId] || {}; const c = curTeam(x, cur);
            let more = null;
            if (p.credit) { more = el('a', 'cred', 'Foto: ' + p.credit + ' ↗'); more.href = p.file; more.target = '_blank'; more.rel = 'noopener'; }
            return { pos: x.position, name: x.Driver.givenName + ' ' + x.Driver.familyName, sub: teamName(c.name || ''), team: c.constructorId, pts: +x.points, wins: x.wins,
              did: x.Driver.driverId, rounds: +dl.round, badge: thumb(p, 'av', initials(x.Driver)), extra: [['Número', x.Driver.permanentNumber || '—'], ['País', NAC[x.Driver.nationality] || x.Driver.nationality]], more };
          });
        } else {
          rows = cl.ConstructorStandings.map(x => {
            const ds = dl.DriverStandings.filter(d => curTeam(d, cur).constructorId === x.Constructor.constructorId);
            const more = el('div', 'pair');
            ds.forEach(d => { const s = el('span', 'mate'); s.append(thumb(ph[d.Driver.driverId], 'av sm', initials(d.Driver)), d.Driver.familyName + ' · ' + fmtPts(+d.points)); more.appendChild(s); });
            const sw = el('span', 'sw'); sw.style.background = COL[x.Constructor.constructorId] || '#26262b';
            return { pos: x.position, name: teamName(x.Constructor.name), sub: ds.map(d => d.Driver.familyName).join(' · '), team: x.Constructor.constructorId, pts: +x.points, wins: x.wins,
              badge: sw, extra: [], more };
          });
        }
        const leader = rows[0] ? rows[0].pts : 0;
        stand.className = 'stand ' + t;
        stand.replaceChildren(...rows.map((r, i) => row(i, r, leader, i ? rows[i - 1].pts : 0)));
      }).catch(() => stand.replaceChildren(el('li', 'st-err', 'No se pudo cargar la tabla. Recarga la página en unos minutos.')));
    }

    const tabs = document.getElementById('stTabs');
    tabs.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b || b.getAttribute('aria-selected') === 'true') return;
      tabs.querySelectorAll('.chip').forEach(c => { const on = c === b; c.setAttribute('aria-selected', on); c.setAttribute('aria-pressed', on); });
      render(b.dataset.t);
    });
    render('drv');
  }

  // ---------- noticias (data/noticias.json, se actualiza a diario) ----------
  const CAT = { carrera: 'Carrera', pilotos: 'Pilotos', equipos: 'Equipos', tecnica: 'Técnica' };
  const CCOL = { carrera: '#B8F32A', pilotos: '#B8F32A', equipos: '#B8F32A', tecnica: '#B8F32A' };
  const fmt = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
  const rel = iso => { const d = Math.round((new Date(new Date().toDateString()) - new Date(iso + 'T00:00:00')) / 864e5); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : 'hace ' + d + ' d'; };
  const link = id => 'noticia.html?id=' + encodeURIComponent(id);

  function photo(a, cls) {
    const ph = el('div', cls || 'ph');
    if (a.img) {
      const im = new Image(); im.alt = a.imgAlt || ''; im.loading = 'lazy'; im.decoding = 'async';
      im.onerror = () => im.remove();
      im.src = a.img; ph.appendChild(im);
    }
    return ph;
  }

  function card(a) {
    const b = el('a', 'card'); b.href = link(a.id);
    b.style.setProperty('--c', CCOL[a.cat] || '#B8F32A');
    const body = el('div', 'b');
    const meta = el('div', 'meta');
    meta.append(el('span', 'tagc', CAT[a.cat] || ''), rel(a.date));
    body.append(meta, el('h3', null, a.title), el('p', null, a.summary));
    b.append(photo(a), body);
    return b;
  }

  const list = document.getElementById('newsList');
  const status = document.getElementById('status');
  const article = document.getElementById('article');

  if (list || article || document.getElementById('hTitle')) {
    // las notas que salen de portada pasan a data/archivo.json; Noticias y cada nota las siguen encontrando
    const needArchive = !!article || (list && !parseInt(list.dataset.limit || '0', 10));
    const noArchive = { articles: [] };
    Promise.all([
      fetch('data/noticias.json', { cache: 'no-cache' }).then(r => r.json()),
      needArchive ? fetch('data/archivo.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : noArchive).catch(() => noArchive) : noArchive
    ]).then(([d, ar]) => {
      const byId = {}; d.articles.forEach(a => byId[a.id] = a);
      const all = d.articles.concat((ar.articles || []).filter(a => !byId[a.id]));
      all.forEach(a => { if (!byId[a.id]) byId[a.id] = a; });

      // portada: tema del día
      const h = d.hero;
      if (h && document.getElementById('hTitle')) {
        document.getElementById('hKicker').textContent = h.kicker;
        document.getElementById('hDate').textContent = fmtShort(d.updated);
        document.getElementById('hTitle').textContent = h.title;
        document.getElementById('hSummary').textContent = h.summary;
        document.getElementById('hRead').href = link(h.article);
        const hp = document.getElementById('hPhoto');
        if (hp && byId[h.article] && byId[h.article].img) {
          const im = new Image(); im.alt = byId[h.article].imgAlt || ''; im.decoding = 'async';
          im.onload = () => hp.classList.add('has');
          im.src = byId[h.article].img; hp.appendChild(im);
        }
        const ul = document.getElementById('hTopicList');
        (h.topics || []).forEach(id => {
          if (!byId[id]) return;
          const li = el('li'); const a = el('a', null, byId[id].title); a.href = link(id);
          li.appendChild(a); ul.appendChild(li);
        });
        if (ul.children.length) document.getElementById('hTopics').hidden = false;
      }

      // más leídas
      const tr = document.getElementById('trend');
      if (tr) d.articles.slice(0, 5).forEach(a => { const li = el('li'); const l = el('a', null, a.title); l.href = link(a.id); li.appendChild(l); tr.appendChild(li); });

      const upd = document.getElementById('upd');
      if (upd) upd.textContent = 'Actualizado el ' + fmtShort(d.updated) + '.';

      // lista (portada = últimas; noticias.html = todas con filtros)
      if (list) {
        const limit = parseInt(list.dataset.limit || '0', 10);
        let shownN = 12, curCat = 'todo';
        const more = limit ? null : el('button', 'more more-btn', 'Ver más notas');
        if (more) { more.type = 'button'; more.hidden = true; list.after(more); more.onclick = () => { shownN += 12; render(curCat); }; }
        const render = cat => {
          if (cat !== curCat) shownN = 12;
          curCat = cat;
          let sel = limit ? d.articles : all;
          if (cat !== 'todo') sel = sel.filter(a => a.cat === cat);
          const total = sel.length;
          sel = sel.slice(0, limit || shownN);
          list.replaceChildren(...sel.map(card));
          if (more) more.hidden = sel.length >= total;
          if (status) status.textContent = total ? (limit ? '' : total + ' notas') : 'No hay notas en esta categoría por ahora.';
        };
        render('todo');
        const filters = document.getElementById('filters');
        if (filters) filters.addEventListener('click', e => {
          const btn = e.target.closest('.chip'); if (!btn) return;
          document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === btn));
          render(btn.dataset.cat);
        });
      }

      // página de una nota
      if (article) {
        const a = byId[new URLSearchParams(location.search).get('id')];
        if (!a) {
          article.replaceChildren(el('h1', null, 'Nota no encontrada'), Object.assign(el('a', 'more', '← Volver a Noticias'), { href: 'noticias.html' }));
          document.title = 'Nota no encontrada · Milésima';
          return;
        }
        document.title = a.title + ' · Milésima';
        const md = document.querySelector('meta[name="description"]'); if (md) md.content = a.summary;
        const am = document.getElementById('aMeta');
        am.style.setProperty('--c', CCOL[a.cat] || '#B8F32A');
        am.replaceChildren(el('span', 'tagc', CAT[a.cat] || ''), fmt(a.date));
        document.getElementById('aTitle').textContent = a.title;
        document.getElementById('aSum').textContent = a.summary;
        const fig = document.getElementById('aFig');
        if (a.img) {
          const im = new Image(); im.alt = a.imgAlt || ''; im.decoding = 'async';
          im.onerror = () => fig.remove();
          im.src = a.img; fig.prepend(im);
          document.getElementById('aCredit').textContent = 'Foto: ' + (a.imgCredit || '');
        } else fig.remove();
        document.getElementById('aBody').replaceChildren(...a.body.map(t => el('p', null, t)));
        // publicación oficial incrustada (opcional): a.embed = { platform: 'x' | 'instagram', url }
        if (a.embed && /^https:\/\/(x\.com|twitter\.com|www\.instagram\.com)\//.test(a.embed.url)) {
          const box = el('div', 'embed'); const btn = el('button', 'more', 'Ver publicación oficial en ' + (a.embed.platform === 'instagram' ? 'Instagram' : 'X'));
          btn.onclick = () => {
            const bq = el('blockquote'); const lk = el('a', null, a.embed.url); lk.href = a.embed.url; bq.appendChild(lk);
            const sc = document.createElement('script'); sc.async = true;
            if (a.embed.platform === 'instagram') { bq.className = 'instagram-media'; bq.dataset.instgrmPermalink = a.embed.url; sc.src = 'https://www.instagram.com/embed.js'; }
            else { bq.className = 'twitter-tweet'; sc.src = 'https://platform.twitter.com/widgets.js'; }
            box.replaceChildren(bq, sc);
          };
          box.appendChild(btn); document.getElementById('aBody').after(box);
        }
        const s = document.getElementById('aSrc'); s.textContent = 'Fuente: ' + a.source + ' ↗'; s.href = a.url;
        const more = document.getElementById('aMore');
        d.articles.filter(x => x.id !== a.id).slice(0, 3).forEach(x => more.appendChild(card(x)));
      }
    }).catch(() => {
      if (list) list.replaceChildren();
      if (status) status.textContent = 'No se pudieron cargar las noticias. Recarga la página en unos minutos.';
      if (article) article.replaceChildren(el('p', null, 'No se pudo cargar la nota. Recarga la página.'));
    });
  }
})();
