// js/uiHandler.js

/**
 * View Switcher
 * Re-parents the 3D renderer based on the active viewport to save memory.
 */
window.switchView = function(viewId) {
    const views = ['view-home', 'view-studio', 'view-vault', 'view-inspect'];
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });
    
    const targetView = document.getElementById('view-' + viewId);
    if (targetView) targetView.classList.remove('hidden');

    const studioViewport = document.getElementById('viewport');
    const inspectViewport = document.getElementById('viewport-inspect');
    
    // Ensure the 3D Renderer moves to the active container
    if (window.CardApp && window.CardApp.renderer) {
        const rendererElement = window.CardApp.renderer.domElement;

        if (viewId === 'inspect' && inspectViewport) {
            inspectViewport.appendChild(rendererElement);
            setTimeout(() => window.CardApp.handleResize('viewport-inspect'), 50);
        } else if (viewId === 'studio' && studioViewport) {
            studioViewport.appendChild(rendererElement);
            setTimeout(() => window.CardApp.handleResize('viewport'), 50);
        }
    }

    // Refresh Gallery when entering Vault
    if (viewId === 'vault' && window.CardApp.renderGallery) {
        window.CardApp.renderGallery();
    }
};

/**
 * Handles the Conditional UI toggle for Builder Mode info.
 */
window.toggleIdMode = function() {
    const mode = document.querySelector('input[name="idMode"]:checked')?.value || "builder";
    const builderSettings = document.getElementById('builder-settings');
    
    if (builderSettings) {
        if (mode === 'png') {
            builderSettings.classList.add('hidden');
        } else {
            builderSettings.classList.remove('hidden');
        }
    }
    
    if (window.CardApp && window.CardApp.updateCard) {
        window.CardApp.updateCard();
    }
};

/**
 * Toggle for the Nickname Transform settings drawer
 */
window.toggleNickSettings = function() {
    const drawer = document.getElementById('nickSettings');
    if (drawer) drawer.classList.toggle('hidden');
};

