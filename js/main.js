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
    currentLoadedId: null,
    scene: null,
    camera: null,
    renderer: null,
    cardMesh: null,
    envMap: null,
    flakeMap: null,
    isFlipped: false,
    userImages: { 
        layerBg: null, 
        layerPlayer: null, 
        layerBorder: null, 
        back: null,
        logo1: null,
        logo2: null,
        teamLogo: null,
        teamLogoBack: null,
        seasonLogo: null,
    },
    flakeOptions: [
        'broken-glass.jpg', 
        'flakes.jpg', 
        'gold.jpg', 
        'oil.jpg', 
        'shards.jpg',
        'fire.jpg',
        'foil1.jpg',
        'checkered.jpg',
        'geometric.jpg',
        'geometric2.jpg',
        'retro.jpg',
        'stained-glass.jpg',
        'hogs-tiled.jpg'
    ],
    rotationVelocity: { x: 0, y: 0 },
    friction: 0.95,
    isDragging: false,

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
        this.envMap = loader.load('assets/environment-maps/studio_small_09.jpg', (tex) => {
            tex.mapping = THREE.EquirectangularReflectionMapping;
            this.updateCard();
        });

        this.flakeMap = loader.load('assets/foil-textures/broken-glass.jpg', (tex) => {
            const imageRatio = tex.image.width / tex.image.height;

            if (imageRatio > 1.0) {
                tex.rotation = Math.PI / 2; 
                tex.center.set(0.5, 0.5); 
            }

            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            this.updateCard();
        });

        this.cardstockBumpMap = loader.load('assets/textures/cardstock.jpg', (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            // Repeat 4x4 or 6x6 so the "weave" looks like fine cardstock grain
            tex.repeat.set(5, 5); 
        });

        const ambient = new THREE.AmbientLight(0xffffff, 1.1);
        this.scene.add(ambient);

        this.createFlakeDropdown();
        this.setupInteraction();
        this.updateCard(); 
        this.animate();
        this.loadLatestCard(); 
        window.addEventListener('resize', () => this.handleResize());
    },

    async loadLatestCard() {
        try {
            const { data: record, error } = await window.supabase
                .from('cards')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !record) return;

            console.log("🌊 Restoring latest session:", record.cardName);
            const cfg = record.config;
            this.currentLoadedId = record.id;

            // Parallel Hydration
            await Promise.all([
                this.hydrateImage(cfg.bgUrl).then(img => this.userImages.layerBg = img),
                this.hydrateImage(cfg.playerUrl).then(img => this.userImages.layerPlayer = img),
                this.hydrateImage(cfg.borderUrl).then(img => this.userImages.layerBorder = img),
                this.hydrateImage(cfg.seasonLogoUrl).then(img => this.userImages.seasonLogo = img),
                this.hydrateImage(cfg.teamLogoUrl).then(img => this.userImages.teamLogo = img),
                this.hydrateImage(cfg.backBgUrl).then(img => this.userImages.back = img),
                this.hydrateImage(cfg.logo1Url).then(img => this.userImages.logo1 = img),
                this.hydrateImage(cfg.logo2Url).then(img => this.userImages.logo2 = img)
            ]);

            if (cfg.flakeType) {
                console.log("💎 Applying Card-Specific Holo:", cfg.flakeType);
                
                // 1. Force the 3D Engine to load the specific texture
                this.changeFlakeTexture(cfg.flakeType); 
                
                // 2. Sync the Sidebar UI dropdown so the user sees what is active
                const flakeDropdown = document.getElementById('flakeType');
                if (flakeDropdown) flakeDropdown.value = cfg.flakeType;
            }

            this.applyDataToUI(cfg);
            this.updateCard();
            
            document.getElementById('update-vault-btn')?.classList.remove('hidden');

        } catch (err) {
            console.error("Session Restore Failed:", err);
        }
    },

    exportCardAsGif() {
        // 1. Configuration
        const duration = 2; 
        const fps = 30;
        const totalFrames = duration * fps;
        
        // Ensure we are capturing the Three.js canvas, not the 2D hidden canvases
        const webglCanvas = this.renderer.domElement;

        // 2. Initialize Capturer
        // Note: Ensure ccapture.js and gif.js.mem are in your project
        const capturer = new CCapture({
            format: 'gif',
            workersPath: 'js/libs/',
            framerate: fps,
            quality: 10 // Higher quality encoding
        });

        alert("Starting GIF capture. The card will rotate and a download will trigger once finished.");

        const originalRotationY = this.cardMesh.rotation.y;
        
        // 3. Create a proxy object to handle the animation steps
        let captureData = { frame: 0 };

        // Use GSAP to animate a "frame counter" rather than time
        // This forces every single frame to be rendered regardless of lag
        gsap.to(captureData, {
            frame: totalFrames,
            duration: duration,
            ease: "none",
            onStart: () => {
                capturer.start();
            },
            onUpdate: () => {
                // Manually set rotation based on progress (0 to 1)
                const progress = captureData.frame / totalFrames;
                this.cardMesh.rotation.y = originalRotationY + (Math.PI * 2 * progress);
                
                // Render the frame
                this.renderer.render(this.scene, this.camera);
                
                // Capture the WebGL canvas
                capturer.capture(webglCanvas);
            },
            onComplete: () => {
                capturer.stop();
                capturer.save();
                this.cardMesh.rotation.y = originalRotationY;
                console.log("Capture Finished");
            }
        });
    },

    createFlakeDropdown() {
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
            option.value = `assets/foil-textures/${fileName}`;
            option.innerText = fileName.replace('.jpg', '').toUpperCase();
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => this.changeFlakeTexture(e.target.value));
        
        wrapper.appendChild(label);
        wrapper.appendChild(select);
        container.appendChild(wrapper);
    },

    changeFlakeTexture(path) {
        if (!path) return;
        const loader = new THREE.TextureLoader();
        loader.load(path, (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            this.flakeMap = tex; // Update the reference for this session

            // Manually inject the texture into the Shader uniforms
            if (this.cardMesh) {
                this.cardMesh.traverse((child) => {
                    if (child.material && child.material.uniforms && child.material.uniforms.uFlakeMap) {
                        child.material.uniforms.uFlakeMap.value = tex;
                    }
                });
            }
            // Force a redraw to see the change
            this.updateCard(); 
        });
    },

    handleResize() {
        const vp = document.getElementById('viewport');
        if (!vp || !this.camera || !this.renderer) return;
        this.camera.aspect = vp.clientWidth / vp.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(vp.clientWidth, vp.clientHeight);
    },

    async updateCard(vaultData = null) {
        if (!window.CardApp || !window.CardRenderer) return;
        
        // 1. FRESH CAPTURE: Get newest UI values
        const data = vaultData || window.UIHandler.getFormData();

        // 2. PERSIST ROTATION: Keep orientation while editing
        let currentRotation = { x: 0, y: 0, z: 0 };
        if (this.cardMesh) {
            currentRotation.x = this.cardMesh.rotation.x;
            currentRotation.y = this.cardMesh.rotation.y;
            currentRotation.z = this.cardMesh.rotation.z;
        }

        // 3. TEAM LOGO HANDSHAKE: Sync the HTML inputs with the JS memory
        const frontLogoInput = document.getElementById('teamLogo');
        const backLogoInput = document.getElementById('teamLogoBack');

        // --- Process Front Logo ---
        if (frontLogoInput?.files[0]) {
            const file = frontLogoInput.files[0];
            if (this._lastFrontLogoName !== file.name) {
                this._lastFrontLogoName = file.name;
                const img = new Image();
                img.src = URL.createObjectURL(file);
                await img.decode();
                this.userImages.teamLogo = img; // Slot A
            }
        }

        // --- Process Back Logo ---
        if (backLogoInput?.files[0]) {
            const file = backLogoInput.files[0];
            if (this._lastBackLogoName !== file.name) {
                this._lastBackLogoName = file.name;
                const img = new Image();
                img.src = URL.createObjectURL(file);
                await img.decode();
                this.userImages.teamLogoBack = img; // Slot B
            }
        }

        // 4. RENDER CANVASES: Draw the 2D source graphics
        window.CardRenderer.renderFront(data, this.userImages);
        window.CardRenderer.renderBack(data, this.userImages);

        // 5. TEXTURE EXTRACTION: Convert canvases to Three.js textures
        const getCanvasTex = (id) => {
            const el = document.getElementById(id);
            if (!el) return null;
            const tex = new THREE.CanvasTexture(el);
            tex.flipY = true;
            tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            return tex;
        };

        const texF = getCanvasTex('hidden-canvas-front');
        const texB = getCanvasTex('hidden-canvas-back');
        const texP = getCanvasTex('hidden-canvas-player');
        const texBorder = getCanvasTex('hidden-canvas-border');
        const texVP = getCanvasTex('hidden-canvas-vp');
        const texLL = getCanvasTex('hidden-canvas-league');
        
        // Ensure these use unique canvas IDs if your Renderer separates them
        //const texTeamLogo = getCanvasTex('hidden-canvas-team-logo');
        const texTeamLogoBack = getCanvasTex('hidden-canvas-team-logo-back'); // Use unique canvas for back

        // 6. CLEANUP & DISPOSE: Prevent memory leaks
        if (this.cardMesh) {
            this.cardMesh.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else if (child.material) {
                        child.material.dispose();
                    }
                }
            });
            this.scene.remove(this.cardMesh);
        }

        // 7. MATERIAL & MESH REBUILD
        const sideMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const backMat = new THREE.MeshStandardMaterial({ 
            map: texB, 
            envMap: this.envMap,
            roughness: 0.9,
            metalness: 0.0, 
            envMapIntensity: 0.1,
            bumpMap: this.cardstockBumpMap, 
            bumpScale: 0.015,         
        });

        const getMaterial = (tex, isHoloEnabled, isTransparent = false) => {
            if (isHoloEnabled && tex) {
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

        const frontMat = getMaterial(texF, data.holoBg, false);
        this.cardMesh = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 5, 0.1), 
            [sideMat, sideMat, sideMat, sideMat, frontMat, backMat]
        );

        this.cardMesh.rotation.set(currentRotation.x, currentRotation.y, currentRotation.z);
        this.scene.add(this.cardMesh);

        // 8. ADD OVERLAYS
        const addOverlay = (tex, holo, z, name) => {
            if (!tex) return;
            const mat = getMaterial(tex, holo, true);
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5), mat);
            mesh.position.z = z;
            if (z < 0) mesh.rotation.y = Math.PI;
            this.cardMesh.add(mesh);
        };

        addOverlay(texP, data.holoPlayer, 0.051, 'player');
        addOverlay(texBorder, data.holoBorder, 0.052, 'border');
        
        // Front Team Logo (if your design uses it on front too)
        // addOverlay(texTeamLogo, data.holoBorder, 0.053, 'teamLogoFront');

        // Back Overlays
        addOverlay(texTeamLogoBack, true, -0.0505, 'teamLogoBack'); // Uses specifically the back texture
        addOverlay(texVP, data.isFoil, -0.051, 'logo1');
        addOverlay(texLL, data.isFoil, -0.052, 'logo2');
    },

    generateNoiseTexture(size = 128) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            // Generate a random grayscale value
            const val = Math.random() * 255;
            data[i] = val;     // R
            data[i + 1] = val; // G
            data[i + 2] = val; // B
            data[i + 3] = 255; // A
        }

        ctx.putImageData(imageData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        // Repeat the noise so it looks like fine grain rather than big blobs
        tex.repeat.set(4, 4); 
        return tex;
    },

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.cardMesh) {
            // 1. MOMENTUM LOGIC: Apply spin if not dragging
            if (!this.isDragging) {
                // Apply current velocity to rotation
                this.cardMesh.rotation.x += this.rotationVelocity.x;
                this.cardMesh.rotation.y += this.rotationVelocity.y;

                // Decay the velocity over time (Friction)
                // this.friction is typically 0.95 to 0.98
                this.rotationVelocity.x *= this.friction;
                this.rotationVelocity.y *= this.friction;

                // Stop tiny movements to save performance
                if (Math.abs(this.rotationVelocity.x) < 0.0001) this.rotationVelocity.x = 0;
                if (Math.abs(this.rotationVelocity.y) < 0.0001) this.rotationVelocity.y = 0;
            }

            // 2. SHADER SYNC: Keep holographic highlights moving with view
            if (this.camera) {
                const camPos = this.camera.position;

                // Sync main card face shader
                if (this.cardMesh.material[4]?.type === 'ShaderMaterial') {
                    this.cardMesh.material[4].uniforms.uCameraPos.value.copy(camPos);
                }
                
                // Sync all overlay materials (Player, Border, etc.)
                this.cardMesh.children.forEach(child => {
                    if (child.material && child.material.type === 'ShaderMaterial') {
                        child.material.uniforms.uCameraPos.value.copy(camPos);
                    }
                });

                // 3. UI LOGIC: Toggle Reset View Button visibility
                const resetBtn = document.getElementById('reset-view-btn');
                if (resetBtn) {
                    // Check for rotation (ignoring tiny fractional decimals)
                    const isRotated = Math.abs(this.cardMesh.rotation.x) > 0.01 || 
                                    Math.abs(this.cardMesh.rotation.y) > 0.01;
                    // Check for zoom (default Z is 12)
                    const isZoomed = Math.abs(this.camera.position.z - 12) > 0.1;
                    // Check for pan (default X, Y are 0)
                    const isPanned = Math.abs(this.camera.position.x) > 0.1 || 
                                    Math.abs(this.camera.position.y) > 0.1;

                    if (isRotated || isZoomed || isPanned) {
                        resetBtn.classList.remove('hidden');
                    } else {
                        resetBtn.classList.add('hidden');
                    }
                }
            }
        }
        
        // 4. RENDER FRAME
        this.renderer.render(this.scene, this.camera);
    },

    flipCard() {
        if (!this.cardMesh) return;
        this.isFlipped = !this.isFlipped;
        const targetY = this.isFlipped ? Math.PI : 0;
        
        gsap.to(this.cardMesh.rotation, {
            y: targetY,
            duration: 0.6,
            ease: "back.out(1.2)"
        });
    },

    resetView() {
        if (!this.cardMesh || !this.camera) return;
        
        // Smoothly reset everything
        gsap.to(this.cardMesh.rotation, { x: 0, y: 0, z: 0, duration: 0.8, ease: "power2.out" });
        gsap.to(this.camera.position, { 
            x: 0, 
            y: 0, 
            z: 12, 
            duration: 0.8, 
            ease: "power2.out",
            onComplete: () => {
                // Force hide the button just in case the animation loop hasn't caught it
                document.getElementById('reset-view-btn')?.classList.add('hidden');
            }
        });
        this.isFlipped = false;
    },


    setupInteraction() {
        let prev = { x: 0, y: 0 };
        let pan = false;

        // 1. Prevent context menu for right-click panning
        window.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#viewport')) e.preventDefault();
        });

        // 2. Mousedown: Unified Left (Rotate) and Right (Pan) detection
        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('#viewport')) {
                if (e.button === 0) { // Left Click
                    this.isDragging = true;
                    this.rotationVelocity = { x: 0, y: 0 }; // Kill momentum while grabbing
                }
                if (e.button === 2) { // Right Click
                    pan = true;
                }
                prev = { x: e.clientX, y: e.clientY };
            }
        });

        // 3. Mouseup: Clear all states
        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            pan = false;
        });

        // 4. Mousemove: Handle Rotation OR Panning
        window.addEventListener('mousemove', (e) => {
            if (!this.cardMesh) return;
            
            const deltaX = e.clientX - prev.x;
            const deltaY = e.clientY - prev.y;

            if (this.isDragging) {
                // MOMENTUM ROTATION: Direct update (no GSAP here to avoid lag)
                this.rotationVelocity.y = deltaX * 0.015;
                this.rotationVelocity.x = deltaY * 0.015;

                this.cardMesh.rotation.y += this.rotationVelocity.y;
                this.cardMesh.rotation.x += this.rotationVelocity.x;

            } else if (pan) {
                // PANNING: Smoothly move camera
                gsap.to(this.camera.position, {
                    x: this.camera.position.x - (deltaX * 0.01),
                    y: this.camera.position.y + (deltaY * 0.01),
                    duration: 0.5,
                    ease: "power2.out"
                });
            }

            prev = { x: e.clientX, y: e.clientY };
        });

        // 5. Wheel: Fast and Smooth Zoom
        window.addEventListener('wheel', (e) => {
            if (e.target.closest('#viewport')) {
                e.preventDefault();

                const speedMultiplier = 1.5; 
                const delta = e.deltaY * speedMultiplier;
                let targetZ = this.camera.position.z + (delta * 0.005);
                
                // Keep zoom within card bounds
                targetZ = Math.min(Math.max(targetZ, 5), 18);

                gsap.to(this.camera.position, {
                    z: targetZ,
                    duration: 0.4,
                    ease: "power2.out",
                    overwrite: "auto"
                });
            }
        }, { passive: false });
    },

    async saveToVault() {
        const formData = window.UIHandler.getFormData();
        const flakeType = document.getElementById('flakeType')?.value; 
        const currentTeamColors = window.TeamColors.getColors();

        const customName = prompt("Card Name:", `${formData.fName} ${formData.lName}`);
        if (!customName) return;
        const customSeason = prompt("Season:", "2026");
        if (!customSeason) return;

        try {
            // Helper function to upload layers to Supabase Storage
            const uploadLayer = async (imgElement, fileName) => {
                // 1. Check if the element exists and has a source
                if (!imgElement || !imgElement.src) return null;

                // 2. ONLY skip upload if it's already a permanent Cloud URL (e.g., contains 'supabase.co')
                // If it starts with 'data:' or 'blob:', it MUST be uploaded.
                const isLocal = imgElement.src.startsWith('data:') || imgElement.src.startsWith('blob:');
                
                if (!isLocal) {
                    return imgElement.src; // It's already a Supabase URL, just return it
                }
                
                // 3. Perform the upload for local blobs/base64
                try {
                    const response = await fetch(imgElement.src);
                    const blob = await response.blob();
                    const path = `layers/${Date.now()}_${fileName}.webp`;
                    
                    const { error: storageErr } = await window.supabase.storage
                        .from('card-thumbnails')
                        .upload(path, blob);
                        
                    if (storageErr) throw storageErr;

                    return window.supabase.storage.from('card-thumbnails').getPublicUrl(path).data.publicUrl;
                } catch (err) {
                    console.error(`Upload failed for ${fileName}:`, err);
                    return null;
                }
            };

            // 1. Upload ALL active images and get their Cloud URLs
            const bgUrl = await uploadLayer(window.CardApp.userImages.layerBg, 'bg');
            const playerUrl = await uploadLayer(window.CardApp.userImages.layerPlayer, 'player');
            const borderUrl = await uploadLayer(window.CardApp.userImages.layerBorder, 'border');
            const seasonLogoUrl = await uploadLayer(window.CardApp.userImages.seasonLogo, 'season');
            const teamLogoUrl = await uploadLayer(this.userImages.teamLogo, 'team_front');
            const teamLogoBackUrl = await uploadLayer(this.userImages.teamLogoBack, 'team_back');
            const backBgUrl = await uploadLayer(window.CardApp.userImages.back, 'back_bg');
            const logo1Url = await uploadLayer(window.CardApp.userImages.logo1, 'logo1');
            const logo2Url = await uploadLayer(window.CardApp.userImages.logo2, 'logo2');

            // 2. Render and Upload Gallery Thumbnail
            this.renderer.render(this.scene, this.camera);
            const thumbBlob = await new Promise(res => this.renderer.domElement.toBlob(res, 'image/webp', 0.8));
            const thumbPath = `thumbs/card_${Date.now()}.webp`;
            
            const { error: thumbErr } = await window.supabase.storage
                .from('card-thumbnails')
                .upload(thumbPath, thumbBlob);
            
            if (thumbErr) throw thumbErr;

            // Retrieve the public URL for the thumbnail
            const thumbUrl = window.supabase.storage.from('card-thumbnails').getPublicUrl(thumbPath).data.publicUrl;

            // 3. Prepare the final record with Organized Hybrid Structure
            const cardRecord = {
                // 1. SEARCHABLE COLUMNS (Flat data)
                cardName: customName,
                cardSeason: customSeason,
                fName: formData.fName,
                lName: formData.lName,
                team: formData.team,
                pPosition: formData.pPosition,
                serial: formData.serial,
                image_url: thumbUrl, 

                // 2. ATTRIBUTES (Text-based data)
                attributes: {
                    stats: formData.stats,
                    quote: formData.quote,
                    pNumber: formData.pNumber,
                    teamColors: currentTeamColors
                },

                // 3. STYLECONFIG (Layout & Visual settings only)
                styleConfig: {
                    fNameStyle: formData.fNameStyle,
                    lNameStyle: formData.lNameStyle,
                    numStyle: formData.numStyle,
                    posStyle: formData.posStyle,
                    rarityTier: formData.rarityTier,
                    holoBg: formData.holoBg,
                    holoPlayer: formData.holoPlayer,
                    holoBorder: formData.holoBorder,
                    isFoil: formData.isFoil,
                    flakeType: flakeType
                    // REDUNDANT LOGO DATA REMOVED FROM HERE
                },

                // 4. IMAGECONFIG (The actual Cloud URLs)
                imageConfig: {
                    bgUrl, 
                    playerUrl, 
                    borderUrl, 
                    teamLogoUrl,
                    teamLogoBackUrl,
                    seasonLogoUrl,
                    backBgUrl, 
                    logo1Url, 
                    logo2Url
                }
            };
            // 4. Save to Database
            const { error: dbErr } = await window.supabase
                .from('cards')
                .insert([cardRecord]);

            if (dbErr) throw dbErr;

            alert("Full card (Front & Back) saved successfully!");
            this.renderGallery();

        } catch (err) {
            console.error("Save Error:", err);
            alert("Save failed: " + err.message);
        }
    },

     // Step A: The URL-to-Memory Helper
    async hydrateImage(url) {
        if (!url) return null;
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.error("Failed to hydrate image from:", url);
                resolve(null);
            };
            img.src = url;
        });
    },

    async updateExistingCard() {
        if (!this.currentLoadedId) return alert("No card loaded to update.");

        const formData = window.UIHandler.getFormData();
        const flakeType = document.getElementById('flakeType')?.value;
        const currentTeamColors = window.TeamColors.getColors();

        try {
            // 1. UPDATED Image Upload Helper: Handles 'data:' AND 'blob:'
            const uploadLayer = async (imgElement, fileName) => {
                if (!imgElement || !imgElement.src) return null;

                // Check if it is a local temporary file (blob or base64)
                const isLocal = imgElement.src.startsWith('data:') || imgElement.src.startsWith('blob:');
                
                // If it's NOT local (meaning it's already a https://...supabase URL), return it as is
                if (!isLocal) return imgElement.src;

                // It is a local file, so we must upload it
                const blob = await (await fetch(imgElement.src)).blob();
                const path = `layers/${Date.now()}_${fileName}.webp`;
                const { error: storageErr } = await window.supabase.storage
                    .from('card-thumbnails').upload(path, blob);
                
                if (storageErr) throw storageErr;
                return window.supabase.storage.from('card-thumbnails').getPublicUrl(path).data.publicUrl;
            };

            // 2. Process all images in parallel (Including the new Team Logo Back)
            const [
                bgUrl, playerUrl, borderUrl, seasonLogoUrl, 
                teamLogoUrl, teamLogoBackUrl, backBgUrl, logo1Url, logo2Url
            ] = await Promise.all([
                uploadLayer(this.userImages.layerBg, 'bg'),
                uploadLayer(this.userImages.layerPlayer, 'player'),
                uploadLayer(this.userImages.layerBorder, 'border'),
                uploadLayer(this.userImages.seasonLogo, 'season'),
                uploadLayer(this.userImages.teamLogo, 'team_front'),
                uploadLayer(this.userImages.teamLogoBack, 'team_back'), // Separate upload
                uploadLayer(this.userImages.back, 'back_bg'),
                uploadLayer(this.userImages.logo1, 'logo1'),
                uploadLayer(this.userImages.logo2, 'logo2')
            ]);

            // 3. Update Thumbnail (Upsert overwrites the existing file)
            this.renderer.render(this.scene, this.camera);

            const thumbBlob = await new Promise(res => this.renderer.domElement.toBlob(res, 'image/webp', 0.8));

            // Log the blob size to ensure it's not 0 (which would cause a 400 error)
            console.log("Generated Thumbnail Blob size:", thumbBlob.size);

            const thumbPath = `thumbs/card_${this.currentLoadedId}.webp`;

            // Ensure the third argument { upsert: true } is present and correct
            const { error: thumbErr } = await window.supabase.storage
                .from('card-thumbnails')
                .upload(thumbPath, thumbBlob, { 
                    upsert: true,
                    contentType: 'image/webp' // Force content type to avoid detection errors
                });

            if (thumbErr) {
                console.error("Thumbnail Upload Error Details:", thumbErr);
                throw thumbErr;
            }

            const thumbUrl = window.supabase.storage.from('card-thumbnails').getPublicUrl(thumbPath).data.publicUrl;

            // 4. Create Payload (Matches your simplified Hybrid Structure)
            const updateData = {
                fName: formData.fName,
                lName: formData.lName,
                team: formData.team,
                pPosition: formData.pPosition,
                serial: formData.serial,
                image_url: thumbUrl,
                attributes: {
                    stats: formData.stats,
                    quote: formData.quote,
                    pNumber: formData.pNumber,
                    teamColors: currentTeamColors // Keep colors in sync
                },
                styleConfig: {
                    fNameStyle: formData.fNameStyle,
                    lNameStyle: formData.lNameStyle,
                    numStyle: formData.numStyle,
                    posStyle: formData.posStyle,
                    rarityTier: formData.rarityTier,
                    holoBg: formData.holoBg,
                    holoPlayer: formData.holoPlayer,
                    holoBorder: formData.holoBorder,
                    isFoil: formData.isFoil,
                    flakeType: flakeType
                },
                imageConfig: {
                    bgUrl, 
                    playerUrl, 
                    borderUrl, 
                    teamLogoUrl, 
                    teamLogoBackUrl, // Saved in its own slot
                    seasonLogoUrl, 
                    backBgUrl, 
                    logo1Url, 
                    logo2Url
                }
            };

            // 5. Run Database Update
            const { data, error: dbErr } = await window.supabase
                .from('cards')
                .update(updateData)
                .eq('id', this.currentLoadedId)
                .select();

            if (dbErr) throw dbErr;

            if (data && data.length > 0) {
                console.log("✅ Card Updated Successfully");
                alert("Card Updated Successfully!");
            }
            
            if (this.renderGallery) this.renderGallery();

        } catch (err) {
            console.error("❌ Update Error:", err);
            alert("Update failed: " + err.message);
        }
    },

    // Step B: The Multi-Layer Load
    async loadFromVault(recordId) {
        console.log("🚀 Loading Card ID:", recordId);
        try {
            // 1. Fetch the full record from Supabase
            const { data: record, error } = await window.supabase
                .from('cards')
                .select('*')
                .eq('id', recordId)
                .single();

            if (error || !record) return alert("Card not found.");

            this.currentLoadedId = record.id;

            // 2. Destructure JSON buckets
            const { attributes, styleConfig, imageConfig } = record;

            // 3. Memory Reset: Clear previous assets to prevent "ghosting"
            this.userImages = { 
                layerBg: null, layerPlayer: null, layerBorder: null, 
                back: null, logo1: null, logo2: null, 
                teamLogo: null, teamLogoBack: null, seasonLogo: null 
            };

            // 4. Parallel Hydration: Download all Cloud URLs into HTML Image Elements
            // We use the imageConfig URLs to populate our this.userImages object
            await Promise.all([
                this.hydrateImage(imageConfig?.bgUrl).then(img => this.userImages.layerBg = img),
                this.hydrateImage(imageConfig?.playerUrl).then(img => this.userImages.layerPlayer = img),
                this.hydrateImage(imageConfig?.borderUrl).then(img => this.userImages.layerBorder = img),
                this.hydrateImage(imageConfig?.seasonLogoUrl).then(img => this.userImages.seasonLogo = img),
                this.hydrateImage(imageConfig?.teamLogoUrl).then(img => this.userImages.teamLogo = img),
                this.hydrateImage(imageConfig?.teamLogoBackUrl).then(img => this.userImages.teamLogoBack = img),
                this.hydrateImage(imageConfig?.backBgUrl).then(img => this.userImages.back = img),
                this.hydrateImage(imageConfig?.logo1Url).then(img => this.userImages.logo1 = img),
                this.hydrateImage(imageConfig?.logo2Url).then(img => this.userImages.logo2 = img)
            ]);

            // 5. Foil/Holo Setup: Apply specific flake texture
            if (styleConfig?.flakeType) {
                console.log("💎 Applying Card-Specific Holo:", styleConfig.flakeType);
                this.changeFlakeTexture(styleConfig.flakeType); 
                
                const flakeDropdown = document.getElementById('flakeType');
                if (flakeDropdown) flakeDropdown.value = styleConfig.flakeType;
            }

            // 6. Final Data Merge:
            // This merges the DB row, attributes, style settings, URLs, AND the actual Images
            const combinedData = {
                cardName: record.cardName,
                cardSeason: record.cardSeason,
                fName: record.fName,
                lName: record.lName,
                team: record.team,
                pPosition: record.pPosition,
                serial: record.serial,
                ...attributes,
                ...styleConfig,
                ...imageConfig,
                ...this.userImages
            };

            if (attributes?.teamColors) {
                console.log("🎨 Syncing Team Colors from Vault...");
                window.TeamColors.colors = attributes.teamColors;
                window.TeamColors.applyColors();
                // Save to local storage so the session persists if they refresh
                localStorage.setItem('teamColors', JSON.stringify(attributes.teamColors));
            }
            
            // Push everything to the UI
            this.applyDataToUI(combinedData);

            // 7. Render: Final 3D Redraw
            // updateCard will now pull from this.userImages which we just populated
            this.updateCard();
            
            // UI Navigation
            document.getElementById('update-vault-btn')?.classList.remove('hidden');
            if (typeof switchView === 'function') switchView('creator');

        } catch (err) {
            console.error("Load Error:", err);
            alert("Failed to load card data: " + err.message);
        }
    },

    resetCurrentCard() {
        this.currentLoadedId = null;
        document.getElementById('update-vault-btn')?.classList.add('hidden');
    },

    applyDataToUI(data) {
        if (!data) return;

        console.log("🛠️ Syncing UI with loaded data...");

        // 1. Internal Helper to find and set UI elements
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;

            if (el.type === 'checkbox') {
                // Handle boolean strings or true booleans
                el.checked = (val === true || val === 'true');
            } else {
                el.value = val !== null && val !== undefined ? val : "";
            }

            // Trigger 'input' event so listeners (like the 3D preview) update
            el.dispatchEvent(new Event('input', { bubbles: true }));
        };

        if (data.teamColors) {
            window.TeamColors.colors = data.teamColors;
            window.TeamColors.applyColors();
            // Save to localStorage so the tool stays in sync locally too
            localStorage.setItem('teamColors', JSON.stringify(data.teamColors));
        }

        // 2. Process the Data Object
        // Since we merged all buckets into 'combinedData' in loadFromVault,
        // we iterate through everything
        Object.keys(data).forEach(key => {
            let val = data[key];

            // 3. Recursive check for nested objects (stats, style objects, logo data)
            // If the value is an object (and not null), we drill down one level
            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                Object.keys(val).forEach(subKey => {
                    // This handles stats.spd, fNameStyle.x, teamLogoData.scale, etc.
                    setVal(subKey, val[subKey]);
                });
            } else {
                // This handles top-level strings like fName, lName, and team
                setVal(key, val);
            }
        });

        // 4. Force a 3D refresh once the UI fields are populated
        if (window.CardApp && typeof window.CardApp.updateCard === 'function') {
            window.CardApp.updateCard();
        }
        
        console.log("✅ UI Hydration Complete.");
    },

    async renderGallery() {
        const gallery = document.getElementById('card-gallery');
        if (!gallery) return;

        gallery.innerHTML = '<div class="loader">Accessing Cloud Vault...</div>';

        try {
            const { data: cards, error } = await window.supabase
                .from('cards')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            gallery.innerHTML = ''; 

            cards.forEach(card => {
                // Extract position from the config JSON
                const cfg = typeof card.config === 'string' ? JSON.parse(card.config) : card.config;
                const position = cfg?.pPosition || 'N/A';

                const item = document.createElement('div');
                item.className = 'menu-btn';
                item.style.height = 'auto';

                item.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <img src="${card.image_url}" onerror="this.src='assets/placeholder.png'" style="width: 100%; border-radius: 4px; border: 1px solid #444;">
                    </div>
                    <span class="label" style="display: block; font-weight: bold;">${card.cardName}</span>
                    <div style="color: #aaa; font-size: 0.85em; line-height: 1.4;">
                        <div>${card.team} | ${card.pPosition}</div> 
                        <div style="color: #8b5cf6; font-weight: bold;">SEASON: ${card.cardSeason}</div>
                    </div>
                    <button onclick="window.CardApp.loadFromVault('${card.id}')" 
                            style="width: 100%; margin-top: 12px; background: #8b5cf6; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        LOAD DATA
                    </button>
                `;
                gallery.appendChild(item);
            });
        } catch (err) {
            console.error("Gallery Load Error:", err.message);
        }
    }
};

window.addEventListener('load', () => window.CardApp.init());

window.TeamColors = {
    colors: {
        color1: '#ff4444',
        color2: '#44ff44',
        color3: '#4444ff'
    },

    init() {
        this.loadColors();
        this.setupColorPickers();
        this.setupButtons();
    },

    loadColors() {
        const saved = localStorage.getItem('teamColors');
        if (saved) {
            this.colors = JSON.parse(saved);
            this.applyColors();
        }
    },

    applyColors() {
        document.getElementById('color1').value = this.colors.color1;
        document.getElementById('color2').value = this.colors.color2;
        document.getElementById('color3').value = this.colors.color3;
        document.getElementById('hex1').textContent = this.colors.color1;
        document.getElementById('hex2').textContent = this.colors.color2;
        document.getElementById('hex3').textContent = this.colors.color3;
    },

    setupColorPickers() {
        ['color1', 'color2', 'color3'].forEach((id, index) => {
            const colorInput = document.getElementById(id);
            const hexDisplay = document.getElementById(`hex${index + 1}`);
            
            colorInput.addEventListener('input', (e) => {
                hexDisplay.textContent = e.target.value;
            });
        });
    },

    setupButtons() {
        const confirmBtn = document.getElementById('confirmColors');
        const cancelBtn = document.getElementById('cancelColors');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.colors.color1 = document.getElementById('color1').value;
                this.colors.color2 = document.getElementById('color2').value;
                this.colors.color3 = document.getElementById('color3').value;
                
                localStorage.setItem('teamColors', JSON.stringify(this.colors));
                this.showFeedback('Colors saved!');
                
                if (window.CardApp) {
                    window.CardApp.updateCard();
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.applyColors();
                this.showFeedback('Changes cancelled');
            });
        }
    },

    showFeedback(message) {
        const feedback = document.getElementById('colorFeedback');
        if (feedback) {
            feedback.textContent = message;
            feedback.style.opacity = '1';
            setTimeout(() => {
                feedback.style.opacity = '0';
            }, 2000);
        }
    },

    getColors() {
        return this.colors;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('color1')) {
        window.TeamColors.init();
    }
});