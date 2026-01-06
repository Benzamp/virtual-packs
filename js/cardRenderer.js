// js/cardRenderer.js

window.CardRenderer = {
    /**
     * Helper: Draws a rounded rectangle for card borders
     */
    drawR(ctx, x, y, w, h, r, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    },

    /**
     * Helper: Text wrapping for career highlights
     */
    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return;
        const words = text.split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    },

    renderFront(data, userImages) {
        const canvas = document.getElementById('hidden-canvas-front');
        const playerCanvas = document.getElementById('hidden-canvas-player');
        const borderCanvas = document.getElementById('hidden-canvas-border');

        const ctx = canvas.getContext('2d');
        const pCtx = playerCanvas.getContext('2d');
        const bCtx = borderCanvas.getContext('2d');
        const w = 1024, h = 1480;

        [ctx, pCtx, bCtx].forEach(c => c.clearRect(0, 0, w, h));

        // 1. BACKGROUND
        if (userImages.layerBg) {
            ctx.drawImage(userImages.layerBg, 0, 0, w, h);
        } else {
            ctx.fillStyle = "#0f172a"; 
            ctx.fillRect(0, 0, w, h);
        }

        // 2. PLAYER (Always draw to separate canvas for independent foiling)
        if (userImages.layerPlayer) {
            pCtx.drawImage(userImages.layerPlayer, 0, 0, w, h);
        }

        // 3. BORDER (Always draw to separate canvas for independent foiling)
        if (userImages.layerBorder) {
            bCtx.drawImage(userImages.layerBorder, 0, 0, w, h);
        }

        // Render Text onto background
        //this.renderFrontText(ctx, data, w, h);
    },

    renderBack(data, userImages) {
        const canvas = document.getElementById('hidden-canvas-back');
        const ctx = canvas.getContext('2d');
        const w = 1024, h = 1480;
        const pad = 60;
        
        ctx.clearRect(0, 0, w, h);
        
        // 2. LAYER 2: Back Image 2 (Action Inset)
        const img2W = 850; 
        const img2H = 500; 
        const img2X = (w - img2W) / 2;
        const img2Y = 150; 

        if (userImages.back2) {
            ctx.drawImage(userImages.back2, img2X, img2Y, img2W, img2H);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(img2X, img2Y, img2W, img2H);
        }

        const plateWidth = w - (pad * 2.5);
        const plateX = (w - plateWidth) / 2;
        
        // 3. LAYER 3: Highlights Section
        const highlightY = 700; 
        const highlightHeight = 180;

        ctx.fillStyle = 'rgba(211, 211, 211, 0.9)';
        ctx.fillRect(plateX, highlightY, plateWidth, highlightHeight);
        
        ctx.textAlign = 'center';
        ctx.fillStyle = '#111'; 
        ctx.font = `bold 36px Arial`; 
        ctx.fillText("HIGHLIGHTS", w / 2, highlightY + 50);
        
        ctx.font = `italic 32px Georgia`; 
        this.wrapText(ctx, data.quote || "NO HIGHLIGHTS PROVIDED", w / 2, highlightY + 105, plateWidth - 40, 40);

        // 4. LAYER 4: Attributes Section
        const statsY = h * 0.72;
        const statsHeight = 300; 

        ctx.fillStyle = 'rgba(211, 211, 211, 0.9)';
        ctx.fillRect(plateX, statsY, plateWidth, statsHeight + 20);

        ctx.fillStyle = '#111'; 
        ctx.font = 'bold 32px Arial';
        ctx.fillText("SEASON 26 ATTRIBUTES", w / 2, statsY + 50); 

        const statList = [
            { l: 'SPD', v: data.stats.spd }, { l: 'AGI', v: data.stats.agi }, { l: 'STR', v: data.stats.str }, { l: 'JMP', v: data.stats.jmp }, { l: 'P RSH', v: data.stats.prsh },
            { l: 'R CVR', v: data.stats.rcvr }, { l: 'CTH', v: data.stats.cth }, { l: 'HOT B', v: data.stats.hotb }, { l: 'TCK', v: data.stats.tck }, { l: 'STA', v: data.stats.sta },
            { l: 'DUR', v: data.stats.dur }, { l: 'LDR', v: data.stats.ldr }, { l: 'CMP', v: data.stats.cmp }, { l: 'CNST', v: data.stats.cnst }, { l: 'AGG', v: data.stats.agg }
        ];

        const rows = 3;
        const cols = 5;
        const colWidth = plateWidth / cols;
        const rowHeight = (statsHeight - 80) / rows;

        statList.forEach((s, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const sx = plateX + (col * colWidth) + (colWidth / 2);
            const sy = statsY + 80 + (row * rowHeight);

            ctx.fillStyle = '#64748b';
            ctx.font = `bold 20px Arial`;
            ctx.fillText(s.l, sx, sy + 35);

            ctx.fillStyle = '#1e293b';
            ctx.font = `900 38px Arial`;
            ctx.fillText(s.v || '-', sx, sy + 80);
        });
    }
};