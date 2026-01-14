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
        const teamColors = window.TeamColors ? window.TeamColors.getColors() : { color1: '#fbbf24', color2: '#000000', color3: '#d2c4af' };
        const canvas = document.getElementById('hidden-canvas-front');
        const pCanvas = document.getElementById('hidden-canvas-player');
        const bCanvas = document.getElementById('hidden-canvas-border');

        const ctx = canvas.getContext('2d');
        const pCtx = pCanvas.getContext('2d');
        const bCtx = bCanvas.getContext('2d');
        const w = 1024, h = 1480;

        [ctx, pCtx, bCtx].forEach(c => c.clearRect(0, 0, w, h));

        // 1. INNER BACKGROUND
        if (userImages.layerBg) {
            ctx.drawImage(userImages.layerBg, 0, 0, w, h);
        } else {
            ctx.fillStyle = "#1e293b"; 
            ctx.fillRect(60, 60, w - 120, h - 120);
        }

        // 2. DRAW PLAYER
        if (userImages.layerPlayer) {
            pCtx.drawImage(userImages.layerPlayer, 0, 0, w, h);
        }

        // 3. DRAW BORDER & BANNER (bCtx)
        const margin = 60;      
        const gap = 14;          
        const bannerY = h - 320;
        const tilt = 55;

        bCtx.save();
        if (userImages.layerBorder) {
            bCtx.drawImage(userImages.layerBorder, 0, 0, w, h);
        }

        // Borders
        bCtx.strokeStyle = teamColors.color1;
        bCtx.lineWidth = 14;
        this.drawR(bCtx, margin, margin, w - (margin * 2), h - (margin * 2), 40, false, true);

        bCtx.strokeStyle = teamColors.color3 || '#d2c4af';
        bCtx.lineWidth = 8;
        const innerM = margin + gap;
        this.drawR(bCtx, innerM, innerM, w - (innerM * 2), h - (innerM * 2), 30, false, true);

        // Banner Shape
        bCtx.beginPath();
        bCtx.moveTo(margin - 20, bannerY); 
        bCtx.lineTo(w - margin + 20, bannerY - tilt); 
        bCtx.lineTo(w - margin + 20, bannerY + 160 - tilt);
        bCtx.lineTo(margin - 20, bannerY + 160);
        bCtx.closePath();
        bCtx.fillStyle = teamColors.color2;
        bCtx.shadowBlur = 15;
        bCtx.shadowColor = "black";
        bCtx.fill();
        bCtx.shadowBlur = 0;
        bCtx.strokeStyle = teamColors.color1;
        bCtx.lineWidth = 6;
        bCtx.stroke();
        bCtx.restore();

        // Text Elements
        const drawBannerText = (text, style) => {
            if (!text || !style) return;
            bCtx.save();
            const angle = Math.atan2(-tilt, w - (margin * 2));
            bCtx.translate(style.x, style.y);
            bCtx.rotate(angle); 
            bCtx.fillStyle = "#FFFFFF"; 
            bCtx.font = `bold ${style.size}px "${style.font || 'Bebas Neue'}", sans-serif`;
            bCtx.textAlign = 'left';
            bCtx.strokeStyle = "black";
            bCtx.lineWidth = 2;
            bCtx.strokeText(text.toUpperCase(), 0, 0);
            bCtx.fillText(text.toUpperCase(), 0, 0);
            bCtx.restore();
        };

        drawBannerText(data.fName, data.fNameStyle);
        drawBannerText(data.lName, data.lNameStyle);
        if (data.pNumber) drawBannerText(`#${data.pNumber}`, data.numStyle, 'right');
        if (data.pPosition) drawBannerText(data.pPosition, data.posStyle, 'right');

        // --- RENDER SEASON LOGO (On Border Layer) ---
        if (userImages.seasonLogo) {
            const sd = data.seasonLogoData;
            bCtx.save();
            // Use the controls from getFormData
            bCtx.translate(sd?.x || 800, sd?.y || 200);
            bCtx.rotate(sd?.rotation || 0);
            
            const sScale = sd?.scale || 1.0;
            const sw = userImages.seasonLogo.width * sScale;
            const sh = userImages.seasonLogo.height * sScale;
            
            // Shadow adds depth so it sits "on top" of the card
            bCtx.shadowColor = "rgba(0,0,0,0.4)";
            bCtx.shadowBlur = 12;
            
            bCtx.drawImage(userImages.seasonLogo, -sw / 2, -sh / 2, sw, sh);
            bCtx.restore();
        }

        // --- RENDER TEAM LOGO (On Border Layer) ---
        const logoImg = userImages.teamLogo; 
        if (logoImg) {
            const ld = data.teamLogoData;
            bCtx.save();
            bCtx.translate(ld?.x || 512, ld?.y || 300);
            bCtx.rotate(ld?.rotation || 0);
            
            const lScale = ld?.scale || 1.0;
            const lw = logoImg.width * lScale;
            const lh = logoImg.height * lScale;
            
            bCtx.drawImage(logoImg, -lw / 2, -lh / 2, lw, lh);
            bCtx.restore();
        }
    },

    renderBack(data, userImages) {
        const teamColors = window.TeamColors ? window.TeamColors.getColors() : { color1: '#fbbf24', color2: '#000000', color3: '#d2c4af' };

        const canvas = document.getElementById('hidden-canvas-back');
        const vpCanvas = document.getElementById('hidden-canvas-vp'); 
        const lCanvas = document.getElementById('hidden-canvas-league');

        const ctx = canvas.getContext('2d');
        const vpCtx = vpCanvas ? vpCanvas.getContext('2d') : null;
        const lCtx = lCanvas ? lCanvas.getContext('2d') : null;
        
        const w = 1024, h = 1480;
        const margin = 60; 
        const gap = 14;   
        
        [ctx, vpCtx, lCtx].forEach(c => c && c.clearRect(0, 0, w, h));

        // 1. BASE BACKGROUND
        if (userImages.back) {
            ctx.drawImage(userImages.back, 0, 0, w, h);
        } else {
            ctx.fillStyle = "#f8fafc"; 
            ctx.fillRect(0, 0, w, h);
        }

        // TEAM LOGO WATERMARK
        if (userImages.teamLogoBack) {
            ctx.save();
            ctx.globalAlpha = 0.15; 
            const watermarkSize = 900;
            ctx.drawImage(userImages.teamLogoBack, (w - watermarkSize) / 2, (h - watermarkSize) / 2, watermarkSize, watermarkSize);
            ctx.restore();
        }

        // 2. BORDER LOGIC
        const drawBorderElements = (targetCtx, isBaseLayer) => {
            targetCtx.save();
            if (isBaseLayer && userImages.layerBorder) {
                targetCtx.drawImage(userImages.layerBorder, 0, 0, w, h);
            }
            targetCtx.strokeStyle = teamColors.color1;
            targetCtx.lineWidth = 14;
            this.drawR(targetCtx, margin, margin, w - (margin * 2), h - (margin * 2), 40, false, true);

            targetCtx.strokeStyle = teamColors.color3 || '#d2c4af';
            targetCtx.lineWidth = 8;
            const innerM = margin + gap;
            this.drawR(targetCtx, innerM, innerM, w - (innerM * 2), h - (innerM * 2), 30, false, true);
            targetCtx.restore();
        };

        drawBorderElements(ctx, true);
        if (vpCtx) drawBorderElements(vpCtx, false);

        // 3. LOGOS
        const logoSize = 80;
        const logoY = 805;
        const offsetX = 220;

        if (userImages.logo1) {
            const lx1 = (w / 2) - offsetX - (logoSize / 2);
            // Draw on main card
            ctx.drawImage(userImages.logo1, lx1, logoY, logoSize, logoSize);
            // Draw on foil layer if it exists (for holographic effect)
            if (vpCtx) vpCtx.drawImage(userImages.logo1, lx1, logoY, logoSize, logoSize);
        }

        if (userImages.logo2) {
            const lx2 = (w / 2) + offsetX - (logoSize / 2);
            // Draw on main card
            ctx.drawImage(userImages.logo2, lx2, logoY, logoSize, logoSize);
            // Draw on foil layer if it exists
            if (lCtx) lCtx.drawImage(userImages.logo2, lx2, logoY, logoSize, logoSize);
        }

        // 4. TEXT TRANSFORMATION (NAMEPLATE)
        const firstName = (data.fName || "FIRST").toUpperCase();
        const lastName = (data.lName || "LAST").toUpperCase();
        const jerseyNum = data.pNumber ? `#${data.pNumber}` : "#00";
        const position = data.pPosition || "SS";

        const nameplateWidth = 860; 
        const nameplateX = (w - nameplateWidth) / 2; 
        const nameBoxY = 170;
        const nameBoxH = 180;
        const skew = 45;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(nameplateX, nameBoxY);
        ctx.lineTo(nameplateX + nameplateWidth, nameBoxY - skew);
        ctx.lineTo(nameplateX + nameplateWidth, nameBoxY + nameBoxH - skew);
        ctx.lineTo(nameplateX, nameBoxY + nameBoxH);
        ctx.closePath();
        ctx.fillStyle = "#111"; 
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.fill();

        const angle = Math.atan2(-skew, nameplateWidth);
        ctx.translate(w / 2, nameBoxY + 65);
        ctx.rotate(angle);
        ctx.textAlign = 'center';
        ctx.fillStyle = teamColors.color1;
        ctx.font = 'bold 32px "Bebas Neue", sans-serif';
        ctx.letterSpacing = "6px";
        ctx.fillText(firstName, 0, -10);
        ctx.fillStyle = 'white';
        ctx.font = 'italic bold 105px "Bebas Neue", sans-serif';
        ctx.fillText(lastName, 0, 85);
        ctx.restore();

        // 5. INFO BADGE
        const badgeY = 375;
        const badgeW = 240, badgeH = 55;
        ctx.fillStyle = '#334155';
        this.drawR(ctx, w/2 - badgeW/2, badgeY, badgeW, badgeH, 10, true, false);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px "Bebas Neue", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${jerseyNum}  |  ${position}`, w / 2, badgeY + 40);

        // 6. HIGHLIGHTS
        const highlightY = 580;
        const plateWidth = w - (margin * 3);
        const plateX = (w - plateWidth) / 2;

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 42px "Bebas Neue", sans-serif';
        ctx.fillText("CAREER HIGHLIGHTS", w / 2, highlightY);
        ctx.fillStyle = '#475569'; 
        ctx.font = `italic 38px Georgia`; 
        this.wrapText(ctx, data.quote || "NO HIGHLIGHTS PROVIDED", w / 2, highlightY + 80, plateWidth, 48);

        // 7. ATTRIBUTES GRID
        const statsY = 930;
        ctx.fillStyle = teamColors.color2 === '#000000' ? '#1e293b' : teamColors.color2;
        this.drawR(ctx, plateX, statsY, plateWidth, 60, 10, true, false);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px "Bebas Neue", sans-serif';
        ctx.fillText("SEASON 26 ATTRIBUTES", w / 2, statsY + 42); 

        const statList = [
            { l: 'SPD', v: data.stats.spd }, { l: 'AGI', v: data.stats.agi }, { l: 'STR', v: data.stats.str }, { l: 'JMP', v: data.stats.jmp }, { l: 'P RSH', v: data.stats.prsh },
            { l: 'R CVR', v: data.stats.rcvr }, { l: 'CTH', v: data.stats.cth }, { l: 'HOT B', v: data.stats.hotb }, { l: 'TCK', v: data.stats.tck }, { l: 'STA', v: data.stats.sta },
            { l: 'DUR', v: data.stats.dur }, { l: 'LDR', v: data.stats.ldr }, { l: 'CMP', v: data.stats.cmp }, { l: 'CNST', v: data.stats.cnst }, { l: 'AGG', v: data.stats.agg }
        ];

        const rows = 3, cols = 5;
        const colWidth = plateWidth / cols;
        const rowHeight = 115;

        statList.forEach((s, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const sx = plateX + (col * colWidth) + (colWidth / 2);
            const sy = statsY + 115 + (row * rowHeight);
            ctx.fillStyle = '#64748b';
            ctx.font = `bold 24px Arial`;
            ctx.fillText(s.l, sx, sy);
            ctx.fillStyle = '#0f172a';
            ctx.font = `900 46px "Bebas Neue", sans-serif`;
            ctx.fillText(s.v || '-', sx, sy + 50);
            ctx.strokeStyle = teamColors.color1;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx - 25, sy + 65);
            ctx.lineTo(sx + 25, sy + 65);
            ctx.stroke();
        });
    }
};