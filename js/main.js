/**
 * SHADER DEFINITIONS
 */
const cardVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const cardFragmentShader = `
    precision highp float;
    #define PI 3.14159265
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    uniform sampler2D map;
    uniform sampler2D envMap2D;
    uniform sampler2D uFlakeMap;
    
    uniform vec3 uCameraPos;
    uniform float uFlakesEnabled;
    uniform float uFlakeSize;
    uniform float uFlakeReduction;
    uniform float uFlakeBrightness;
    uniform float uMetalness;
    uniform float uIridescence;
    uniform float uEnvIntensity;

    float luminance(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }

    vec2 dirToEquirectUv(vec3 dir) {
        dir = normalize(dir);
        float phi = atan(dir.z, dir.x);
        float theta = acos(clamp(dir.y, -1.0, 1.0));
        return vec2((phi + PI) / (2.0 * PI), theta / PI);
    }

    vec3 iridescenceColor(float cosTheta) {
        float phase = 6.28318 * (0.2 + 0.5 * (1.0 - cosTheta));
        vec3 rainbow = 0.5 + 0.5 * vec3(sin(phase), sin(phase + 2.094), sin(phase + 4.188));
        return mix(vec3(1.0), rainbow, uIridescence);
    }

    void main() {
        vec4 base = texture2D(map, vUv);
        
        // DISCARD transparent pixels (This acts as our mask for the layers)
        if(base.a < 0.1) discard;

        vec3 N = normalize(vNormal);
        vec3 V = normalize(uCameraPos - vWorldPos);
        vec3 R = reflect(-V, N);
        float cosTheta = clamp(dot(N, V), 0.0, 1.0);

        vec3 env = texture2D(envMap2D, dirToEquirectUv(R)).rgb * uEnvIntensity;
        vec3 iri = iridescenceColor(cosTheta);
        vec3 holoTint = base.rgb * iri;
        
        vec3 sparkleCol = vec3(0.0);
        if(uFlakesEnabled > 0.5) {
            vec4 flakeTex = texture2D(uFlakeMap, vUv * uFlakeSize);
            float mask = smoothstep(uFlakeReduction, 1.0, flakeTex.r);
            
            vec3 flakeNorm = normalize(N + vec3((flakeTex.r - 0.5) * 0.7, (flakeTex.g - 0.5) * 0.7, (flakeTex.b - 0.5) * 0.7));
            vec3 PR = reflect(-V, flakeNorm);
            float lightHit = luminance(texture2D(envMap2D, dirToEquirectUv(PR)).rgb);
            
            float glint = pow(lightHit, 16.0) * mask; 
            vec3 fire = 0.5 + 0.5 * cos(6.28318 * (flakeTex.g + vec3(0, 1, 2) / 3.0));
            sparkleCol = glint * fire * uFlakeBrightness * 100.0;
        }

        // Apply holographic effect
        vec3 diffuse = mix(base.rgb, holoTint, uMetalness);
        vec3 specular = (env * 0.4) * iri * uMetalness;
        vec3 finalColor = diffuse + specular + sparkleCol + (iri * 0.1);
        
        gl_FragColor = vec4(finalColor, base.a);
    }
`;

