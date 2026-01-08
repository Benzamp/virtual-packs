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
        const teamColors = window.TeamColors ? window.TeamColors.getColors() : { color1: '#fbbf24', color2: '#000000' };
        const canvas = document.getElementById('hidden-canvas-front');
        const pCanvas = document.getElementById('hidden-canvas-player');
        const bCanvas = document.getElementById('hidden-canvas-border');

        const ctx = canvas.getContext('2d');
        const pCtx = pCanvas.getContext('2d');
        const bCtx = bCanvas.getContext('2d');
        const w = 1024, h = 1480;

        [ctx, pCtx, bCtx].forEach(c => c.clearRect(0, 0, w, h));

        // Inner Background (The "Card Face" inside the border)
        if (userImages.layerBg) {
            ctx.drawImage(userImages.layerBg, 0, 0, w, h);
        } else {
            ctx.fillStyle = "#1e293b"; 
            ctx.fillRect(60, 60, w - 120, h - 120);
        }

        // 2. DRAW PLAYER (Middle Layer)
        if (userImages.layerPlayer) {
            pCtx.drawImage(userImages.layerPlayer, 0, 0, w, h);
        }

        // 3. DRAW BORDER & BANNER ON TOP LAYER (bCtx)
        const margin = 100;      
        const gap = 14;         
        const bannerY = h - 320;
        const tilt = 55;

        bCtx.save();

        if (userImages.layerBorder) {
            // If you have a PNG border, draw it first
            bCtx.drawImage(userImages.layerBorder, 0, 0, w, h);
        } else {
            // If NO PNG exists, use the programmatic borders you built
            // --- DRAW DOUBLE BORDERS ---
            bCtx.strokeStyle = teamColors.color1;
            bCtx.lineWidth = 14;
            this.drawR(bCtx, margin, margin, w - (margin * 2), h - (margin * 2), 40, false, true);

            bCtx.strokeStyle = teamColors.color3 || '#d2c4af';
            bCtx.lineWidth = 8;
            const innerM = margin + gap;
            this.drawR(bCtx, innerM, innerM, w - (innerM * 2), h - (innerM * 2), 30, false, true);
        }
        
        // --- DRAW DOUBLE BORDERS ---
        bCtx.strokeStyle = teamColors.color1;
        bCtx.lineWidth = 14;
        this.drawR(bCtx, margin, margin, w - (margin * 2), h - (margin * 2), 40, false, true);

        bCtx.strokeStyle = teamColors.color3;
        bCtx.lineWidth = 8;
        const innerM = margin + gap;
        this.drawR(bCtx, innerM, innerM, w - (innerM * 2), h - (innerM * 2), 30, false, true);

        // --- DRAW THE BANNER SHAPE ---
        bCtx.beginPath();
        bCtx.moveTo(margin - 20, bannerY); 
        bCtx.lineTo(w - margin + 20, bannerY - tilt); 
        bCtx.lineTo(w - margin + 20, bannerY + 160 - tilt);
        bCtx.lineTo(margin - 20, bannerY + 160);
        bCtx.closePath();

        // Fill Banner (Dark background for text)
        bCtx.fillStyle = teamColors.color2;
        bCtx.shadowBlur = 15;
        bCtx.shadowColor = "black";
        bCtx.fill();
        
        // Banner Stroke
        bCtx.shadowBlur = 0;
        bCtx.strokeStyle = teamColors.color1;
        bCtx.lineWidth = 6;
        bCtx.stroke();
        
        bCtx.restore();

        // 4. DRAW TEXT ON TOP OF BANNER
        // We draw this on bCtx so it is definitely on top of the banner shape
        const drawBannerText = (text, style) => {
            if (!text) return;
            bCtx.save();
            
            // Calculate tilt angle in radians (approx -3.5 degrees)
            const angle = Math.atan2(-tilt, w - (margin * 2));
            
            // Move to the banner area
            bCtx.translate(style.x, style.y);
            bCtx.rotate(angle); 
            
            // Text Style
            bCtx.fillStyle = "#FFFFFF"; 
            bCtx.font = `bold ${style.size}px "${style.font || 'Bebas Neue'}", sans-serif`;
            bCtx.textAlign = 'left';
            
            // Optional: Add thin stroke to text for pop
            bCtx.strokeStyle = "black";
            bCtx.lineWidth = 2;
            bCtx.strokeText(text.toUpperCase(), 0, 0);
            bCtx.fillText(text.toUpperCase(), 0, 0);
            
            bCtx.restore();
        };

        // Position names inside the banner
        // You might need to adjust these Y values in your data object to ~1250-1300
        drawBannerText(data.fName, data.fNameStyle);
        drawBannerText(data.lName, data.lNameStyle);
    },

    renderBack(data, userImages) {
        // Get team colors
        const teamColors = window.TeamColors ? window.TeamColors.getColors() : null;

        const canvas = document.getElementById('hidden-canvas-back');
        const vpCanvas = document.getElementById('hidden-canvas-vp'); 
        const lCanvas = document.getElementById('hidden-canvas-league');

        const ctx = canvas.getContext('2d');
        const vpCtx = vpCanvas ? vpCanvas.getContext('2d') : null;
        const lCtx = lCanvas ? lCanvas.getContext('2d') : null;
        
        const w = 1024, h = 1480;
        const pad = 60;
        
        // Clear all relevant canvases
        ctx.clearRect(0, 0, w, h);
        if (vpCtx) vpCtx.clearRect(0, 0, w, h);
        if (lCtx) lCtx.clearRect(0, 0, w, h);

        // --- 1. BASE BACKGROUND ---
        if (userImages.back) {
            ctx.drawImage(userImages.back, 0, 0, w, h);
        } else {
            ctx.fillStyle = "#f8fafc"; 
            ctx.fillRect(0, 0, w, h);
        }

        // --- TEAM LOGO WATERMARK ---
        if (userImages.teamLogo) {
            ctx.save();
            ctx.globalAlpha = 0.25; // Set low transparency (adjust 0.0 to 1.0)
            
            const watermarkSize = 1000;
            const wx = (w - watermarkSize) / 2;
            const wy = (h - watermarkSize) / 2;

            ctx.drawImage(userImages.teamLogo, wx, wy, watermarkSize, watermarkSize);
            ctx.restore();
        }

        const plateWidth = w - (pad * 2.5);
        const plateX = (w - plateWidth) / 2;

        // --- 2. LOGOS (Drawn after Background, before Text) ---
        const logoSize = 100;
        const logoY = 455;

        // Virtual Packs Logo
        if (userImages.logo1) {
            const logoX = (w - logoSize) / 2 - 300;
            // Draw to main back for 2D visibility
            ctx.drawImage(userImages.logo1, logoX, logoY, logoSize, logoSize);
            // Draw to dedicated foil canvas if it exists
            if (vpCtx) vpCtx.drawImage(userImages.logo1, logoX, logoY, logoSize, logoSize);
        }

        // League Logo
        if (userImages.logo2) {
            const logoX = (w - logoSize) / 2 + 300;
            // Draw to main back for 2D visibility
            ctx.drawImage(userImages.logo2, logoX, logoY, logoSize, logoSize);
            // Draw to dedicated foil canvas if it exists
            if (lCtx) lCtx.drawImage(userImages.logo2, logoX, logoY, logoSize, logoSize);
        }

        // --- Card # TEXT ---
        const cardNum = data.cardNum || "1/100";
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 40px "Bebas Neue", "Impact", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cardNum, w / 2, 115);

        // --- 3. POSITION TEXT ---
        const position = data.pPosition || "SS";
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 48px "Bebas Neue", "Impact", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(position, w / 2, 340);

        // --- 4. PLAYER NUMBER (Stylized) ---
        const number = data.pNumber || "00";
        const centerX = w / 2;
        const centerY = 590;

        ctx.font = '900 240px "Bebas Neue", "Impact", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';

        // Outer border (Stroke)
        ctx.strokeStyle = teamColors ? teamColors.color2 : '#64748b';
        ctx.lineWidth = 15;
        ctx.strokeText(number, centerX, centerY);

        // Main number (Fill)
        ctx.fillStyle = teamColors ? teamColors.color1 : '#1e293b';
        ctx.fillText(number, centerX, centerY);

        // --- 5. HIGHLIGHTS SECTION ---
        const highlightY = 750; 
        ctx.fillStyle = '#111'; 
        ctx.font = `bold 44px Arial`; 
        ctx.fillText("HIGHLIGHTS", w / 2, highlightY);
        
        ctx.font = `italic 40px Georgia`; 
        this.wrapText(ctx, data.quote || "NO HIGHLIGHTS PROVIDED", w / 2, highlightY + 55, plateWidth - 40, 42);

        // --- 6. ATTRIBUTES SECTION ---
        const statsY = 975;
        const statsHeight = 400; 

        ctx.fillStyle = '#111'; 
        ctx.font = 'bold 44px Arial';
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