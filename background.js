

(function() {
    'use strict';

    // --- Configuration ---
    const CONFIG = {
        starCount: 800,           // Number of background stars
        dustCount: 200,           // Number of atmospheric space dust particles
        cometFrequency: 0.02,     // Chance per frame to spawn a comet
        baseSpeed: 1.5,           // Base forward movement speed
        warpSpeedMultiplier: 1,   // Multiplier for speed (can be changed dynamically)
        fov: 250,                 // Field of view for 3D projection
        blurAmount: '1.5px',      // Slight blur requested
        colors: {
            background: '#000000',
            star: '#FFFFFF',
            dust: 'rgba(200, 200, 200, 0.15)',
            comet: '#FFFFFF'
        }
    };

    // --- Utility Functions ---
    const Utils = {
        /**
         * Generates a random float between min and max.
         */
        random: function(min, max) {
            return Math.random() * (max - min) + min;
        },

        /**
         * Maps a value from one range to another.
         */
        map: function(value, inMin, inMax, outMin, outMax) {
            return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
        },

        /**
         * Clamps a value between a minimum and maximum.
         */
        clamp: function(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }
    };

    // --- Core Classes ---

    /**
     * Vector3D represents a point in 3D space.
     */
    class Vector3D {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }

        reset(canvasWidth, canvasHeight, depth) {
            this.x = Utils.random(-canvasWidth, canvasWidth);
            this.y = Utils.random(-canvasHeight, canvasHeight);
            this.z = Utils.random(1, depth);
        }
    }

    /**
     * Represents a standard star moving towards the viewer.
     */
    class Star {
        constructor(engine) {
            this.engine = engine;
            this.pos = new Vector3D();
            this.prevZ = 0;
            this.radius = Utils.random(0.5, 2);
            this.opacity = Utils.random(0.3, 1);
            
            // Initial randomized spawn
            this.pos.reset(this.engine.width * 2, this.engine.height * 2, this.engine.depth);
            this.prevZ = this.pos.z;
        }

        update() {
            this.prevZ = this.pos.z;
            this.pos.z -= CONFIG.baseSpeed * CONFIG.warpSpeedMultiplier;

            // If the star passes the camera, reset it far away
            if (this.pos.z <= 0) {
                this.pos.reset(this.engine.width * 2, this.engine.height * 2, this.engine.depth);
                this.prevZ = this.pos.z;
            }
        }

        draw(ctx) {
            const fov = CONFIG.fov;
            const width = this.engine.width;
            const height = this.engine.height;

            // 3D to 2D Projection
            let sx = (this.pos.x / this.pos.z) * fov + width / 2;
            let sy = (this.pos.y / this.pos.z) * fov + height / 2;

            let px = (this.pos.x / this.prevZ) * fov + width / 2;
            let py = (this.pos.y / this.prevZ) * fov + height / 2;

            // Calculate size based on depth (closer = bigger)
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

    /**
     * Space dust or nebula particles for depth.
     */
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

            if (this.pos.z <= 0) {
                this.pos.reset(this.engine.width * 1.5, this.engine.height * 1.5, this.engine.depth);
            }
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

    /**
     * Occasional fast-moving comet or shooting star.
     */
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
            // Spawn at edge
            this.pos.x = Utils.random(-this.engine.width, this.engine.width);
            this.pos.y = -this.engine.height; 
            this.pos.z = Utils.random(100, 500); // Fairly close
            
            this.speed = Utils.random(15, 30);
            this.angle = Utils.random(Math.PI / 4, (Math.PI * 3) / 4); // Downward angles
        }

        update() {
            if (!this.active) return;

            this.tail.push({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
            if (this.tail.length > 20) {
                this.tail.shift();
            }

            this.pos.x += Math.cos(this.angle) * this.speed;
            this.pos.y += Math.sin(this.angle) * this.speed;
            this.pos.z -= CONFIG.baseSpeed; // Move forward slightly

            // Deactivate if out of bounds
            if (this.pos.y > this.engine.height * 2 || this.pos.x > this.engine.width * 2 || this.pos.x < -this.engine.width * 2) {
                this.active = false;
            }
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
                
                if (i === 0) {
                    ctx.moveTo(sx, sy);
                } else {
                    ctx.lineTo(sx, sy);
                }
            }

            // Fade tail
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

            // Draw comet head
            let hx = (this.pos.x / this.pos.z) * fov + w;
            let hy = (this.pos.y / this.pos.z) * fov + h;
            ctx.beginPath();
            ctx.arc(hx, hy, ctx.lineWidth * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
        }
    }

    // --- Main Engine ---

    class SpaceEngine {
        constructor() {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimize
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.depth = 1000; // Z-depth of the scene

            this.stars = [];
            this.dustParticles = [];
            this.comets = [];
            
            this.animationFrameId = null;

            this.initDOM();
            this.initEntities();
            this.addEventListeners();
            this.loop();
        }

        initDOM() {
            // Setup canvas styles
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            this.canvas.style.zIndex = '-9999'; // Keep it in the background
            this.canvas.style.pointerEvents = 'none'; // Don't block clicks
            
            // Apply the requested subtle blur
            this.canvas.style.filter = `blur(${CONFIG.blurAmount})`;
            
            document.body.style.margin = '0';
            document.body.style.backgroundColor = CONFIG.colors.background;
            document.body.appendChild(this.canvas);

            this.resize();
        }

        initEntities() {
            for (let i = 0; i < CONFIG.starCount; i++) {
                this.stars.push(new Star(this));
            }
            
            for (let i = 0; i < CONFIG.dustCount; i++) {
                this.dustParticles.push(new SpaceDust(this));
            }

            // Pool of comets
            for (let i = 0; i < 3; i++) {
                this.comets.push(new Comet(this));
            }
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
            for (let i = 0; i < this.stars.length; i++) {
                this.stars[i].update();
            }

            for (let i = 0; i < this.dustParticles.length; i++) {
                this.dustParticles[i].update();
            }

            // Random comet spawning logic
            if (Math.random() < CONFIG.cometFrequency) {
                let inactiveComet = this.comets.find(c => !c.active);
                if (inactiveComet) inactiveComet.spawn();
            }

            for (let i = 0; i < this.comets.length; i++) {
                this.comets[i].update();
            }
        }

        draw() {
            // Fill background
            this.ctx.fillStyle = CONFIG.colors.background;
            this.ctx.fillRect(0, 0, this.width, this.height);

            // Draw dust (background layer)
            for (let i = 0; i < this.dustParticles.length; i++) {
                this.dustParticles[i].draw(this.ctx);
            }

            // Draw stars (mid layer)
            for (let i = 0; i < this.stars.length; i++) {
                this.stars[i].draw(this.ctx);
            }

            // Draw comets (foreground layer)
            for (let i = 0; i < this.comets.length; i++) {
                this.comets[i].draw(this.ctx);
            }
        }

        loop() {
            this.update();
            this.draw();
            this.animationFrameId = requestAnimationFrame(() => this.loop());
        }
    }

    // --- Initialization ---
    // Wait for the DOM to be fully loaded before starting the engine
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        new SpaceEngine();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            new SpaceEngine();
        });
    }

})();
