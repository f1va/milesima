/* Carrusel "squeeze" para las noticias del día.
   Port a JS puro del componente SqueezeCarousel (carousel-squeeze.tsx):
   un panel abierto y el resto apretado en láminas a la derecha. */
(() => {
  'use strict';
  const root = document.getElementById('sqCarousel');
  if (!root) return;

  const OPT = { gap: 16, slatGap: 8, slat: 8, radius: 8, duration: 900, interval: 9000 };
  const SHARES = [-0.06, 0.61, 0.3, 0.15];
  const STRETCHED = [0, 0.71, 0.4, 0.25];
  const SQUEEZED = [-0.12, 0.59, 0.28, 0.13];
  const CAT = { carrera: 'Carrera', pilotos: 'Pilotos', equipos: 'Equipos', tecnica: 'Técnica' };
  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  fetch('data/noticias.json').then(r => r.json()).then(d => {
    let items = d.articles.filter(a => a.date === d.updated && a.img);
    if (items.length < 3) items = d.articles.filter(a => a.img);
    const first = d.hero && d.hero.article;
    items.sort((a, b) => (b.id === first) - (a.id === first));
    items = items.slice(0, 8);
    if (items.length < 2) { const s = root.closest('section'); if (s) s.hidden = true; return; }
    init(items);
  }).catch(() => { const s = root.closest('section'); if (s) s.hidden = true; });

  function init(items) {
    const n = items.length;
    const slats = Math.min(3, Math.max(1, n - 4));
    const ms = () => (reduceMq.matches ? 0 : OPT.duration);

    // ---------- DOM ----------
    const ctrl = el('div', 'sq-ctrl');
    const mkArrow = (back, label) => {
      const b = el('button', 'sq-arrow'); b.type = 'button'; b.setAttribute('aria-label', label);
      b.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="' +
        (back ? 'M9.6 2.6 5.1 7.1h9.1v1.8H5.1l4.5 4.5-1.2 1.2-6-6L1.8 8l.6-.6 6-6 1.2 1.2Z' : 'M6.4 2.6l4.5 4.5H1.8v1.8h9.1l-4.5 4.5 1.2 1.2 6-6 .6-.6-.6-.6-6-6-1.2 1.2Z') + '"/></svg>';
      return b;
    };
    const prev = mkArrow(true, 'Anterior'), next = mkArrow(false, 'Siguiente');
    ctrl.append(prev, next);

    const view = el('div', 'sq-view');
    const strip = el('div', 'sq-strip'); strip.setAttribute('role', 'tablist'); strip.setAttribute('aria-label', 'Noticias del día');
    view.appendChild(strip);

    const copy = el('div', 'sq-copy'); copy.setAttribute('aria-live', 'polite');

    const cards = items.map((a, i) => {
      const c = el('button', 'sq-card'); c.type = 'button'; c.setAttribute('role', 'tab'); c.setAttribute('aria-label', a.title);
      const im = new Image(); im.src = a.img; im.alt = a.imgAlt || ''; im.draggable = false; im.className = 'sq-img'; im.onload = () => im.classList.add('ok'); if (im.complete && im.naturalWidth) im.classList.add('ok');
      const ov = el('span', 'sq-ov'); ov.setAttribute('aria-hidden', 'true');
      ov.append(el('span', 'tagc', CAT[a.cat] || 'Noticia'));
      c.append(im, ov);
      strip.appendChild(c);

      const s = el('div', 'sq-slide');
      const p = el('p', 'sq-text'); p.append(el('span', 'sq-t', a.title), ' ', el('span', 'sq-d', a.summary));
      const l = el('a', 'btn red sq-go'); l.href = 'noticia.html?id=' + encodeURIComponent(a.id); l.append('Leer la nota ', el('span', null, '→'));
      s.append(p, l); copy.appendChild(s);
      return { c, ov, s, l, col: i };
    });

    root.replaceChildren(ctrl, view, copy);

    // ---------- geometría ----------
    let W = 0, H = 0, hero = 0, room = 0, mobile = false, hover = -1;
    const measure = () => {
      W = root.clientWidth;
      mobile = W < 700;
      H = mobile ? Math.round(W * 0.56) : Math.round(Math.min(340, Math.max(180, W * 0.32)));
      hero = mobile ? W - 3 * (OPT.slat + OPT.slatGap) : Math.round(H * 16 / 9);
      room = Math.max(0, W - hero - slats * OPT.slatGap - 3 * OPT.gap - slats * OPT.slat);
      strip.style.height = view.style.height = H + 'px';
      strip.style.setProperty('--sq-img', Math.round(H * 16 / 9) + 'px');
    };
    const share = col => (hover < 0 ? SHARES[col] : hover === col ? STRETCHED[col] : SQUEEZED[col]);
    const widthOf = col => {
      if (col < 0 || col > 3 || mobile) return col === 0 ? hero : OPT.slat;
      return col === 0 ? hero + room * share(0) : room * share(col);
    };
    const spacing = col => (mobile ? OPT.slatGap : col <= 3 ? OPT.gap : OPT.slatGap);
    const leftOf = col => {
      if (col < 0) return col * (OPT.slat + (mobile ? OPT.slatGap : OPT.gap));
      let x = 0;
      for (let c = 1; c <= col; c++) x += widthOf(c - 1) + spacing(c);
      return x;
    };

    // ---------- pintado ----------
    function apply() {
      cards.forEach(k => {
        const w = widthOf(k.col);
        k.c.style.width = w + 'px';
        k.c.style.transform = 'translateX(' + leftOf(k.col) + 'px)';
        k.c.style.borderRadius = Math.min(OPT.radius, w / 2) + 'px';
        k.c.setAttribute('aria-selected', k.col === 0);
        k.c.tabIndex = k.col === 0 ? 0 : -1;
        k.ov.style.opacity = k.col === 0 ? 1 : 0;
        const on = k.col === 0;
        k.s.classList.toggle('on', on);
        k.s.setAttribute('aria-hidden', !on);
        k.l.tabIndex = on ? 0 : -1;
      });
    }
    const setMs = () => root.style.setProperty('--sq-ms', ms() + 'ms');
    const still = fn => { strip.classList.add('still'); fn(); strip.offsetWidth; strip.classList.remove('still'); };

    let busy = false, timer = 0, paused = false;
    function step(by) {
      if (busy || n < 2 || !by) return;
      busy = true; setMs();
      if (by > 0) {
        cards.forEach(k => { k.col -= by; });
        apply();
        setTimeout(() => {
          still(() => { cards.forEach(k => { if (k.col < 0) k.col += n; }); apply(); });
          busy = false; schedule();
        }, ms() + 20);
      } else {
        const k0 = -by;
        still(() => { cards.forEach(k => { if (k.col >= n - k0) k.col -= n; }); apply(); });
        cards.forEach(k => { k.col += k0; });
        apply();
        setTimeout(() => { busy = false; schedule(); }, ms() + 20);
      }
    }

    function schedule() {
      clearTimeout(timer);
      if (paused || reduceMq.matches) return;
      timer = setTimeout(() => step(1), OPT.interval);
    }

    // ---------- eventos ----------
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    cards.forEach(k => {
      k.c.addEventListener('click', () => { if (k.col > 0) step(k.col); });
      k.c.addEventListener('mousemove', () => { if (!mobile && !busy && k.col >= 1 && k.col <= 3 && hover !== k.col) { hover = k.col; setMs(); apply(); } });
    });
    strip.addEventListener('mouseleave', () => { if (hover !== -1) { hover = -1; apply(); } });
    strip.addEventListener('keydown', e => {
      const by = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!by) return; e.preventDefault(); step(by);
    });
    root.addEventListener('mouseenter', () => { paused = true; clearTimeout(timer); });
    root.addEventListener('mouseleave', () => { paused = false; schedule(); });
    root.addEventListener('focusin', () => { paused = true; clearTimeout(timer); });
    root.addEventListener('focusout', () => { paused = false; schedule(); });

    new ResizeObserver(() => { still(() => { measure(); apply(); }); }).observe(root);

    measure(); setMs(); still(apply);
    root.classList.add('ready');
    schedule();
  }
})();
