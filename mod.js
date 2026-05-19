(function() {
    // =========================================================
    // 1. ENGINE CLOCK HIJACK (Speedhack & Focus Mode)
    // =========================================================
    var baseSpeed = 1.0;
    var focusSpeed = 0.5; // Speed when holding Shift
    var speedMultiplier = 1.0;
    
    var originalPerfNow = performance.now.bind(performance);
    var perfLastReal = originalPerfNow();
    var perfFake = perfLastReal;
    
    performance.now = function() {
        var now = originalPerfNow();
        var dt = now - perfLastReal;
        perfLastReal = now;
        perfFake += (dt * speedMultiplier);
        return perfFake;
    };

    var originalDateNow = Date.now.bind(Date);
    var dateLastReal = originalDateNow();
    var dateFake = dateLastReal;
    
    Date.now = function() {
        var now = originalDateNow();
        var dt = now - dateLastReal;
        dateLastReal = now;
        dateFake += (dt * speedMultiplier);
        return Math.floor(dateFake);
    };

    // =========================================================
    // 2. UI CONSTRUCTION FUNCTION
    // =========================================================
    function buildModMenu() {
        if (document.getElementById('gd-standalone-menu')) return;

        // --- Styles ---
        var style = document.createElement('style');
        style.innerHTML = `
            #gd-standalone-menu {
                position: fixed; top: 40px; left: 40px; width: 330px;
                max-height: 85vh; background: rgba(10, 12, 18, 0.95);
                backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
                border: 1px solid rgba(0, 242, 254, 0.3); border-radius: 12px;
                color: #e0e0e0; font-family: "Inter", "Segoe UI", sans-serif;
                z-index: 9999999; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
                user-select: none; transition: opacity 0.2s ease;
                display: flex; flex-direction: column;
            }
            .gd-header {
                display: flex; justify-content: space-between; align-items: center;
                background: linear-gradient(90deg, rgba(0, 0, 0, 0.8), rgba(0, 40, 50, 0.8));
                padding: 15px 16px; cursor: move;
                border-top-left-radius: 12px; border-top-right-radius: 12px;
                border-bottom: 1px solid rgba(0, 242, 254, 0.3);
            }
            .gd-title { font-weight: 800; font-size: 15px; color: #fff; letter-spacing: 0.5px; text-transform: uppercase; text-shadow: 0 0 8px rgba(0, 242, 254, 0.6); }
            .gd-fps { font-family: monospace; color: #00f2fe; font-size: 12px; font-weight: bold; background: rgba(0,242,254,0.1); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(0,242,254,0.2);}
            .gd-body {
                padding: 20px 16px; display: flex; flex-direction: column; gap: 18px;
                overflow-y: auto;
            }
            .gd-body::-webkit-scrollbar { width: 6px; }
            .gd-body::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 10px; }
            .gd-body::-webkit-scrollbar-thumb { background: rgba(0,242,254,0.4); border-radius: 10px; }
            .mod-row { display: flex; justify-content: space-between; align-items: center; }
            .mod-label { font-size: 13px; font-weight: 600; display: flex; flex-direction: column; }
            .mod-subtext { font-size: 10px; color: #999; margin-top: 2px; font-weight: 400; }
            .mod-key { display: inline-block; background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2); font-family: monospace; font-size: 9px; margin-left: 4px; color: #00f2fe;}
            
            /* Toggles */
            .switch { position: relative; display: inline-block; width: 40px; height: 20px; flex-shrink: 0; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255, 255, 255, 0.1); transition: .3s; border-radius: 20px; }
            .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: #aaa; transition: .3s; border-radius: 50%; }
            input:checked + .slider { background-color: rgba(0, 242, 254, 0.2); border: 1px solid #00f2fe; }
            input:checked + .slider:before { transform: translateX(20px); background-color: #00f2fe; box-shadow: 0 0 8px #00f2fe; }
            
            /* Sliders */
            .range-container { display: flex; flex-direction: column; gap: 8px; }
            .range-header { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; }
            .range-val { color: #00f2fe; font-weight: 700; }
            .gd-range { -webkit-appearance: none; width: 100%; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; outline: none; }
            .gd-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #00f2fe; cursor: pointer; transition: transform 0.1s; box-shadow: 0 0 5px rgba(0,242,254,0.5); }
            .gd-range::-webkit-slider-thumb:hover { transform: scale(1.2); }
            
            .gd-footer { background: rgba(0, 0, 0, 0.7); padding: 10px; font-size: 11px; color: rgba(255, 255, 255, 0.5); text-align: center; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
            .section-title { font-size: 11px; text-transform: uppercase; color: #00f2fe; font-weight: 800; margin-bottom: -5px; margin-top: 5px; letter-spacing: 1.5px; border-bottom: 1px solid rgba(0,242,254,0.2); padding-bottom: 4px; }
            
            /* Aim Guide Line */
            #aim-guide-line {
                position: absolute; top: 50%; left: 0; width: 100%; height: 2px;
                background: #00f2fe; box-shadow: 0 0 10px #00f2fe, 0 0 20px #00f2fe;
                pointer-events: none; z-index: 9999; display: none; opacity: 0.6;
            }
        `;
        document.head.appendChild(style);

        // --- DOM Elements ---
        var menu = document.createElement('div');
        menu.id = 'gd-standalone-menu';
        menu.innerHTML = `
            <div class="gd-header" id="gd-handle">
                <span class="gd-title">GD MOD MENU</span>
                <span class="gd-fps" id="fps-counter">60 FPS</span>
            </div>
            <div class="gd-body">
                
                <div class="section-title">Engine Core</div>
                
                <div class="range-container">
                    <div class="range-header">
                        <span>Base Speed</span>
                        <span id="speed-txt" class="range-val">1.00x</span>
                    </div>
                    <input type="range" min="0.1" max="3.0" step="0.05" value="1.0" class="gd-range" id="sl-speed">
                </div>

                <div class="range-container">
                    <div class="range-header">
                        <span>Focus Speed <span class="mod-key">Hold SHIFT</span></span>
                        <span id="focus-txt" class="range-val">0.50x</span>
                    </div>
                    <input type="range" min="0.1" max="1.0" step="0.05" value="0.5" class="gd-range" id="sl-focus">
                </div>

                <div class="section-title">Visuals & Camera</div>

                <div class="range-container">
                    <div class="range-header">
                        <span>Smooth Zoom (FOV)</span>
                        <span id="zoom-txt" class="range-val">1.00x</span>
                    </div>
                    <input type="range" min="0.3" max="2.0" step="0.05" value="1.0" class="gd-range" id="sl-zoom">
                </div>
                
                <div class="mod-row">
                    <div class="mod-label">
                        Invert Gravity View
                        <span class="mod-subtext">Flips canvas vertically</span>
                    </div>
                    <label class="switch"><input type="checkbox" id="toggle-invert"><span class="slider"></span></label>
                </div>

                <div class="mod-row">
                    <div class="mod-label">
                        Mirror Mode
                        <span class="mod-subtext">Flips canvas horizontally</span>
                    </div>
                    <label class="switch"><input type="checkbox" id="toggle-mirror"><span class="slider"></span></label>
                </div>

                <div class="section-title">Wave Tools</div>
                
                <div class="mod-row">
                    <div class="mod-label">
                        Wave Stabilizer (30 CPS)
                        <span class="mod-subtext">Drifts slightly upward</span>
                    </div>
                    <label class="switch"><input type="checkbox" id="toggle-wavebot"><span class="slider"></span></label>
                </div>

                <div class="mod-row">
                    <div class="mod-label">
                        Aim Guide
                        <span class="mod-subtext">Displays center crosshair line</span>
                    </div>
                    <label class="switch"><input type="checkbox" id="toggle-aim"><span class="slider"></span></label>
                </div>

                <div class="mod-row">
                    <div class="mod-label">
                        Anti-Distraction
                        <span class="mod-subtext">Dims flashing backgrounds</span>
                    </div>
                    <label class="switch"><input type="checkbox" id="toggle-dim"><span class="slider"></span></label>
                </div>

            </div>
            <div class="gd-footer">Press [M] to Hide UI | Hold [C] to Auto-Spam Wave</div>
        `;
        
        document.body.appendChild(menu);

    }

    // =========================================================
    // 3. LOGIC & FUNCTIONALITY
    // =========================================================
    
    var canvasTarget = null;
    var unityContainer = null;
    
    function initLogic() {
        canvasTarget = document.querySelector("#unity-canvas"); 
        unityContainer = document.querySelector("#unity-container");

        // Inject Aim Line into the Unity Container so it scales perfectly with the game
        if (unityContainer && !document.getElementById('aim-guide-line')) {
            var aimLine = document.createElement('div');
            aimLine.id = 'aim-guide-line';
            unityContainer.appendChild(aimLine);
            // Ensure container is relative for absolute positioning of line
            if(window.getComputedStyle(unityContainer).position === 'static') {
                unityContainer.style.position = 'relative';
            }
        }
        
        // --- FPS Counter ---
        var lastTime = performance.now();
        var frames = 0;
        function updateFPS() {
            frames++;
            var now = performance.now();
            if (now >= lastTime + 1000) {
                var fps = Math.round((frames * 1000) / (now - lastTime));
                var fpsEl = document.getElementById('fps-counter');
                if(fpsEl) fpsEl.innerText = fps + ' FPS';
                frames = 0;
                lastTime = now;
            }
            requestAnimationFrame(updateFPS);
        }
        requestAnimationFrame(updateFPS);

        // --- Speed Controls & Focus Mode ---
        var shiftHeld = false;
        
        document.getElementById('sl-speed').addEventListener('input', function(e) {
            baseSpeed = parseFloat(e.target.value);
            document.getElementById('speed-txt').innerText = baseSpeed.toFixed(2) + 'x';
            if (!shiftHeld) speedMultiplier = baseSpeed; 
        });

        document.getElementById('sl-focus').addEventListener('input', function(e) {
            focusSpeed = parseFloat(e.target.value);
            document.getElementById('focus-txt').innerText = focusSpeed.toFixed(2) + 'x';
            if (shiftHeld) speedMultiplier = focusSpeed;
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Shift' && !shiftHeld) {
                shiftHeld = true;
                speedMultiplier = focusSpeed;
            }
        });

        document.addEventListener('keyup', function(e) {
            if (e.key === 'Shift') {
                shiftHeld = false;
                speedMultiplier = baseSpeed;
            }
        });

        // --- Visual Transforms (Smooth Zoom, Invert, Mirror, Dim) ---
        var currentZoom = 1.0;
        var isInverted = false;
        var isMirrored = false;
        
        function applyCanvasTransforms() {
            if (!canvasTarget) canvasTarget = document.querySelector("#unity-canvas");
            if (!canvasTarget) return;
            
            canvasTarget.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), filter 0.3s ease';
            
            var scaleY = isInverted ? (currentZoom * -1) : currentZoom;
            var scaleX = isMirrored ? (currentZoom * -1) : currentZoom;
            
            canvasTarget.style.transform = 'scale(' + scaleX + ', ' + scaleY + ')';
            canvasTarget.style.transformOrigin = "center center";
        }

        document.getElementById('sl-zoom').addEventListener('input', function(e) {
            currentZoom = parseFloat(e.target.value);
            document.getElementById('zoom-txt').innerText = currentZoom.toFixed(2) + 'x';
            applyCanvasTransforms();
        });

        document.getElementById('toggle-invert').addEventListener('change', function(e) {
            isInverted = e.target.checked;
            applyCanvasTransforms();
        });

        document.getElementById('toggle-mirror').addEventListener('change', function(e) {
            isMirrored = e.target.checked;
            applyCanvasTransforms();
        });

        // --- Anti-Distraction (Dim Filter) ---
        document.getElementById('toggle-dim').addEventListener('change', function(e) {
            if (!canvasTarget) return;
            if (e.target.checked) {
                // Lowers brightness to darken the background, reduces saturation to cut flashing
                canvasTarget.style.filter = 'brightness(0.6) saturate(0.6)';
            } else {
                canvasTarget.style.filter = 'none';
            }
        });

        // --- Aim Guide Toggle ---
        document.getElementById('toggle-aim').addEventListener('change', function(e) {
            var line = document.getElementById('aim-guide-line');
            if (line) line.style.display = e.target.checked ? 'block' : 'none';
        });

        // --- Keyboard Simulation Helper ---
        function simulateClick(duration) {
            if (!canvasTarget) canvasTarget = document.querySelector("#unity-canvas");
            if (!canvasTarget) return;
            var keyDown = new KeyboardEvent('keydown', { bubbles: true, keyCode: 32, code: 'Space', key: ' ' });
            canvasTarget.dispatchEvent(keyDown);
            setTimeout(function() {
                var keyUp = new KeyboardEvent('keyup', { bubbles: true, keyCode: 32, code: 'Space', key: ' ' });
                canvasTarget.dispatchEvent(keyUp);
            }, duration);
        }

        // --- Wave Stabilizer Bot (30 CPS - Upward Drift) ---
        // 30 CPS = 33.3ms per interval
        // Hold for 19ms, release for 14ms (Total 33ms)
        // Holding slightly longer than releasing causes a slow, steady upward drift
        var waveBotActive = false;
        var spamKeyHeld = false;

        document.getElementById('toggle-wavebot').addEventListener('change', function(e) { 
            waveBotActive = e.target.checked; 
        });

        // Add 'C' keybind for dynamic holding
        document.addEventListener('keydown', function(e) {
            if (e.key.toLowerCase() === 'c' && !spamKeyHeld) {
                spamKeyHeld = true;
            }
        });
        document.addEventListener('keyup', function(e) {
            if (e.key.toLowerCase() === 'c') {
                spamKeyHeld = false;
            }
        });
        
        setInterval(function() { 
            if (waveBotActive || spamKeyHeld) {
                simulateClick(19); 
            }
        }, 33);

        // =========================================================
        // 4. WINDOW CONTROLS (Drag & Hide)
        // =========================================================
        var handle = document.getElementById('gd-handle');
        var menu = document.getElementById('gd-standalone-menu');
        var dragging = false, x = 0, y = 0;

        handle.addEventListener('mousedown', function(e) {
            dragging = true;
            x = e.clientX - menu.getBoundingClientRect().left;
            y = e.clientY - menu.getBoundingClientRect().top;
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            menu.style.left = (e.clientX - x) + 'px';
            menu.style.top = (e.clientY - y) + 'px';
        });
        
        document.addEventListener('mouseup', function() { dragging = false; });

        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key.toLowerCase() === 'm') {
                if (menu.style.opacity === '0') {
                    menu.style.opacity = '1';
                    menu.style.pointerEvents = 'auto';
                } else {
                    menu.style.opacity = '0';
                    menu.style.pointerEvents = 'none';
                }
            }
        });
    }

    // =========================================================
    // 5. SAFE INITIALIZATION TRIGGER
    // =========================================================
    function init() {
        buildModMenu();
        setTimeout(initLogic, 500); // Give DOM a moment to parse the injected HTML
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }
})();
