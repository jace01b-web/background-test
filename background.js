(function() {
    'use strict';

    // --- Configuration ---
    const CONFIG = {
        starCount: 800,           
        dustCount: 200,           
        cometFrequency: 0.02,     
        baseSpeed: 1.5,           
        warpSpeedMultiplier: 1,   
        fov: 250,                 
        blurAmount: '1.5px',      
        colors: {
            background: '#000000',
            star: '#FFFFFF',
            dust: 'rgba(200, 200, 200, 0.15)',
            comet: '#FFFFFF',
            // Changed to White with 0.5 transparency to keep it as an overlay
            text: 'rgba(255, 255, 255, 0.5)' 
        },
        overlayText: "InitialsAndVoices",
        // Reduced size to ~20px (70% smaller than 64px)
        overlayFont: "italic bold 20px 'Georgia', serif" 
    };

    const Utils = {
        random: (min, max) => Math.random() * (max - min) + min,
        map: (value, inMin, inMax, outMin, outMax) => (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin,
        clamp: (value, min, max) => Math.max(min, Math.min(max, value))
    };

    class Vector3D {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x; this.y = y; this.z = z;
        }
        reset(canvasWidth, canvasHeight, depth) {
            this.x = Utils.random(-canvasWidth, canvasWidth);
            this.y = Utils.random(-canvasHeight, canvasHeight);
            this.z = Utils.random(1, depth);
        }
    }

    class Star {
        constructor(engine) {
            this.engine = engine;
            this.pos = new Vector3D();
            this.prevZ = 0;
            this.radius = Utils.random(0.5, 2);
            this.opacity = Utils.random(0.3, 1);
            this.pos.reset(this.engine.width * 2, this.engine.height * 2, this.engine.depth);
            this.prevZ = this.pos.z;
        }
        update() {
            this.prevZ = this.pos.z;
            this.pos.z -= CONFIG.baseSpeed * CONFIG.warpSpeedMultiplier;
            if (this.pos.z <= 0) {
                this.pos.reset(this.engine.width * 2, this.engine.height * 2, this.engine.depth);
                this.prevZ = this.pos.z;
            }
        }
        draw(ctx) {
            const fov = CONFIG.fov;
            let sx = (this.pos.x / this.pos.z) * fov + this.engine.width / 2;
            let sy = (this.pos.y / this.pos.z) * fov + this.engine.height / 2;
            let px = (this.pos.x / this.prevZ) * fov + this.engine.width / 2;
            let py = (this.pos.y / this.prevZ) * fov + this.engine.height / 2;
            let projectedRadius = Utils.map(this.pos.z, 0, this.engine.depth, this.radius * 2, 0);
            projectedRadius = Utils.clamp(projectedRadius, 0.1, this.radius * 3);
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineWidth = projectedRadius;
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.stroke();
        }
    }

    class SpaceDust {
        constructor(engine) {
            this.engine = engine;
            this.pos = new Vector3D();
            this.radius = Utils.random(10, 50);
            this.opacity = Utils.random(0.01, 0.05);
            this.pos.reset(this.engine.width * 1.5, this.engine.height * 1.5, this.engine.depth);
        }
        update() {
            this.pos.z -= (CONFIG.baseSpeed * 0.5) * CONFIG.warpSpeedMultiplier;
            if (this.pos.z <= 0) this.pos.reset(this.engine.width * 1.5, this.engine.height * 1.5, this.engine.depth);
        }
        draw(ctx) {
            const fov = CONFIG.fov;
            let sx = (this.pos.x / this.pos.z) * fov + this.engine.width / 2;
            let sy = (this.pos.y / this.pos.z) * fov + this.engine.height / 2;
            let projRadius = Utils.map(this.pos.z, 0, this.engine.depth, this.radius * 3, this.radius * 0.5);
            ctx.beginPath();
            ctx.arc(sx, sy, Math.abs(projRadius), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    class Comet {
        constructor(engine) {
            this.engine = engine;
            this.active = false;
            this.pos = new Vector3D();
            this.tail = [];
            this.speed = 0;
            this.angle = 0;
        }
        spawn() {
            this.active = true;
            this.tail = [];
            this.pos.x = Utils.random(-this.engine.width, this.engine.width);
            this.pos.y = -this.engine.height; 
            this.pos.z = Utils.random(100, 500);
            this.speed = Utils.random(15, 30);
            this.angle = Utils.random(Math.PI / 4, (Math.PI * 3) / 4);
        }
        update() {
            if (!this.active) return;
            this.tail.push({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
            if (this.tail.length > 20) this.tail.shift();
            this.pos.x += Math.cos(this.angle) * this.speed;
            this.pos.y += Math.sin(this.angle) * this.speed;
            this.pos.z -= CONFIG.baseSpeed;
            if (this.pos.y > this.engine.height * 2 || this.pos.x > this.engine.width * 2 || this.pos.x < -this.engine.width * 2) this.active = false;
        }
        draw(ctx) {
            if (!this.active || this.tail.length === 0) return;
            const fov = CONFIG.fov;
            const w = this.engine.width / 2;
            const h = this.engine.height / 2;
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 0; i < this.tail.length; i++) {
                let p = this.tail[i];
                let sx = (p.x / p.z) * fov + w;
                let sy = (p.y / p.z) * fov + h;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            let gradient = ctx.createLinearGradient(
                (this.tail[0].x / this.tail[0].z) * fov + w,
                (this.tail[0].y / this.tail[0].z) * fov + h,
                (this.pos.x / this.pos.z) * fov + w,
                (this.pos.y / this.pos.z) * fov + h
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = Utils.map(this.pos.z, 0, this.engine.depth, 4, 0.5);
            ctx.stroke();
            let hx = (this.pos.x / this.pos.z) * fov + w;
            let hy = (this.pos.y / this.pos.z) * fov + h;
            ctx.beginPath();
            ctx.arc(hx, hy, ctx.lineWidth * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
        }
    }

    class SpaceEngine {
        constructor() {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d', { alpha: false });
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.depth = 1000;
            this.stars = [];
            this.dustParticles = [];
            this.comets = [];
            this.initDOM();
            this.initEntities();
            this.addEventListeners();
            this.loop();
        }

        initDOM() {
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            this.canvas.style.zIndex = '-9999';
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.filter = `blur(${CONFIG.blurAmount})`;
            document.body.style.margin = '0';
            document.body.style.backgroundColor = CONFIG.colors.background;
            document.body.appendChild(this.canvas);
            this.resize();
        }

        initEntities() {
            for (let i = 0; i < CONFIG.starCount; i++) this.stars.push(new Star(this));
            for (let i = 0; i < CONFIG.dustCount; i++) this.dustParticles.push(new SpaceDust(this));
            for (let i = 0; i < 3; i++) this.comets.push(new Comet(this));
        }

        resize() {
            const dpr = window.devicePixelRatio || 1;
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width * dpr;
            this.canvas.height = this.height * dpr;
            this.ctx.scale(dpr, dpr);
        }

        addEventListeners() {
            window.addEventListener('resize', () => this.resize());
        }

        update() {
            for (let i = 0; i < this.stars.length; i++) this.stars[i].update();
            for (let i = 0; i < this.dustParticles.length; i++) this.dustParticles[i].update();
            if (Math.random() < CONFIG.cometFrequency) {
                let inactiveComet = this.comets.find(c => !c.active);
                if (inactiveComet) inactiveComet.spawn();
            }
            for (let i = 0; i < this.comets.length; i++) this.comets[i].update();
        }

        drawOverlayText() {
            this.ctx.save();
            this.ctx.font = CONFIG.overlayFont;
            this.ctx.fillStyle = CONFIG.colors.text;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            // Logic maintains perfect center alignment
            this.ctx.fillText(CONFIG.overlayText, this.width / 2, this.height / 2);
            this.ctx.restore();
        }

        draw() {
            this.ctx.fillStyle = CONFIG.colors.background;
            this.ctx.fillRect(0, 0, this.width, this.height);
            for (let i = 0; i < this.dustParticles.length; i++) this.dustParticles[i].draw(this.ctx);
            for (let i = 0; i < this.stars.length; i++) this.stars[i].draw(this.ctx);
            for (let i = 0; i < this.comets.length; i++) this.comets[i].draw(this.ctx);
            this.drawOverlayText();
        }

        loop() {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.loop());
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        new SpaceEngine();
    } else {
        document.addEventListener('DOMContentLoaded', () => new SpaceEngine());
    }

})();
