/* <crona-modelo base="…glb" figuras="a.glb|b.glb|c.glb" activa="0"> — base fija; la figura activa se gira con arrastre y cambia con el atributo activa. */
(function () {
  if (customElements.get('crona-modelo')) return;
  const V = '0.160.0';
  const cargarThree = () => window.__cronaThree || (window.__cronaThree = Promise.all([
    import('https://esm.sh/three@' + V),
    import('https://esm.sh/three@' + V + '/examples/jsm/loaders/GLTFLoader.js'),
    import('https://esm.sh/three@' + V + '/examples/jsm/environments/RoomEnvironment.js')
  ]));

  class CronaModelo extends HTMLElement {
    static get observedAttributes() { return ['activa']; }
    attributeChangedCallback() { if (this._cambiar) this._cambiar(+this.getAttribute('activa') || 0); }
    connectedCallback() {
      if (this._iniciado) return;
      this._iniciado = true;
      this.style.display = 'block';
      this.style.position = this.style.position || 'relative';
      this.style.touchAction = 'pan-y';
      this.style.cursor = 'none';
      const aviso = document.createElement('span');
      aviso.className = 'modelo-aviso';
      aviso.setAttribute('aria-hidden', 'true');
      aviso.innerHTML = '<svg class="modelo-aviso__icono" viewBox="0 0 64 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="32" cy="14" rx="27" ry="10" opacity=".35"/><path id="orbita-crona" d="M5 14a27 10 0 1 0 54 0a27 10 0 1 0-54 0" stroke="none"/><path d="M-4-4 0 0l-4 4" stroke-width="2.2"><animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto"><mpath href="#orbita-crona"/></animateMotion></path></svg>';
      this.appendChild(aviso);
      this._aviso = aviso;
      cargarThree().then(([THREE, { GLTFLoader }, { RoomEnvironment }]) => this.montar(THREE, GLTFLoader, RoomEnvironment)).catch(e => console.warn('crona-modelo', e));
    }

    disconnectedCallback() {
      this._vivo = false;
      cancelAnimationFrame(this._cuadro);
      if (this._ro) this._ro.disconnect();
      if (this._io) this._io.disconnect();
      if (this._renderer) { this._renderer.dispose(); this._renderer.domElement.remove(); }
      this._iniciado = false;
    }

    async montar(THREE, GLTFLoader, RoomEnvironment) {
      this._vivo = true;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
      this.insertBefore(renderer.domElement, this.firstChild);
      this._renderer = renderer;

      const escena = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      escena.add(new THREE.HemisphereLight(0xf5f5f7, 0x0b1020, 1.4));
      const luz = new THREE.DirectionalLight(0xffffff, 2.2);
      luz.position.set(3, 6, 4);
      escena.add(luz);
      const relleno = new THREE.DirectionalLight(0x00e5ff, 0.6);
      relleno.position.set(-4, 2, -3);
      escena.add(relleno);

      const camara = new THREE.PerspectiveCamera(28, 1, 0.01, 1000);
      const loader = new GLTFLoader();
      const cargar = url => new Promise((ok, mal) => loader.load(url, g => ok(g.scene), undefined, mal));
      const urls = (this.getAttribute('figuras') || this.getAttribute('figura') || '').split('|').map(s => s.trim()).filter(Boolean);
      const [base, figura] = await Promise.all([cargar(this.getAttribute('base')), cargar(urls[0])]);
      if (!this._vivo) return;
      const ajustarMateriales = (raiz) => raiz.traverse(n => {
        if (!n.isMesh) return;
        (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => {
          if (m.transparent) { m.depthWrite = false; m.side = THREE.DoubleSide; n.renderOrder = 2; }
          if (m.isMeshBasicMaterial) m.toneMapped = false;
          if (m.map) m.map.anisotropy = 8;
          m.needsUpdate = true;
        });
      });
      ajustarMateriales(base); ajustarMateriales(figura);
      escena.add(base);

      const armar = fig => {
        const c = new THREE.Box3().setFromObject(fig).getCenter(new THREE.Vector3());
        const p = new THREE.Group();
        p.position.set(c.x, 0, c.z);
        fig.position.sub(new THREE.Vector3(c.x, 0, c.z));
        p.add(fig);
        return p;
      };
      const pivotes = [armar(figura)];
      escena.add(pivotes[0]);

      const caja = new THREE.Box3().setFromObject(escena);
      const centro = caja.getCenter(new THREE.Vector3());
      const radio = caja.getBoundingSphere(new THREE.Sphere()).radius;
      const azimut = THREE.MathUtils.degToRad(+(this.getAttribute('azimut') || 45));
      const elevacion = THREE.MathUtils.degToRad(+(this.getAttribute('elevacion') || 30));
      const dist = radio / Math.sin(THREE.MathUtils.degToRad(camara.fov / 2)) * 1.08;
      camara.position.set(
        centro.x + dist * Math.cos(elevacion) * Math.sin(azimut),
        centro.y + dist * Math.sin(elevacion),
        centro.z + dist * Math.cos(elevacion) * Math.cos(azimut)
      );
      camara.lookAt(centro);
      camara.near = dist / 100; camara.far = dist * 10;

      let angulo = 0, velocidad = 0, arrastrando = false, ultimoX = 0, visible = true;
      let actual = 0, transicion = null;
      const estado = pivotes.map((p, i) => ({ v: i === 0 ? 1 : 0 }));
      const suave = t => t * t * (3 - 2 * t);
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
        if (!arrastrando) { velocidad *= 0.93; angulo += velocidad; }
        let animando = false;
        pivotes.forEach((p, i) => {
          if (!p) return;
          const meta = i === actual ? 1 : 0, e = estado[i];
          e.v += (meta - e.v) * 0.14;
          if (Math.abs(meta - e.v) < 0.002) e.v = meta; else animando = true;
          const k = suave(e.v);
          p.visible = k > 0.001;
          p.scale.set(0.85 + 0.15 * k, k, 0.85 + 0.15 * k);
          if (i === actual) p.rotation.y = angulo;
        });
        dibujar();
        if (arrastrando || animando || Math.abs(velocidad) > 0.0004) this._cuadro = requestAnimationFrame(bucle);
        else this._cuadro = 0;
      };
      const despertar = () => { if (!this._cuadro && visible) this._cuadro = requestAnimationFrame(bucle); };

      this.addEventListener('pointerdown', e => {
        arrastrando = true; ultimoX = e.clientX; velocidad = 0;
        this.setAttribute('data-usado', '');
        this.setAttribute('data-arrastrando', '');
        this.setPointerCapture(e.pointerId);
        this.style.cursor = 'none';
        despertar();
      });
      this.addEventListener('pointermove', e => {
        if (!arrastrando) return;
        const d = (e.clientX - ultimoX) / Math.max(200, this.clientWidth) * Math.PI * 1.6;
        ultimoX = e.clientX; angulo += d; velocidad = d;
      });
      const soltar = () => { arrastrando = false; this.removeAttribute('data-arrastrando'); this.style.cursor = 'none'; despertar(); };
      this.addEventListener('pointerup', soltar);
      this.addEventListener('pointercancel', soltar);

      this._cambiar = i => {
        i = Math.max(0, Math.min(urls.length - 1, i));
        if (i === actual) return;
        actual = i;
        angulo = 0; velocidad = 0;
        if (pivotes[i]) pivotes[i].rotation.y = 0;
        despertar();
      };
      urls.slice(1).forEach((u, k) => cargar(u).then(f => {
        if (!this._vivo) return;
        ajustarMateriales(f);
        const p = armar(f);
        p.scale.set(0.85, 0, 0.85); p.visible = false;
        pivotes[k + 1] = p; estado[k + 1] = { v: 0 };
        escena.add(p);
        despertar();
      }).catch(e => console.warn('crona-modelo', u, e)));
      this._ro = new ResizeObserver(ajustar);
      this._ro.observe(this);
      this._io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) despertar(); });
      this._io.observe(this);
      ajustar();
      this._cambiar(+this.getAttribute('activa') || 0);
    }
  }
  customElements.define('crona-modelo', CronaModelo);
})();
