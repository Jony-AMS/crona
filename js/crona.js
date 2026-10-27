(function () {
  const ZONA = 'America/Argentina/Buenos_Aires';
  const limitar = v => Math.min(1, Math.max(0, v));
  const tramo = (v, a, b) => limitar((v - a) / (b - a));

  class Crona {
    constructor(raiz, opciones) {
      this.raiz = raiz;
      this.opciones = opciones || {};
      const q = n => raiz.querySelector('[data-js="' + n + '"]');
      this.portada = q('portada');
      this.velo = q('velo');
      this.iso = q('iso');
      this.giro = q('giro');
      this.arena = q('arena');
      this.firma = q('firma');
      this.gantt = q('gantt');
      this.lineaAvance = q('linea-avance');
      this.lineaRiel = this.lineaAvance ? this.lineaAvance.parentElement : null;
      this.hitos = this.gantt ? [...this.gantt.querySelectorAll('.linea__hito')] : [];
      this.arenaArriba = q('arena-arriba');
      this.arenaAbajo = q('arena-abajo');
      this.izquierda = q('izquierda');
      this.derecha = q('derecha');
      this.bordes = [...raiz.querySelectorAll('[data-js="borde"]')];
      this.categoria = q('categoria');
      this.contador = q('contador');
      this.hora = q('hora');
      this.cronologia = q('cronologia');
      this.anio = q('anio');
      this.nombre = q('nombre');
      this.avance = q('avance');
      this.categorias = (this.categoria && this.categoria.dataset.lista || '').split(',');
      [...raiz.querySelectorAll('.marco, .caso-pieza__ventana')].filter(n => !n.closest('.caso-pieza__ventana') || n.classList.contains('caso-pieza__ventana')).forEach((n, i) => { if (!n.hasAttribute('data-forma')) n.setAttribute('data-forma', String(i % 4 + 1)); });
      this.iniciarClips(raiz);
      this.alScrollear = this.alScrollear.bind(this);
      this.ajustar(this.opciones);
      this.prepararRevelado();
      this.iniciarHora();
      this.iniciarEstadia();
      this.iniciarMenu();
      this.iniciarCursor();
      this.iniciarCategorias();
      window.addEventListener('scroll', this.alScrollear, { passive: true });
      window.addEventListener('resize', this.alScrollear, { passive: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(this.alScrollear);
      this.alScrollear();
    }

    ajustar(opciones) {
      this.opciones = opciones || {};
      if (this.opciones.verGrilla) this.raiz.setAttribute('data-guias', '');
      else this.raiz.removeAttribute('data-guias');
      this.alScrollear();
    }

    desmontar() {
      window.removeEventListener('scroll', this.alScrollear);
      window.removeEventListener('resize', this.alScrollear);
      clearInterval(this.reloj);
      clearInterval(this.estadia);
      const barraMenu = this.raiz && this.raiz.querySelector('.barra');
      if (barraMenu && this.alMenu) barraMenu.removeEventListener('click', this.alMenu);
      if (this.alTeclaMenu) window.removeEventListener('keydown', this.alTeclaMenu);
      if (this.cerrarMenu) this.cerrarMenu();
      cancelAnimationFrame(this.cuadroCursor);
      if (this.limpiarCursor) this.limpiarCursor();
      if (this.observador) this.observador.disconnect();
    }

    iniciarCategorias() {
      const grupos = [...this.raiz.querySelectorAll('[data-js="grupo"]')];
      if (!grupos.length) return;
      const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const cerrar = grupo => {
        const panel = grupo.querySelector('[data-js="panel"]');
        const boton = grupo.querySelector('[data-js="abrir"]');
        if (!grupo.hasAttribute('data-abierta')) return;
        grupo.removeAttribute('data-abierta');
        boton.setAttribute('aria-expanded', 'false');
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(() => { panel.style.height = '0px'; });
        const fin = () => { if (!grupo.hasAttribute('data-abierta')) panel.hidden = true; };
        if (reducido) fin(); else panel.addEventListener('transitionend', fin, { once: true });
      };
      const abrir = grupo => {
        const panel = grupo.querySelector('[data-js="panel"]');
        const boton = grupo.querySelector('[data-js="abrir"]');
        grupo.setAttribute('data-abierta', '');
        boton.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
        panel.style.height = '0px';
        requestAnimationFrame(() => { panel.style.height = panel.scrollHeight + 'px'; });
        const fin = () => { if (grupo.hasAttribute('data-abierta')) panel.style.height = 'auto'; };
        if (reducido) fin(); else panel.addEventListener('transitionend', fin, { once: true });
      };
      grupos.forEach(grupo => {
        grupo.querySelector('[data-js="abrir"]').addEventListener('click', () => {
          const estaba = grupo.hasAttribute('data-abierta');
          grupos.forEach(otro => { if (otro !== grupo) cerrar(otro); });
          if (estaba) cerrar(grupo); else abrir(grupo);
        });
      });
    }

    iniciarCursor() {
      const cursor = this.raiz.querySelector('[data-js="cursor"]');
      if (!cursor || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const punto = cursor.querySelector('[data-js="punto"]');
      const anillo = cursor.querySelector('[data-js="anillo"]');
      const destino = { x: -100, y: -100 };
      const p = { x: -100, y: -100 };
      const a = { x: -100, y: -100 };
      const clickeable = 'a, button, [role="button"], label, input, select, textarea, [data-cursor]';
      this.raiz.setAttribute('data-cursor-activo', '');
      const mover = e => {
        destino.x = e.clientX;
        destino.y = e.clientY;
        if (!cursor.hasAttribute('data-visible')) {
          p.x = a.x = destino.x;
          p.y = a.y = destino.y;
          cursor.setAttribute('data-visible', '');
        }
      };
      const sobre = e => {
        if (e.target.closest && e.target.closest(clickeable)) cursor.setAttribute('data-sobre', '');
        else cursor.removeAttribute('data-sobre');
        cursor.toggleAttribute('data-girar', !!(e.target.closest && e.target.closest('crona-modelo, crona-maqueta canvas')));
        const amp = !!(e.target.closest && e.target.closest('.caso-galeria .caso-pieza__ventana'));
        cursor.toggleAttribute('data-deslizar', !!(e.target.closest && e.target.closest('.pantallas__telefono[data-pos="0"] .pantallas__vidrio')) && !(e.target.closest && e.target.closest('.pantallas__punto')));
        const cer = !!(e.target.closest && e.target.closest('.visor-imagen'));
        cursor.toggleAttribute('data-ampliar', amp);
        cursor.toggleAttribute('data-cerrar', cer);
        if (amp || cer) cursor.removeAttribute('data-sobre');
      };
      const salir = () => cursor.removeAttribute('data-visible');
      const bajar = () => cursor.setAttribute('data-presionado', '');
      const subir = () => cursor.removeAttribute('data-presionado');
      document.addEventListener('mousemove', mover, { passive: true });
      document.addEventListener('mouseover', sobre, { passive: true });
      document.addEventListener('mouseleave', salir);
      document.addEventListener('mousedown', bajar);
      document.addEventListener('mouseup', subir);
      this.limpiarCursor = () => {
        document.removeEventListener('mousemove', mover);
        document.removeEventListener('mouseover', sobre);
        document.removeEventListener('mouseleave', salir);
        document.removeEventListener('mousedown', bajar);
        document.removeEventListener('mouseup', subir);
        this.raiz.removeAttribute('data-cursor-activo');
      };
      const cuadro = () => {
        p.x += (destino.x - p.x) * 0.32;
        p.y += (destino.y - p.y) * 0.32;
        a.x += (destino.x - a.x) * 0.09;
        a.y += (destino.y - a.y) * 0.09;
        punto.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0)';
        anillo.style.transform = 'translate3d(' + a.x.toFixed(1) + 'px,' + a.y.toFixed(1) + 'px,0)';
        this.cuadroCursor = requestAnimationFrame(cuadro);
      };
      cuadro();
    }

    iniciarClips(raiz) {
      const marcos = [...raiz.querySelectorAll('.proyecto__marco')];
      marcos.forEach(m => {
        if (m.dataset.tc) return;
        m.dataset.tc = '1';
        const regla = document.createElement('div');
        regla.className = 'clip-tc';
        regla.setAttribute('aria-hidden', 'true');
        regla.innerHTML = '<span class="clip-tc__regla"></span>';
        if (m.classList.contains('caso-pieza__ventana') || m.classList.contains('proyecto__marco')) {
          const cap = m.parentNode.querySelector('figcaption');
          if (cap) cap.replaceWith(regla); else m.after(regla);
          return;
        }
        const envoltura = document.createElement('div');
        [...m.classList].filter(c => /^(col|inicio|fin)-/.test(c)).forEach(c => { m.classList.remove(c); envoltura.classList.add(c); });
        envoltura.classList.add('clip-envoltura');
        m.before(envoltura);
        envoltura.append(m, regla);
      });
    }

    iniciarMenu() {
      const barra = this.raiz.querySelector('.barra');
      const boton = this.raiz.querySelector('[data-js="hamburguesa"]');
      if (!barra || !boton) return;
      const cerrar = () => { barra.removeAttribute('data-menu'); boton.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; };
      this.alMenu = e => {
        if (e.target.closest('[data-js="hamburguesa"]')) {
          const abierto = !barra.hasAttribute('data-menu');
          barra.toggleAttribute('data-menu', abierto);
          boton.setAttribute('aria-expanded', String(abierto));
          document.documentElement.style.overflow = abierto ? 'hidden' : '';
        } else if (e.target.closest('.barra__menu a, .barra .boton, .barra__marca')) cerrar();
      };
      this.alTeclaMenu = e => { if (e.key === 'Escape') cerrar(); };
      this.cerrarMenu = cerrar;
      barra.addEventListener('click', this.alMenu);
      window.addEventListener('keydown', this.alTeclaMenu);
    }

    iniciarEstadia() {
      const nodos = [...this.raiz.querySelectorAll('[data-js="estadia"], [data-js="codigo"]')];
      if (!nodos.length) return;
      const inicio = Date.now();
      const dos = n => String(n).padStart(2, '0');
      const pintar = () => {
        const s = Math.floor((Date.now() - inicio) / 1000);
        const texto = dos(Math.floor(s / 3600)) + ':' + dos(Math.floor(s / 60) % 60) + ':' + dos(s % 60);
        nodos.forEach(n => { n.textContent = texto; });
      };
      pintar();
      this.estadia = setInterval(pintar, 1000);
    }

    iniciarHora() {
      if (!this.hora) return;
      const formato = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });
      const poner = () => { this.hora.textContent = formato.format(new Date()); };
      poner();
      this.reloj = setInterval(poner, 10000);
    }

    prepararRevelado() {
      if (!('IntersectionObserver' in window)) return;
      const alto = window.innerHeight;
      this.observador = new IntersectionObserver(entradas => {
        entradas.forEach(entrada => {
          if (!entrada.isIntersecting) return;
          entrada.target.style.opacity = '1';
          entrada.target.style.transform = 'none';
          this.observador.unobserve(entrada.target);
        });
      }, { rootMargin: '0px 0px -12% 0px' });
      this.raiz.querySelectorAll('[data-revelar]').forEach(nodo => {
        if (nodo.getBoundingClientRect().top <= alto * 0.92) return;
        nodo.style.opacity = '0';
        nodo.style.transform = 'translateY(22px)';
        nodo.style.transition = 'opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1)';
        this.observador.observe(nodo);
      });
    }

    alScrollear() {
      if (this.cuadro) return;
      this.cuadro = requestAnimationFrame(() => {
        this.cuadro = null;
        this.animarPortada();
        this.animarFondos();
        this.actualizarCronologia();
        this.animarManifiesto();
        this.actualizarCodigo();
      });
    }

    actualizarCodigo() {
      if (!this.codigo) this.codigo = this.raiz.querySelector('[data-js="codigo"]');
      if (!this.codigo) return;
      const borde = this.bordes[0] ? parseFloat(this.bordes[0].style.opacity || '1') : 0;
      if (!this.pie) this.pie = this.raiz.querySelector('.pie');
      const pieTop = this.pie ? this.pie.getBoundingClientRect().top : Infinity;
      const salida = Math.min(1, Math.max(0, (pieTop - window.innerHeight + 40) / 80));
      this.codigo.parentNode.style.opacity = (Math.max(0, 1 - borde * 4) * salida * 0.8).toFixed(3);
    }

    avancePortada() {
      const recorrido = this.portada.offsetHeight - window.innerHeight;
      return limitar(-this.portada.getBoundingClientRect().top / (recorrido || 1));
    }

    actualizarCategoria(v) {
      if (!this.categoria || !this.categorias.length) return;
      const n = this.categorias.length;
      const i = Math.min(n - 1, Math.floor(limitar(v) * n));
      if (this.categoria.textContent !== this.categorias[i]) this.categoria.textContent = this.categorias[i];
      if (this.contador) this.contador.textContent = String(i + 1).padStart(2, '0') + '/' + String(n).padStart(2, '0');
    }

    animarMarca() {
      const a = this.avancePortada();
      const ritmo = this.opciones.ritmoArena == null ? 1.5 : this.opciones.ritmoArena;
      const salida = tramo(a, 0.16, 0.36);
      const s = salida * salida * (3 - 2 * salida);
      if (this.izquierda) {
        this.izquierda.style.transform = 'translateX(' + (-s * 520).toFixed(1) + 'px)';
        this.izquierda.style.opacity = (1 - s).toFixed(3);
      }
      if (this.derecha) {
        this.derecha.style.transform = 'translateX(' + (s * 520).toFixed(1) + 'px)';
        this.derecha.style.opacity = (1 - s).toFixed(3);
      }
      if (this.firma) {
        const entrada = tramo(a, 0.01, 0.13);
        const suave = 1 - Math.pow(1 - entrada, 3);
        this.firma.style.clipPath = 'inset(0 ' + ((1 - suave) * 100).toFixed(2) + '% 0 0)';
        this.firma.style.opacity = (suave * (1 - s)).toFixed(3);
        this.firma.style.transform = 'translateY(' + ((1 - suave) * 14 + s * 24).toFixed(1) + 'px)';
      }

      const arena = limitar(tramo(a, 0.38, 0.62) * ritmo);
      if (this.arena) {
        const alto = 135 * arena;
        this.arena.setAttribute('x', (340 - alto).toFixed(2));
        this.arena.setAttribute('width', alto.toFixed(2));
      }

      const zoom = tramo(a, 0.66, 0.95);
      const escala = 1 + s * 0.5 + zoom * zoom * 13;
      if (this.giro) this.giro.style.transform = 'translateX(' + (this.desfaseIso() * s).toFixed(2) + 'px) rotate(' + (-s * 90 - zoom * 90).toFixed(2) + 'deg) scale(' + escala.toFixed(3) + ')';

      this.animarGantt(a, zoom > 0);
      if (this.velo) this.velo.style.opacity = (1 - tramo(a, 0.86, 0.99)).toFixed(3);

      const bordes = (1 - tramo(a, 0.16, 0.32)).toFixed(3);
      this.bordes.forEach(n => { n.style.opacity = bordes; });
      this.actualizarCategoria(tramo(a, 0.28, 0.74));
    }

    animarGantt(a, congelar) {
      if (!this.gantt || !this.giro) return;
      if (!congelar || this.pieIso == null) {
        const iso = this.giro.getBoundingClientRect();
        const centro = this.gantt.parentElement.getBoundingClientRect();
        this.pieIso = iso.bottom - centro.top - centro.height / 2;
      }
      const entrada = tramo(a, 0.3, 0.4);
      const salida = 1 - tramo(a, 0.6, 0.66);
      const y = this.pieIso + 40 + (1 - entrada) * 16;
      this.gantt.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
      this.gantt.style.opacity = (entrada * salida).toFixed(3);
      const fase = tramo(a, 0.34, 0.58);
      if (this.lineaAvance) this.lineaAvance.style.transform = 'scaleX(' + fase.toFixed(4) + ')';
      if (!this.hitos.length || !this.lineaRiel) return;
      const caja = this.lineaRiel.parentElement.getBoundingClientRect();
      const centros = this.hitos.map(hito => {
        const punto = hito.firstElementChild.getBoundingClientRect();
        return punto.left + punto.width / 2 - caja.left;
      });
      const desde = centros[0], hasta = centros[centros.length - 1];
      this.lineaRiel.style.left = desde.toFixed(1) + 'px';
      this.lineaRiel.style.right = (caja.width - hasta).toFixed(1) + 'px';
      this.hitos.forEach((hito, i) => {
        const punto = (centros[i] - desde) / ((hasta - desde) || 1);
        if (fase > 0 && fase >= punto - 0.001) hito.setAttribute('data-activa', '');
        else hito.removeAttribute('data-activa');
      });
      const encendidos = this.hitos.filter(h => h.hasAttribute('data-activa'));
      this.hitos.forEach(h => h.toggleAttribute('data-actual', h === encendidos[encendidos.length - 1]));
    }

    desfaseIso() {
      if (this.desfase == null && this.giro && this.giro.getBBox) {
        const caja = this.giro.getBBox();
        const vista = this.giro.ownerSVGElement.viewBox.baseVal;
        if (caja.width) this.desfase = (vista.x + vista.width / 2) - (caja.x + caja.width / 2);
      }
      return this.desfase == null ? -52.2 : this.desfase;
    }

    animarPortada() {
      if (!this.portada) return;
      if (this.giro) return this.animarMarca();
      if (!this.iso) return;
      const a = this.avancePortada();
      const ritmo = this.opciones.ritmoArena == null ? 1 : this.opciones.ritmoArena;
      const arena = limitar(tramo(a, 0, 0.55) * ritmo);

      this.arenaArriba.setAttribute('y', (arena * 60).toFixed(2));
      this.arenaArriba.setAttribute('height', (60 - arena * 60).toFixed(2));
      this.arenaAbajo.setAttribute('y', (120 - arena * 60).toFixed(2));
      this.arenaAbajo.setAttribute('height', (arena * 60).toFixed(2));

      const apertura = tramo(a, 0.06, 0.5);
      const suave = apertura * apertura * (3 - 2 * apertura);
      if (this.izquierda) {
        this.izquierda.style.transform = 'translate3d(' + (-suave * 42).toFixed(2) + 'vw,0,0)';
        this.izquierda.style.opacity = (1 - suave).toFixed(3);
      }
      if (this.derecha) {
        this.derecha.style.transform = 'translate3d(' + (suave * 42).toFixed(2) + 'vw,0,0)';
        this.derecha.style.opacity = (1 - suave).toFixed(3);
      }

      const zoom = tramo(a, 0.38, 0.92);
      this.iso.style.transform = 'scale(' + (1 + zoom * zoom * 11).toFixed(3) + ') rotate(' + (zoom * 90).toFixed(2) + 'deg)';

      const bordes = (1 - tramo(a, 0.02, 0.3)).toFixed(3);
      this.bordes.forEach(n => { n.style.opacity = bordes; });

      this.actualizarCategoria(tramo(a, 0, 0.62));

      if (this.velo) this.velo.style.opacity = (1 - tramo(a, 0.8, 0.97)).toFixed(3);
    }

    animarFondos() {
      const factor = this.opciones.parallax == null ? 1 : this.opciones.parallax;
      const alto = window.innerHeight;
      this.raiz.querySelectorAll('[data-velocidad]').forEach(nodo => {
        const caja = nodo.getBoundingClientRect();
        const relativo = (caja.top + caja.height / 2 - alto / 2) / alto;
        nodo.style.transform = 'translate3d(0,' + (relativo * parseFloat(nodo.dataset.velocidad) * factor * 180).toFixed(1) + 'px,0)';
      });
    }

    animarManifiesto() {
      if (!this.bloquesManifiesto) {
        this.bloquesManifiesto = [...this.raiz.querySelectorAll('[data-js="manifiesto-bloque"]')];
        this.seccionManifiesto = this.raiz.querySelector('[data-js="manifiesto-seccion"]');
      }
      const bloques = this.bloquesManifiesto;
      if (!bloques.length) return;
      const alto = window.innerHeight;
      const fijada = this.seccionManifiesto && !window.matchMedia('(max-width: 760px)').matches;
      if (fijada) {
        const r = this.seccionManifiesto.getBoundingClientRect();
        const previa = alto * 0.45;
        const p = limitar((previa - r.top) / ((r.height - alto + previa) || 1));
        bloques.forEach((bloque, i) => {
          const umbral = 0.02 + i * 0.32;
          if (p >= umbral) bloque.setAttribute('data-activo', '');
          else if (p < umbral - 0.04) bloque.removeAttribute('data-activo');
          this.llenarCifra(bloque, tramo(p, umbral, umbral + 0.3));
        });
        return;
      }
      bloques.forEach(bloque => {
        const r = bloque.getBoundingClientRect();
        if (r.top < alto * 0.62) bloque.setAttribute('data-activo', '');
        else if (r.top > alto * 0.7) bloque.removeAttribute('data-activo');
        this.llenarCifra(bloque, tramo(alto * 0.7 - r.top, 0, alto * 0.35));
      });
    }

    llenarCifra(bloque, v) {
      const cuenta = bloque.querySelector('[data-js="cuenta"]');
      if (!cuenta) return;
      const objetivo = parseInt(cuenta.dataset.objetivo, 10) || 0;
      const suave = 1 - Math.pow(1 - limitar(v), 3);
      const valor = String(Math.round(60 - suave * (60 - objetivo))).padStart(2, '0');
      if (cuenta.textContent !== valor) cuenta.textContent = valor;
      bloque.toggleAttribute('data-llegado', parseInt(valor, 10) === objetivo);
    }

    actualizarCronologia() {
      if (!this.cronologia || !this.anio) return;
      const trabajos = [...this.cronologia.querySelectorAll('.trabajo')];
      if (!trabajos.length) return;
      const linea = window.innerHeight * 0.42;
      let activo = 0;
      trabajos.forEach((nodo, i) => { if (nodo.getBoundingClientRect().top <= linea) activo = i; });
      const trabajo = trabajos[activo];
      if (this.anio.textContent !== trabajo.dataset.anio) {
        this.anio.textContent = trabajo.dataset.anio;
        this.anio.style.opacity = '0';
        requestAnimationFrame(() => { this.anio.style.opacity = '1'; });
      }
      if (this.nombre) this.nombre.textContent = trabajo.dataset.nombre;
      const inicio = trabajos[0].getBoundingClientRect().top;
      const fin = trabajos[trabajos.length - 1].getBoundingClientRect().bottom;
      const recorrido = limitar((linea - inicio) / ((fin - inicio) || 1));
      if (this.avance) {
        const horizontal = window.matchMedia('(max-width: 760px)').matches;
        this.avance.style.height = horizontal ? '' : (recorrido * 100).toFixed(2) + '%';
        this.avance.style.width = horizontal ? (recorrido * 100).toFixed(2) + '%' : '';
      }
      const marcas = [...this.cronologia.querySelectorAll('.cronologia__marca')];
      marcas.forEach((marca, i) => {
        const punto = marcas.length > 1 ? i / (marcas.length - 1) : 0;
        if (recorrido >= punto - 0.001 && recorrido > 0) marca.setAttribute('data-activa', '');
        else marca.removeAttribute('data-activa');
      });
      const activas = marcas.filter(m => m.hasAttribute('data-activa'));
      marcas.forEach(m => m.toggleAttribute('data-actual', m === activas[activas.length - 1]));
    }
  }

  window.Crona = { montar: (raiz, opciones) => new Crona(raiz, opciones) };
})();

