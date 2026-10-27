/* <crona-maqueta ruta="modelos/maqueta/"> — maqueta por capas. API: el.aplicar(capasActivas[], vista), el.reiniciarCamara(). */
(function () {
  if (customElements.get('crona-maqueta')) return;
  const V = '0.160.0';
  const cargarThree = () => window.__cronaMaqueta || (window.__cronaMaqueta = Promise.all([
    import('https://esm.sh/three@' + V),
    import('https://esm.sh/three@' + V + '/examples/jsm/loaders/GLTFLoader.js'),
    import('https://esm.sh/three@' + V + '/examples/jsm/controls/OrbitControls.js'),
    import('https://esm.sh/three@' + V + '/examples/jsm/environments/RoomEnvironment.js')
  ]));
  const CAPAS = {
    terreno: { archivo: '01_Terreno.glb', anim: 'caer', fija: true },
    calles: { archivo: '02_Calles_Puente.glb', anim: 'caer' },
    residencial: { archivo: '03_Residencial.glb', anim: 'crecer' },
    comercial: { archivo: '04_Comercial.glb', anim: 'crecer' },
    industria: { archivo: '05_Industria.glb', anim: 'crecer' },
    agua: { archivo: '06_Moldeado_Agua.glb', anim: 'caer' },
    pips: { archivo: '07_Pips_Autos.glb', anim: 'caer' },
    barras: { archivo: '08_Barras.glb', anim: 'crecer', solo: 'basura' }
  };
  const suave = t => t * t * (3 - 2 * t);
  const salida = t => 1 - Math.pow(1 - t, 3);

  class CronaMaqueta extends HTMLElement {
    connectedCallback() {
      if (this._iniciado) return;
      this._iniciado = true;
      this.style.display = 'block';
      if (getComputedStyle(this).position === 'static') this.style.position = 'relative';
      this._deseo = { capas: [], vista: 'normal' };
      const aviso = document.createElement('span');
      aviso.className = 'modelo-aviso';
      aviso.setAttribute('aria-hidden', 'true');
      aviso.innerHTML = '<svg class="modelo-aviso__icono" viewBox="0 0 64 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="32" cy="14" rx="27" ry="10" opacity=".35"/><path id="orbita-maqueta" d="M5 14a27 10 0 1 0 54 0a27 10 0 1 0-54 0" stroke="none"/><path d="M-4-4 0 0l-4 4" stroke-width="2.2"><animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto"><mpath href="#orbita-maqueta"/></animateMotion></path></svg>';
      this.appendChild(aviso);
      // precarga: arranca cuando la sección está a ~1,5 pantallas
      const arrancar = () => {
        if (this._arrancado) return;
        this._arrancado = true;
        window.removeEventListener('scroll', this._chequeo);
        window.removeEventListener('resize', this._chequeo);
        if (this._ioPre) this._ioPre.disconnect();
        cargarThree().then(m => this.montar(...m)).catch(e => console.warn('crona-maqueta', e));
      };
      this._chequeo = () => {
        const r = this.getBoundingClientRect(), h = window.innerHeight;
        if (r.top < h * 2.5 && r.bottom > -h * 1.5) arrancar();
      };
      window.addEventListener('scroll', this._chequeo, { passive: true });
      window.addEventListener('resize', this._chequeo, { passive: true });
      this._ioPre = new IntersectionObserver(([en]) => { if (en.isIntersecting) arrancar(); }, { rootMargin: '150% 0px 150% 0px' });
      this._ioPre.observe(this);
      requestAnimationFrame(this._chequeo);
    }

    disconnectedCallback() {
      this._vivo = false;
      cancelAnimationFrame(this._cuadro);
      [this._ro, this._ioPre].forEach(o => o && o.disconnect());
      window.removeEventListener('scroll', this._chequeo);
      window.removeEventListener('resize', this._chequeo);
      if (this._despertarScroll) window.removeEventListener('scroll', this._despertarScroll);
      this._arrancado = false;
      if (this._controles) this._controles.dispose();
      if (this._renderer) { this._renderer.dispose(); this._renderer.domElement.remove(); }
      this._iniciado = false;
    }

    aplicar(capas, vista) {
      this._deseo = { capas: capas.slice(), vista: vista || 'normal' };
      if (this._reconciliar) this._reconciliar();
    }

    reiniciarCamara() { if (this._volver) this._volver(); }

    async montar(THREE, { GLTFLoader }, { OrbitControls }, { RoomEnvironment }) {
      this._vivo = true;
      const ruta = this.getAttribute('ruta') || 'modelos/maqueta/';
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;cursor:none;';
      this.insertBefore(renderer.domElement, this.firstChild);
      this._renderer = renderer;

      const escena = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      escena.add(new THREE.HemisphereLight(0xf5f5f7, 0x1a1f2e, 1.2));
      const sol = new THREE.DirectionalLight(0xffffff, 2.4);
      sol.castShadow = true;
      sol.shadow.mapSize.set(2048, 2048);
      sol.shadow.bias = -0.0004;
      sol.shadow.normalBias = 0.6;
      sol.shadow.radius = 4;
      escena.add(sol, sol.target);

      const loader = new GLTFLoader();
      const cache = {};
      const cargar = (vista, archivo) => cache[vista + archivo] || (cache[vista + archivo] = new Promise((ok, mal) =>
        loader.load(ruta + vista + '/' + archivo, g => ok(g.scene), undefined, mal)));
      const preparar = raiz => {
        if (raiz.userData.prep) return raiz;
        raiz.userData.prep = true;
        raiz.traverse(n => {
          if (!n.isMesh) return;
          n.castShadow = true; n.receiveShadow = true;
          (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => {
            m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent;
            if (m.map) m.map.anisotropy = 8;
          });
        });
        raiz.children.forEach(c => { c.userData.sy = c.scale.y; });
        return raiz;
      };
      const materiales = raiz => { const s = new Set(); raiz.traverse(n => n.isMesh && [].concat(n.material).forEach(m => s.add(m))); return [...s]; };
      const opacidad = (raiz, k) => materiales(raiz).forEach(m => {
        const fin = k >= 1;
        m.transparent = fin ? m.userData.tr0 : true;
        m.opacity = m.userData.op0 * k;
        m.depthWrite = fin ? true : k > 0.6;
        m.needsUpdate = true;
      });

      const terreno = preparar(await cargar('normal', CAPAS.terreno.archivo));
      if (!this._vivo) return;
      const caja = new THREE.Box3().setFromObject(terreno);
      const centro = caja.getCenter(new THREE.Vector3());
      const radio = caja.getBoundingSphere(new THREE.Sphere()).radius;
      const camara = new THREE.PerspectiveCamera(28, 1, 1, 1000);
      const az = THREE.MathUtils.degToRad(+(this.getAttribute('azimut') || 45));
      const el = THREE.MathUtils.degToRad(+(this.getAttribute('elevacion') || 30));
      const dist = radio / Math.sin(THREE.MathUtils.degToRad(camara.fov / 2)) * 1.0;
      const posInicial = new THREE.Vector3(
        centro.x + dist * Math.cos(el) * Math.sin(az),
        centro.y + dist * Math.sin(el),
        centro.z + dist * Math.cos(el) * Math.cos(az));
      camara.position.copy(posInicial);
      camara.near = dist / 50; camara.far = dist * 6;
      camara.lookAt(centro);
      sol.position.set(centro.x - radio * 0.6, centro.y + radio * 1.4, centro.z + radio * 0.8);
      sol.target.position.copy(centro);
      const sc = sol.shadow.camera;
      sc.left = sc.bottom = -radio * 1.05; sc.right = sc.top = radio * 1.05;
      sc.near = radio * 0.2; sc.far = radio * 4; sc.updateProjectionMatrix();
      const mesa = new THREE.Mesh(new THREE.PlaneGeometry(radio * 6, radio * 6), new THREE.ShadowMaterial({ opacity: 0.32 }));
      mesa.rotation.x = -Math.PI / 2; mesa.position.set(centro.x, caja.min.y - 0.05, centro.z);
      mesa.receiveShadow = true;
      escena.add(mesa);

      const controles = new OrbitControls(camara, renderer.domElement);
      this._controles = controles;
      controles.target.copy(centro);
      controles.enableDamping = true; controles.dampingFactor = 0.08;
      controles.enablePan = false;
      controles.rotateSpeed = 0.6;
      controles.minDistance = dist * 0.45; controles.maxDistance = dist * 1.2;
      controles.minPolarAngle = THREE.MathUtils.degToRad(12);
      controles.maxPolarAngle = THREE.MathUtils.degToRad(78);
      controles.update();
      // la rueda scrollea la página; solo pellizco (ctrl+rueda / trackpad) hace zoom
      renderer.domElement.addEventListener('wheel', e => { if (!e.ctrlKey) e.stopImmediatePropagation(); }, { capture: true });
      controles.addEventListener('start', () => { this.setAttribute('data-usado', ''); renderer.domElement.style.cursor = 'none'; });
      controles.addEventListener('end', () => { renderer.domElement.style.cursor = 'none'; });
      controles.addEventListener('change', () => despertar());

      const tweens = new Set();
      const tween = (dur, fn, fin) => { const t = { t0: performance.now(), dur, fn, fin }; tweens.add(t); despertar(); return t; };
      const cortar = obj => tweens.forEach(t => { if (t.obj === obj) { tweens.delete(t); t.fn(1); t.fin && t.fin(); } });

      const entrar = (obj, tipo, inverso, listo) => {
        let t;
        if (tipo === 'crecer') {
          const hijos = obj.children.map(c => ({ c, d: Math.random() * (inverso ? 0.35 : 0.55) }));
          const dur = inverso ? 0.45 : 0.6, total = (inverso ? 0.35 : 0.55) + dur;
          t = tween(total * 1000, k => {
            const s = k * total;
            hijos.forEach(({ c, d }) => {
              let e = Math.min(1, Math.max(0, (s - d) / dur));
              e = inverso ? 1 - suave(e) : salida(e);
              c.scale.y = Math.max(0.001, c.userData.sy * e);
              c.visible = e > 0.002;
            });
          }, listo);
        } else {
          const y0 = obj.position.y;
          t = tween(inverso ? 380 : 620, k => {
            const e = inverso ? 1 - suave(k) : salida(k);
            obj.position.y = y0 + (1 - e) * 14;
            opacidad(obj, e);
          }, () => { obj.position.y = y0; listo && listo(); });
        }
        t.obj = obj;
      };

      const fundir = (viejo, nuevo, listo) => {
        nuevo.children.forEach((c, i) => { const o = viejo.children[i]; if (o) { c.scale.y = o.scale.y; c.visible = o.visible; } });
        nuevo.position.y = viejo.position.y;
        nuevo.traverse(n => { if (n.isMesh) n.renderOrder = 3; });
        opacidad(nuevo, 0);
        escena.add(nuevo);
        const t = tween(320, k => opacidad(nuevo, suave(k)), () => {
          escena.remove(viejo);
          nuevo.traverse(n => { if (n.isMesh) n.renderOrder = 0; });
          listo && listo();
        });
        t.obj = nuevo;
      };

      const actual = {}; // id → { obj, vista, saliendo }
      const token = {};
      const objetivo = id => {
        const c = CAPAS[id], d = this._deseo;
        const visible = c.fija || (c.solo ? d.vista === c.solo : d.capas.includes(id));
        return { visible, vista: c.solo || d.vista };
      };
      const reconciliar = () => {
        Object.keys(CAPAS).forEach(async id => {
          const o = objetivo(id), a = actual[id], c = CAPAS[id];
          const tk = token[id] = (token[id] || 0) + 1;
          if (!o.visible) {
            if (a && !a.saliendo) {
              a.saliendo = true; cortar(a.obj);
              entrar(a.obj, c.anim, true, () => { if (actual[id] === a) { escena.remove(a.obj); delete actual[id]; } });
            }
            return;
          }
          if (a && a.vista === o.vista && !a.saliendo) return;
          let obj;
          try { obj = (id === 'terreno' && o.vista === 'normal') ? terreno : preparar((await cargar(o.vista, c.archivo))); } catch (e) { console.warn('crona-maqueta', id, e); return; }
          if (!this._vivo || token[id] !== tk) return;
          const prev = actual[id];
          if (prev && prev.obj === obj) { cortar(obj); prev.saliendo = false; entrar(obj, c.anim, false); return; }
          if (prev && !prev.saliendo) {
            cortar(prev.obj);
            actual[id] = { obj, vista: o.vista };
            fundir(prev.obj, obj);
          } else {
            if (prev) { cortar(prev.obj); escena.remove(prev.obj); }
            actual[id] = { obj, vista: o.vista };
            escena.add(obj);
            entrar(obj, c.anim, false);
          }
        });
      };
      this._reconciliar = reconciliar;

      // estado inicial: terreno ya puesto, sin animar
      escena.add(terreno);
      actual.terreno = { obj: terreno, vista: 'normal' };
      reconciliar();
      // precarga del resto en segundo plano
      ['normal', 'datos', 'basura'].forEach((v, i) => setTimeout(() => {
        Object.values(CAPAS).forEach(c => { if (!c.solo || c.solo === v) cargar(v, c.archivo).then(preparar).catch(() => {}); });
      }, i * 600));

      this._volver = () => {
        const p0 = camara.position.clone();
        tween(900, k => { camara.position.lerpVectors(p0, posInicial, suave(k)); controles.target.copy(centro); });
      };

      const enPantalla = () => { const r = this.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight && r.width > 0; };
      const dibujar = () => renderer.render(escena, camara);
      const ajustar = () => {
        const w = this.clientWidth, h = this.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camara.aspect = w / h;
        camara.updateProjectionMatrix();
        dibujar();
      };
      const bucle = () => {
        if (!this._vivo) return;
        const ahora = performance.now();
        tweens.forEach(t => {
          const k = Math.min(1, (ahora - t.t0) / t.dur);
          t.fn(k);
          if (k >= 1) { tweens.delete(t); t.fin && t.fin(); }
        });
        controles.update();
        dibujar();
        this._cuadro = (tweens.size || enPantalla()) ? requestAnimationFrame(bucle) : 0;
      };
      const despertar = () => { if (!this._cuadro && this._vivo) this._cuadro = requestAnimationFrame(bucle); };
      this._ro = new ResizeObserver(ajustar);
      this._ro.observe(this);
      this._despertarScroll = () => { if (!this._cuadro && enPantalla()) despertar(); };
      window.addEventListener('scroll', this._despertarScroll, { passive: true });
      ajustar();
      despertar();
      this.setAttribute('data-listo', '');
    }
  }
  customElements.define('crona-maqueta', CronaMaqueta);
})();
