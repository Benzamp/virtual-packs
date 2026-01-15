window.getHomeHTML = function() {
    return `
    <div id="view-home" class="screen-center">
        <div class="home-content">
            <img src="assets/logos/virtual-packs-logo.png" alt="VP Logo" height="200" width="200" class="crt-logo">
            <div class="menu-card">
                <p style="color: #94a3b8; font-size: 12px; font-weight: bold; margin-bottom: 12px;">CARD MANAGER</p>
                <div class="menu-grid">
                    <div class="menu-btn" onclick="switchView('studio')" role="button" tabindex="0">
                        <span class="icon">🎴</span>
                        <span class="label">STUDIO</span>
                    </div>

                    <div class="menu-btn" onclick="switchView('vault')" role="button" tabindex="0">
                        <span class="icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="7" y="3" width="12" height="16" rx="1.5" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.4"/>
                                <rect x="4" y="6" width="12" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                                <path d="M7 10H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M7 13H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                        </span>
                        <span class="label">MY CARDS</span>
                    </div>

                    <div class="menu-btn disabled">
                        <span class="icon">📦</span>
                        <span class="label">PACKS</span>
                        <small style="display: block; font-size: 10px; opacity: 0.6;">LOCKED</small>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
};