(function () {
  const montar = () => window.Crona.montar(document.body, {});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})();

(function () {
  if (window.__cronaVideoFinal) return; window.__cronaVideoFinal = true;
  const dos = n => String(Math.floor(n)).padStart(2, '0');
  const tc = s => dos((s || 0) / 60) + ':' + dos((s || 0) % 60);
  const pintar = (fig, v) => {
    const k = v.duration ? v.currentTime / v.duration : 0;
    const t = fig.querySelector('[data-js="tiempo"]'); if (t) t.textContent = tc(v.currentTime) + ' / ' + tc(v.duration);
    const a = fig.querySelector('[data-js="avance"]'); if (a) a.style.width = (k * 100) + '%';
    const c = fig.querySelector('[data-js="cabezal"]'); if (c) c.style.left = (k * 100) + '%';
  };
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.caso-final [data-js="play"], .caso-final__barra');
    if (!b) return;
    const fig = b.closest('.caso-final'), v = fig.querySelector('video');
    if (!v) return;
    if (!v.__crona) {
      v.__crona = true;
      ['timeupdate', 'loadedmetadata'].forEach(ev => v.addEventListener(ev, () => pintar(fig, v)));
      v.addEventListener('play', () => fig.setAttribute('data-reproduciendo', ''));
      v.addEventListener('pause', () => fig.removeAttribute('data-reproduciendo'));
    }
    if (b.classList.contains('caso-final__barra')) { const r = b.getBoundingClientRect(); if (v.duration) v.currentTime = (e.clientX - r.left) / r.width * v.duration; return; }
    v.paused ? v.play() : v.pause();
  });
})();

