/* Controlador de la maqueta (Project Skyscraper) */
(function () {
  const raiz = document.querySelector('.maqueta');
  if (!raiz) return;
  const CAPAS = ['agua', 'calles', 'residencial', 'comercial', 'industria', 'pips'];
  const RCI = ['residencial', 'comercial', 'industria'];
  const T = {
    residencial: 'Zonificá barrios para que lleguen los Pips. Las casas crecen en tres densidades, de casas bajas a torres, según el valor del suelo y la demanda.',
    comercial: 'Los comercios dan trabajo y servicios a los Pips. Se concentran donde hay movimiento y pueden convertirse en rascacielos de oficinas.',
    industria: 'Las fábricas mueven la economía y generan empleo, pero también contaminan y bajan el valor del suelo a su alrededor.',
    agua: 'Moldeá el terreno: levantá colinas y ubicá ríos. El relieve condiciona dónde se puede construir y cómo se ve la ciudad.',
    calles: 'Trazá calles, avenidas y puentes. Cada tipo de calle tiene su ancho, sus carriles y sus veredas, y define cómo se mueve el tránsito por toda la ciudad.',
    pips: 'Cada Pip es un habitante con vida propia: sale de su casa, va a trabajar y vuelve. Algunos caminan y otros usan el auto, según la distancia.',
    datos: 'Cada edificio se pinta según cuánta gente vive o trabaja en él, de baja a alta densidad. Así se lee dónde crece la ciudad y dónde todavía hay lugar.',
    basura: 'Cada edificio produce basura. Las columnas muestran cuánta acumula: si se ponen rojas, los camiones no dan abasto.'
  };
  const s = { capas: [], vista: 'normal', abierta: null, ultimo: null, ultimoRci: null };
  const visor = raiz.querySelector('crona-maqueta');
  const dos = n => String(n).padStart(2, '0');
  const txt = (k, v) => raiz.querySelectorAll('[data-txt="' + k + '"]').forEach(e => { e.textContent = v; });
  const pintar = () => {
    const on = id => CAPAS.includes(id) ? s.capas.includes(id) : id === 'rci' ? RCI.some(r => s.capas.includes(r)) : s.vista === id;
    raiz.querySelectorAll('[data-act]').forEach(e => { const v = on(e.dataset.act); e.setAttribute('data-activo', v ? 'si' : 'no'); });
    raiz.querySelectorAll('[data-ab]').forEach(e => e.setAttribute(e.hasAttribute('data-abierta') ? 'data-abierta' : 'data-abierto', s.abierta === e.dataset.ab ? 'si' : 'no'));
    raiz.querySelectorAll('[data-maq^="alt:"], [data-maq^="abrir:"]').forEach(b => {
      const id = b.dataset.maq.split(':')[1];
      if (b.hasAttribute('aria-expanded')) b.setAttribute('aria-expanded', s.abierta === id ? 'true' : 'false');
      else b.setAttribute('aria-pressed', on(id) ? 'true' : 'false');
    });
    const t = raiz.querySelector('[data-maq="todas"]'); if (t) t.disabled = s.capas.length === CAPAS.length;
    txt('contador', dos(s.capas.length) + ' / ' + dos(CAPAS.length));
    txt('vistaNombre', s.vista === 'normal' ? 'Normal' : s.vista === 'datos' ? 'Densidad' : 'Basura');
    txt('rciCuenta', RCI.filter(r => s.capas.includes(r)).length + '/3');
    txt('notaRci', s.ultimoRci && s.capas.includes(s.ultimoRci) ? T[s.ultimoRci] : 'La demanda define qué crece en la ciudad. Activá cada zona para verla levantarse sobre la maqueta.');
    const u = s.ultimo, uv = u && (CAPAS.includes(u) ? s.capas.includes(u) : s.vista === u);
    txt('notaMovil', uv ? T[u] : 'Tocá una capa para sumarla a la maqueta. Arrastrá para girarla.');
    if (visor && visor.aplicar) visor.aplicar(s.capas, s.vista);
  };
  const acciones = {
    abrir(id) {
      if (s.abierta === id) { s.abierta = null; return; }
      s.abierta = id; s.ultimo = id;
      if (!s.capas.includes(id)) s.capas.push(id);
    },
    alt(id) {
      if (id === 'rci') { s.abierta = s.abierta === 'rci' ? null : 'rci'; return; }
      if (id === 'datos' || id === 'basura') {
        const on = s.vista !== id;
        s.vista = on ? id : 'normal';
        s.ultimo = on ? id : (s.ultimo === id ? null : s.ultimo);
        s.abierta = on ? id : (s.abierta === id ? null : s.abierta);
        return;
      }
      const on = !s.capas.includes(id);
      s.capas = on ? s.capas.concat(id) : s.capas.filter(c => c !== id);
      s.ultimo = on ? id : (s.ultimo === id ? null : s.ultimo);
      if (RCI.includes(id)) { s.ultimoRci = on ? id : (s.ultimoRci === id ? null : s.ultimoRci); s.abierta = 'rci'; }
    },
    todas() { s.capas = CAPAS.slice(); s.abierta = 'rci'; },
    reiniciar() { Object.assign(s, { capas: [], vista: 'normal', abierta: null, ultimo: null, ultimoRci: null }); if (visor && visor.reiniciarCamara) visor.reiniciarCamara(); }
  };
  raiz.addEventListener('click', e => {
    const b = e.target.closest('[data-maq]'); if (!b) return;
    const [k, id] = b.dataset.maq.split(':');
    acciones[k](id); pintar();
  });
  customElements.whenDefined('crona-maqueta').then(pintar);
  pintar();
})();
