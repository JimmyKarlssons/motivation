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
    const alla = rader.flatMap((r) => r.v);
    const steg = 0.2;
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
    for (let x = min; x <= max + 1e-9; x += steg) skala.append(el('span', { style: `left: ${pos(x)}%`, text: tal(x, 1) }));
    ytan.append(el('div'), skala);

    function visa(k) {
      [...val.children].forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
      delar.forEach(({ r, stapel, varde, spar }) => {
        const x = r.v[k];
        const a = pos(Math.min(0, x)), b = pos(Math.max(0, x));
        stapel.style.left = a + '%';
        stapel.style.width = Math.max(b - a, 0.6) + '%';
        varde.textContent = tal(x);
        varde.style.left = x >= 0 ? `calc(${b}% + 6px)` : `calc(${a}% - 6px)`;
        varde.style.transform = x >= 0 ? 'none' : 'translateX(-100%)';
        spar.setAttribute('aria-label', `${r.namn}: ${tal(x)}`);
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
    const fragor = JSON.parse(ruta.querySelector('script').textContent);
    const status = el('div', { class: 'quiz-status' });
    const poang = el('span', { 'aria-live': 'polite' });
    const om = el('button', { type: 'button', text: 'Börja om' });
    status.append(poang, om);
    let ratt = 0, besvarade = 0;
    const uppdatera = () => { poang.textContent = `${ratt} rätt av ${besvarade} besvarade (${fragor.length} frågor)`; };

    function bygg() {
      ratt = 0; besvarade = 0;
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
            besvarade++; if (ok) ratt++;
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
    ruta.prepend(status);
    bygg();
  });
})();