(function () {
  if (window.__cronaVisorImagen) return; window.__cronaVisorImagen = true;
  let v = null, lista = [], idx = 0, x0 = null;
  const flecha = d => '<svg viewBox="0 0 16 15" aria-hidden="true" style="width:14px;height:14px;fill:currentColor;' + (d < 0 ? 'transform:rotate(180deg);' : '') + '"><path d="M16 7.5L4.75 13.9952L4.75 1.00481L16 7.5Z"></path><rect y="1" width="2" height="13"></rect></svg>';
  const pintar = () => {
    const ventana = lista[idx], c = v.querySelector('.visor-imagen__contenido');
    c.innerHTML = '';
    const img = ventana.querySelector('img');
    if (img) { const i = img.cloneNode(); i.removeAttribute('style'); i.removeAttribute('loading'); c.appendChild(i); c.style.aspectRatio = (img.naturalWidth || 16) + ' / ' + (img.naturalHeight || 9); }
    else { const m = ventana.querySelector('.marco').cloneNode(true); m.removeAttribute('style'); m.removeAttribute('data-velocidad'); c.appendChild(m); const r = ventana.getBoundingClientRect(); c.style.aspectRatio = r.width + ' / ' + r.height; }
    v.querySelector('.visor-imagen__contador').textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(lista.length).padStart(2, '0');
    v.querySelectorAll('.visor-imagen__nav').forEach(b => { b.hidden = lista.length < 2; });
  };
  const mover = d => { if (!v || lista.length < 2) return; idx = (idx + d + lista.length) % lista.length; pintar(); };
  const cerrar = () => {
    if (!v) return;
    const el = v; v = null;
    el.removeAttribute('data-abierto');
    document.documentElement.style.overflow = '';
    setTimeout(() => el.remove(), 350);
  };
  const abrir = ventana => {
    const g = ventana.closest('.caso-galeria');
    lista = [...(g || document).querySelectorAll('.caso-pieza__ventana')];
    idx = Math.max(0, lista.indexOf(ventana));
    v = document.createElement('div');
    v.className = 'visor-imagen';
    v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Galería ampliada');
    v.innerHTML = '<div class="visor-imagen__contenido"></div>'
      + '<button type="button" class="visor-imagen__cerrar" aria-label="Cerrar">+</button>'
      + '<button type="button" class="visor-imagen__nav visor-imagen__nav--ant" data-d="-1" aria-label="Imagen anterior">' + flecha(-1) + '</button>'
      + '<button type="button" class="visor-imagen__nav visor-imagen__nav--sig" data-d="1" aria-label="Imagen siguiente">' + flecha(1) + '</button>'
      + '<span class="visor-imagen__contador etiqueta"></span>';
    v.addEventListener('click', e => {
      const n = e.target.closest('.visor-imagen__nav');
      if (n) { e.stopPropagation(); mover(+n.dataset.d); return; }
      if (e.target.closest('.visor-imagen__contenido') && lista.length > 1) { e.stopPropagation(); return; }
      cerrar();
    });
    v.addEventListener('pointerdown', e => { x0 = e.clientX; });
    v.addEventListener('pointerup', e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1); });
    document.body.appendChild(v);
    pintar();
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => v && v.setAttribute('data-abierto', ''));
    v.querySelector('.visor-imagen__cerrar').focus();
  };
  document.addEventListener('click', e => { const w = e.target.closest && e.target.closest('.caso-galeria .caso-pieza__ventana'); if (w && !v) abrir(w); });
  document.addEventListener('keydown', e => {
    if (v) {
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.caso-galeria .caso-pieza__ventana')) { e.preventDefault(); abrir(e.target); }
  });
})();