window.UIHandler = {
    /**
     * Initializes listeners for file uploads and live-updates for all inputs
     */
    init() {
        // Bind the three Front Layers
        this.bindFileUpload('imgLayerBg', 'layerBg');
        this.bindFileUpload('imgLayerPlayer', 'layerPlayer');
        this.bindFileUpload('imgLayerBorder', 'layerBorder');
        
        // Bind Back Image
        this.bindFileUpload('imgBack', 'back');

        // Bind Logo 1
        this.bindFileUpload('logo1', 'logo1');

        // Bind Logo 2
        this.bindFileUpload('logo2', 'logo2');

        // Bind Team Logo
        this.bindFileUpload('teamLogo', 'teamLogo');

        this.bindFileUpload('imgLayerLogo', 'layerLogo');

        // Bind Season Logo
        this.bindFileUpload('imgLayerSeason', 'seasonLogo');
        
        ['input', 'change'].forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                // Only trigger if the element is inside the sidebar
                if (e.target.closest('.sidebar')) {
                    if (window.CardApp && window.CardApp.updateCard) {
                        window.CardApp.updateCard();
                    }
                }
            });
        });
    },

    /**
     * Processes image file uploads and stores them in the CardApp state
     */
    bindFileUpload(id, key) {
        const el = document.getElementById(id);
        if (!el) return;
        el.onchange = e => {
            const reader = new FileReader();
            reader.onload = ev => {
                const img = new Image();
                img.onload = () => {
                    // This ensures we are only updating ONE key (e.g., 'logo1') 
                    // and not wiping out the others (e.g., 'back')
                    window.CardApp.userImages[key] = img; 
                    console.log(`Uploaded ${key}:`, window.CardApp.userImages);
                    window.CardApp.updateCard();
                };
                img.src = ev.target.result;
            };
            if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
        };
    },

    /**
     * Collects all sidebar data into a structured object for the Renderer.
     * This captures identity, aesthetics, overlays, and the full 15-attribute set.
     */
    getFormData() {
        const getVal = (id) => document.getElementById(id)?.value || "";
        const getNum = (id) => parseFloat(document.getElementById(id)?.value || 0);
        const getChecked = (id) => document.getElementById(id)?.checked || false;

        const mode = document.querySelector('input[name="idMode"]:checked')?.value || "builder";
        
        // Serial Logic for Previewing
        const currentCount = parseInt(localStorage.getItem('vsc_counter') || '0');
        const previewSerial = `VP-${currentCount + 1}`;

        // Update numerical labels for nickname sliders in the UI
        ['X', 'Y', 'Rot', 'Scale'].forEach(s => {
            const label = document.getElementById(`val${s}`);
            const input = document.getElementById(`nick${s}`);
            if (label && input) label.innerText = input.value;

            const sLabel = document.getElementById(`valSeason${s}`);
            const sInput = document.getElementById(`season${s}`);
            if (sLabel && sInput) sLabel.innerText = sInput.value;
        });

        return {
            mode: mode,
            serial: previewSerial,
            
            // Global Identity Fields
            fName: getVal('fName'),
            fNameStyle: {
                x: getNum('fNameX'),
                y: getNum('fNameY'),
                rot: getNum('fNameRot'),
                size: getNum('fNameSize'),
                font: getVal('fNameFont')
            },

            // Jersey Number Style
            numStyle: {
                x: parseFloat(document.getElementById('numX').value) || 65,
                y: parseFloat(document.getElementById('numY').value) || 1240,
                rot: parseFloat(document.getElementById('numRot').value) || 0,
                size: parseFloat(document.getElementById('numSize').value) || 55
            },
            // Position Style
            posStyle: {
                x: parseFloat(document.getElementById('posX').value) || 980,
                y: parseFloat(document.getElementById('posY').value) || 1260,
                rot: parseFloat(document.getElementById('posRot').value) || 0,
                size: parseFloat(document.getElementById('posSize').value) || 50
            },

            pNumber: getVal('pNumber'),
            pPosition: getVal('pPosition'),
            
            lName: getVal('lName'),
            lNameStyle: {
                x: getNum('lNameX'),
                y: getNum('lNameY'),
                rot: getNum('lNameRot'),
                size: getNum('lNameSize'),
                font: getVal('lNameFont')
            },
            
            team: getVal('team'),
            teamColor: getVal('teamColor'),
            teamFont: getVal('teamFont'),

            teamLogoData: {
                x: parseFloat(document.getElementById('logoX').value) || 512,
                y: parseFloat(document.getElementById('logoY').value) || 250,
                scale: parseFloat(document.getElementById('logoScale').value) || 1.0,
                rotation: (parseFloat(document.getElementById('logoRot').value) || 0) * (Math.PI / 180)
            },

            seasonLogoData: {
                x: parseFloat(document.getElementById('seasonX')?.value) || 800,
                y: parseFloat(document.getElementById('seasonY')?.value) || 200,
                scale: parseFloat(document.getElementById('seasonScale')?.value) || 1.0,
                rotation: (parseFloat(document.getElementById('seasonRot')?.value) || 0) * (Math.PI / 180)
            },

            // Aesthetic Settings
            rarityTier: getVal('rarityTier'),
            themeColor: getVal('themeColor'),
            isFoil: getChecked('isFoil'),

            flakeType: getVal('flakeType') || "assets/foil-textures/broken-glass.jpg",

            holoBg: document.getElementById('holoBg')?.checked || false,
            holoPlayer: document.getElementById('holoPlayer')?.checked || false,
            holoBorder: document.getElementById('holoBorder')?.checked || false,

            // Back Side Customization
            quote: getVal('quote'), // Career Highlights text
            stats: {
                // Physical & Core Attributes
                spd: getVal('spd'),
                agi: getVal('agi'),
                str: getVal('str'),
                jmp: getVal('jmp'),
                
                // Defensive & Pass Rush Attributes
                prsh: getVal('prsh'),
                rcvr: getVal('rcvr'),
                
                // Skill & Technical Attributes
                cth: getVal('cth'),
                hotb: getVal('hotb'),
                tck: getVal('tck'),
                
                // Endurance, Mental, & Intangible Attributes
                sta: getVal('sta'),
                dur: getVal('dur'),
                ldr: getVal('ldr'),
                cmp: getVal('cmp'),
                cnst: getVal('cnst'),
                agg: getVal('agg')
            }
        };
    }
};