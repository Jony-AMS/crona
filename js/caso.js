/* Crona · página de caso: apertura con video, proceso horizontal y secuencia fija */
(function () {
  const FORMATOS = { vr: 16 / 9, juego: 16 / 9, app: 9 / 16, tableta: 3 / 4, video: 16 / 9, web: 16 / 9 };
  const limitar = v => Math.min(1, Math.max(0, v));
  const tramo = (v, a, b) => limitar((v - a) / (b - a));
  const suave = t => t * t * (3 - 2 * t);

  function iniciar() {
    const $ = nombre => document.querySelector('[data-js="' + nombre + '"]');
    const datos = document.body.dataset;
    const ar = FORMATOS[datos.formato] || 16 / 9;
    const vertical = ar < 1;
    const n = {
      apertura: $('apertura'), visor: $('visor'), play: $('play'), barra: $('barra'), cabezalVisor: $('cabezal-visor'),
      titular: $('titular'), fondo: $('fondo'), monitor: $('monitor'), principal: $('capa-principal'), mockup: $('capa-mockup'), collage: $('collage'),
      proceso: $('proceso'), pista: $('pista'), tira: $('tira'), cabezal: $('cabezal'), pie: document.querySelector('.pie'),
      cabecera: document.querySelector('.barra')
    };
    const clips = [...document.querySelectorAll('.tira__clip')];
    let medidas = [];
    const movil = () => window.matchMedia('(max-width: 760px)').matches;

    if (datos.clip) document.body.style.setProperty('--clip', datos.clip);

    if (!vertical && n.mockup) { n.mockup.remove(); n.mockup = null; }
    [[n.principal, datos.videoPrincipal], [n.mockup, datos.videoMockup]].forEach(([capa, url]) => {
      if (!capa || !url) return;
      const video = document.createElement('video');
      Object.assign(video, { src: url, muted: true, loop: true, autoplay: true, playsInline: true });
      capa.prepend(video);
    });

    function grilla() {
      const ancho = document.documentElement.clientWidth || window.innerWidth;
      const ref = document.querySelector('.caso-intro');
      let m = ref ? parseFloat(getComputedStyle(ref).paddingLeft) : NaN;
      let calle = ref ? parseFloat(getComputedStyle(ref).columnGap) : NaN;
      if (!(m > 0 && m < ancho / 4)) m = Math.min(88, Math.max(20, ancho * 0.045));
      if (!(calle >= 0 && calle < ancho / 6)) calle = ancho * 0.018;
      const col = (ancho - 2 * m - 5 * calle) / 6;
      return { m: m / ancho * 100, calle: calle / ancho * 100, col: col / ancho * 100 };
    }

    function medir() {
      if (n.proceso && n.pista) {
        n.proceso.style.height = movil() ? '' : (n.pista.scrollWidth - window.innerWidth + window.innerHeight) + 'px';
      }
      const secciones = clips.map(b => document.getElementById(b.dataset.ir));
      if (!secciones.length || secciones.some(s => !s)) return;
      const y = s => s.getBoundingClientRect().top + window.scrollY;
      const inicio = y(secciones[0]);
      const ultima = secciones[secciones.length - 1];
      const total = (y(ultima) + ultima.offsetHeight - inicio) || 1;
      medidas = secciones.map(s => ({ izq: (y(s) - inicio) / total * 100, ancho: s.offsetHeight / total * 100 }));
      clips.forEach((b, i) => { b.style.left = medidas[i].izq + '%'; b.style.width = medidas[i].ancho + '%'; });
    }

    let quiere = false, espera = false, uPausa = false, uSilencio = false, uActivo = false, entro = false, nivelSon = null, rafSon = 0, enlazado = false;
    const vidP = () => n.principal && n.principal.querySelector('video');
    const tc = x => { x = x || 0; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(Math.floor(x % 60)).padStart(2, '0'); };
    const sel = k => document.querySelector('[data-js="' + k + '"]');
    function estadoCtl(v) {
      const p = v.paused ? 'si' : 'no', et = v.paused ? 'Reproducir video' : 'Pausar video';
      [n.play, sel('ctl-play')].forEach(b => { if (b) { b.setAttribute('data-pausado', p); b.setAttribute('aria-label', et); } });
      const m = sel('ctl-son'); if (m) { m.setAttribute('data-silencio', v.muted ? 'si' : 'no'); m.setAttribute('aria-label', v.muted ? 'Activar sonido' : 'Silenciar video'); }
    }
    function enlazar(v) {
      if (enlazado || !v) return; enlazado = true;
      const pintar = () => { const k = v.duration ? v.currentTime / v.duration : 0; const cv = sel('cabezal-visor'), av = sel('avance-visor'), t = sel('tiempo-visor'); if (cv) cv.style.left = (k * 100).toFixed(2) + '%'; if (av) av.style.width = (k * 100).toFixed(2) + '%'; if (t) t.textContent = tc(v.currentTime) + ' / ' + tc(v.duration); };
      ['timeupdate', 'loadedmetadata', 'seeked'].forEach(t => v.addEventListener(t, pintar));
      ['play', 'pause', 'volumechange'].forEach(t => v.addEventListener(t, () => estadoCtl(v)));
      const alternar = () => { if (v.paused) { uPausa = false; v.play().catch(() => {}); } else { uPausa = true; v.pause(); } };
      if (n.play) n.play.addEventListener('click', alternar);
      const cp = sel('ctl-play'); if (cp) cp.addEventListener('click', e => { e.stopPropagation(); alternar(); });
      const cs = sel('ctl-son'); if (cs) cs.addEventListener('click', e => { e.stopPropagation(); if (v.muted) { uSilencio = false; uActivo = true; v.volume = 1; v.muted = false; v.play().catch(() => { v.muted = true; }); } else { uSilencio = true; uActivo = false; v.muted = true; } });
      if (n.barra) n.barra.addEventListener('click', e => { if (e.target.closest('.caso-visor__controles') || !v.duration) return; const r = n.barra.getBoundingClientRect(); v.currentTime = limitar((e.clientX - r.left) / r.width) * v.duration; });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') v.muted = true; });
      estadoCtl(v);
    }
    function sonido(on) {
      const vid = vidP();
      if (!vid) return;
      enlazar(vid);
      quiere = on;
      if (!on) { if (!vid.muted && !uActivo) vid.muted = true; return; }
      if (uSilencio || document.visibilityState !== 'visible' || !vid.muted) return;
      if (!entro) { entro = true; vid.currentTime = 0; }
      const activo = navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
      if (activo) {
        vid.muted = false;
        if (vid.paused && !uPausa) { const pr = vid.play(); if (pr && pr.catch) pr.catch(() => { vid.muted = true; vid.play().catch(() => {}); }); }
      } else if (!espera) {
        espera = true;
        const g = () => { ['pointerdown', 'keydown', 'touchend'].forEach(t => window.removeEventListener(t, g, true)); espera = false; if (quiere) sonido(true); };
        ['pointerdown', 'keydown', 'touchend'].forEach(t => window.addEventListener(t, g, true));
      }
    }
    function volumen(r, e, alto) {
      const sal = limitar((r.bottom - alto * 0.3) / (alto * 0.4));
      const nivel = suave(tramo(e, 0.45, 1)) * sal;
      sonido(nivel > 0.02);
      const v = vidP();
      if (v && !uActivo) {
        nivelSon = nivelSon == null ? nivel : nivelSon + (nivel - nivelSon) * 0.35;
        v.volume = limitar(nivelSon);
        if (Math.abs(nivel - nivelSon) > 0.005 && !rafSon) rafSon = requestAnimationFrame(() => { rafSon = 0; animarApertura(window.innerHeight); });
      }
      if (n.barra) n.barra.style.pointerEvents = e > 0.6 ? 'auto' : 'none';
    }

    function animarApertura(alto) {
      if (!n.apertura || !n.visor) return;
      const r = n.apertura.getBoundingClientRect();
      const p = limitar(-r.top / ((r.height - alto) || 1));
      const e = suave(tramo(p, 0.04, 0.62));
      volumen(r, e, alto);
      const g = grilla();
      const ini = movil() ? { t: 16, r: g.m, b: 50, l: g.m } : { t: 14, r: g.m, b: 40, l: g.m + 3 * (g.col + g.calle) };
      const minT = ((n.cabecera ? n.cabecera.offsetHeight : 70) + 24) / alto * 100;
      if (ini.t < minT) ini.t = minT;
      if (vertical) {
        const minB = ((n.tira ? n.tira.offsetHeight : 52) + 32) / alto * 100;
        ini.b = movil() ? Math.max(34, minB) : minB;
      }
      const W = window.innerWidth;
      const bw = (100 - ini.l - ini.r) / 100 * W, bh = (100 - ini.t - ini.b) / 100 * alto;
      let vw = bw, vh = bw / ar;
      if (vh > bh) { vh = bh; vw = bh * ar; }
      const dx = (bw - vw) / 2 / W * 100, dy = (bh - vh) / 2 / alto * 100;
      const lv = movil() ? ini.l + 2 * dx : g.m + 4 * (g.col + g.calle);
      const v = vertical
        ? { t: ini.t + dy, b: ini.b + dy, l: lv, r: 100 - lv - vw / W * 100 }
        : { t: ini.t + dy, b: ini.b + dy, l: ini.l + dx, r: ini.r + dx };
      const t = v.t * (1 - e), d = v.r * (1 - e), b = v.b * (1 - e), l = v.l * (1 - e);
      const sale = tramo(p, 0.02, 0.32);
      const caja = (el, c) => Object.assign(el.style, { left: c.l + '%', top: c.t + '%', right: c.r + '%', bottom: c.b + '%' });

      n.visor.style.clipPath = 'polygon(' + l + '% ' + t + '%, ' + (100 - d) + '% ' + t + '%, ' + (100 - d) + '% ' + (100 - b) + '%, ' + l + '% ' + (100 - b) + '%)';

      if (n.mockup) {
        const w0 = vw / W * 100, h0 = vh / alto * 100;
        const k = 1 + (Math.min(1.25, 86 / h0, 86 / w0) - 1) * e;
        const cx = v.l + w0 / 2 + (50 - v.l - w0 / 2) * e, cy = v.t + h0 / 2 + (50 - v.t - h0 / 2) * e;
        caja(n.mockup, { l: cx - w0 * k / 2, t: cy - h0 * k / 2, r: 100 - cx - w0 * k / 2, b: 100 - cy - h0 * k / 2 });
        n.mockup.style.opacity = (1 - tramo(e, 0.3, 0.9)).toFixed(3);
      }
      if (n.principal) n.principal.style.opacity = vertical ? tramo(e, 0, 0.3).toFixed(3) : '1';
      if (n.collage) {
        const x0 = v.l / 100 * W, y0 = v.t / 100 * alto;
        [...n.collage.children].forEach((pz, i) => {
          const sal = suave(tramo(e, i * 0.08, 0.5 + i * 0.08));
          const d = pz.dataset, s = +d.s * vw;
          const px = x0 + +d.x * vw + +d.dx * sal * W * 0.35;
          const py = y0 + +d.y * vh + +d.dy * sal * alto * 0.2;
          pz.style.width = s + 'px'; pz.style.height = s + 'px';
          pz.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0)';
          pz.style.opacity = (1 - sal).toFixed(3);
        });
      }
      if (n.monitor) { caja(n.monitor, v); n.monitor.style.opacity = (1 - sale).toFixed(3); }
      if (n.fondo) {
        caja(n.fondo, ini);
        n.fondo.style.opacity = (1 - sale).toFixed(3);
        n.fondo.style.transform = 'scale(' + (1 + sale * 0.12).toFixed(3) + ')';
      }
      if (n.play) {
        n.play.style.left = (l + (100 - d - l) / 2) + '%';
        n.play.style.top = (t + (100 - b - t) / 2) + '%';
        n.play.style.transform = 'scale(' + (1 + e * 0.35).toFixed(3) + ')';
      }
      if (n.titular) {
        const s = tramo(p, 0.06, 0.42);
        n.titular.style.opacity = (1 - s).toFixed(3);
        n.titular.style.transform = 'translate3d(0,' + (-s * 80).toFixed(1) + 'px,0)';
      }
      if (n.barra) n.barra.style.opacity = tramo(p, 0.6, 0.72).toFixed(3);
    }

    function animarProceso(alto) {
      if (!n.proceso || !n.pista) return;
      if (movil()) { n.pista.style.transform = ''; return; }
      const r = n.proceso.getBoundingClientRect();
      const p = limitar(-r.top / ((r.height - alto) || 1));
      n.pista.style.transform = 'translate3d(' + (-p * (n.pista.scrollWidth - window.innerWidth)).toFixed(1) + 'px,0,0)';
      const centro = window.innerWidth / 2;
      n.pista.querySelectorAll('.caso-tramo').forEach(tr => {
        const c = tr.getBoundingClientRect();
        tr.toggleAttribute('data-activo', centro >= c.left && centro < c.right);
      });
    }

    function seguir() {
      const alto = window.innerHeight;
      animarApertura(alto);
      animarProceso(alto);
      if (!medidas.length) return;
      const max = document.documentElement.scrollHeight - alto;
      const pos = (max > 0 ? limitar(window.scrollY / max) : 0) * 100;
      if (n.cabezal) n.cabezal.style.left = pos.toFixed(3) + '%';
      let activo = 0;
      medidas.forEach((m, i) => { if (pos >= m.izq - 0.01) activo = i; });
      clips.forEach((b, i) => {
        b.toggleAttribute('data-activo', i === activo);
        if (i === activo) b.style.setProperty('--avance', limitar((pos - medidas[i].izq) / (medidas[i].ancho || 1)) * 100 + '%');
      });
      if (n.tira && n.pie) n.tira.toggleAttribute('data-oculta', alto - n.pie.getBoundingClientRect().top > 60);
    }

    clips.forEach(b => b.addEventListener('click', () => {
      const s = document.getElementById(b.dataset.ir);
      if (s) window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - (b.dataset.ir === 'apertura' ? 0 : 72), behavior: 'smooth' });
    }));

    let cuadro;
    const alScroll = () => { cancelAnimationFrame(cuadro); cuadro = requestAnimationFrame(seguir); };
    const alResize = () => { cancelAnimationFrame(cuadro); cuadro = requestAnimationFrame(() => { medir(); seguir(); }); };
    window.addEventListener('scroll', alScroll, { passive: true });
    window.addEventListener('resize', alResize, { passive: true });
    window.addEventListener('load', alResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alResize);
    medir();
    seguir();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
