window.getStudioHTML = function() {
    return `
    <div id="view-studio" class="view-content hidden">
        <div class="top-nav">
            <button class="nav-back" onclick="switchView('home')">← TERMINAL</button>
            <h2 style="font-size: 1rem;">CARD STUDIO</h2>
            <div style="margin-left:auto; display:flex; gap:10px;">
                <button id="update-vault-btn" class="nav-back hidden" 
                        style="border-color:#fbbf24; color:#fbbf24;" 
                        onclick="window.CardApp.updateExistingCard()">UPDATE</button>
                
                <button class="nav-back" style="border-color:#ce2c24; color:#ce2c24;" 
                        onclick="window.CardApp.saveToVault()">SAVE NEW</button>
            </div>
        </div>  

        <div class="app-container">
            <div class="sidebar">
                
                <div class="section">
                    <label>Player Details</label>
                    <input type="text" id="fName" placeholder="First Name" value="AMONTE">
                    <input type="text" id="lName" placeholder="Last Name" value="DUBOIS-SMITH">
                    
                    <div class="grid-controls">
                        <div>
                            <label style="font-size: 0.6rem; color: #64748b;">Number</label>
                            <input type="text" id="pNumber" placeholder="#32" value="32">
                        </div>
                        <div>
                            <label style="font-size: 0.6rem; color: #64748b;">Position</label>
                            <input type="text" id="pPosition" placeholder="SS" value="SS">
                        </div>
                    </div>

                    <input type="text" id="team" placeholder="Team Name" value="RIVERHOGS">

                    <div class="section team-logo-section">
                        <label>Team Logo</label>
                        <input type="file" id="teamLogo" accept="image/*" onchange="window.CardApp.updateCard()">
                        
                        <div class="transform-group" style="margin-top:10px;">
                            <small style="color:var(--accent)">Logo Transform</small>
                            <div class="grid-controls">
                                <div><small>X</small><input type="number" id="logoX" value="325" oninput="window.CardApp.updateCard()"></div>
                                <div><small>Y</small><input type="number" id="logoY" value="1088" oninput="window.CardApp.updateCard()"></div>
                                <div><small>Scale</small><input type="number" id="logoScale" step="0.1" value="0.4" oninput="window.CardApp.updateCard()"></div>
                                <div><small>Rot°</small><input type="number" id="logoRot" value="6.8" oninput="window.CardApp.updateCard()"></div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <label>Name Transformations</label>
                        <div class="transform-group">
                            <small style="color:var(--accent)">First Name Styling</small>
                            <div class="grid-controls">
                                <input type="number" id="fNameX" placeholder="X" value="480">
                                <input type="number" id="fNameY" placeholder="Y" value="1200">
                                <input type="number" id="fNameRot" placeholder="Rot°" value="0">
                                <input type="number" id="fNameSize" placeholder="Size" value="40">
                            </div>
                            <select id="fNameFont">
                                <option value="Bebas Neue">Bebas Neue</option>
                                <option value="Jersey 25">Jersey 25</option>
                                <option value="Impact">Impact</option>
                                <option value="Arial">Arial</option>
                            </select>
                        </div>
                        <div class="transform-group" style="margin-top:10px;">
                            <small style="color:var(--accent)">Last Name Styling</small>
                            <div class="grid-controls">
                                <input type="number" id="lNameX" placeholder="X" value="480">
                                <input type="number" id="lNameY" placeholder="Y" value="1260">
                                <input type="number" id="lNameRot" placeholder="Rot°" value="0">
                                <input type="number" id="lNameSize" placeholder="Size" value="60">
                            </div>
                            <select id="lNameFont">
                                <option value="Bebas Neue">Bebas Neue</option>
                                <option value="Jersey 25">Jersey 25</option>
                                <option value="Impact">Impact</option>
                                <option value="Arial">Arial</option>
                            </select>
                        </div>
                    </div>

                    <div class="transform-group" style="margin-top:10px;">
                        <small style="color:var(--accent)">Jersey # Styling</small>
                        <div class="grid-controls">
                            <div><small>X</small><input type="number" id="numX" value="65"></div>
                            <div><small>Y</small><input type="number" id="numY" value="1240"></div>
                            <div><small>Rot°</small><input type="number" id="numRot" value="0"></div>
                            <div><small>Size</small><input type="number" id="numSize" value="55"></div>
                        </div>
                    </div>

                    <div class="transform-group" style="margin-top:10px;">
                        <small style="color:var(--accent)">Position Styling</small>
                        <div class="grid-controls">
                            <div><small>X</small><input type="number" id="posX" value="175"></div>
                            <div><small>Y</small><input type="number" id="posY" value="1265"></div>
                            <div><small>Rot°</small><input type="number" id="posRot" value="0"></div>
                            <div><small>Size</small><input type="number" id="posSize" value="100"></div>
                        </div>
                    </div>

                    <div class="team-color-section section">
                        <label class="section-title">Team Colors</label>
                        <div class="color-picker-group">
                            <input type="color" id="color1" class="color-input" value="#ff4444">
                            <span class="color-hex" id="hex1">#ff4444</span>
                            <input type="color" id="color2" class="color-input" value="#44ff44">
                            <span class="color-hex" id="hex2">#44ff44</span>
                            <input type="color" id="color3" class="color-input" value="#4444ff">
                            <span class="color-hex" id="hex3">#4444ff</span>
                            <div class="color-buttons">
                                <button id="confirmColors" class="btn btn-primary">Confirm</button>
                                <button id="cancelColors" class="btn btn-flip">Cancel</button>
                            </div>
                        </div>
                        <div id="colorFeedback" class="color-feedback"></div>
                    </div>
                </div>

                <div class="section">
                    <label>Rarity & Holo</label>
                    <label style="margin-top: 10px; font-size: 0.6rem; color: #64748b;">Foil Pattern</label>
                    <select id="flakeType" onchange="window.CardApp.changeFlakeTexture(this.value)">
                        <option value="assets/foil-textures/broken-glass.jpg">BROKEN GLASS</option>
                        <option value="assets/foil-textures/flakes.jpg">FLAKE</option>
                        <option value="assets/foil-textures/gold.jpg">GOLD DUST</option>
                        <option value="assets/foil-textures/oil.jpg">OIL SLICK</option>
                        <option value="assets/foil-textures/shards.jpg">SHARDS</option>
                        <option value="assets/foil-textures/fire.jpg">FIRE</option>
                        <option value="assets/foil-textures/foil1.jpg">CLASSIC FOIL</option>
                        <option value="assets/foil-textures/checkered.jpg">CHECKERED</option>
                        <option value="assets/foil-textures/geometric.jpg">GEOMETRIC</option>
                        <option value="assets/foil-textures/geometric2.jpg">GEOMETRIC2</option>
                        <option value="assets/foil-textures/retro.jpg">RETRO</option>
                        <option value="assets/foil-textures/stained-glass.jpg">STAINED GLASS</option>
                        <option value="assets/foil-textures/hogs-tiled.jpg">HOGS TILED</option>
                    </select>
                    
                    <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr; gap: 5px;">
                        <label style="font-size: 0.6rem; color: #64748b;">Holo/Foil Inclusion</label>
                        <div class="inline-flex"><input type="checkbox" id="holoBg" onchange="window.CardApp.updateCard()"><small>Background Holo</small></div>
                        <div class="inline-flex"><input type="checkbox" id="holoPlayer" onchange="window.CardApp.updateCard()"><small>Player Holo</small></div>
                        <div class="inline-flex"><input type="checkbox" id="holoBorder" onchange="window.CardApp.updateCard()"><small>Border Holo</small></div>
                    </div>
                </div>

                <div class="section">
                    <label>Card Front Layers</label>
                    
                    <label style="font-size: 0.6rem; color: #64748b;">1. Background</label>
                    <input type="file" id="imgLayerBg" accept="image/*" onchange="window.CardApp.updateCard()">
                    
                    <label style="font-size: 0.6rem; color: #64748b;">2. Player</label>
                    <input type="file" id="imgLayerPlayer" accept="image/*" onchange="window.CardApp.updateCard()">
                    
                    <label style="font-size: 0.6rem; color: #64748b;">3. Card Border</label>
                    <input type="file" id="imgLayerBorder" accept="image/*" onchange="window.CardApp.updateCard()">

                    <label style="font-size: 0.6rem; color: #64748b; margin-top: 10px; display: block;">4. Season Logo</label>
                    <input type="file" id="imgLayerSeason" accept="image/*" onchange="window.CardApp.updateCard()">

                    <div class="setting-group" style="margin-top: 10px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px;">
                        <small style="color:var(--accent); display: block; margin-bottom: 5px;">Season Logo Transform</small>
                        
                        <label>X Position: <span id="valSeasonX">760</span></label>
                        <input type="range" id="seasonX" min="0" max="1024" value="760" oninput="document.getElementById('valSeasonX').textContent = this.value; window.CardApp.updateCard()">

                        <label>Y Position: <span id="valSeasonY">1340</span></label>
                        <input type="range" id="seasonY" min="0" max="1480" value="1340" oninput="document.getElementById('valSeasonY').textContent = this.value; window.CardApp.updateCard()">

                        <label>Scale: <span id="valSeasonScale">0.5</span></label>
                        <input type="range" id="seasonScale" min="0.1" max="3.0" step="0.1" value="0.5" oninput="document.getElementById('valSeasonScale').textContent = this.value; window.CardApp.updateCard()">

                        <label>Rotation: <span id="valSeasonRot">0</span>°</label>
                        <input type="range" id="seasonRot" min="0" max="360" value="0" oninput="document.getElementById('valSeasonRot').textContent = this.value; window.CardApp.updateCard()">
                    </div>
                </div>

                <div class="section">
                    <label>Attributes</label>
                    <div class="section">
                    <label>Attributes</label>
                        <div class="grid-controls" style="grid-template-columns: repeat(3, 1fr); gap: 8px;">
                            <div class="control-box"><label>SPD</label><input type="number" id="spd" value="90"></div>
                            <div class="control-box"><label>AGI</label><input type="number" id="agi" value="85"></div>
                            <div class="control-box"><label>STR</label><input type="number" id="str" value="80"></div>
                            <div class="control-box"><label>JMP</label><input type="number" id="jmp" value="0"></div>
                            
                            <div class="control-box"><label>P RSH</label><input type="number" id="prsh" value="0"></div>
                            <div class="control-box"><label>R CVR</label><input type="number" id="rcvr" value="0"></div>
                            <div class="control-box"><label>TCK</label><input type="number" id="tck" value="75"></div>
                            
                            <div class="control-box"><label>CTH</label><input type="number" id="cth" value="0"></div>
                            <div class="control-box"><label>HOT B</label><input type="number" id="hotb" value="0"></div>
                            <div class="control-box"><label>STA</label><input type="number" id="sta" value="90"></div>
                            
                            <div class="control-box"><label>DUR</label><input type="number" id="dur" value="0"></div>
                            <div class="control-box"><label>LDR</label><input type="number" id="ldr" value="0"></div>
                            <div class="control-box"><label>CMP</label><input type="number" id="cmp" value="0"></div>
                            
                            <div class="control-box"><label>CNST</label><input type="number" id="cnst" value="0"></div>
                            <div class="control-box"><label>AGG</label><input type="number" id="agg" value="90"></div>
                        </div>
                        
                        <label style="margin-top:10px;">Bio / Quote</label>
                        <textarea id="quote" placeholder="Career Highlights..." rows="3">A standout strong safety known for his punishing hits and exceptional field vision. A cornerstone of the Riverhogs defense.</textarea>
                    </div>
                </div>

                <div class="section">
                    <button class="btn btn-flip" onclick="window.CardApp.flipCard()">Flip Card</button>
                </div>
            </div>

            <div id="viewport">
                <button id="reset-view-btn" class="hidden" 
                        style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); 
                               z-index: 10; background: rgba(15, 23, 42, 0.8); border: 1px solid #ef4444; 
                               color: #ef4444; padding: 10px 20px; border-radius: 20px; cursor: pointer; 
                               font-weight: bold; backdrop-filter: blur(5px); font-size: 0.8rem;"
                        onclick="window.CardApp.resetView()">
                    RESET VIEW ↺
                </button>
            </div>
        </div>
    </div>`;
};