(function () {
  if (window.__cronaSinHover) return; window.__cronaSinHover = true;
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.categoria, .maqueta__tarjeta');
    if (!b || e.detail === 0) return;
    b.setAttribute('data-sin-hover', '');
    b.addEventListener('pointerleave', () => b.removeAttribute('data-sin-hover'), { once: true });
  }, true);
})();

(function () {
  if (window.__cronaYoutube) return; window.__cronaYoutube = true;
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.caso-final[data-youtube] [data-js="play"]');
    if (!b) return;
    e.stopImmediatePropagation();
    const fig = b.closest('.caso-final'), p = fig.querySelector('.caso-final__pantalla');
    if (p.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube.com/embed/' + fig.dataset.youtube + '?autoplay=1&rel=0&playsinline=1';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.title = 'Video final';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
    f.allowFullscreen = true;
    p.appendChild(f);
    fig.setAttribute('data-reproduciendo', '');
  }, true);
})();

(function () {
  if (window.__cronaSaltar) return; window.__cronaSaltar = true;
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-saltar]');
    if (!a) return;
    e.preventDefault();
    const s = a.closest('section');
    const dest = document.getElementById('proyecto') || (s && s.nextElementSibling);
    if (dest) window.scrollTo({ top: dest.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' });
  });
})();

