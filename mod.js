(function() {
    // =========================================================
    // 1. ENGINE CLOCK HIJACK (Must run before Unity calculates time)
    // =========================================================
    let speedMultiplier = 1.0;
    
    // Hijack performance.now()
    const originalPerfNow = performance.now.bind(performance);
    let perfLastReal = originalPerfNow();
    let perfFake = perfLastReal;
    
    performance.now = function() {
        let now = originalPerfNow();
        let dt = now - perfLastReal;
        perfLastReal = now;
        perfFake += (dt * speedMultiplier);
        return perfFake;
    };

    // Hijack Date.now() as a fallback
    const originalDateNow = Date.now.bind(Date);
    let dateLastReal = originalDateNow();
    let dateFake = dateLastReal;
    
    Date.now = function() {
        let now = originalDateNow();
        let dt = now - dateLastReal;
        dateLastReal = now;
        dateFake += (dt * speedMultiplier);
        return Math.floor(dateFake);
    };

    // =========================================================
    // 2. UI CONSTRUCTION
    // =========================================================
    window.addEventListener('DOMContentLoaded', () => {
        
        // --- Styles ---
        const style = document.createElement('style');
        style.innerHTML = `
            #gd-standalone-menu {
                position: fixed;
                top: 40px;
                left: 40px;
                width: 280px;
                background: rgba(15, 15, 20, 0.75);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                color: #e0e0e0;
                font-family: 'Inter', 'Segoe UI', sans-serif;
                z-index: 9999999;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                user-select: none;
                transition: opacity 0.2s ease;
            }
            
            .gd-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(0, 0, 0, 0.4);
                padding: 12px 16px;
                cursor: move;
                border-top-left-radius: 12px;
                border-top-right-radius: 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            .gd-title {
                font-weight: 700;
                font-size: 14px;
                color: #fff;
                letter-spacing: 0.5px;
            }
            .gd-beta-badge {
                background: linear-gradient(135deg, #ff007f, #ff5e00);
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                color: #fff;
                box-shadow: 0 2px 8px rgba(255, 0, 127, 0.4);
            }

            .gd-body { 
                padding: 20px 16px; 
                display: flex; 
                flex-direction: column; 
                gap: 18px; 
            }
            
            .mod-row { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
            }
            .mod-label { 
                font-size: 13px; 
                font-weight: 500;
            }
            
            /* Modern Toggle Switch */
            .switch { position: relative; display: inline-block; width: 40px; height: 20px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255, 255, 255, 0.1); transition: .3s; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); }
            .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: #aaa; transition: .3s; border-radius: 50%; }
            input:checked + .slider { background-color: rgba(0, 255, 136, 0.2); border-color: #00ff88; }
            input:checked + .slider:before { transform: translateX(20px); background-color: #00ff88; box-shadow: 0 0 8px #00ff88; }

            /* Modern Range Slider */
            .speed-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .speed-header {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                font-weight: 500;
            }
            .speed-slider { 
                -webkit-appearance: none;
                width: 100%; 
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                outline: none;
            }
            .speed-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #00ddff;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(0, 221, 255, 0.5);
                transition: transform 0.1s;
            }
            .speed-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
            }

            .gd-hint { 
                font-size: 11px; 
                color: rgba(255, 255, 255, 0.4); 
                text-align: center; 
                margin-top: 5px; 
                font-weight: 400;
            }
        `;
        document.head.appendChild(style);

        // --- DOM Elements ---
        const menu = document.createElement('div');
        menu.id = 'gd-standalone-menu';
        menu.innerHTML = `
            <div class="gd-header" id="gd-handle">
                <span class="gd-title">GD MOD MENU</span>
                <span class="gd-beta-badge">Beta</span>
            </div>
            <div class="gd-body">
                <div class="mod-row">
                    <span class="mod-label">Auto-Jump (Bot)</span>
                    <label class="switch">
                        <input type="checkbox" id="toggle-autojump">
                        <span class="slider"></span>
                    </label>
                </div>
                
                <div class="speed-container">
                    <div class="speed-header">
                        <span>Game Speed</span>
                        <span id="speed-txt" style="color: #00ddff; font-weight: 700;">1.00x</span>
                    </div>
                    <input type="range" min="0.1" max="2.0" step="0.05" value="1.0" class="speed-slider" id="sl-speed">
                </div>
                
                <div class="gd-hint">Press [M] to hide/show</div>
            </div>
        `;
        document.body.appendChild(menu);

        // =========================================================
        // 3. LOGIC & FUNCTIONALITY
        // =========================================================
        
        // --- Speedhack Update ---
        const speedInput = document.getElementById('sl-speed');
        const speedText = document.getElementById('speed-txt');
        
        speedInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            speedText.innerText = val.toFixed(2) + 'x';
            speedMultiplier = val; // Updates the global time multiplier dynamically
        });

        // --- Slower Auto-Jump Bot ---
        let autoJumpActive = false;
        document.getElementById('toggle-autojump').addEventListener('change', (e) => {
            autoJumpActive = e.target.checked;
        });

        // Grabs the Unity canvas element based on your HTML file
        const canvasTarget = document.querySelector("#unity-canvas"); 
        
        // Slower interval (150ms instead of 60ms) for more stable execution
        setInterval(() => {
            if (!autoJumpActive || !canvasTarget) return;

            const keyDown = new KeyboardEvent('keydown', { bubbles: true, keyCode: 32, code: 'Space', key: ' ' });
            canvasTarget.dispatchEvent(keyDown);
            
            // Holds the key slightly longer (50ms) before releasing
            setTimeout(() => {
                const keyUp = new KeyboardEvent('keyup', { bubbles: true, keyCode: 32, code: 'Space', key: ' ' });
                canvasTarget.dispatchEvent(keyUp);
            }, 50);
        }, 150); 

        // =========================================================
        // 4. WINDOW CONTROLS (Drag & Hide)
        // =========================================================
        const handle = document.getElementById('gd-handle');
        let dragging = false, x = 0, y = 0;

        handle.addEventListener('mousedown', (e) => {
            dragging = true;
            x = e.clientX - menu.getBoundingClientRect().left;
            y = e.clientY - menu.getBoundingClientRect().top;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            menu.style.left = (e.clientX - x) + 'px';
            menu.style.top = (e.clientY - y) + 'px';
        });
        
        document.addEventListener('mouseup', () => { 
            dragging = false; 
        });

        document.addEventListener('keydown', (e) => {
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
    });
})();