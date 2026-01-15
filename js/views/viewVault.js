window.getVaultHTML = function() {
    return `
    <div id="view-vault" class="view-content hidden">
        <div class="top-nav">
            <button class="nav-back" onclick="switchView('home')">← TERMINAL</button>
            
            <h2>COLLECTION VAULT</h2>
            
            <div id="vault-stats" style="margin-left: auto; font-size: 0.8rem; color: #94a3b8;"></div>
        </div>

        <div id="card-gallery" class="gallery-grid">
            </div>
    </div>`;
};