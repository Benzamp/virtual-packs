window.getInspectHTML = function() {
    return `
    <div id="view-inspect" class="view-content hidden">
        <div class="top-nav">
            <button class="nav-back" onclick="switchView('vault')">← BACK TO VAULT</button>
            
            <h2 id="inspect-title" style="font-size: 1rem; color: var(--accent);">INSPECTOR</h2>
            
            <button class="nav-back" style="margin-left:auto;" onclick="window.CardApp.flipCard()">FLIP CARD</button>
        </div>

        <div class="app-container">
            <div class="sidebar">
                <div id="inspect-details">
                    </div>
                
                <div class="action-buttons" style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="window.CardApp.editCurrentCard()">
                        Open in Editor
                    </button>
                    <button class="btn btn-flip" onclick="window.CardApp.downloadCard()">
                        Download PNG
                    </button>
                </div>
            </div>

            <div id="viewport-inspect">
                </div>
        </div>
    </div>`;
};