(function () {
  if (window.__cronaTareas) return; window.__cronaTareas = true;
  const ajustar = d => {
    const l = d.querySelector('.caso-tareas__lista'), b = d.querySelector('.caso-tareas__boton');
    if (!l || !b) return;
    l.style.maxHeight = ''; l.style.top = ''; l.style.bottom = '';
    if (!d.open || window.innerWidth <= 760) return;
    const esc = d.closest('.caso-proceso__escena');
    const lim = esc ? esc.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const barra = document.querySelector('.tira, .caso-tira, [data-js="tira"]');
    const bh = barra && getComputedStyle(barra).position === 'fixed' ? barra.getBoundingClientRect().height : 56;
    const rb = b.getBoundingClientRect(), m = 12;
    const abajo = Math.min(lim.bottom, window.innerHeight) - bh - rb.bottom - 8 - m;
    const arriba = rb.top - Math.max(lim.top, 0) - 72 - 8 - m;
    const necesita = l.scrollHeight;
    if (abajo >= Math.min(necesita, 120) || abajo >= arriba) {
      l.style.top = 'calc(100% + 8px)'; l.style.bottom = 'auto'; l.style.maxHeight = Math.max(80, abajo) + 'px';
    } else {
      l.style.top = 'auto'; l.style.bottom = 'calc(100% + 8px)'; l.style.maxHeight = Math.max(80, arriba) + 'px';
    }
  };
  document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('.caso-tareas')) ajustar(e.target); }, true);
  const todas = () => document.querySelectorAll('.caso-tareas[open]').forEach(ajustar);
  window.addEventListener('resize', todas);
  window.addEventListener('scroll', () => requestAnimationFrame(todas), { passive: true });
})();
