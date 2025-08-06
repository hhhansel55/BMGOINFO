// effect.js (完整替換版)

const EffectsController = {
    elements: {},
    contexts: {},
    lastContainerRects: { player: null, enemy: null },
    init() {
        this.elements.effectsCanvas = document.getElementById('effects-canvas');
        this.elements.webglCanvas = document.getElementById('webgl-particle-canvas');
        this.elements.effectsCtx = this.elements.effectsCanvas.getContext('2d');
        
        ['player', 'enemy'].forEach(panelType => {
            this.contexts[panelType] = {
                masterFxContainer: document.getElementById(`${panelType}-master-fx-container`),
                imageContainer: document.getElementById(`${panelType}-image-container`),
                image: document.getElementById(`${panelType}-image`)
            };
        });

        this.WebGLParticles.init(); 
        this.DomFx.init(); 
        this.IceSpike.init(); 
        this.Petrification.init(); 
        this.Vortex.init(); 
        this.Trajectory.init();
        
        this.masterAnimationLoop();
        window.addEventListener('resize', this.onResize.bind(this)); 
        this.onResize();
    },

    masterAnimationLoop() {
        const ctx = this.elements.effectsCtx;
        const canvas = this.elements.effectsCanvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 在每一幀開始時，計算位移
        ['player', 'enemy'].forEach(panelType => {
            const newRect = this.contexts[panelType].imageContainer.getBoundingClientRect();
            const oldRect = this.lastContainerRects[panelType];
            
            let deltaX = 0;
            let deltaY = 0;

            if (oldRect) {
                deltaX = newRect.left - oldRect.left;
                deltaY = newRect.top - oldRect.top;
            }

            // 更新粒子位置
            if (this.IceSpike.isActive[panelType]) {
                this.IceSpike.updateAndDraw(ctx, panelType, deltaX, deltaY);
            }
            if (this.Vortex.isActive[panelType]) {
                this.Vortex.updateAndDraw(ctx, panelType, deltaX, deltaY);
            }
            
            // 儲存當前位置供下一幀比較
            this.lastContainerRects[panelType] = newRect;
        });

        if (this.Trajectory.isActive) { this.Trajectory.updateAndDraw(ctx); }

        requestAnimationFrame(this.masterAnimationLoop.bind(this));
    },
    onResize() {
        const canvas = this.elements.effectsCanvas; 
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight;
        this.Vortex.handleResize(); 
        this.Trajectory.handleResize();
    },
    triggerEffect(panelType, effectName, isActive) {
        switch(effectName) {
            case 'Apollo_Title_Burn':
                this.WebGLParticles.toggle('fire', panelType, isActive);
                break;
            case 'Medusa_Poison':
                this.WebGLParticles.toggle('footprints', panelType, isActive);
                break;
            case 'Hephaestus_energy':
                 this.DomFx.toggle(panelType, 'hephaestusShield', isActive);
                 break;
            // 我們為真正的火球 buff 'Hephaestus_Fireballs' 添加新的觸發
            case 'Hephaestus_Fireballs':
                 this.WebGLParticles.toggleFireballs(panelType, isActive);
                 break;
            // END: 修改/添加這個 case
            case 'Ares_Shield':
                this.DomFx.toggle(panelType, 'aresShield', isActive);
                break;
            case 'Jormungandr_Shield':
                this.DomFx.toggle(panelType, 'jormungandrShield', isActive);
                break;
            case 'Belphegor_Shield_Timer':
                this.DomFx.toggle(panelType, 'slothShield', isActive);
                break;
            case 'Fenrir_Rage':
                if(isActive) this.DomFx.trigger(panelType, 'fenrirDomain');
                this.DomFx.toggle(panelType, 'shadow', isActive);
                break;
            case 'Valkyrie_Divine_Form':
                 if(isActive) this.DomFx.trigger(panelType, 'goldenAura');
                 break;
            case 'Lucifer_CC_Immunity':
                 if(isActive) this.DomFx.trigger(panelType, 'prideAura');
                 break;
            case 'Samael_Full_Rage':
                 if(isActive) this.Trajectory.trigger(panelType);
                 break;
            case 'Mjollnir_Release':
                 if(isActive) this.DomFx.trigger(panelType, 'mjolnir');
                 break;
            case 'Chione_Frost_Domain':
                this.DomFx.toggle(panelType, 'frostDomain', isActive);
                break;
            case 'Apollo_Sun_Aura':
                this.DomFx.toggle(panelType, 'apollo', isActive);
                break;
            case 'Medusa_Gaze':
                 this.DomFx.toggle(panelType, 'medusaEye', isActive);
                 break;
            case 'Flame_Vortex':
                 this.Vortex.toggle(panelType, isActive);
                 break;
            case 'Freeze':
                 this.IceSpike.toggle(panelType, isActive);
                 break;
            case 'Petrify':
                 this.Petrification.toggle(panelType, isActive);
                 break;
        }
    },
    WebGLParticles: {
        gl: null, program: null, attributes: {}, buffers: {},
        particles: { fire: [], footprints: [] },
        isEffectActive: { fire: { player: false, enemy: false }, footprints: { player: false, enemy: false } },
        emissionRates: { fire: 80, footprints: 3 }, 
        bodyEmissionPoints: { player: [], enemy: [] },
        footEmissionPoints: { player: [], enemy: [] },
        // --- 火球特效狀態 ---
        isFireballActive: { player: false, enemy: false },
        orbitingFireballs: { player: [], enemy: [] },
        fireballEmissionRate: 4, // 每幀每個火球發射的粒子數量
        // END: 添加此區塊
        init() {
            const canvas = EffectsController.elements.webglCanvas; this.gl = canvas.getContext('webgl', { premultipliedAlpha: false });
            if (!this.gl) { console.error('WebGL not supported'); return; }
            canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
            const vs = this.createShader(this.gl.VERTEX_SHADER, document.getElementById("vertex-shader").text); const fs = this.createShader(this.gl.FRAGMENT_SHADER, document.getElementById("fragment-shader").text);
            this.program = this.createProgram(vs, fs); this.gl.useProgram(this.program);
            ['a_position', 'a_size', 'a_alpha', 'a_type'].forEach(attr => { this.attributes[attr] = this.gl.getAttribLocation(this.program, attr); this.buffers[attr] = this.gl.createBuffer(); });
            ['player', 'enemy'].forEach(panelType => {
                const image = EffectsController.contexts[panelType].image;
                if (image.complete && image.naturalHeight !== 0) { this.analyzeImageAndGetEmissionPoints(panelType, image); } 
                else { image.onload = () => this.analyzeImageAndGetEmissionPoints(panelType, image); }
            });
            this.animate();
        },


        toggleFireballs(panelType, isActive) {
            this.isFireballActive[panelType] = isActive;

            // 如果啟動特效，且當前沒有火球實例，則創建它們
            if (isActive && this.orbitingFireballs[panelType].length === 0) {
                this.orbitingFireballs[panelType] = []; // 清空以防萬一
                for (let i = 0; i < 3; i++) {
                    this.orbitingFireballs[panelType].push({
                        angle: (Math.PI * 2 / 3) * i,
                        baseRadius: 90, // 環繞半徑 (像素)
                        radiusWobble: 15, // 半徑擺動幅度
                        elevation: -60, // Y軸偏移
                        elevationWobble: 20, // Y軸擺動幅度
                        speed: 0.02 + Math.random() * 0.01, // 旋轉速度
                        wobbleSpeed1: Math.random() * 0.05,
                        wobbleSpeed2: Math.random() * 0.05
                    });
                }
            } 
            // 如果關閉特效，則清空火球實例
            else if (!isActive) {
                this.orbitingFireballs[panelType] = [];
            }
        },

        updateAndEmitFireballs(panelType) {
            // 獲取正確玩家容器的邊界
            const containerRect = EffectsController.contexts[panelType].imageContainer.getBoundingClientRect();
            if (!containerRect) return;
            
            const time = Date.now() * 0.001;

            this.orbitingFireballs[panelType].forEach(fb => {
                fb.angle += fb.speed;

                // 計算動態位置
                const currentRadius = fb.baseRadius + Math.sin(time * 2 + fb.wobbleSpeed1) * fb.radiusWobble;
                const currentElevation = fb.elevation + Math.cos(time * 2 + fb.wobbleSpeed2) * fb.elevationWobble;
                
                // 玩家容器的中心點
                const centerX = containerRect.left + containerRect.width / 2;
                const centerY = containerRect.top + containerRect.height / 2;

                // 火球在螢幕上的像素位置
                const pixelX = centerX + Math.cos(fb.angle) * currentRadius;
                const pixelY = centerY + Math.sin(fb.angle) * currentRadius * 0.4 + currentElevation; // 0.4 用於模擬透視感

                // 轉換為 WebGL 裁剪空間座標
                const clipX = (pixelX / this.gl.canvas.width) * 2 - 1;
                const clipY = -(pixelY / this.gl.canvas.height) * 2 + 1;

                // 在此位置發射粒子
                for (let i = 0; i < this.fireballEmissionRate; i++) {
                    // 從你現有的 createParticle 函式創建粒子
                    this.createParticle('fire', { x: clipX, y: clipY, life: Math.random() * 0.5 + 0.2, size: Math.random() * 18 + 8, vx: (Math.random() - 0.5) * 0.005, vy: (Math.random() - 0.5) * 0.005 });
                }
            });
        },
        // END: 添加此區塊


        toggle(effectType, panelType, isActive) { if (this.isEffectActive[effectType]) this.isEffectActive[effectType][panelType] = isActive; },
        createShader(type, source) { const s=this.gl.createShader(type); this.gl.shaderSource(s,source); this.gl.compileShader(s); if(this.gl.getShaderParameter(s,this.gl.COMPILE_STATUS)) return s; console.error(this.gl.getShaderInfoLog(s)); this.gl.deleteShader(s); return null; },
        createProgram(vs, fs) { const p=this.gl.createProgram(); this.gl.attachShader(p,vs); this.gl.attachShader(p,fs); this.gl.linkProgram(p); if(this.gl.getProgramParameter(p,this.gl.LINK_STATUS)) return p; console.error(this.gl.getProgramInfoLog(p)); this.gl.deleteProgram(p); return null; },
        analyzeImageAndGetEmissionPoints(panelType, image) {
            const tempCanvas = document.createElement('canvas');
            const pctx = tempCanvas.getContext('2d');
            
            // 步驟 1: 設定畫布為固定的 300x300，與 CSS 顯示容器尺寸一致
            const canvasSize = 300;
            tempCanvas.width = canvasSize;
            tempCanvas.height = canvasSize;

            // 步驟 2: 計算圖片在 300x300 容器中應有的尺寸，模擬 CSS 的 'height: 300px; width: auto;'
            // 使用 naturalWidth/naturalHeight 來確保我們得到的是圖片原始尺寸
            const aspectRatio = image.naturalWidth / image.naturalHeight;
            const dHeight = canvasSize;
            const dWidth = dHeight * aspectRatio;
            
            // 步驟 3: 計算繪製的起始點，使其在 300px 的畫布中水平置中
            const dx = (canvasSize - dWidth) / 2;
            const dy = 0; // 高度填滿，所以 y 從 0 開始

            // 步驟 4: 將圖片以計算出的正確尺寸和位置繪製到臨時畫布上
            pctx.drawImage(image, dx, dy, dWidth, dHeight);

            // 後續的像素分析邏輯不變，但現在是在正確的 300x300 畫布上進行
            const data = pctx.getImageData(0, 0, canvasSize, canvasSize).data;
            let maxY = 0;
            const bodyPoints = [];
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 128) { // 檢查透明度
                    const x = (i / 4) % canvasSize;
                    const y = Math.floor((i / 4) / canvasSize);
                    bodyPoints.push({ x, y });
                    if (y > maxY) maxY = y;
                }
            }
            this.bodyEmissionPoints[panelType] = bodyPoints;
            this.footEmissionPoints[panelType] = bodyPoints.filter(p => p.y > maxY * 0.9);
        },
        createParticle(type, overrides = {}) { let particle; switch(type) { case 'fire': particle = { life: Math.random() * 0.4 + 0.15, size: Math.random() * 15 + 5, vx: (Math.random() - 0.5) * 0.01, vy: Math.random() * 0.008 + 0.003, typeId: 0.0 }; this.particles.fire.push(particle); break; case 'footprints': particle = { life: Math.random() * 0.8 + 0.5, size: Math.random() * 8 + 4, vx: (Math.random() - 0.5) * 0.004, vy: Math.random() * 0.001 + 0.001, typeId: 5.0 }; this.particles.footprints.push(particle); break; } if(particle) { Object.assign(particle, overrides); particle.maxLife = particle.life; particle.alpha = 1.0; } },
        emitParticles(panelType, rate, type, sourcePoints) {
            if (!sourcePoints || sourcePoints.length === 0) return;
            const containerRect = EffectsController.contexts[panelType].imageContainer.getBoundingClientRect();
            for (let i = 0; i < rate; i++) {
                const point = sourcePoints[Math.floor(Math.random() * sourcePoints.length)];
                const clipX = ((containerRect.left + point.x) / this.gl.canvas.width) * 2 - 1;
                const clipY = -(((containerRect.top + point.y) / this.gl.canvas.height) * 2 - 1);
                this.createParticle(type, { x: clipX, y: clipY });
            }
        },
 
        animate() {
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);

            const deltas = { player: { x: 0, y: 0 }, enemy: { x: 0, y: 0 } };

            // 同樣計算 WebGL 粒子的位移
            ['player', 'enemy'].forEach(panelType => {
                const newRect = EffectsController.contexts[panelType].imageContainer.getBoundingClientRect();
                const oldRect = EffectsController.lastContainerRects[panelType];
                if (oldRect) {
                    deltas[panelType].x = (newRect.left - oldRect.left) / this.gl.canvas.width * 2;
                    deltas[panelType].y = -((newRect.top - oldRect.top) / this.gl.canvas.height * 2);
                }
            });

            ['player', 'enemy'].forEach(panelType => {
                if (this.isEffectActive.fire[panelType]) this.emitParticles(panelType, this.emissionRates.fire, 'fire', this.bodyEmissionPoints[panelType]);
                if (this.isEffectActive.footprints[panelType]) this.emitParticles(panelType, this.emissionRates.footprints, 'footprints', this.footEmissionPoints[panelType]);
                if (this.isFireballActive[panelType]) this.updateAndEmitFireballs(panelType);
            });
            
                const bufferData = { a_position: [], a_size: [], a_alpha: [], a_type: [] };

            // 將位移傳入粒子處理函式
            this.processParticles(this.particles.fire, p => { p.vy *= 1.015; p.vx *= 0.96; }, bufferData, deltas);
            this.processParticles(this.particles.footprints, p => { p.vx *= 0.97; p.vy *= 0.97; }, bufferData, deltas);

            if (bufferData.a_position.length > 0) {
                for (const key in this.attributes) {
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers[key]);
                    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(bufferData[key]), this.gl.DYNAMIC_DRAW);
                    this.gl.vertexAttribPointer(this.attributes[key], key === 'a_position' ? 2 : 1, this.gl.FLOAT, false, 0, 0);
                    this.gl.enableVertexAttribArray(this.attributes[key]);
                }
                this.gl.enable(this.gl.BLEND);
                this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
                this.gl.drawArrays(this.gl.POINTS, 0, bufferData.a_position.length / 2);
            }
            requestAnimationFrame(this.animate.bind(this));
        },
        processParticles(particleArray, updateLogic, bufferData, deltas) {
            for (let i = particleArray.length - 1; i >= 0; i--) {
                const p = particleArray[i];
                p.life -= 0.01;
                if (p.life <= 0) {
                    particleArray.splice(i, 1);
                    continue;
                }

                // 應用位移 (deltas 包含 player 和 enemy 的位移，但粒子無所屬，統一應用 player 的即可，因為滾動是全域的)
                if (deltas.player) {
                    p.x += deltas.player.x;
                    p.y += deltas.player.y;
                }

                p.x += p.vx;
                p.y += p.vy;
                updateLogic(p);
                p.alpha = p.life / p.maxLife;
                bufferData.a_position.push(p.x, p.y);
                bufferData.a_size.push(p.size);
                bufferData.a_alpha.push(p.alpha);
                bufferData.a_type.push(p.typeId);
            }
        },
    },
    DomFx: {
        activeEffects: { player: new Map(), enemy: new Map() },
        init() {},
        getFxConfig(name) {
            const configs = {
                frostDomain: { class: 'effect-frost-domain', isToggle: true },
                apollo: { class: ['effect-apollo-sun', 'effect-apollo-domain'], isToggle: true },
                aresShield: { class: 'shield-base shield-ares', isToggle: true },
                jormungandrShield: { class: 'shield-base shield-jormungandr', isToggle: true },
                slothShield: { class: 'shield-base shield-sloth', isToggle: true },
                hephaestusShield: { class: 'shield-base shield-hephaestus', isToggle: true },
                shadow: { class: 'effect-shadow-container looping-effect', isLoop: true, html: '<img src="player.png" class="shadow-img">' },
                goldenAura: { class: ['effect-golden-aura', 'effect-golden-aura-ring'], duration: 800 },
                prideAura: { class: ['effect-pride-aura', 'effect-pride-aura-ring'], duration: 800 },
                mjolnir: { class: 'effect-mjolnir', duration: 400, onStart: () => document.getElementById('flash-overlay').classList.add('active'), onEnd: () => document.getElementById('flash-overlay').classList.remove('active') },
                fenrirDomain: { class: 'effect-fenrir-domain', duration: 2000 },
                medusaEye: { class: 'effect-medusa-eye', isToggle: true, html: '<div class="pupil"></div><div class="shimmer"></div>' },
            };
            return configs[name];
        },
        toggle(panelType, name, isActive) {
            const config = this.getFxConfig(name); if (!config) return;
            if (isActive) {
                if (this.activeEffects[panelType].has(name)) return;
                const elements = this.createElements(panelType, config.class, config.html);
                this.activeEffects[panelType].set(name, elements);
                requestAnimationFrame(() => { elements.forEach(el => el.classList.add(config.isToggle ? 'intro' : 'active')); });
                if (config.onStart) config.onStart(elements);
            } else {
                const elements = this.activeEffects[panelType].get(name);
                if (!elements) return;
                if (config.isToggle) {
                    elements.forEach(el => {
                        el.classList.remove('intro');
                        el.classList.add('outro');
                        el.addEventListener('animationend', () => el.remove(), { once: true });
                    });
                } else {
                    elements.forEach(el => el.remove());
                }
                this.activeEffects[panelType].delete(name);
                if (config.onEnd) config.onEnd();
            }
        },
        trigger(panelType, name) {
            const config = this.getFxConfig(name); if (!config) return;
            if (this.activeEffects[panelType].has(name) && name !== 'fenrirDomain') return;
            const elements = this.createElements(panelType, config.class, config.html);
            if (name !== 'fenrirDomain') this.activeEffects[panelType].set(name, elements);
            if (config.onStart) config.onStart(elements);
            requestAnimationFrame(() => { elements.forEach(el => el.classList.add('active')); });
            setTimeout(() => {
                if (config.onEnd) config.onEnd();
                elements.forEach(el => el.remove());
                if (name !== 'fenrirDomain') this.activeEffects[panelType].delete(name);
            }, config.duration);
        },
        createElements(panelType, classNames, htmlContent = '') {
            const container = EffectsController.contexts[panelType].masterFxContainer;
            const classes = Array.isArray(classNames) ? classNames : [classNames];
            return classes.map(cls => {
                const el = document.createElement('div');
                el.className = `animated-effect ${cls}`;
                if (htmlContent) el.innerHTML = htmlContent;
                container.appendChild(el);
                return el;
            });
        },
    },
    IceSpike: { isActive: { player: false, enemy: false }, domElement: { player: null, enemy: null }, burstParticles: [], lingeringParticles: [], PARTICLE_COUNT: { BURST: 350, LINGERING: 25 }, init() {}, toggle(panelType, isActive) { this.isActive[panelType] = isActive; if (isActive) { this.domElement[panelType] = document.createElement('div'); this.domElement[panelType].className = 'ice-spike-container'; this.domElement[panelType].innerHTML = `<div class="ice-spike-effect"><div class="ground-frost"></div><div class="light-beam"></div><div class="ice-spike"><div class="spike-outer-glow"></div><div class="spike-core"></div><div class="spike-left-face"></div><div class="spike-right-face"></div><div class="spike-cracks"></div><div class="spike-highlights"></div></div></div>`; EffectsController.contexts[panelType].masterFxContainer.appendChild(this.domElement[panelType]); requestAnimationFrame(() => this.domElement[panelType].classList.add('active')); const effectRect = this.domElement[panelType].getBoundingClientRect(); const originX = effectRect.left + effectRect.width / 2; const originY = effectRect.top + effectRect.height; this.createBurstParticles(originX, originY); this.createLingeringParticles(effectRect); } else { if (this.domElement[panelType]) { this.domElement[panelType].classList.remove('active'); this.domElement[panelType].addEventListener('transitionend', () => this.domElement[panelType].remove(), { once: true }); } this.domElement[panelType] = null; } }, updateAndDraw(ctx) { this.burstParticles = this.burstParticles.filter(p => { p.update(); p.draw(ctx); return p.life > 0; }); this.lingeringParticles = this.lingeringParticles.filter(p => { p.update(); p.draw(ctx); return p.life > 0; }); }, createBurstParticles(x, y) { this.burstParticles = []; for (let i = 0; i < this.PARTICLE_COUNT.BURST; i++) { this.burstParticles.push(new this.BurstParticle(x, y)); } }, createLingeringParticles(rect) { this.lingeringParticles = []; for (let i = 0; i < this.PARTICLE_COUNT.LINGERING; i++) { this.lingeringParticles.push(new this.LingeringParticle(rect)); } }, BurstParticle: class { constructor(x, y) { this.x = x; this.y = y; const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 4 + 4; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed * 0.7 - 5; this.gravity = 0.2; this.friction = 0.98; this.life = this.maxLife = Math.random() * 80 + 40; this.size = Math.random() * 2 + 1; this.opacity = 1; this.hue = Math.random() * 30 + 190; } update() { this.life--; this.vy += this.gravity; this.vx *= this.friction; this.vy *= this.friction; this.x += this.vx; this.y += this.vy; this.opacity = this.life / this.maxLife; } draw(ctx) { ctx.beginPath(); ctx.fillStyle = `hsla(${this.hue}, 100%, 90%, ${this.opacity > 0 ? this.opacity : 0})`; ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); } }, LingeringParticle: class { constructor(rect) { this.x = rect.left + Math.random() * rect.width; this.y = rect.top + Math.random() * rect.height; this.wander = 0.2; this.angle = Math.random() * Math.PI * 2; this.vx = (Math.random() - 0.5) * 0.2; this.vy = -0.2 - Math.random() * 0.2; this.life = this.maxLife = Math.random() * 250 + 200; this.size = Math.random() * 2 + 1; this.opacity = 0; } update() { this.life--; this.angle += (Math.random() - 0.5) * 0.1; this.x += this.vx + Math.sin(this.angle) * this.wander; this.y += this.vy; this.opacity = Math.sin(Math.PI * (1 - (this.life / this.maxLife))); } draw(ctx) { ctx.beginPath(); ctx.fillStyle = `hsla(200, 100%, 95%, ${this.opacity > 0 ? this.opacity * 0.7 : 0})`; ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); } } },
    Petrification: { isActive: { player: false, enemy: false }, domElement: { player: null, enemy: null }, init() {}, toggle(panelType, isActive) { this.isActive[panelType] = isActive; if (isActive) { this.domElement[panelType] = document.createElement('div'); this.domElement[panelType].className = 'petrification-container'; this.domElement[panelType].innerHTML = `<div class="petrification-effect"><div class="stone-spike"><div class="spike-core-stone"></div><div class="spike-left-face-stone"></div><div class="spike-right-face-stone"></div><div class="spike-cracks-stone"></div></div></div>`; EffectsController.contexts[panelType].masterFxContainer.appendChild(this.domElement[panelType]); requestAnimationFrame(() => this.domElement[panelType].classList.add('active')); } else { if (this.domElement[panelType]) { this.domElement[panelType].classList.remove('active'); this.domElement[panelType].addEventListener('transitionend', () => this.domElement[panelType].remove(), { once: true }); } this.domElement[panelType] = null; } } },
    Trajectory: { isActive: false, trajectories: [], COUNT_BURST: 5, width: 0, height: 0, init() {}, handleResize() { this.width = window.innerWidth; this.height = window.innerHeight; }, trigger(panelType) { this.isActive = true; const playerRect = EffectsController.contexts[panelType].imageContainer.getBoundingClientRect(); const cX = playerRect.left + playerRect.width / 2; const cY = playerRect.top + playerRect.height / 2; const mR = playerRect.width * 0.5; for (let i = 0; i < this.COUNT_BURST; i++) { this.trajectories.push(new this.TrajectoryExplosion(cX, cY, mR)); } }, updateAndDraw(ctx) { ctx.globalCompositeOperation = 'lighter'; this.trajectories = this.trajectories.filter(t => { t.update(); t.draw(ctx, this.width * 0.8); return t.life > 0; }); ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; if (this.trajectories.length === 0) this.isActive = false; }, Vector3: class { constructor(x,y,z) { this.x=x; this.y=y; this.z=z; } }, rotatePointAroundAxis(p, a, angle) { const c=Math.cos(angle),s=Math.sin(angle),C=1-c,{x,y,z}=p,{x:u,y:v,z:w}=a; const nX=(c+u*u*C)*x+(u*v*C-w*s)*y+(u*w*C+v*s)*z; const nY=(v*u*C+w*s)*x+(c+v*v*C)*y+(v*w*C-u*s)*z; const nZ=(w*u*C-v*s)*x+(w*v*C+u*s)*y+(c+w*w*C)*z; return new this.Vector3(nX,nY,nZ); }, TrajectoryExplosion: class { constructor(cX, cY, mR) { this.life = this.maxLife = 40; this.opacity = 0; this.currentRadius = 0; this.centerX = cX; this.centerY = cY; this.maxRadius = mR; this.axis = new EffectsController.Trajectory.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5); const l = Math.sqrt(this.axis.x**2+this.axis.y**2+this.axis.z**2); if (l > 0) { this.axis.x/=l; this.axis.y/=l; this.axis.z/=l; } this.rotation = Math.random() * Math.PI * 2; } update() { this.life--; const p=1-(this.life/this.maxLife); this.currentRadius=this.maxRadius*(1-(1-p)**3); this.opacity=1-p**2; } draw(ctx, p) { ctx.beginPath(); const pts=80; for (let i = 0; i <= pts; i++) { const a=(i/pts)*Math.PI*2; const bP=new EffectsController.Trajectory.Vector3(Math.cos(a)*this.currentRadius,Math.sin(a)*this.currentRadius,0); const rP=EffectsController.Trajectory.rotatePointAroundAxis(bP,this.axis,this.rotation); const s=p/(p+rP.z); const sX=this.centerX+rP.x*s; const sY=this.centerY+rP.y*s; if(i===0)ctx.moveTo(sX,sY); else ctx.lineTo(sX,sY); } ctx.strokeStyle=`hsla(0, 100%, 55%, ${this.opacity})`; ctx.lineWidth=3; ctx.shadowColor=`hsl(0,100%,55%)`; ctx.shadowBlur=30; ctx.stroke(); } } },
    Vortex: { isActive: { player: false, enemy: false }, particles: { player: [], enemy: [] }, layers: { player: [], enemy: [] }, frame: 0, PARTICLE_COUNT: 150, LAYER_COUNT: 7, init() {}, toggle(panelType, isActive) { this.isActive[panelType] = isActive; if (isActive) this.createVortex(panelType); }, handleResize() { ['player', 'enemy'].forEach(p => { if (this.isActive[p]) this.createVortex(p); }); }, createVortex(panelType) { this.particles[panelType] = []; this.layers[panelType] = []; for (let i = 0; i < this.PARTICLE_COUNT; i++) this.particles[panelType].push(new this.Particle(this, panelType)); for (let i = 0; i < this.LAYER_COUNT; i++) this.layers[panelType].push(new this.Layer(this, panelType)); }, updateAndDraw(ctx, panelType) { ctx.globalCompositeOperation='lighter'; this.frame++; const rect = EffectsController.contexts[panelType].imageContainer.getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height * 0.9; const baseRadius = rect.width * 0.4; const glowPulse = (Math.sin(this.frame * 0.03) + 1) / 2; const gradientSize = baseRadius * 2.5 + glowPulse * 30; const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, gradientSize); gradient.addColorStop(0,'hsla(25,100%,50%,0.3)'); gradient.addColorStop(0.8,'hsla(10,100%,40%,0.05)'); gradient.addColorStop(1,'hsla(0,100%,30%,0)'); ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(centerX, centerY, gradientSize, 0, Math.PI * 2); ctx.fill(); this.layers[panelType].forEach(l => { l.update(centerX, centerY, baseRadius); l.draw(ctx); }); ctx.shadowBlur = 0; this.particles[panelType].forEach(p => { p.update(centerX, centerY, baseRadius); p.draw(ctx); }); ctx.globalCompositeOperation='source-over'; }, random: (min, max) => Math.random()*(max-min)+min, Particle: class { constructor(v, p){ this.vortex = v; this.panelType = p; this.reset(); } reset(){ const rect = EffectsController.contexts[this.panelType].imageContainer.getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height * 0.9; const baseRadius = rect.width * 0.4; const angle = EffectsController.Vortex.random(0,Math.PI*2); const radius = baseRadius + EffectsController.Vortex.random(-20,20); this.x = centerX + Math.cos(angle) * radius; this.y = centerY + Math.sin(angle) * radius * 0.3; this.vx = (this.x - centerX) * EffectsController.Vortex.random(0.01, 0.03); this.vy = (this.y - centerY) * EffectsController.Vortex.random(0.01, 0.03) - EffectsController.Vortex.random(0.5, 1); this.life = EffectsController.Vortex.random(40, 80); this.maxLife = this.life; this.size = EffectsController.Vortex.random(1, 3); this.hue = EffectsController.Vortex.random(0, 35); } update(centerX, centerY, baseRadius){ this.life--; if(this.life <= 0) this.reset(); this.vx *= 0.98; this.vy *= 0.98; this.vy += 0.02; this.x += this.vx; this.y += this.vy; } draw(ctx){ctx.beginPath();ctx.arc(this.x,this.y,this.size,0,Math.PI*2);ctx.fillStyle=`hsla(${this.hue},100%,60%,${(this.life/this.maxLife)**2})`;ctx.fill();}}, Layer: class { constructor(v, p) { this.vortex = v; this.panelType = p; const rect = EffectsController.contexts[this.panelType].imageContainer.getBoundingClientRect(); const baseRadius = rect.width * 0.4; this.radius = baseRadius + EffectsController.Vortex.random(-15, 15); this.thickness = EffectsController.Vortex.random(1, 4); this.speed = EffectsController.Vortex.random(0.02, 0.05) * (Math.random() > 0.5 ? 1 : -1); this.angle = EffectsController.Vortex.random(0, Math.PI * 2); this.hue = EffectsController.Vortex.random(0, 25); this.arcSegments = []; let currentAngle = 0; while (currentAngle < Math.PI * 2) { const arcLength = EffectsController.Vortex.random(0.5, 2.5); this.arcSegments.push({ start: currentAngle, length: arcLength }); currentAngle += arcLength + EffectsController.Vortex.random(0.5, 2.0); } } update(centerX, centerY, baseRadius) { this.centerX = centerX; this.centerY = centerY; this.angle += this.speed; } draw(ctx){ctx.lineWidth=this.thickness;ctx.strokeStyle=`hsla(${this.hue},90%,55%,0.8)`;ctx.shadowColor=`hsl(${this.hue},100%,50%)`;ctx.shadowBlur=25;this.arcSegments.forEach(seg=>{ctx.beginPath();ctx.ellipse(this.centerX,this.centerY,this.radius,this.radius*0.3,0,this.angle+seg.start,this.angle+seg.start+seg.length);ctx.stroke();});}} },
};