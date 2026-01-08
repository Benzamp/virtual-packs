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
    userImages: { 
        layerBg: null, 
        layerPlayer: null, 
        layerBorder: null, 
        back: null,
        logo1: null,
        logo2: null,
        teamLogo: null,
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

        window.CardApp.handleLogoUpload = (input) =>  {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        this.userImages.logoFront = img; // Store in userImages
                        this.updateCard();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(input.files[0]);
            }
        };

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
        const loader = new THREE.TextureLoader();
        loader.load(path, (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            this.flakeMap = tex;
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

    updateCard(vaultData = null) {
        if (!window.CardApp || !window.CardRenderer) return;
        const data = vaultData || window.UIHandler.getFormData();

        // 1. PERSIST ROTATION: Keep the card's orientation while editing
        let currentRotation = { x: 0, y: 0, z: 0 };
        if (this.cardMesh) {
            currentRotation.x = this.cardMesh.rotation.x;
            currentRotation.y = this.cardMesh.rotation.y;
            currentRotation.z = this.cardMesh.rotation.z;
        }
        
        // 2. RENDER CANVASES: Update the 2D source graphics
        window.CardRenderer.renderFront(data, this.userImages);
        window.CardRenderer.renderBack(data, this.userImages);

        // 3. TEXTURE EXTRACTION: Convert canvases to Three.js textures
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
        const texTeamLogo = getCanvasTex('hidden-canvas-team-logo'); // NEW: Team Logo Foil source

        // 4. CLEANUP: Dispose of old geometry/materials to prevent memory leaks
        if (this.cardMesh) {
            this.cardMesh.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.scene.remove(this.cardMesh);
        }

        // 5. MATERIAL BUILDER: Helper for Standard vs Shader materials
        const sideMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        
        const backMat = new THREE.MeshStandardMaterial({ 
            map: texB, 
            envMap: this.envMap,
            roughness: 0.9,          // Keeps it matte
            metalness: 0.0, 
            envMapIntensity: 0.1,
            
            // Applying your uploaded image here
            bumpMap: this.cardstockBumpMap, 
            // Keep this value low (0.005 to 0.02). 
            // Higher values will make the card look like heavy concrete.
            bumpScale: 0.015,         
        });

        const getMaterial = (tex, isHoloEnabled, isTransparent = false) => {
            const shouldShowHolo = isHoloEnabled;
            
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

        // 6. MESH ASSEMBLY
        // Create the main card box
        const frontMat = getMaterial(texF, data.holoBg, false);
        this.cardMesh = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 5, 0.1), 
            [sideMat, sideMat, sideMat, sideMat, frontMat, backMat]
        );

        // Re-apply the rotation captured at the start
        this.cardMesh.rotation.set(currentRotation.x, currentRotation.y, currentRotation.z);
        this.scene.add(this.cardMesh);

        // --- FRONT OVERLAYS ---
        // Player Overlay
        const pMat = getMaterial(texP, data.holoPlayer, true);
        const pMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5), pMat);
        pMesh.position.z = 0.051; 
        this.cardMesh.add(pMesh);

        // Border Overlay
        const bMat = getMaterial(texBorder, data.holoBorder, true);
        const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5), bMat);
        bMesh.position.z = 0.052; 
        this.cardMesh.add(bMesh);

        // --- BACK OVERLAYS ---
        // NEW: Team Logo Foil (Watermark style on back)
        const tlMat = getMaterial(texTeamLogo, true, true); // Always foil, always transparent
        const tlMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5), tlMat);
        tlMesh.position.z = -0.0505; // Sit just behind the back face
        tlMesh.rotation.y = Math.PI;
        this.cardMesh.add(tlMesh);

        // Back Logo 1 (Virtual Packs)
        const logo1Mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5), getMaterial(texVP, data.isFoil, true));
        logo1Mesh.position.z = -0.051; 
        logo1Mesh.rotation.y = Math.PI;
        this.cardMesh.add(logo1Mesh);

        // Back Logo 2 (League)
        const logo2Mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5), getMaterial(texLL, data.isFoil, true));
        logo2Mesh.position.z = -0.052; 
        logo2Mesh.rotation.y = Math.PI;
        this.cardMesh.add(logo2Mesh);
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
        
        const customName = prompt("Card Name:", `${formData.fName} ${formData.lName}`);
        if (!customName) return;

        const customSeason = prompt("Season:", "2026");
        if (!customSeason) return;

        try {
            // Prepare record - explicitly do NOT include an 'id' property here
            const cardRecord = {
                cardName: customName,
                cardSeason: customSeason,
                fName: formData.fName,
                lName: formData.lName,
                team: formData.team,
                pPosition: formData.pPosition,
                pNumber: formData.pNumber,
                quote: formData.quote,
                themeColor: formData.themeColor,
                holoBg: formData.holoBg,
                holoPlayer: formData.holoPlayer,
                holoBorder: formData.holoBorder,
                fNameStyle: formData.fNameStyle,
                lNameStyle: formData.lNameStyle,
                numStyle: formData.numStyle,
                posStyle: formData.posStyle,
                teamLogoData: formData.teamLogoData,
                seasonLogoData: formData.seasonLogoData,
                stats: formData.stats,
                config: formData 
            };

            // Render and Upload
            this.renderer.render(this.scene, this.camera);
            const blob = await new Promise(res => this.renderer.domElement.toBlob(res, 'image/webp', 0.8));
            const fileName = `card_${Date.now()}.webp`;

            const { data: storageData, error: sErr } = await window.supabase.storage
                .from('card-thumbnails')
                .upload(fileName, blob);
            
            if (sErr) throw sErr;

            const { data: urlData } = window.supabase.storage
                .from('card-thumbnails')
                .getPublicUrl(fileName);

            cardRecord.image_url = urlData.publicUrl;

            // Always use .insert() for new cards to avoid primary key conflicts
            const { error: iErr } = await window.supabase
                .from('cards')
                .insert([cardRecord]);
            
            if (iErr) throw iErr;

            alert("Card saved successfully!");
            this.renderGallery();
        } catch (err) {
            alert("Save failed: " + err.message);
        }
    },

    async loadLatestCard() {
        try {
            // Query the 'cards' table, order by newest first, and grab only one
            const { data: record, error } = await window.supabase
                .from('cards')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                console.log("No previous cards found or error fetching:", error.message);
                return;
            }

            if (record) {
                console.log("Loading most recent card:", record.fName);
                // Apply the UI settings (sliders, text, etc.)
                this.applyDataToUI(record.config);
                
                // Note: If you want to auto-load the images, you would need to 
                // ensure the image URLs are stored and handled here too.
                this.updateCard();
            }
        } catch (err) {
            console.error("Fetch error:", err);
        }
    },

    async loadFromVault(recordId) {
        console.log("Attempting to load card with ID:", recordId);

        if (!recordId || recordId === 'undefined') {
            return alert("Error: Invalid Card ID. Please try refreshing the gallery.");
        }

        try {
            const { data: record, error } = await window.supabase
                .from('cards')
                .select('*')
                .eq('id', recordId) // Ensure your DB column is actually named 'id'
                .single();

            if (error || !record) {
                console.error("Supabase Error:", error);
                return alert("Card not found in the cloud vault.");
            }

            // Apply the saved configuration to the UI
            if (record.config) {
                this.applyDataToUI(record.config);
                this.updateCard();
                if (typeof switchView === 'function') switchView('creator');
            } else {
                alert("This card has no configuration data saved.");
            }

        } catch (err) {
            console.error("Critical Load Error:", err);
        }
    },

    applyDataToUI(data) {
        if (!data) return;
        Object.keys(data).forEach(key => {
            // Handle standard inputs
            const el = document.getElementById(key);
            if (el) {
                el.value = data[key];
                // Manually trigger the 'input' event so UI labels update
                el.dispatchEvent(new Event('input'));
            }
            
            // Handle nested objects like styles
            if (typeof data[key] === 'object' && data[key] !== null) {
                Object.keys(data[key]).forEach(subKey => {
                    const subEl = document.getElementById(subKey);
                    if (subEl) {
                        subEl.value = data[key][subKey];
                        subEl.dispatchEvent(new Event('input'));
                    }
                });
            }
        });
    },

    applyDataToUI(data) {
        // Logic to set input.value = data.fieldName for every UI element
        // This ensures the sliders match the loaded card
        Object.keys(data).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.value = data[key];
        });
    },

    async renderGallery() {
        const gallery = document.getElementById('card-gallery');
        if (!gallery) return;

        // 1. Show a loading state while we talk to Supabase
        gallery.innerHTML = '<div class="loader">Accessing Cloud Vault...</div>';

        try {
            // 2. Fetch cards from Supabase ordered by newest first
            const { data: cards, error } = await window.supabase
                .from('cards')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 3. Check if we actually have data
            if (!cards || cards.length === 0) {
                gallery.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No cards found in cloud vault.</p>';
                return;
            }

            // 4. Clear loader and render the cards
            gallery.innerHTML = ''; 

            cards.forEach(card => {
                const item = document.createElement('div');
                item.className = 'menu-btn';
                item.style.height = 'auto';
                
                // Safety check for ID - log it to see if it's missing in the DB
                if (!card.id) console.error("Database record missing ID for:", card.cardName);

                item.innerHTML = `
                    <div style="margin-bottom: 10px; position: relative; min-height: 100px; background: #222;">
                        <img src="${card.image_url}" 
                            onerror="this.src='assets/placeholder.png'; this.style.opacity='0.5';"
                            style="width: 100%; border-radius: 4px; border: 1px solid #444; display: block;">
                    </div>
                    <span class="label" style="display: block; font-weight: bold;">${card.cardName || 'Unnamed'}</span>
                    <small style="color: #aaa;">Season: ${card.cardSeason} | ${card.team}</small>
                    
                    <button onclick="window.CardApp.loadFromVault('${card.id}')" 
                            style="width: 100%; margin-top: 10px; background: #8b5cf6; color: white; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                        LOAD DATA
                    </button>
                `;
                gallery.appendChild(item);
            });

        } catch (err) {
            console.error("Gallery Load Error:", err.message);
            gallery.innerHTML = `<p style="color: #ff4444;">Error loading vault: ${err.message}</p>`;
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