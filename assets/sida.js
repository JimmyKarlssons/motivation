/* Motivation – interaktiva delar. Varje figur har en statisk version i HTML som ersätts här. */
(function () {
  'use strict';

  const tal = (x, d = 2) => { const s = Math.abs(x).toFixed(d); return (x < 0 && +s !== 0 ? '−' : '') + s.replace('.', ','); };
  const lasTal = (s) => parseFloat(s.replace('−', '-').replace(',', '.'));
  const el = (tag, attr = {}, ...barn) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attr)) {
      if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v);
    }
    barn.flat().forEach((b) => b && e.append(b));
    return e;
  };

  // Kategorier i SDT:s regleringskontinuum
  const KATEGORI = {
    'Amotivation': 'amot',
    'Yttre reglering': 'kontroll',
    'Introjicerad reglering': 'kontroll',
    'Identifierad reglering': 'autonom',
    'Integrerad reglering': 'autonom',
    'Inre motivation': 'autonom',
  };
  const KAT_TEXT = { amot: 'Ingen motiverad reglering', kontroll: 'Kontrollerad motivation', autonom: 'Autonom motivation' };

  /* ---------- Innehållsförteckning: markera aktuellt avsnitt ---------- */
  const mobilToc = document.querySelector('details.inneh-mobil');
  if (mobilToc && window.matchMedia('(max-width: 1039px)').matches) mobilToc.open = false;
  const tocLankar = [...document.querySelectorAll('.inneh a')];
  if (tocLankar.length && 'IntersectionObserver' in window) {
    const rubriker = tocLankar.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
    const syns = new Map();
    const obs = new IntersectionObserver((poster) => {
      poster.forEach((p) => syns.set(p.target.id, p.boundingClientRect.top));
      let aktuell = rubriker[0];
      for (const r of rubriker) if (r.getBoundingClientRect().top < 140) aktuell = r;
      tocLankar.forEach((a) => a.classList.toggle('aktiv', a.hash === '#' + aktuell.id));
    }, { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
    rubriker.forEach((r) => obs.observe(r));
  }

  /* ---------- Regleringskontinuumet ---------- */
  document.querySelectorAll('.figur[data-typ="kontinuum"]').forEach((fig) => {
    const former = [...fig.querySelectorAll('li')].map((li) => {
      const namn = li.querySelector('strong').textContent.trim();
      const eng = (li.querySelector('em') || {}).textContent || '';
      const def = li.textContent.replace(namn, '').replace('(' + eng + ')', '').replace(/^[\s:]+/, '').trim();
      return { namn, eng, def, kat: KATEGORI[namn] || 'amot' };
    });
    const lista = fig.querySelector('ul');
    const kont = el('div', { class: 'kont', role: 'group', 'aria-label': 'Regleringskontinuumet' });
    const sp = (a, b) => `grid-column: ${a} / ${b}`;
    kont.append(el('div', { class: 'kont-klammer', style: sp(2, 6), text: 'Yttre motivation' }));
    const detalj = el('div', { class: 'kont-detalj', 'aria-live': 'polite' });
    const knappar = former.map((f, i) => {
      const b = el('button', { type: 'button', class: 'kont-knapp', 'data-kat': f.kat, 'aria-pressed': 'false', style: sp(i + 1, i + 2) },
        f.namn, el('small', { text: KAT_TEXT[f.kat] }));
      b.addEventListener('click', () => valj(i));
      b.addEventListener('keydown', (e) => {
        const steg = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (steg) { e.preventDefault(); const n = (i + steg + former.length) % former.length; knappar[n].focus(); valj(n); }
      });
      kont.append(b);
      return b;
    });
    kont.append(
      el('div', { class: 'kont-kat', 'data-kat': 'amot', style: sp(1, 2), text: '' }),
      el('div', { class: 'kont-kat', 'data-kat': 'kontroll', style: sp(2, 4), text: 'Kontrollerad motivation' }),
      el('div', { class: 'kont-kat', 'data-kat': 'autonom', style: sp(4, 7), text: 'Autonom motivation' }),
      el('div', { class: 'kont-axel' }, el('span', { text: 'Lägre' }), el('span', { text: 'Högre grad av självbestämmande' })),
    );
    function valj(i) {
      const f = former[i];
      knappar.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
      detalj.style.setProperty('--k', `var(--${f.kat})`);
      detalj.replaceChildren(
        el('h4', {}, f.namn + ' ', el('span', { class: 'eng', text: f.eng ? '(' + f.eng + ')' : '' })),
        el('p', { text: f.def }),
        el('p', { class: 'kat', text: KAT_TEXT[f.kat] + (f.kat !== 'amot' && f.namn !== 'Inre motivation' ? ' · yttre motivation' : '') }),
      );
    }
    lista.replaceWith(kont, detalj);
    valj(3);
  });

  /* ---------- Stapeldiagram från tabell ---------- */
  document.querySelectorAll('.figur[data-typ="staplar"]').forEach((fig) => {
    const tabell = fig.querySelector('table');
    const kolumner = [...tabell.querySelectorAll('thead th')].slice(1).map((th) => th.textContent.trim());
    const rader = [...tabell.querySelectorAll('tbody tr')].map((tr) => {
      const c = [...tr.children];
      return { namn: c[0].textContent.trim(), v: c.slice(1).map((td) => lasTal(td.textContent.trim())) };
    });
    const alla = rader.flatMap((r) => r.v).filter((x) => !Number.isNaN(x));
    const steg = fig.dataset.steg ? lasTal(fig.dataset.steg) : 0.2;
    const dec = fig.dataset.dec ? +fig.dataset.dec : 2;
    const enhet = fig.dataset.enhet ? '\u00a0' + fig.dataset.enhet : '';
    // Lämna minst ett halvt skalsteg utanför längsta stapeln, så att värdet får plats.
    let min = Math.min(0, Math.floor(Math.min(...alla) / steg) * steg);
    let max = Math.max(0, Math.ceil(Math.max(...alla) / steg) * steg);
    if (min < 0 && Math.min(...alla) - min < steg / 2) min -= steg;
    if (max > 0 && max - Math.max(...alla) < steg / 2) max += steg;
    const pos = (x) => ((x - min) / (max - min)) * 100;
    const kategori = fig.dataset.farg === 'kategori';

    const val = el('div', { class: 'diagram-val', role: 'group', 'aria-label': 'Välj utfall' });
    const ytan = el('div', { class: 'staplar' });
    const delar = rader.map((r) => {
      const stapel = el('div', { class: 'stapel', 'data-kat': kategori ? (KATEGORI[r.namn] || '') : '' });
      const varde = el('div', { class: 'stapel-varde' });
      const spar = el('div', { class: 'stapel-spar' }, el('div', { class: 'stapel-noll', style: `left: calc(${pos(0)}% - 1px)` }), stapel, varde);
      ytan.append(el('div', { class: 'stapel-namn', text: r.namn }), spar);
      return { r, stapel, varde, spar };
    });
    const skala = el('div', { class: 'stapel-skala', 'aria-hidden': 'true' });
    const skalDec = steg >= 1 ? 0 : 1;
    for (let x = min; x <= max + 1e-9; x += steg) skala.append(el('span', { style: `left: ${pos(x)}%`, text: tal(x, skalDec) + enhet }));
    ytan.append(el('div'), skala);

    function visa(k) {
      [...val.children].forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
      delar.forEach(({ r, stapel, varde, spar }) => {
        const x = r.v[k];
        if (Number.isNaN(x)) {
          stapel.style.width = '0';
          varde.textContent = 'ingen uppgift';
          varde.classList.add('saknas');
          varde.style.left = `calc(${pos(0)}% + 6px)`;
          varde.style.transform = 'none';
          spar.setAttribute('aria-label', `${r.namn}: ingen uppgift`);
          return;
        }
        varde.classList.remove('saknas');
        const a = pos(Math.min(0, x)), b = pos(Math.max(0, x));
        stapel.style.left = a + '%';
        stapel.style.width = Math.max(b - a, 0.6) + '%';
        varde.textContent = tal(x, dec) + enhet;
        varde.style.left = x >= 0 ? `calc(${b}% + 6px)` : `calc(${a}% - 6px)`;
        varde.style.transform = x >= 0 ? 'none' : 'translateX(-100%)';
        spar.setAttribute('aria-label', `${r.namn}: ${tal(x, dec)}${enhet}`);
      });
    }
    if (kolumner.length > 1) {
      kolumner.forEach((k, i) => {
        const b = el('button', { type: 'button', text: k, 'aria-pressed': 'false' });
        b.addEventListener('click', () => visa(i));
        val.append(b);
      });
      fig.prepend(val);
    }
    const tabellVy = el('details', {}, el('summary', { text: 'Visa som tabell' }));
    tabell.replaceWith(ytan);
    tabellVy.append(tabell);
    if (kategori) {
      fig.append(el('div', { class: 'forklaring' },
        el('span', { style: '--s: var(--amot)', text: 'Amotivation' }),
        el('span', { style: '--s: var(--kontroll)', text: 'Kontrollerad motivation' }),
        el('span', { style: '--s: var(--autonom)', text: 'Autonom motivation' })));
    }
    fig.append(tabellVy);
    const kalla = fig.querySelector('.figur-kalla');
    if (kalla) fig.append(kalla);
    visa(0);
  });

  /* ---------- Quiz ---------- */
  document.querySelectorAll('.quiz').forEach((ruta) => {
    const banken = JSON.parse(ruta.querySelector('script').textContent);
    const antal = ruta.dataset.antal ? +ruta.dataset.antal : 0;
    const status = el('div', { class: 'quiz-status' });
    const poang = el('span', { 'aria-live': 'polite' });
    const om = el('button', { type: 'button', text: antal ? 'Nya frågor' : 'Börja om' });
    const ovaFel = el('button', { type: 'button', text: 'Gör om felsvaren', hidden: '' });
    status.append(poang, ovaFel, om);
    let ratt = 0, besvarade = 0, fragor = [], fel = [];
    const uppdatera = () => {
      poang.textContent = `${ratt} rätt av ${besvarade} besvarade (${fragor.length} frågor)`;
      ovaFel.hidden = !(besvarade === fragor.length && fel.length);
    };
    const blanda = (lista) => {
      const a = [...lista];
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    };

    function bygg(urval) {
      ratt = 0; besvarade = 0; fel = [];
      fragor = urval || (antal ? blanda(banken).slice(0, antal) : banken);
      ruta.querySelectorAll('.quiz-fraga').forEach((f) => f.remove());
      fragor.forEach((q, i) => {
        const svar = el('p', { class: 'quiz-svar', 'aria-live': 'polite' });
        const alt = el('div', { class: 'quiz-alt' });
        q.options.forEach((o) => {
          const b = el('button', { type: 'button', text: o });
          b.addEventListener('click', () => {
            const ok = o === q.correct;
            [...alt.children].forEach((x) => {
              x.disabled = true;
              if (x.textContent === q.correct) x.classList.add('ratt');
            });
            if (!ok) b.classList.add('fel');
            besvarade++; if (ok) ratt++; else fel.push(q);
            svar.replaceChildren(el('strong', { class: ok ? 'ratt' : 'fel', text: ok ? 'Rätt. ' : `Inte rätt. Rätt svar: ${q.correct}. ` }), q.explanation || '');
            uppdatera();
          });
          alt.append(b);
        });
        ruta.append(el('div', { class: 'quiz-fraga' }, el('h3', {}, el('span', { text: `${i + 1}.` }), q.text), alt, svar));
      });
      uppdatera();
    }
    om.addEventListener('click', () => { bygg(); status.scrollIntoView({ block: 'nearest' }); });
    ovaFel.addEventListener('click', () => { bygg([...fel]); status.scrollIntoView({ block: 'nearest' }); });
    ruta.prepend(status);
    bygg();
  });

  /* ================= Nya figurtyper ================= */

  // Läser en tabell i figuren: rubriker och rader som text (celler med HTML behålls i .html).
  const lasTabell = (fig) => {
    const t = fig.querySelector('table');
    const rub = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    const rader = [...t.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => ({ text: td.textContent.trim(), html: td.innerHTML.trim() })));
    return { t, rub, rader };
  };
  // Lägger tabellen i en hopfälld "Visa som tabell" och flyttar källraden sist.
  const tabellSist = (fig, t) => {
    const d = el('details', {}, el('summary', { text: 'Visa som tabell' }));
    t.replaceWith(d); d.append(t);
    fig.append(d);
    const k = fig.querySelector('.figur-kalla'); if (k) fig.append(k);
  };
  // Tangentbord för en grupp knappar: piltangenter flyttar och väljer.
  const pilar = (knappar, valj) => knappar.forEach((b, i) => b.addEventListener('keydown', (e) => {
    const s = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!s) return;
    e.preventDefault();
    const n = (i + s + knappar.length) % knappar.length;
    knappar[n].focus(); valj(n);
  }));
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attr = {}) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v); return e; };
  let pilNr = 0;
  const pilspets = (rot, farg, id, storlek = 12) => {
    const defs = rot.querySelector('defs') || rot.appendChild(svg('defs'));
    const m = svg('marker', { id, viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: String(storlek), markerHeight: String(storlek), markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' });
    m.append(svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: farg }));
    defs.append(m);
  };

  // Ritar om pilar mellan element när storleken ändras.
  const ritaOm = (behallare, rita) => {
    const kor = () => requestAnimationFrame(rita);
    if ('ResizeObserver' in window) new ResizeObserver(kor).observe(behallare); else window.addEventListener('resize', kor);
    kor();
  };
  const kant = (rut, bas, sida) => {
    const r = rut.getBoundingClientRect(), b = bas.getBoundingClientRect();
    const x = { v: r.left - b.left, h: r.right - b.left, m: (r.left + r.right) / 2 - b.left }[sida[0]];
    const y = { o: r.top - b.top, n: r.bottom - b.top, m: (r.top + r.bottom) / 2 - b.top }[sida[1]];
    return [x, y];
  };

  /* ---------- Kolumner: lista där varje punkt börjar med **Rubrik**; alla visas samtidigt ---------- */
  document.querySelectorAll('.figur[data-typ="kolumner"]').forEach((fig) => {
    const lista = fig.querySelector('ul, ol');
    const toner = (fig.dataset.toner || '').split(',');
    const wrap = el('div', { class: 'kolumner' });
    let maxRader = 0;
    const kols = [...lista.children].map((li, i) => {
      const forsta = li.querySelector('strong');
      const namn = forsta.textContent.replace(/:$/, '').trim();
      forsta.remove();
      const k = el('div', { class: 'kolumn' });
      if (toner[i] && toner[i].trim()) k.dataset.ton = toner[i].trim();
      k.append(el('h4', { class: 'kolumn-rubrik', text: namn }));
      const tmp = el('div', { html: li.innerHTML.trim() });
      if (!tmp.querySelector('p')) tmp.innerHTML = `<p>${tmp.innerHTML}</p>`;
      const f = tmp.querySelector('p');
      if (f && f.firstChild && f.firstChild.nodeType === 3) f.firstChild.textContent = f.firstChild.textContent.replace(/^\s*:\s*/, '');
      [...tmp.children].forEach((c) => k.append(c));
      k.querySelectorAll('p').forEach((p) => {
        if (!p.textContent.includes('→')) return;
        const kedja = el('div', { class: 'kedja' });
        p.innerHTML.split('→').map((s) => s.trim()).forEach((s, j) => {
          if (j) kedja.append(el('span', { class: 'kedja-pil', 'aria-hidden': 'true', text: '↓' }));
          kedja.append(el('span', { class: 'kedja-steg', html: s }));
        });
        p.replaceWith(kedja);
      });
      maxRader = Math.max(maxRader, k.children.length);
      return k;
    });
    kols.forEach((k) => { k.style.gridRow = `span ${maxRader}`; wrap.append(k); });
    wrap.style.setProperty('--n', kols.length);
    lista.replaceWith(wrap);
    // Valfri lista med påståenden som markerar en kolumn: ::: {.signaler rubrik="..."} med [Kolumnnamn]{.till}
    const sig = fig.querySelector('.signaler');
    if (sig) {
      const rad = el('div', { class: 'signaler-rad', role: 'group', 'aria-label': sig.dataset.rubrik || 'Välj' });
      let aktiv = null;
      const knappar = [...sig.querySelectorAll('li')].map((li) => {
        const till = li.querySelector('.till');
        const mal = till.textContent.trim();
        till.remove();
        const idx = kols.findIndex((k) => k.querySelector('.kolumn-rubrik').textContent.trim().startsWith(mal));
        const b = el('button', { type: 'button', 'aria-pressed': 'false', html: li.innerHTML.trim() });
        b.addEventListener('click', () => {
          aktiv = aktiv === b ? null : b;
          knappar.forEach((x) => x.setAttribute('aria-pressed', String(x === aktiv)));
          wrap.classList.toggle('fokus', !!aktiv);
          kols.forEach((k, j) => k.classList.toggle('aktiv', !!aktiv && j === idx));
        });
        rad.append(b);
        return b;
      });
      sig.remove();
      wrap.before(el('div', { class: 'signaler-ruta' }, sig.dataset.rubrik ? el('p', { class: 'signaler-rubrik', text: sig.dataset.rubrik }) : '', rad));
    }
  });

  /* ---------- Grupperade staplar: alla serier samtidigt, förklaringen markerar en serie ----------
     Tabell: Namn | serie 1 | serie 2 ...  (– = ingen uppgift) */
  document.querySelectorAll('.figur[data-typ="grupperade"]').forEach((fig) => {
    const { t, rub, rader } = lasTabell(fig);
    const serier = rub.slice(1);
    const data = rader.map((c) => ({ namn: c[0].text, v: c.slice(1).map((x) => lasTal(x.text)) }));
    const alla = data.flatMap((d) => d.v).filter((x) => !Number.isNaN(x));
    const steg = fig.dataset.steg ? lasTal(fig.dataset.steg) : 0.2;
    let max = Math.ceil(Math.max(...alla) / steg) * steg;
    if (max - Math.max(...alla) < steg / 2) max += steg;
    const min = Math.min(0, Math.floor(Math.min(...alla) / steg) * steg);
    const pos = (x) => ((x - min) / (max - min)) * 100;
    const FARG = ['var(--bla)', 'var(--d-overtid)', 'var(--d-intervention)'];
    const yta = el('div', { class: 'staplar grupp' });
    const rader2 = [];
    data.forEach((d) => {
      const spar = el('div', { class: 'grupp-spar' }, el('div', { class: 'stapel-noll', style: `left: calc(${pos(0)}% - 1px)` }));
      d.v.forEach((x, k) => {
        const rad = el('div', { class: 'grupp-rad', 'data-serie': String(k) });
        if (Number.isNaN(x)) rad.append(el('span', { class: 'stapel-varde saknas', style: `left: calc(${pos(0)}% + 6px)`, text: 'ingen uppgift' }));
        else rad.append(el('div', { class: 'stapel', style: `left: ${pos(Math.min(0, x))}%; width: ${Math.abs(pos(x) - pos(0))}%; --s: ${FARG[k]}` }),
          el('div', { class: 'stapel-varde', style: `left: calc(${pos(Math.max(0, x))}% + 6px)`, text: tal(x) }));
        rad.setAttribute('aria-label', `${d.namn}, ${serier[k]}: ${Number.isNaN(x) ? 'ingen uppgift' : tal(x)}`);
        spar.append(rad); rader2.push(rad);
      });
      yta.append(el('div', { class: 'stapel-namn', text: d.namn }), spar);
    });
    const skala = el('div', { class: 'stapel-skala', 'aria-hidden': 'true' });
    for (let x = min; x <= max + 1e-9; x += steg) skala.append(el('span', { style: `left: ${pos(x)}%`, text: tal(x, 1) }));
    yta.append(el('div'), skala);
    const forkl = el('div', { class: 'diagram-val', role: 'group', 'aria-label': 'Markera en serie' });
    let fokus = -1;
    const knappar = serier.map((s, k) => {
      const b = el('button', { type: 'button', 'aria-pressed': 'false', class: 'serie-knapp', style: `--s: ${FARG[k]}`, text: s });
      b.addEventListener('click', () => {
        fokus = fokus === k ? -1 : k;
        knappar.forEach((x, j) => x.setAttribute('aria-pressed', String(j === fokus)));
        rader2.forEach((r) => { r.style.opacity = fokus === -1 || +r.dataset.serie === fokus ? '1' : '.25'; });
      });
      forkl.append(b);
      return b;
    });
    t.before(forkl, yta);
    tabellSist(fig, t);
  });

  /* ---------- Fasfigur: Zimmermans modell med pilar mellan faserna ---------- */
  document.querySelectorAll('.fasfigur').forEach((fig) => {
    const faser = [...fig.querySelectorAll(':scope > .faser > .fas')];
    const omr = fig.querySelector('.faser');
    const rot = svg('svg', { class: 'vag-svg', 'aria-hidden': 'true' });
    omr.prepend(rot);
    const id = 'pil' + (++pilNr);
    function rita() {
      const W = omr.clientWidth, H = omr.clientHeight;
      rot.setAttribute('viewBox', `0 0 ${W} ${H}`);
      rot.replaceChildren();
      pilspets(rot, 'var(--text-2)', id, 14);
      const [P, G, R] = faser;
      const linje = (d) => rot.append(svg('path', { d, fill: 'none', stroke: 'var(--text-2)', 'stroke-width': '2.5', 'marker-end': `url(#${id})` }));
      if (W < 640) {
        const [a1, b1] = kant(P, omr, 'mn'), [, b2] = kant(G, omr, 'mo');
        linje(`M${a1},${b1 + 4} L${a1},${b2 - 6}`);
        const [, c1] = kant(G, omr, 'mn'), [, c2] = kant(R, omr, 'mo');
        linje(`M${a1},${c1 + 4} L${a1},${c2 - 6}`);
        const [rx, ry] = kant(R, omr, 'hm'), [px, py] = kant(P, omr, 'hm');
        linje(`M${rx + 2},${ry} C${W - 2},${ry} ${W - 2},${py} ${px + 8},${py}`);
      } else {
        const [gl, gb] = kant(G, omr, 'vn'), [gr] = kant(G, omr, 'hn');
        const klamp = (x) => Math.min(Math.max(x, gl + 24), gr - 24);
        const [px, py] = kant(P, omr, 'mo'), [rx, ry] = kant(R, omr, 'mo');
        const x1 = klamp(px), x2 = klamp(rx);
        linje(`M${x1},${py - 4} L${x1},${gb + 8}`);
        linje(`M${x2},${gb + 4} L${x2},${ry - 8}`);
        const [sx, sy] = kant(R, omr, 'vm'), [qx] = kant(P, omr, 'hm');
        linje(`M${sx - 4},${sy} L${qx + 8},${sy}`);
      }
    }
    const knapp = fig.querySelector('.fas-vaxla');
    if (knapp) knapp.addEventListener('click', () => {
      const pa = fig.classList.toggle('visa-exempel');
      knapp.setAttribute('aria-pressed', String(pa));
      requestAnimationFrame(rita);
    });
    ritaOm(omr, rita);
  });

  /* ---------- Cykel och triangel: noder i en ring med pilar ----------
     Tabell: Nod | Engelska | Innehåll (punkter avskilda med semikolon) */
  document.querySelectorAll('.figur[data-typ="cykel"]').forEach((fig) => {
    const { t, rader } = lasTabell(fig);
    const dubbel = fig.dataset.dubbel === 'ja';
    const n = rader.length;
    const noder = rader.map((c) => ({ namn: c[0].text, eng: c[1].text, punkter: c[2].html.split(/;\s*/).filter(Boolean) }));
    const yta = el('div', { class: 'cykel', 'data-n': String(n) });
    const rot = svg('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', class: 'cykel-svg' });
    const mid = 'pil' + (++pilNr);
    pilspets(rot, dubbel ? 'var(--d-intervention)' : 'var(--text-2)', mid, 4.5);
    const R = 34, start = -90;
    const vinkel = (i) => (start + (360 / n) * i) * Math.PI / 180;
    const glapp = (n === 3 ? 34 : 26) * Math.PI / 180;
    if (dubbel) yta.dataset.form = 'triangel';
    for (let i = 0; i < n; i++) {
      if (dubbel) {
        // Triangel: raka, streckade dubbelpilar mellan hörnen
        const xa = 50 + R * Math.cos(vinkel(i)), ya = 50 + R * Math.sin(vinkel(i));
        const xb = 50 + R * Math.cos(vinkel(i + 1)), yb = 50 + R * Math.sin(vinkel(i + 1));
        const f0 = 0.3, f1 = 0.7;
        rot.append(svg('path', { d: `M${xa + (xb - xa) * f0},${ya + (yb - ya) * f0} L${xa + (xb - xa) * f1},${ya + (yb - ya) * f1}`,
          fill: 'none', stroke: 'var(--d-intervention)', 'stroke-width': '.9', 'stroke-dasharray': '2.2 1.4',
          'marker-start': `url(#${mid})`, 'marker-end': `url(#${mid})` }));
        continue;
      }
      const a1 = vinkel(i) + glapp, a2 = vinkel(i + 1) - glapp;
      const x1 = 50 + R * Math.cos(a1), y1 = 50 + R * Math.sin(a1), x2 = 50 + R * Math.cos(a2), y2 = 50 + R * Math.sin(a2);
      const attr = { d: `M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}`, fill: 'none', stroke: 'var(--text-2)', 'stroke-width': '.8', 'marker-end': `url(#${mid})` };
      if (dubbel) { attr['marker-start'] = `url(#${mid})`; attr['stroke-dasharray'] = '2 1.4'; }
      rot.append(svg('path', attr));
    }
    yta.append(rot);
    if (fig.dataset.mitt) yta.append(el('div', { class: 'cykel-mitt', text: fig.dataset.mitt }));
    const detalj = el('div', { class: 'kont-detalj', 'aria-live': 'polite' });
    const knappar = noder.map((nod, i) => {
      const a = vinkel(i);
      const b = el('button', { type: 'button', class: 'cykel-nod', 'aria-pressed': 'false',
        style: `left: ${50 + R * Math.cos(a)}%; top: ${50 + R * Math.sin(a)}%` }, el('span', { text: nod.namn }));
      b.addEventListener('click', () => valj(i));
      yta.append(b);
      return b;
    });
    function valj(i) {
      const nod = noder[i];
      knappar.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
      const ul = el('ul');
      nod.punkter.forEach((p) => ul.append(el('li', { html: p[0] === '<' ? p : p[0].toUpperCase() + p.slice(1) })));
      detalj.replaceChildren(el('h4', {}, nod.namn + ' ', el('span', { class: 'eng', text: nod.eng ? `(${nod.eng})` : '' })), ul);
    }
    pilar(knappar, valj);
    t.before(yta, detalj);
    tabellSist(fig, t);
    valj(0);
  });

  /* ---------- Flöde: steg i rad med returpil till början ----------
     Tabell: Steg | Engelska | Innehåll (punkter avskilda med semikolon). data-retur anger returpilens text. */
  document.querySelectorAll('.figur[data-typ="flode"]').forEach((fig) => {
    const { t, rader } = lasTabell(fig);
    const noder = rader.map((c) => ({ namn: c[0].text, eng: c[1].text, punkter: c[2].html.split(/;\s*/).filter(Boolean) }));
    const yta = el('div', { class: 'flode' });
    const rot = svg('svg', { class: 'vag-svg', 'aria-hidden': 'true' });
    yta.append(rot);
    const detalj = el('div', { class: 'kont-detalj', 'aria-live': 'polite' });
    const knappar = noder.map((nod, i) => {
      const b = el('button', { type: 'button', class: 'flode-nod', 'aria-pressed': 'false' },
        el('small', { text: `Steg ${i + 1}` }), el('span', { text: nod.namn }));
      b.addEventListener('click', () => valj(i));
      yta.append(b);
      return b;
    });
    const retur = el('div', { class: 'flode-retur', text: fig.dataset.retur || '' });
    yta.append(retur);
    const id = 'pil' + (++pilNr);
    function rita() {
      const W = yta.clientWidth, H = yta.clientHeight;
      rot.setAttribute('viewBox', `0 0 ${W} ${H}`);
      rot.replaceChildren();
      pilspets(rot, 'var(--bla)', id, 14);
      const linje = (d, streck) => rot.append(svg('path', { d, fill: 'none', stroke: 'var(--bla)', 'stroke-width': '2.5', 'stroke-dasharray': streck ? '6 5' : '', 'marker-end': `url(#${id})` }));
      const smal = getComputedStyle(yta).flexDirection === 'column';
      const forsta = knappar[0], sista = knappar[knappar.length - 1];
      for (let i = 0; i < knappar.length - 1; i++) {
        if (smal) { const [x1, y1] = kant(knappar[i], yta, 'mn'), [, y2] = kant(knappar[i + 1], yta, 'mo'); linje(`M${x1},${y1 + 3} L${x1},${y2 - 6}`); }
        else { const [x1, y1] = kant(knappar[i], yta, 'hm'), [x2] = kant(knappar[i + 1], yta, 'vm'); linje(`M${x1 + 3},${y1} L${x2 - 6},${y1}`); }
      }
      if (smal) {
        const [x1, y1] = kant(sista, yta, 'hm'), [, y2] = kant(forsta, yta, 'hm');
        linje(`M${x1 + 3},${y1} H${W - 8} V${y2} H${x1 + 10}`, true);
      } else {
        const [x1, y1] = kant(sista, yta, 'mn'), [x2] = kant(forsta, yta, 'mn');
        const yb = H - 6;
        linje(`M${x1},${y1 + 3} V${yb} H${x2} V${y1 + 10}`, true);
      }
    }
    function valj(i) {
      const nod = noder[i];
      knappar.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
      const ul = el('ul');
      nod.punkter.forEach((p) => ul.append(el('li', { html: p[0] === '<' ? p : p[0].toUpperCase() + p.slice(1) })));
      detalj.style.setProperty('--k', 'var(--bla)');
      detalj.replaceChildren(el('h4', {}, nod.namn + ' ', el('span', { class: 'eng', text: nod.eng ? `(${nod.eng})` : '' })), ul);
    }
    pilar(knappar, valj);
    t.before(yta, detalj);
    tabellSist(fig, t);
    ritaOm(yta, rita);
    valj(0);
  });

  /* ---------- Cirkumplexmodellen: fyra stilar med två delområden ----------
     Tabell: Stil | Delområde | Engelska | Beskrivning, i ordning runt cirkeln medurs från vänster */
  document.querySelectorAll('.figur[data-typ="cirkel"]').forEach((fig) => {
    const { t, rader } = lasTabell(fig);
    const STIL = {
      'Autonomistöd': { farg: 'var(--autonom)', yta: 'var(--autonom-yta)', dim: 'behovsstödjande, låg grad av styrning' },
      'Struktur': { farg: 'var(--bla)', yta: 'var(--bla-yta)', dim: 'behovsstödjande, hög grad av styrning' },
      'Kontroll': { farg: 'var(--kontroll)', yta: 'var(--kontroll-yta)', dim: 'behovsmotarbetande, hög grad av styrning' },
      'Kaos': { farg: 'var(--amot)', yta: 'var(--amot-yta)', dim: 'behovsmotarbetande, låg grad av styrning' },
    };
    const delar = rader.map((c) => ({ stil: c[0].text, namn: c[1].text, eng: c[2].text, text: c[3].html }));
    const cx = 210, cy = 210, R1 = 132, R2 = 206;
    const rot = svg('svg', { viewBox: '0 0 420 420', class: 'cirkel-svg', role: 'group', 'aria-label': 'Cirkumplexmodellen över lärares motiverande stil' });
    const p = (r, grad) => [cx + r * Math.cos(grad * Math.PI / 180), cy + r * Math.sin(grad * Math.PI / 180)];
    const sektor = (r0, r1, g0, g1) => {
      const [a, b] = p(r1, g0), [c, d] = p(r1, g1), [e, f] = p(r0, g1), [g, h] = p(r0, g0);
      return r0 === 0 ? `M${cx},${cy} L${a},${b} A${r1},${r1} 0 0 1 ${c},${d} Z`
        : `M${a},${b} A${r1},${r1} 0 0 1 ${c},${d} L${e},${f} A${r0},${r0} 0 0 0 ${g},${h} Z`;
    };
    // Inre ring: stilarna (varannan del), yttre ring: delområdena
    const stilar = [...new Set(delar.map((d) => d.stil))];
    const etiketter = [];
    stilar.forEach((s, k) => {
      const g0 = 180 + 90 * k, g1 = g0 + 90;
      rot.append(svg('path', { d: sektor(0, R1, g0, g1), fill: STIL[s].yta, stroke: 'var(--yta)', 'stroke-width': '3' }));
      const [x, y] = p(R1 * 0.56, g0 + 45);
      const tx = svg('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'cirkel-stil', fill: STIL[s].farg });
      tx.textContent = s; etiketter.push(tx);
    });
    const detalj = el('div', { class: 'kont-detalj', 'aria-live': 'polite' });
    const bitar = delar.map((d, i) => {
      const g0 = 180 + 45 * i, g1 = g0 + 45;
      const g = svg('g', { class: 'cirkel-del', tabindex: '0', role: 'button', 'aria-pressed': 'false', 'aria-label': `${d.stil}: ${d.namn}` });
      g.style.setProperty('--f', STIL[d.stil].farg);
      g.style.setProperty('--fy', STIL[d.stil].yta);
      g.append(svg('path', { d: sektor(R1 + 4, R2, g0, g1) }));
      const [x, y] = p((R1 + R2) / 2 + 2, g0 + 22.5);
      const tx = svg('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'cirkel-namn' });
      tx.textContent = d.namn; etiketter.push(tx); g.etikett = tx;
      g.addEventListener('click', () => valj(i));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); valj(i); } });
      rot.append(g);
      return g;
    });
    etiketter.forEach((e) => rot.append(e));
    function valj(i) {
      const d = delar[i];
      bitar.forEach((b, j) => { b.setAttribute('aria-pressed', String(i === j)); b.etikett.classList.toggle('vald', i === j); });
      detalj.style.setProperty('--k', STIL[d.stil].farg);
      detalj.replaceChildren(
        el('h4', {}, `${d.stil}: ${d.namn} `, el('span', { class: 'eng', text: d.eng ? `(${d.eng})` : '' })),
        el('p', { html: d.text }),
        el('p', { class: 'kat', text: STIL[d.stil].dim[0].toUpperCase() + STIL[d.stil].dim.slice(1) }));
    }
    pilar(bitar, valj);
    t.before(el('div', { class: 'cirkel' }, el('span', { class: 'ax-o', text: 'Behovsstödjande' }), el('span', { class: 'ax-v', text: 'Låg styrning' }), rot,
      el('span', { class: 'ax-h', text: 'Hög styrning' }), el('span', { class: 'ax-n', text: 'Behovsmotarbetande' })), detalj);
    tabellSist(fig, t);
    valj(0);
  });

  /* ---------- Vägmodell: flera källor mot ett utfall ----------
     Tabell: Källa | β | KI | Förklaring.  data-mal anger utfallet. */
  document.querySelectorAll('.figur[data-typ="vag"]').forEach((fig) => {
    const { t, rub, rader } = lasTabell(fig);
    const kallor = rader.map((c) => ({ namn: c[0].html, ren: c[0].text, b: lasTal(c[1].text), ki: c[2].text, text: c[3] ? c[3].html : '' }));
    const yta = el('div', { class: 'vag', style: `--rader: ${kallor.length}` });
    const rot = svg('svg', { class: 'vag-svg', 'aria-hidden': 'true' });
    const mal = el('div', { class: 'vag-mal', html: fig.dataset.mal || 'Utfall' });
    const detalj = el('div', { class: 'kont-detalj', 'aria-live': 'polite' });
    const idp = 'pil' + (++pilNr), idn = 'pil' + (++pilNr);
    const knappar = kallor.map((k, i) => {
      const b = el('button', { type: 'button', class: 'vag-kalla', 'aria-pressed': 'false', style: `grid-row: ${i + 1}` },
        el('span', { html: k.namn }), el('small', { text: `${rub[1]} = ${tal(k.b)}` }));
      b.addEventListener('click', () => valj(i));
      return b;
    });
    yta.append(rot, ...knappar, mal);
    let vald = 0;
    function rita() {
      const W = yta.clientWidth, H = yta.clientHeight;
      rot.setAttribute('viewBox', `0 0 ${W} ${H}`);
      rot.replaceChildren();
      pilspets(rot, 'var(--bla)', idp, 16);
      pilspets(rot, 'var(--kontroll)', idn, 16);
      const [mx, my] = kant(mal, yta, 'vm');
      kallor.forEach((k, i) => {
        const [x, y] = kant(knappar[i], yta, 'hm');
        const neg = k.b < 0;
        const linje = svg('path', {
          d: `M${x + 4},${y} C${(x + mx) / 2},${y} ${(x + mx) / 2},${my + (i - (kallor.length - 1) / 2) * 10} ${mx - 6},${my + (i - (kallor.length - 1) / 2) * 10}`,
          fill: 'none', stroke: neg ? 'var(--kontroll)' : 'var(--bla)', 'stroke-width': String(1.5 + Math.abs(k.b) * 18),
          'stroke-dasharray': neg ? '6 4' : '', 'marker-end': `url(#${neg ? idn : idp})`,
          opacity: i === vald ? '1' : '.45', 'stroke-linecap': 'butt' });
        rot.append(linje);
      });
    }
    function valj(i) {
      vald = i;
      const k = kallor[i];
      knappar.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
      detalj.style.setProperty('--k', k.b < 0 ? 'var(--kontroll)' : 'var(--bla)');
      detalj.replaceChildren(el('h4', { html: k.namn }),
        el('p', { class: 'kat', text: `${rub[1]} = ${tal(k.b)}` + (k.ki ? ` (95 % KI ${k.ki})` : '') }),
        k.text ? el('p', { html: k.text }) : '');
      rita();
    }
    pilar(knappar, valj);
    t.before(yta, detalj);
    tabellSist(fig, t);
    ritaOm(yta, rita);
    valj(0);
  });

  /* ---------- Korsförskjuten modell: två mått vid två tillfällen ----------
     Tabell: Väg (A → B) | β | Förklaring */
  document.querySelectorAll('.figur[data-typ="kors"]').forEach((fig) => {
    const { t, rub, rader } = lasTabell(fig);
    const vagar = rader.map((c) => { const [fran, till] = c[0].text.split('→').map((s) => s.trim()); return { fran, till, b: lasTal(c[1].text), text: c[2] ? c[2].html : '' }; });
    const matt = [...new Set(vagar.flatMap((v) => [v.fran, v.till]))];
    const yta = el('div', { class: 'kors' });
    const rot = svg('svg', { class: 'vag-svg', 'aria-hidden': 'true' });
    yta.append(rot, el('div', { class: 'kors-tid', style: 'grid-column: 1', text: 'Tid 1' }), el('div', { class: 'kors-tid', style: 'grid-column: 3', text: 'Tid 2' }));
    const rutor = {};
    matt.forEach((m, r) => [0, 1].forEach((tid) => {
      const d = el('div', { class: 'kors-ruta', style: `grid-row: ${r + 2}; grid-column: ${tid * 2 + 1}`, text: m });
      rutor[m + tid] = d; yta.append(d);
    }));
    const val = el('div', { class: 'diagram-val', role: 'group', 'aria-label': 'Välj väg' });
    const detalj = el('div', { class: 'kont-detalj', 'aria-live': 'polite' });
    const knappar = vagar.map((v, i) => {
      const b = el('button', { type: 'button', 'aria-pressed': 'false', text: `${v.fran} → senare ${v.till.toLowerCase()}` });
      b.addEventListener('click', () => valj(i));
      val.append(b);
      return b;
    });
    const ids = ['pil' + (++pilNr), 'pil' + (++pilNr)];
    let vald = 0;
    function rita() {
      const W = yta.clientWidth, H = yta.clientHeight;
      rot.setAttribute('viewBox', `0 0 ${W} ${H}`);
      rot.replaceChildren();
      pilspets(rot, 'var(--linje)', ids[0], 12);
      pilspets(rot, 'var(--d-overtid)', ids[1], 16);
      // Stabilitet över tid (ingen siffra anges)
      matt.forEach((m) => {
        const [x1, y1] = kant(rutor[m + 0], yta, 'hm'), [x2, y2] = kant(rutor[m + 1], yta, 'vm');
        rot.append(svg('line', { x1: x1 + 4, y1, x2: x2 - 6, y2, stroke: 'var(--linje)', 'stroke-width': '3', 'marker-end': `url(#${ids[0]})` }));
      });
      vagar.forEach((v, i) => {
        const [x1, y1] = kant(rutor[v.fran + 0], yta, 'hm'), [x2, y2] = kant(rutor[v.till + 1], yta, 'vm');
        const forskj = matt.indexOf(v.fran) < matt.indexOf(v.till) ? 1 : -1;
        rot.append(svg('line', { x1: x1 + 4, y1: y1 + forskj * 8, x2: x2 - 8, y2: y2 - forskj * 8, stroke: 'var(--d-overtid)',
          'stroke-width': String(1.5 + v.b * 30), opacity: i === vald ? '1' : '.3', 'marker-end': `url(#${ids[1]})` }));
        const f = 0.3, lx = x1 + (x2 - x1) * f, ly = y1 + forskj * 8 + (y2 - y1 - forskj * 16) * f;
        const tx = svg('text', { x: lx, y: ly + (forskj > 0 ? -12 : 22), 'text-anchor': 'start', class: 'kors-b', opacity: i === vald ? '1' : '.5' });
        tx.textContent = `${rub[1]} ≈ ${tal(v.b)}`; rot.append(tx);
      });
    }
    function valj(i) {
      vald = i;
      const v = vagar[i];
      knappar.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
      detalj.style.setProperty('--k', 'var(--d-overtid)');
      detalj.replaceChildren(el('h4', { text: `${v.fran} vid tid 1 → ${v.till.toLowerCase()} vid tid 2` }),
        el('p', { class: 'kat', text: `${rub[1]} ≈ ${tal(v.b)}` }), v.text ? el('p', { html: v.text }) : '');
      rita();
    }
    pilar(knappar, valj);
    t.before(val, yta, detalj);
    tabellSist(fig, t);
    ritaOm(yta, rita);
    valj(0);
  });

  /* ---------- Skattningar med konfidensintervall ----------
     Tabell: Skattning | värde | nedre | övre | förklaring  (tomma gränser = inget intervall redovisat) */
  document.querySelectorAll('.figur[data-typ="intervall"]').forEach((fig) => {
    const { t, rub, rader } = lasTabell(fig);
    const poster = rader.map((c) => ({ namn: c[0].html, ren: c[0].text, v: lasTal(c[1].text), lo: lasTal(c[2].text), hi: lasTal(c[3].text), text: c[4] ? c[4].html : '' }));
    const steg = fig.dataset.steg ? lasTal(fig.dataset.steg) : 0.05;
    const varden = poster.flatMap((p) => [p.v, p.lo, p.hi]).filter((x) => !Number.isNaN(x));
    const min = Math.min(0, Math.floor(Math.min(...varden) / steg) * steg) - (Math.min(...varden) < 0 ? 0 : steg);
    const max = Math.ceil(Math.max(...varden) / steg) * steg + steg;
    const pos = (x) => ((x - min) / (max - min)) * 100;
    const yta = el('div', { class: 'staplar intervall' });
    const detalj = el('div', { class: 'kont-detalj', 'aria-live': 'polite' });
    const knappar = poster.map((p, i) => {
      const spar = el('div', { class: 'stapel-spar' }, el('div', { class: 'stapel-noll', style: `left: calc(${pos(0)}% - 1px)` }));
      if (!Number.isNaN(p.lo)) spar.append(el('div', { class: 'iv-linje', style: `left: ${pos(p.lo)}%; width: ${pos(p.hi) - pos(p.lo)}%` }));
      spar.append(el('div', { class: 'iv-punkt', style: `left: ${pos(p.v)}%` }),
        el('div', { class: 'stapel-varde', style: `left: calc(${pos(Number.isNaN(p.hi) ? p.v : p.hi)}% + 10px)`, text: tal(p.v) }));
      const b = el('button', { type: 'button', class: 'iv-namn', 'aria-pressed': 'false', html: p.namn });
      b.addEventListener('click', () => valj(i));
      spar.addEventListener('click', () => valj(i));
      yta.append(b, spar);
      return b;
    });
    const skala = el('div', { class: 'stapel-skala', 'aria-hidden': 'true' });
    for (let x = min; x <= max + 1e-9; x += steg * 2) skala.append(el('span', { style: `left: ${pos(x)}%`, text: tal(x, 1) }));
    yta.append(el('div'), skala);
    function valj(i) {
      const p = poster[i];
      knappar.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
      detalj.style.setProperty('--k', 'var(--d-intervention)');
      detalj.replaceChildren(el('h4', { html: p.namn }),
        el('p', { class: 'kat', text: `${rub[1]} = ${tal(p.v)}` + (Number.isNaN(p.lo) ? '' : ` (95 % KI ${tal(p.lo)} till ${tal(p.hi)})`) }),
        p.text ? el('p', { html: p.text }) : '');
    }
    pilar(knappar, valj);
    t.before(yta, detalj);
    tabellSist(fig, t);
    valj(0);
  });
})();
