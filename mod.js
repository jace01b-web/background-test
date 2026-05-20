(function() {
    // =========================================================
    // 1. STATE & CONFIGURATION MANAGEMENT
    // =========================================================
    const STORAGE_KEY = 'gd_wave_config_v4';
    
    // Default values
    let config = {
        // Engine
        baseSpeed: 1.0,
        focusSpeed: 0.5,
        timeFreeze: false,
        fpsUnlocker: false, // NEW: FPS Unlocker State
        antiLag: false,     // NEW: Anti-Lag State
        
        // Transforms & Filters
        zoom: 1.0,
        rotation: 0,
        invertX: false,
        invertY: false,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 0,
        blur: 0,
        invertColors: 0,
        
        // Wave Visuals
        rainbowMode: false,
        rainbowSpeed: 2.0,
        showAimLine: false,
        showGrid: false,
        
        // Macros
        autoClickerActive: false,
        autoClickerCPS: 15,
        jitterClick: false, 
        
        // Training
        ghostMode: 100, 
        
        // New Modifiers
        earthquake: false,
        deepFried: false,
        flashlight: false,
        cinematic: false,
        vignette: false,
        
        // Menu
        menuOpacity: 0.95,
        menuTheme: '#ff0055',
        tabPosition: 'top' // 'top', 'bottom', 'left', 'right'
    };

    function loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) config = { ...config, ...JSON.parse(saved) };
        } catch(e) { console.error("Could not load config", e); }
    }
    
    function saveConfig() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        applyAllVisuals();
    }

    function resetConfig() {
        localStorage.removeItem(STORAGE_KEY);
        location.reload(); 
    }

    loadConfig();

    // =========================================================
    // 2. ENGINE CLOCK & RAF HIJACK (FPS UNLOCKER)
    // =========================================================
    let speedMultiplier = config.baseSpeed;
    let shiftHeld = false;
    let isTimeSkipping = false; // Prevents shift/base overrides during 24h skip
    
    const originalPerfNow = performance.now.bind(performance);
    let perfLastReal = originalPerfNow();
    let perfFake = perfLastReal;
    
    performance.now = function() {
        const now = originalPerfNow();
        const dt = now - perfLastReal;
        perfLastReal = now;
        if (!config.timeFreeze) perfFake += (dt * speedMultiplier);
        return perfFake;
    };

    const originalDateNow = Date.now.bind(Date);
    let dateLastReal = originalDateNow();
    let dateFake = dateLastReal;
    
    Date.now = function() {
        const now = originalDateNow();
        const dt = now - dateLastReal;
        dateLastReal = now;
        if (!config.timeFreeze) dateFake += (dt * speedMultiplier);
        return Math.floor(dateFake);
    };

    // FPS Unlocker Core Interceptor
    const originalRAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function(callback) {
        if (config.fpsUnlocker) {
            // Unlocks V-Sync restrictions by execution forcing through the event loop macro-tasking
            return setTimeout(() => {
                callback(performance.now());
            }, 0);
        }
        return originalRAF(callback);
    };

    // =========================================================
    // 3. UI CONSTRUCTION
    // =========================================================
    function buildModMenu() {
        if (document.getElementById('gd-standalone-menu')) return;

        const style = document.createElement('style');
        style.innerHTML = `
            :root {
                --theme-color: ${config.menuTheme};
                --bg-color: rgba(10, 12, 18, var(--menu-alpha, 0.95));
            }
            #gd-standalone-menu {
                position: fixed; 
                top: 50%; 
                left: 40px; 
                width: 400px; 
                height: 580px;
                background: var(--bg-color); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
                border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
                color: #e0e0e0; font-family: "Inter", "Segoe UI", sans-serif;
                z-index: 9999999; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
                user-select: none; display: flex; flex-direction: column;
                will-change: left, top, transform, opacity;
                
                opacity: 0;
                transform: translateY(-50%) scale(0.92) translateX(-30px);
                transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, filter 0.4s ease;
                filter: blur(5px);
            }
            
            #gd-standalone-menu.menu-visible {
                opacity: 1;
                transform: translateY(-50%) scale(1) translateX(0px);
                filter: blur(0px);
            }
            
            #gd-standalone-menu.menu-hidden {
                opacity: 0 !important;
                transform: translateY(-50%) scale(0.95) translateX(-15px) !important;
                pointer-events: none !important;
                filter: blur(3px) !important;
            }
            
            .gd-header {
                display: flex; justify-content: space-between; align-items: center;
                background: linear-gradient(90deg, rgba(0,0,0,0.8), rgba(40,0,20,0.8));
                padding: 15px 16px; cursor: move; border-top-left-radius: 12px; border-top-right-radius: 12px;
                border-bottom: 2px solid var(--theme-color); flex-shrink: 0;
            }
            .gd-title { font-weight: 800; font-size: 16px; color: #fff; text-shadow: 0 0 8px var(--theme-color); letter-spacing: 1px;}
            .gd-fps { font-family: monospace; color: var(--theme-color); font-size: 12px; font-weight: bold; background: rgba(0,0,0,0.5); padding: 3px 6px; border-radius: 4px; pointer-events: auto; }
            
            .gd-content-wrapper { display: flex; flex: 1; overflow: hidden; }
            .gd-tabs { display: flex; background: rgba(0,0,0,0.5); flex-shrink: 0; }
            
            .pos-top { flex-direction: column; }
            .pos-top .gd-tabs { flex-direction: row; border-bottom: 1px solid rgba(255,255,255,0.1); }
            .pos-top .gd-tab.active { border-bottom: 2px solid var(--theme-color); }
            
            .pos-bottom { flex-direction: column-reverse; }
            .pos-bottom .gd-tabs { flex-direction: row; border-top: 1px solid rgba(255,255,255,0.1); }
            .pos-bottom .gd-tab.active { border-top: 2px solid var(--theme-color); }
            
            .pos-left { flex-direction: row; }
            .pos-left .gd-tabs { flex-direction: column; width: 85px; border-right: 1px solid rgba(255,255,255,0.1); }
            .pos-left .gd-tab.active { border-right: 2px solid var(--theme-color); background: rgba(255,255,255,0.1); }
            
            .pos-right { flex-direction: row-reverse; }
            .pos-right .gd-tabs { flex-direction: column; width: 85px; border-left: 1px solid rgba(255,255,255,0.1); }
            .pos-right .gd-tab.active { border-left: 2px solid var(--theme-color); background: rgba(255,255,255,0.1); }

            .gd-tab { display: flex; align-items: center; justify-content: center; flex: 1; text-align: center; padding: 10px 5px; font-size: 11px; font-weight: 600; cursor: pointer; color: #888; transition: 0.2s; text-transform: uppercase; }
            .gd-tab:hover { color: #fff; background: rgba(255,255,255,0.05); }
            .gd-tab.active { color: var(--theme-color); background: rgba(255,255,255,0.1); }
            
            .gd-body { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
            .gd-body::-webkit-scrollbar { width: 6px; }
            .gd-body::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
            .gd-body::-webkit-scrollbar-thumb { background: var(--theme-color); border-radius: 10px; }
            .tab-content { display: none; flex-direction: column; gap: 15px; }
            .tab-content.active { display: flex; }
            .section-title { font-size: 11px; text-transform: uppercase; color: var(--theme-color); font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-top: 5px;}
            
            .mod-row { display: flex; justify-content: space-between; align-items: center; }
            .mod-label { font-size: 13px; font-weight: 600; display: flex; flex-direction: column; }
            .mod-subtext { font-size: 10px; color: #999; margin-top: 2px; font-weight: 400; }
            
            .switch { position: relative; display: inline-block; width: 36px; height: 18px; flex-shrink: 0; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); transition: .3s; border-radius: 18px; }
            .slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 3px; bottom: 3px; background-color: #888; transition: .3s; border-radius: 50%; }
            input:checked + .slider { background-color: rgba(255, 0, 85, 0.2); border: 1px solid var(--theme-color); }
            input:checked + .slider:before { transform: translateX(18px); background-color: var(--theme-color); box-shadow: 0 0 5px var(--theme-color); }
            
            .range-container { display: flex; flex-direction: column; gap: 6px; }
            .range-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; }
            .range-val { color: var(--theme-color); font-weight: 700; font-family: monospace; }
            .gd-range { -webkit-appearance: none; width: 100%; height: 4px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; outline: none; }
            .gd-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--theme-color); cursor: pointer; transition: 0.1s; }
            .gd-range::-webkit-slider-thumb:hover { transform: scale(1.2); }

            .gd-select { background: rgba(0,0,0,0.5); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 4px 6px; border-radius: 4px; outline: none; cursor: pointer; font-family: inherit; font-size: 11px; }
            .gd-select:focus { border-color: var(--theme-color); }

            .gd-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: 0.2s; text-align: center; }
            .gd-btn:hover { background: rgba(255,255,255,0.1); border-color: var(--theme-color); color: var(--theme-color); }
            .btn-group { display: flex; gap: 10px; }
            .btn-group .gd-btn { flex: 1; }

            .gd-footer { background: rgba(0,0,0,0.7); padding: 10px; font-size: 10px; color: rgba(255,255,255,0.5); text-align: center; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; flex-shrink: 0; cursor: move; }
            
            #gd-aim-line { position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: var(--theme-color); box-shadow: 0 0 5px var(--theme-color); pointer-events: none; z-index: 9999; display: none; }
            #gd-grid-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; z-index: 9998; display: none; }
            #gd-flashlight-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at 50% 50%, transparent 80px, rgba(0,0,0,0.98) 120px); pointer-events: none; z-index: 9998; display: none; }
            #gd-cinematic-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; box-shadow: inset 0 120px 0 #000, inset 0 -120px 0 #000; pointer-events: none; z-index: 9998; display: none; }
            #gd-vignette-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.9) 100%); pointer-events: none; z-index: 9998; display: none; }
        `;
        document.head.appendChild(style);

        const menu = document.createElement('div');
        menu.id = 'gd-standalone-menu';
        menu.innerHTML = `
            <div class="gd-header" id="gd-handle">
                <span class="gd-title">WAVE CLIENT</span>
                <span class="gd-fps" id="fps-counter">0 FPS</span>
            </div>
            
            <div class="gd-content-wrapper pos-${config.tabPosition}" id="gd-content-wrapper">
                <div class="gd-tabs">
                    <div class="gd-tab active" data-target="tab-main">Main</div>
                    <div class="gd-tab" data-target="tab-visuals">Visuals</div>
                    <div class="gd-tab" data-target="tab-macros">Macros</div>
                    <div class="gd-tab" data-target="tab-training">Training</div>
                    <div class="gd-tab" data-target="tab-mods">Mods</div>
                    <div class="gd-tab" data-target="tab-config">Config</div>
                </div>

                <div class="gd-body">
                    <div class="tab-content active" id="tab-main">
                        <div class="section-title">Engine Speed</div>
                        ${createSlider('Base Speed', 'baseSpeed', 0.1, 3.0, 0.05, 'x')}
                        ${createSlider('Focus Speed (Shift)', 'focusSpeed', 0.1, 1.0, 0.05, 'x')}
                        ${createToggle('Freeze Time', 'timeFreeze', 'Halts the game completely')}
                        
                        <div class="section-title">Time Skip</div>
                        <div class="gd-btn" id="btn-timeskip" style="border-color: #ffcc00; color: #ffcc00;">Skip 24 Hours [Takes 1 Second]</div>

                        <div class="section-title">Performance Opts</div>
                        ${createToggle('FPS Unlocker', 'fpsUnlocker', 'Bypasses browser monitor V-Sync caps')}
                        ${createToggle('Anti-Lag Mode', 'antiLag', 'Optimizes GPU canvas buffers')}

                        <div class="section-title">Wave Stats</div>
                        <div class="mod-row"><span class="mod-label">Session Clicks</span><span class="range-val" id="stat-clicks">0</span></div>
                        <div class="mod-row"><span class="mod-label">Session Time</span><span class="range-val" id="stat-time">00:00</span></div>
                    </div>

                    <div class="tab-content" id="tab-visuals">
                        <div class="section-title">Wave Colors</div>
                        ${createToggle('Rainbow Mode', 'rainbowMode', 'Cycles canvas hue automatically')}
                        ${createSlider('Rainbow Speed', 'rainbowSpeed', 0.5, 10.0, 0.5, 'x')}
                        
                        <div class="section-title">Transforms & Filters</div>
                        ${createSlider('FOV / Zoom', 'zoom', 0.3, 2.0, 0.05, 'x')}
                        ${createSlider('Rotation', 'rotation', -180, 180, 1, '°')}
                        ${createToggle('Invert Gravity (Flip Y)', 'invertY')}
                        ${createToggle('Mirror Mode (Flip X)', 'invertX')}
                        ${createSlider('Brightness', 'brightness', 10, 200, 1, '%')}
                        ${createSlider('Contrast', 'contrast', 10, 200, 1, '%')}
                        ${createSlider('Saturation', 'saturation', 0, 300, 1, '%')}
                        ${createSlider('Static Hue Shift', 'hue', 0, 360, 1, '°')}
                        ${createSlider('Blur', 'blur', 0, 10, 0.5, 'px')}
                        ${createSlider('Invert Colors', 'invertColors', 0, 100, 1, '%')}

                        <div class="section-title">Wave Overlays</div>
                        ${createToggle('Show Center Path (Aim Line)', 'showAimLine')}
                        ${createToggle('Show Grid Map', 'showGrid')}
                    </div>

                    <div class="tab-content" id="tab-macros">
                        <div class="section-title">Wave Auto-Clicker</div>
                        ${createToggle('Enable Auto-Clicker (Hold C)', 'autoClickerActive', 'Spams precisely at target CPS')}
                        ${createSlider('Target Speed', 'autoClickerCPS', 1, 150, 1, ' CPS')}
                        ${createToggle('Jitter Click Simulation', 'jitterClick', 'Adds random MS variance to bypass macro detection')}
                    </div>

                    <div class="tab-content" id="tab-training">
                        <div class="section-title">Visibility</div>
                        ${createSlider('Ghost Mode (Opacity)', 'ghostMode', 10, 100, 1, '%')}
                        
                        <div class="section-title">Slow-Mo Presets</div>
                        <div class="btn-group">
                            <div class="gd-btn preset-btn" data-speed="0.25">0.25x</div>
                            <div class="gd-btn preset-btn" data-speed="0.5">0.50x</div>
                            <div class="gd-btn preset-btn" data-speed="0.75">0.75x</div>
                            <div class="gd-btn preset-btn" data-speed="1.0">1.00x</div>
                        </div>
                    </div>

                    <div class="tab-content" id="tab-mods">
                        <div class="section-title">Movement Chaos</div>
                        ${createToggle('Earthquake', 'earthquake', 'Violent screen shake')}
                        
                        <div class="section-title">Visual Chaos</div>
                        ${createToggle('Deep Fried', 'deepFried', 'Max contrast and saturation')}
                        
                        <div class="section-title">Vision Restrictor</div>
                        ${createToggle('Flashlight Mode', 'flashlight', 'Pitch black except for the center')}
                        ${createToggle('Cinematic Bars', 'cinematic', 'Restricts vertical vision completely')}
                        ${createToggle('Heavy Vignette', 'vignette', 'Darkens the outer edges to limit sight')}
                    </div>

                    <div class="tab-content" id="tab-config">
                        <div class="section-title">UI Layout</div>
                        ${createSelect('Tab Position', 'tabPosition', [
                            { value: 'top', text: 'Top (Default)' },
                            { value: 'bottom', text: 'Bottom' },
                            { value: 'left', text: 'Left Sidebar' },
                            { value: 'right', text: 'Right Sidebar' }
                        ])}

                        <div class="section-title">UI Appearance</div>
                        ${createSlider('Menu Opacity', 'menuOpacity', 0.3, 1.0, 0.05, '')}
                        
                        <div class="section-title">Save Management</div>
                        <div class="gd-btn" id="btn-save">Save Wave Profile</div>
                        <div class="gd-btn" id="btn-load">Reload Profile</div>
                        <div class="gd-btn" style="border-color:#ff4d4d; color:#ff4d4d; margin-top:5px;" id="btn-reset">Hard Reset</div>
                    </div>
                </div>
            </div>
            <div class="gd-footer" id="gd-footer-handle">Press [M] to Hide UI | Built for Wave Players</div>
        `;
        document.body.appendChild(menu);
        
        requestAnimationFrame(() => {
            setTimeout(() => {
                menu.classList.add('menu-visible');
            }, 10);
        });

        setupTabSwitching();
        setupInputListeners();
    }

    function createSlider(label, key, min, max, step, unit) {
        return `
        <div class="range-container">
            <div class="range-header"><span>${label}</span><span id="txt-${key}" class="range-val">${config[key]}${unit}</span></div>
            <input type="range" min="${min}" max="${max}" step="${step}" value="${config[key]}" class="gd-range" id="sl-${key}" data-key="${key}" data-unit="${unit}">
        </div>`;
    }

    function createToggle(label, key, subtext = '') {
        const checked = config[key] ? 'checked' : '';
        return `
        <div class="mod-row">
            <div class="mod-label">${label} <span class="mod-subtext">${subtext}</span></div>
            <label class="switch"><input type="checkbox" id="tg-${key}" data-key="${key}" ${checked}><span class="slider"></span></label>
        </div>`;
    }

    function createSelect(label, key, options) {
        let optsHTML = options.map(opt => `<option value="${opt.value}" ${config[key] === opt.value ? 'selected' : ''}>${opt.text}</option>`).join('');
        return `
        <div class="mod-row" style="margin-bottom: 5px;">
            <div class="mod-label">${label}</div>
            <select class="gd-select" data-key="${key}">
                ${optsHTML}
            </select>
        </div>`;
    }

    // =========================================================
    // 4. LOGIC & GAME LOOP
    // =========================================================
    let canvasTarget = null;
    let unityContainer = null;
    let sessionClicks = 0;
    let sessionStartTime = Date.now();

    function setupTabSwitching() {
        const tabs = document.querySelectorAll('.gd-tab');
        const contents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            });
        });
    }

    function applyAllVisuals() {
        if (!canvasTarget) canvasTarget = document.querySelector("#unity-canvas");
        if (!canvasTarget) return;

        canvasTarget.style.opacity = config.ghostMode / 100;
        canvasTarget.style.transition = 'none';

        // Anti-Lag hardware acceleration optimizations
        if (config.antiLag) {
            canvasTarget.style.imageRendering = 'pixelated';
            canvasTarget.style.willChange = 'transform';
            document.documentElement.style.setProperty('--menu-alpha', '1.0'); 
            const menuEl = document.getElementById('gd-standalone-menu');
            if (menuEl) menuEl.style.backdropFilter = 'none'; // Drops costly blurs
        } else {
            canvasTarget.style.imageRendering = 'auto';
            canvasTarget.style.willChange = 'auto';
            document.documentElement.style.setProperty('--menu-alpha', config.menuOpacity);
            const menuEl = document.getElementById('gd-standalone-menu');
            if (menuEl) menuEl.style.backdropFilter = 'blur(15px)';
        }

        const aimLine = document.getElementById('gd-aim-line');
        const grid = document.getElementById('gd-grid-overlay');
        const flashlight = document.getElementById('gd-flashlight-overlay');
        const cinematic = document.getElementById('gd-cinematic-overlay');
        const vignette = document.getElementById('gd-vignette-overlay');
        
        if (aimLine) aimLine.style.display = config.showAimLine ? 'block' : 'none';
        if (grid) grid.style.display = config.showGrid ? 'block' : 'none';
        if (flashlight) flashlight.style.display = config.flashlight ? 'block' : 'none';
        if (cinematic) cinematic.style.display = config.cinematic ? 'block' : 'none';
        if (vignette) vignette.style.display = config.vignette ? 'block' : 'none';
    }

    function syncSpeedMultiplier() {
        if (isTimeSkipping) return; // Block input engine adjustments during burst skip
        if (shiftHeld) {
            speedMultiplier = config.focusSpeed;
        } else {
            speedMultiplier = config.baseSpeed;
        }
    }

    function setupInputListeners() {
        document.querySelectorAll('.gd-range').forEach(sl => {
            sl.addEventListener('input', (e) => {
                const key = e.target.dataset.key;
                const val = parseFloat(e.target.value);
                config[key] = val;
                document.getElementById(`txt-${key}`).innerText = val + e.target.dataset.unit;
                
                if (key === 'baseSpeed' || key === 'focusSpeed') {
                    syncSpeedMultiplier();
                }
                if (key !== 'rainbowSpeed') applyAllVisuals();
            });
        });

        document.querySelectorAll('input[type="checkbox"]').forEach(tg => {
            tg.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                config[key] = e.target.checked;
                applyAllVisuals();
            });
        });

        document.querySelectorAll('.gd-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                config[key] = e.target.value;
                if (key === 'tabPosition') {
                    document.getElementById('gd-content-wrapper').className = `gd-content-wrapper pos-${config.tabPosition}`;
                }
            });
        });

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                config.baseSpeed = speed;
                syncSpeedMultiplier(); 
                document.getElementById('sl-baseSpeed').value = speed;
                document.getElementById('txt-baseSpeed').innerText = speed.toFixed(2) + 'x';
            });
        });

        // 24 Hour Engine Time Skip Logic
        document.getElementById('btn-timeskip').addEventListener('click', (e) => {
            if (isTimeSkipping) return;
            isTimeSkipping = true;
            
            const btn = e.target;
            const previousText = btn.innerText;
            btn.innerText = "Skipping Time... Please Wait";
            btn.style.borderColor = "#ff4d4d";
            btn.style.color = "#ff4d4d";

            // 24 hours = 86400 seconds. Processed over 1 second = 86400x multiplier
            speedMultiplier = 86400;

            setTimeout(() => {
                isTimeSkipping = false;
                syncSpeedMultiplier(); // Revert back safely
                btn.innerText = previousText;
                btn.style.borderColor = "#ffcc00";
                btn.style.color = "#ffcc00";
            }, 1000);
        });

        document.getElementById('btn-save').addEventListener('click', saveConfig);
        document.getElementById('btn-load').addEventListener('click', () => { loadConfig(); location.reload(); });
        document.getElementById('btn-reset').addEventListener('click', resetConfig);

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.key === 'Shift') { 
                shiftHeld = true; 
                syncSpeedMultiplier(); 
            }
            if (e.key.toLowerCase() === 'm') {
                const menu = document.getElementById('gd-standalone-menu');
                menu.classList.toggle('menu-hidden');
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') { 
                shiftHeld = false; 
                syncSpeedMultiplier(); 
            }
        });

        document.addEventListener('mousedown', () => {
            sessionClicks++;
            const el = document.getElementById('stat-clicks');
            if (el) el.innerText = sessionClicks;
        });
    }

    // --- ACCURATE WAVE MACRO ---
    function simulateKey(state) {
        if (!canvasTarget) return;
        const ev = new KeyboardEvent(state, { bubbles: true, keyCode: 32, code: 'Space', key: ' ' });
        canvasTarget.dispatchEvent(ev);
    }

    let autoClickTimer = null;
    let spamKeyHeld = false;

    function triggerAutoClick() {
        if (!config.autoClickerActive || !spamKeyHeld) {
            autoClickTimer = null;
            return;
        }
        
        let cps = Math.max(1, config.autoClickerCPS);
        let delay = 1000 / cps; 

        if (config.jitterClick) delay += (Math.random() * 6 - 3);

        simulateKey('keydown');
        setTimeout(() => simulateKey('keyup'), Math.min(delay / 2, 20)); 

        autoClickTimer = setTimeout(triggerAutoClick, delay);
    }

    document.addEventListener('keydown', e => { 
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.key.toLowerCase() === 'c' && !spamKeyHeld) { 
            spamKeyHeld = true; 
            if (!autoClickTimer) triggerAutoClick();
        } 
    });
    document.addEventListener('keyup', e => { 
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.key.toLowerCase() === 'c') spamKeyHeld = false; 
    });

    // --- RENDER LOOP ---
    function initGameLoopLogic() {
        canvasTarget = document.querySelector("#unity-canvas");
        unityContainer = document.querySelector("#unity-container");

        if (unityContainer) {
            if(window.getComputedStyle(unityContainer).position === 'static') {
                unityContainer.style.position = 'relative';
            }
            
            const overlays = `
                <div id="gd-aim-line"></div>
                <div id="gd-grid-overlay"></div>
                <div id="gd-flashlight-overlay"></div>
                <div id="gd-cinematic-overlay"></div>
                <div id="gd-vignette-overlay"></div>
            `;
            if (!document.getElementById('gd-flashlight-overlay')) {
                unityContainer.insertAdjacentHTML('beforeend', overlays);
            }
        }

        applyAllVisuals();

        let lastTime = performance.now();
        let frames = 0;
        let currentRainbowHue = config.hue;
        
        function updateLoop() {
            frames++;
            const now = performance.now();
            
            if (now >= lastTime + 1000) {
                const fps = Math.round((frames * 1000) / (now - lastTime));
                const fpsEl = document.getElementById('fps-counter');
                if(fpsEl) fpsEl.innerText = `${fps} FPS`;
                frames = 0;
                lastTime = now;

                const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
                const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
                const secs = String(elapsed % 60).padStart(2, '0');
                const timeEl = document.getElementById('stat-time');
                if(timeEl) timeEl.innerText = `${mins}:${secs}`;
            }

            if (canvasTarget) {
                // If Anti-Lag is turned on, skip heavy filter recalculations completely
                if (config.antiLag) {
                    canvasTarget.style.filter = 'none';
                } else {
                    let dynamicHue = config.hue;
                    let cContrast = config.contrast;
                    let cSat = config.saturation;

                    if (config.rainbowMode) {
                        currentRainbowHue = (currentRainbowHue + config.rainbowSpeed) % 360;
                        dynamicHue = currentRainbowHue;
                    }

                    if (config.deepFried) {
                        cContrast = Math.max(cContrast, 300);
                        cSat = Math.max(cSat, 400);
                    }

                    canvasTarget.style.filter = `
                        brightness(${config.brightness}%) 
                        contrast(${cContrast}%) 
                        saturate(${cSat}%) 
                        hue-rotate(${dynamicHue}deg) 
                        blur(${config.blur}px) 
                        invert(${config.invertColors}%)
                    `;
                }

                let transX = 0;
                let transY = 0;
                let scaleX = config.invertX ? (config.zoom * -1) : config.zoom;
                let scaleY = config.invertY ? (config.zoom * -1) : config.zoom;
                let dynamicRot = config.rotation;

                if (config.earthquake) {
                    transX = (Math.random() * 10 - 5);
                    transY = (Math.random() * 10 - 5);
                }

                canvasTarget.style.transform = `translate3d(${transX}px, ${transY}px, 0) scale(${scaleX}, ${scaleY}) rotate(${dynamicRot}deg)`;
            }

            requestAnimationFrame(updateLoop);
        }
        requestAnimationFrame(updateLoop);
    }

    // =========================================================
    // 5. WINDOW CONTROLS (OPTIMIZED DRAGGING)
    // =========================================================
    function setupDragging() {
        const headerHandle = document.getElementById('gd-handle');
        const footerHandle = document.getElementById('gd-footer-handle');
        const menu = document.getElementById('gd-standalone-menu');
        
        let dragging = false;
        let startX = 0, startY = 0;
        let menuLeft = 40, menuTop = window.innerHeight / 2; 
        let mouseX = 0, mouseY = 0;

        function onMouseDown(e) {
            if (e.target.closest('input, select, .gd-btn, .gd-tab')) return;
            
            dragging = true;
            const rect = menu.getBoundingClientRect();
            menuLeft = rect.left;
            menuTop = rect.top;
            
            startX = e.clientX;
            startY = e.clientY;
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            menu.style.transform = 'translateY(0) scale(1) translateX(0)';
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            requestAnimationFrame(updateMenuPosition);
        }

        function onMouseMove(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }

        function onMouseUp() {
            dragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        function updateMenuPosition() {
            if (!dragging) return;
            
            const deltaX = mouseX - startX;
            const deltaY = mouseY - startY;
            
            menu.style.left = (menuLeft + deltaX) + 'px';
            menu.style.top = (menuTop + deltaY) + 'px';
            
            requestAnimationFrame(updateMenuPosition);
        }

        headerHandle.addEventListener('mousedown', onMouseDown);
        footerHandle.addEventListener('mousedown', onMouseDown);
    }

    function init() {
        buildModMenu();
        setupDragging();
        setTimeout(initGameLoopLogic, 500); 
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }
})();
