/* Escenario 3D de LEGO × NotCo */
(function () {
  const e = document.querySelector('[data-js="escenario"]'); if (!e) return;
  const modelo = e.querySelector('[data-js="modelo"]'), audio = e.querySelector('[data-js="audio"]'), btn = e.querySelector('[data-js="audio-btn"]');
  const n = e.querySelectorAll('.caso-escenario__texto').length || 1;
  let paso = -1;
  const pintar = () => {
    const r = e.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, -r.top / ((r.height - window.innerHeight) || 1)));
    const i = Math.min(n - 1, Math.floor(p * n));
    if (i === paso) return; paso = i;
    if (i !== 0 && audio && !audio.paused) audio.pause();
    e.querySelectorAll('[data-paso]').forEach(el => el.toggleAttribute('data-activo', +el.dataset.paso === i));
    if (modelo) modelo.setAttribute('activa', String(i));
  };
  e.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ir]');
    if (!b) return;
    const top = e.getBoundingClientRect().top + window.scrollY, rec = e.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + rec * ((+b.dataset.ir + 0.5) / n), behavior: 'smooth' });
  });
  if (btn && audio) {
    const est = on => { btn.setAttribute('data-sonando', on ? 'si' : 'no'); btn.setAttribute('aria-label', on ? 'Pausar a Giuseppe' : 'Escuchar a Giuseppe'); };
    audio.addEventListener('play', () => { est(true); const v = document.querySelector('.caso-visor__capa--principal video'); if (v) v.muted = true; });
    ['pause', 'ended'].forEach(t => audio.addEventListener(t, () => est(false)));
    btn.addEventListener('click', () => { if (audio.paused) audio.play().catch(() => est(false)); else audio.pause(); });
  }
  window.addEventListener('scroll', () => requestAnimationFrame(pintar), { passive: true });
  window.addEventListener('resize', pintar);
  pintar();
})();
