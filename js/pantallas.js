/* Pantallas mobile: scroll + clic + arrastre */
(function () {
  if (window.__cronaPantallas) return; window.__cronaPantallas = true;
  const iniciar = raiz => {
    if (raiz.__ok) return; raiz.__ok = true;
    const tels = [...raiz.querySelectorAll('.pantallas__telefono')];
    const n = tels.length;
    let actual = -1;
    const fijar = i => {
      i = Math.max(0, Math.min(n - 1, i));
      if (i === actual) return;
      actual = i;
      tels.forEach((t, k) => t.setAttribute('data-pos', String(Math.max(-2, Math.min(2, k - i)))));
      raiz.querySelectorAll('[data-paso]').forEach(el => el.toggleAttribute('data-activo', +el.dataset.paso === i));
    };
    const ir = i => {
      const top = raiz.getBoundingClientRect().top + window.scrollY;
      const rec = raiz.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + rec * ((i + 0.5) / n), behavior: 'smooth' });
    };
    const seguir = () => {
      const r = raiz.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / ((r.height - window.innerHeight) || 1)));
      fijar(Math.min(n - 1, Math.floor(p * n)));
    };
    raiz.addEventListener('click', e => {
      const b = e.target.closest('[data-ir]'); if (b) { ir(+b.dataset.ir); return; }
      const t = e.target.closest('.pantallas__telefono');
      if (t && t.dataset.pos !== '0' && !raiz.__arrastro) ir(+t.dataset.pantalla);
    });
    let x0 = null;
    const esc = raiz.querySelector('.pantallas__escena');
    esc.addEventListener('pointerdown', e => { x0 = e.clientX; raiz.__arrastro = false; });
    window.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { raiz.__arrastro = true; ir(actual + (dx < 0 ? 1 : -1)); setTimeout(() => { raiz.__arrastro = false; }, 50); }
    });
    window.addEventListener('scroll', () => requestAnimationFrame(seguir), { passive: true });
    seguir();
  };
  const buscar = () => document.querySelectorAll('[data-js="pantallas"]').forEach(iniciar);
  new MutationObserver(buscar).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState !== 'loading') buscar(); else document.addEventListener('DOMContentLoaded', buscar);
})();

(function () {
  if (window.__cronaPantallasInfo) return; window.__cronaPantallasInfo = true;
  const ocultar = raiz => { const c = raiz.querySelector('.pantallas__cartel'); if (c) c.removeAttribute('data-visible'); raiz.querySelectorAll('.pantallas__punto[data-activo]').forEach(p => p.removeAttribute('data-activo')); };
  document.addEventListener('click', e => {
    const raiz = e.target.closest && e.target.closest('[data-js="pantallas"]');
    document.querySelectorAll('[data-js="pantallas"]').forEach(r => { if (r !== raiz) ocultar(r); });
    if (!raiz) return;
    const p = e.target.closest('.pantallas__punto');
    if (!p) { ocultar(raiz); return; }
    e.stopPropagation();
    const ya = p.hasAttribute('data-activo');
    ocultar(raiz);
    if (ya) return;
    raiz.setAttribute('data-usado-puntos', '');
    p.setAttribute('data-activo', '');
    const c = raiz.querySelector('.pantallas__cartel'), esc = raiz.querySelector('.pantallas__escena');
    c.querySelector('.pantallas__cartel-titulo').textContent = p.dataset.titulo;
    c.querySelector('.pantallas__cartel-texto').textContent = p.dataset.texto;
    const re = esc.getBoundingClientRect(), rp = p.getBoundingClientRect(), tel = p.closest('.pantallas__telefono').getBoundingClientRect();
    const w = c.offsetWidth, h = c.offsetHeight;
    const vw = document.documentElement.clientWidth, m = 12;
    let x = tel.right - re.left + 16, y;
    if (re.left + x + w > vw - m) x = tel.left - re.left - 16 - w;
    if (re.left + x < m) {
      x = Math.max(m - re.left, Math.min(vw - m - re.left - w, rp.left - re.left - w / 2));
      const abajo = rp.top - re.top + 26;
      y = abajo + h <= re.height ? abajo : rp.top - re.top - 26 - h;
    } else {
      y = Math.max(0, Math.min(re.height - h, rp.top - re.top - h / 2));
    }
    c.style.left = x + 'px'; c.style.top = y + 'px';
    c.setAttribute('data-visible', '');
  }, true);
  document.addEventListener('scroll', e => {
    const v = e.target.closest && e.target.closest('.pantallas__vidrio');
    if (!v) return;
    const raiz = v.closest('[data-js="pantallas"]');
    raiz.setAttribute('data-usado-scroll', '');
    ocultar(raiz);
  }, true);
})();