window.CardApp = {
    scene: null,
    camera: null,
    renderer: null,
    cardMesh: null,
    envMap: null,
    flakeMap: null,
    isFlipped: false,
    userImages: { front: null, back: null },
    flakeOptions: [
        'broken-glass.jpg', 
        'flakes.jpg', 
        'gold.jpg', 
        'oil.jpg', 
        'shards.jpg',
        'fire.jpg',
        'foil1.jpg'
    ],

    init() {
        const viewport = document.getElementById('viewport');
        if (!viewport) return;

        window.UIHandler?.init();

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(35, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
        this.camera.position.z = 12;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        viewport.appendChild(this.renderer.domElement);

        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');

        // Load Default Environment
        this.envMap = loader.load('assets/room-envmap.jpg', (tex) => {
            tex.mapping = THREE.EquirectangularReflectionMapping;
            this.updateCard();
        });

        this.flakeMap = loader.load('assets/broken-glass.jpg', (tex) => {
            const imageRatio = tex.image.width / tex.image.height;

            // 1. Check if the image needs rotation to fit the vertical card better
            if (imageRatio > 1.0) {
                tex.rotation = Math.PI / 2; 
                tex.center.set(0.5, 0.5); 
            }

            // 2. Set wrapping and repeat
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            
            // 3. Update the card now that the texture is ready
            this.updateCard();
        });

        this.flakeMap.wrapS = this.flakeMap.wrapT = THREE.RepeatWrapping;

        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);

        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        pointLight.position.set(5, 5, 10); // Positioned to hit the card face
        this.scene.add(pointLight);

        this.createFlakeDropdown();
        this.setupInteraction();
        this.updateCard(); 
        this.animate();
        window.addEventListener('resize', () => this.handleResize());
    },

    createFlakeDropdown() {
        // Looks for a div with ID 'ui-controls' in your HTML
        const container = document.getElementById('ui-controls'); 
        if (!container) return;

        const wrapper = document.createElement('div');
        wrapper.style.padding = "10px";
        wrapper.style.background = "rgba(0,0,0,0.5)";
        wrapper.style.borderRadius = "5px";
        wrapper.style.marginTop = "10px";
        
        const label = document.createElement('label');
        label.innerText = "Foil Pattern: ";
        label.style.color = "white";
        label.style.fontSize = "12px";
        
        const select = document.createElement('select');
        select.style.background = "#222";
        select.style.color = "white";
        select.style.border = "1px solid #444";
        
        this.flakeOptions.forEach(fileName => {
            const option = document.createElement('option');
            option.value = `assets/${fileName}`;
            option.innerText = fileName.replace('.jpg', '').toUpperCase();
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => this.changeFlakeTexture(e.target.value));
        
        wrapper.appendChild(label);
        wrapper.appendChild(select);
        container.appendChild(wrapper);
    },

    changeFlakeTexture(path) {
        const loader = new THREE.TextureLoader();
        loader.load(path, (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            this.flakeMap = tex; // Update the global map
            this.updateCard();   // Re-render the 3D card
        });
    },

    handleResize() {
        const vp = document.getElementById('viewport');
        if (!vp || !this.camera || !this.renderer) return;
        this.camera.aspect = vp.clientWidth / vp.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(vp.clientWidth, vp.clientHeight);
    },

    updateCard(vaultData = null) {
        if (!window.CardApp || !window.CardRenderer) return;
        const data = vaultData || window.UIHandler.getFormData();
        
        window.CardRenderer.renderFront(data, this.userImages);
        window.CardRenderer.renderBack(data, this.userImages);

        const texF = new THREE.CanvasTexture(document.getElementById('hidden-canvas-front'));
        const texB = new THREE.CanvasTexture(document.getElementById('hidden-canvas-back'));
        const texP = new THREE.CanvasTexture(document.getElementById('hidden-canvas-player'));
        const texBorder = new THREE.CanvasTexture(document.getElementById('hidden-canvas-border'));

        [texF, texB, texP, texBorder].forEach(t => t.needsUpdate = true);

        if (this.cardMesh) this.scene.remove(this.cardMesh);

        const sideMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        
        // BACK MATERIAL: Always uses environment map for subtle depth
        const backMat = new THREE.MeshStandardMaterial({ 
            map: texB, 
            envMap: this.envMap,
            roughness: 0.7, 
            metalness: 0.1,
            envMapIntensity: 0.5 
        });

        /**
         * Helper: Material Switcher
         * Now applies environment mapping to both Shader and Standard materials
         */
        const getMaterial = (tex, isHoloEnabled, isTransparent = false) => {
            // Determine if this specific layer should be holographic
            // Logic: If the user checked the specific layer holo OR if the master foil is on
            const shouldShowHolo = isHoloEnabled || data.isFoil || data.rarityTier === 'Legendary';
            
            if (shouldShowHolo) {
                return new THREE.ShaderMaterial({
                    uniforms: {
                        map: { value: tex },
                        envMap2D: { value: this.envMap },
                        uFlakeMap: { value: this.flakeMap },
                        uCameraPos: { value: new THREE.Vector3().copy(this.camera.position) },
                        uFlakesEnabled: { value: 1.0 },
                        uFlakeSize: { value: 1.0 },
                        uFlakeReduction: { value: 0.65 },
                        uFlakeBrightness: { value: 0.18 },
                        uMetalness: { value: 0.4 },
                        uIridescence: { value: 0.8 },
                        uEnvIntensity: { value: 1.2 }
                    },
                    vertexShader: cardVertexShader,
                    fragmentShader: cardFragmentShader,
                    transparent: true,
                    depthWrite: !isTransparent
                });
            }

            // Default Matte Material
            return new THREE.MeshStandardMaterial({ 
                map: tex, 
                envMap: this.envMap,
                envMapIntensity: 0.4,
                transparent: isTransparent, 
                alphaTest: isTransparent ? 0.1 : 0,
                roughness: 0.8,
                metalness: 0.1
            });
        };

        // 1. Background
        const frontMat = getMaterial(texF, data.holoBg, false);
        this.cardMesh = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 5, 0.1), 
            [sideMat, sideMat, sideMat, sideMat, frontMat, backMat]
        );
        this.scene.add(this.cardMesh);

        // 2. Player
        const pMat = getMaterial(texP, data.holoPlayer, true);
        const pMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5), pMat);
        pMesh.position.z = 0.051; 
        this.cardMesh.add(pMesh);

        // 3. Border
        const bMat = getMaterial(texBorder, data.holoBorder, true);
        const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5), bMat);
        bMesh.position.z = 0.052; 
        this.cardMesh.add(bMesh);
    },

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const camPos = this.camera.position;

        if (this.cardMesh) {
            // Update Background (Box Side 4)
            if (this.cardMesh.material[4].type === 'ShaderMaterial') {
                this.cardMesh.material[4].uniforms.uCameraPos.value.copy(camPos);
            }
            
            // Update Overlays (Children of cardMesh)
            this.cardMesh.children.forEach(child => {
                if (child.material && child.material.type === 'ShaderMaterial') {
                    child.material.uniforms.uCameraPos.value.copy(camPos);
                }
            });
        }
        
        this.renderer.render(this.scene, this.camera);
    },

    setupInteraction() {
        let drag = false, prev = {x:0, y:0};
        window.addEventListener('mousedown', (e) => { 
            if (e.target.closest('#viewport')) {
                drag = true; prev = {x:e.clientX, y:e.clientY}; 
            }
        });
        window.addEventListener('mouseup', () => drag = false);
        window.addEventListener('mousemove', e => {
            if (!drag || !this.cardMesh) return;
            this.cardMesh.rotation.y += (e.clientX - prev.x) * 0.01;
            this.cardMesh.rotation.x += (e.clientY - prev.y) * 0.01;
            prev = {x:e.clientX, y:e.clientY};
        });
    }
};

window.addEventListener('load', () => window.CardApp.init());