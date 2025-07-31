// ===================================================================================
// --- 1. 資料定義 (DATA SETUP) ---
// (來自 data.js)
// ===================================================================================

// ===================================================================================
// --- 2. 狀態管理 (STATE MANAGEMENT) ---
// ===================================================================================

function getDefaultState() {
    return {
        currentHp: 0, baseStats: {}, finalStats: {}, selections: {}, selectedAttributes: {},
        activeBuffs: [], hitCounters: {}, isInvincible: false, isCCImmune: false,
        shield: { hp: 0, max: 0 }, damageDealtInDuration: {}
    };
}

const selectionState = {
    player: getDefaultState(),
    enemy: getDefaultState()
};

// ===================================================================================
// --- 3. UI 生成 (UI CREATION) ---
// ===================================================================================

function createCustomDropdown(panelType, config) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.style.width = config.key === 'titles' ? '590px' : '380px';
    trigger.innerHTML = `<div class="trigger-content"><span>${config.label}</span></div><span class="trigger-arrow"></span>`;
    
    const options = document.createElement('div');
    options.className = 'custom-options';
    options.style.width = config.key === 'titles' ? '590px' : '380px';
    
    const noneOption = document.createElement('div');
    noneOption.className = 'custom-option';
    noneOption.dataset.value = "";
    noneOption.dataset.img = "";
    noneOption.innerHTML = `<span>${config.label}</span>`;
    options.appendChild(noneOption);
    
    const isTitle = config.key === 'titles';
    data[config.key].forEach(item => {
        const option = document.createElement('div');
        option.className = 'custom-option';
        option.dataset.value = item.name;
        option.dataset.img = item.img || "";
        const imgClass = isTitle ? 'class="title-preview"' : '';
        option.innerHTML = `${item.img ? `<img src="${item.img}" alt="${item.name}" ${imgClass}>` : `<div style="width:32px; height:32px;"></div>`}<span>${item.name}</span>`;
        options.appendChild(option);
    });
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        options.style.display = 'block';
    });
    
    options.addEventListener('click', (e) => {
        const selectedOption = e.target.closest('.custom-option');
        if (!selectedOption) return;

        const value = selectedOption.dataset.value;
        const imgSrc = selectedOption.dataset.img;
        
        const imgClass = isTitle ? 'class="title-preview"' : '';
        trigger.innerHTML = `<div class="trigger-content">${imgSrc ? `<img src="${imgSrc}" alt="${value}" ${imgClass}>` : ''}<span>${value || config.label}</span></div><span class="trigger-arrow"></span>`;
        
        options.style.display = 'none';

        selectionState[panelType].selections[config.key] = value;
        calculateAndDisplayStats(panelType, { equipmentChanged: true });
    });
    
    wrapper.appendChild(trigger);
    wrapper.appendChild(options);
    return wrapper;
}

function createAttributeDropdown(panelType, config) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.style.width = '200px';
    trigger.innerHTML = `<div class="trigger-content"><span>無屬性</span></div><span class="trigger-arrow"></span>`;

    const options = document.createElement('div');
    options.className = 'custom-options';
    options.style.width = '200px';

    const noneOption = document.createElement('div');
    noneOption.className = 'custom-option';
    noneOption.dataset.value = "";
    noneOption.innerHTML = `<span>無屬性</span>`;
    options.appendChild(noneOption);
    
    const isArmorLike = ['helmets', 'armors', 'legguards', 'boots', 'cloaks', 'shields'].includes(config.key);
    const optionsList = config.key === 'weapons' ? weaponAttributes : (isArmorLike ? armorAttributes : []);
    
    optionsList.forEach(opt => {
        const optionEl = document.createElement('div');
        optionEl.className = 'custom-option';
        optionEl.textContent = opt.label;
        optionEl.dataset.value = JSON.stringify({ stat: opt.stat, value: opt.value });
        optionEl.dataset.label = opt.label;
        options.appendChild(optionEl);
    });

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
        options.style.display = 'block';
    });

    options.addEventListener('click', (e) => {
        const selectedOption = e.target.closest('.custom-option');
        if (!selectedOption) return;

        const value = selectedOption.dataset.value;
        const label = selectedOption.dataset.label || '無屬性';
        
        trigger.querySelector('.trigger-content span').textContent = label;
        options.style.display = 'none';
        
        selectionState[panelType].selectedAttributes[config.key] = value ? JSON.parse(value) : null;
        calculateAndDisplayStats(panelType, { equipmentChanged: true });
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(options);
    return wrapper;
}

function closeAllDropdowns() {
    document.querySelectorAll('.custom-options').forEach(o => o.style.display = 'none');
}

function createConfigRow(panelType, config) {
    const row = document.createElement('div');
    row.className = 'config-row';
    const equipmentDropdown = createCustomDropdown(panelType, config);
    row.appendChild(equipmentDropdown);
    
    if (config.key !== 'titles') {
        const attributeDropdown = createAttributeDropdown(panelType, config);
        row.appendChild(attributeDropdown);
    }
    return row;
}

// ===================================================================================
// --- 4. 核心計算與顯示 (CORE CALCULATION & DISPLAY) ---
// ===================================================================================

function calculateAndDisplayStats(panelType, options = {}) {
    const { isInitialSetup = false, equipmentChanged = false } = options;
    const state = selectionState[panelType];
    const stats = { ...baseStats }; 

    if (!state.selections.weapons || state.selections.weapons === "") {
        stats.dmg = 2;
    }

    slotConfigs.forEach(config => {
        const selectedItemName = state.selections[config.key];
        if (selectedItemName) {
            const itemData = data[config.key].find(item => item.name === selectedItemName);
            if (itemData?.stats) {
                for (const statKey in itemData.stats) {
                    stats[statKey] = (stats[statKey] || 0) + itemData.stats[statKey];
                }
            }
        }
    });
    
    Object.values(state.selectedAttributes).forEach(attr => {
        if (attr) stats[attr.stat] += attr.value;
    });

    const equippedSets = {};
    ['helmets', 'armors', 'legguards', 'boots', 'cloaks'].forEach(slot => {
        const itemName = state.selections[slot];
        if(itemName) {
            equippedSets[itemName] = (equippedSets[itemName] || 0) + 1;
        }
    });
    
    if (equippedSets['POSEIDON 海王'] >= 2) stats.cri_rate += 15;
    if (equippedSets['POSEIDON 海王'] >= 4) stats.cri_dmg += 90;
    if (equippedSets['ZEUS 宙斯'] >= 2 && stats.hp >= 110) stats.hp += 10;
    if (equippedSets['HADES 哈迪斯'] >= 2 && stats.def >= 28) stats.hp += 20;
    if (equippedSets['ARES 阿瑞斯'] >= 2) stats.dmg += 3;
    if (equippedSets['APOLLO 阿波羅'] >= 2 && stats.def >= 26) stats.def += 1;
    if (equippedSets['FENRIR 芬尼爾狼'] >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if (equippedSets['VALKYRIE 瓦爾基里'] >= 2 && stats.def >= 26) stats.hp += 15;
    if (equippedSets['JORMUNGANDR 耶夢加得'] >= 2 && stats.def >= 26) stats.dmg_reduc += 12;
    if (equippedSets['THOR 索爾'] >= 2 && stats.hp >= 110) stats.def += 1.5;
    if (equippedSets['HELHEIM 海拉'] >= 2 && stats.hp >= 110) stats.def += 1.5;
    if (equippedSets['HERMES 赫爾墨斯'] >= 2 && stats.hp >= 110) stats.dmg_reduc += 12;
    if (equippedSets['HEPHAESTUS 火神'] >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if (equippedSets['HEPHAESTUS 火神'] >= 4) stats.dmg_reduc += 8;
    if (equippedSets['CHIONE 凜冬之神'] >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if (equippedSets['MEDUSA 梅杜莎'] >= 2 && stats.dmg >= 32) stats.dmg_reduc += 12;
    if (equippedSets['MEOW 貓貓'] >= 2 && stats.hp >= 140) stats.dmg_reduc += 8;
    if (equippedSets['LUCIFER 傲慢'] >= 2 && stats.hp >= 110) stats.dmg_reduc += 12;
    if (equippedSets['LEVIATHAN 嫉妒'] >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if (equippedSets['BEELZEBUB 暴食'] >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if (equippedSets['SAMAEL 憤怒'] >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if (equippedSets['MAMMON 貪婪'] >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if (equippedSets['BELPHEGOR 怠惰'] >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    
    state.baseStats = stats;

    if (isInitialSetup || equipmentChanged) {
        state.currentHp = stats.hp;
        state.activeBuffs = [];
        state.hitCounters = {}; 
        state.shield = { hp: 0, max: 0 };
        initializeHitCounters(state);
    }
    
    if (state.currentHp > stats.hp) {
        state.currentHp = stats.hp;
    }

    updateAllDisplays(panelType);
}


function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return 0;
    return parseFloat(num.toFixed(2));
}

function updateCurrentHpDisplay(panelType) {
    const state = selectionState[panelType];
    const hpDisplay = document.getElementById(`${panelType}-current-hp`);
    const hpBar = document.getElementById(`${panelType}-hp-bar-inner`);
    const shieldBar = document.getElementById(`${panelType}-hp-bar-shield`);
    const maxHp = state.finalStats.hp || 0;

    if (hpDisplay && maxHp > 0) {
        hpDisplay.textContent = `${formatNumber(state.currentHp)} / ${formatNumber(maxHp)}`;
        const percentage = (state.currentHp / maxHp) * 100;
        hpBar.style.width = `${Math.max(0, percentage)}%`;
        const shieldPercentage = state.shield.hp > 0 ? (state.shield.hp / maxHp) * 100 : 0;
        shieldBar.style.width = `${Math.max(0, shieldPercentage)}%`;
    } else if (hpDisplay) {
        hpDisplay.textContent = `0 / 0`;
        hpBar.style.width = `0%`;
        shieldBar.style.width = `0%`;
    }
}

function updateStatsDisplay(panelType) {
    const state = selectionState[panelType];
    updateFinalStats(panelType);
    const stats = state.finalStats;
    const displayPanel = document.getElementById(`${panelType}-stats`);
    displayPanel.innerHTML = `
        <h3>屬性</h3>
        <span>Max HP ❤️: ${formatNumber(stats.hp)}</span>
        <span>DEF 🛡️: ${formatNumber(stats.def)}</span>
        <span>DMG 🗡️: ${formatNumber(stats.dmg)}</span>
        <span>吸血 🩸: ${formatNumber(stats.lifesteal)}%</span>
        <span>CRI Rate 🎯: ${formatNumber(stats.cri_rate)}%</span>
        <span>CRI Dmg: ${formatNumber(stats.cri_dmg)}%</span>
        <span>傷害增幅: ${formatNumber(stats.dmg_amp)}%</span>
        <span>傷害減免: ${formatNumber(stats.dmg_reduc)}%</span>
        <span>真傷: ${formatNumber(stats.true_dmg)}</span>
        <span>近戰傷害: ${formatNumber(stats.melee_dmg)}</span>
        <span>反彈傷害: ${formatNumber(stats.reflect_dmg)}%</span>
        <span>治療效果: +${formatNumber(stats.healing_effect)}%</span>
        <span>速度: ${formatNumber(stats.speed)}%</span>
        <span>回復(4s): ${formatNumber(stats.recovery)}</span>
    `;
}

function updateSkillsDisplay(panelType) {
    const state = selectionState[panelType];
    const skillsList = document.getElementById(`${panelType}-skills-list`);
    skillsList.innerHTML = ''; 
    const activeSkills = new Set();

    const equippedSets = {};
    ['helmets', 'armors', 'legguards', 'boots', 'cloaks'].forEach(slot => {
        const itemName = state.selections[slot];
        if (itemName) equippedSets[itemName] = (equippedSets[itemName] || 0) + 1;
    });
    Object.entries(equippedSets).forEach(([setName, count]) => {
        if (count >= 2) activeSkills.add(`${setName} (2)`);
        if (count >= 4) activeSkills.add(`${setName} (4)`);
    });

    if (state.selections.weapons) activeSkills.add(state.selections.weapons);
    if (state.selections.shields) activeSkills.add(state.selections.shields);
    if (state.selections.titles) activeSkills.add(state.selections.titles);
    
    if (state.activeBuffs.length > 0 || Object.keys(state.hitCounters).length > 0) {
        state.activeBuffs.forEach(buff => {
            const buffEl = document.createElement('div');
            buffEl.className = 'skill-item';
            buffEl.style.color = '#f9d71c';
            let buffText = `▶ `;
            if (buff.duration < Infinity) {
                buffText += `(${(buff.duration / 1000).toFixed(1)}s) `;
            }
            buffText += `${buff.displayName || buff.name}`;
            if (buff.stacks) {
                 buffText += ` [層數: ${buff.stacks}]`;
            } else if (buff.value) {
                buffText += ` [值: ${buff.value}]`;
            }
            buffEl.textContent = buffText;
            skillsList.appendChild(buffEl);
        });

        Object.entries(state.hitCounters).forEach(([key, value]) => {
            const counterEl = document.createElement('div');
            counterEl.className = 'skill-item';
            counterEl.style.color = '#add8e6';
            counterEl.textContent = `▶ [計數] ${key}: ${value}`;
            skillsList.appendChild(counterEl);
        });

        const divider = document.createElement('hr');
        divider.style.borderColor = 'var(--border-color)';
        divider.style.margin = '10px 0';
        skillsList.appendChild(divider);
    }
    
    activeSkills.forEach(skillKey => {
        const skillEl = document.createElement('div');
        skillEl.className = 'skill-item';
        const description = skillDescriptions[skillKey] || skillKey;
        skillEl.textContent = `▶ ${description}`;
        skillsList.appendChild(skillEl);
    });
}

// ===================================================================================
// --- 5. 動畫與視覺效果 (ANIMATION & VISUAL EFFECTS) ---
// ===================================================================================

function showDamageAnimation(panelType, amount, type) {
    const container = document.getElementById(`${panelType}-image-container`);
    const damageEl = document.createElement('div');
    damageEl.className = 'damage-number';
    
    if (type === 'crit') {
        damageEl.classList.add('crit');
        damageEl.textContent = formatNumber(amount);
    } else if (type === 'heal') {
        damageEl.classList.add('heal');
        damageEl.textContent = `+${formatNumber(amount)}`;
    } else {
         damageEl.textContent = formatNumber(amount);
    }
    
    container.appendChild(damageEl);
    setTimeout(() => { 
        if(damageEl.parentElement) {
            container.removeChild(damageEl); 
        }
    }, 1000);
}

function positionEffectWrappers() {
    const pageScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const playerContainer = document.getElementById('player-image-container');
    const enemyContainer = document.getElementById('enemy-image-container');

    if (playerContainer && enemyContainer) {
        const playerRect = playerContainer.getBoundingClientRect();
        const enemyRect = enemyContainer.getBoundingClientRect();
        const playerWrapper = document.getElementById('player-effects-wrapper');
        const enemyWrapper = document.getElementById('enemy-effects-wrapper');
        
        playerWrapper.style.top = `${playerRect.top + pageScrollY}px`;
        playerWrapper.style.left = `${playerRect.left}px`;
        
        enemyWrapper.style.top = `${enemyRect.top + pageScrollY}px`;
        enemyWrapper.style.left = `${enemyRect.left}px`;
    }
}


function toggleAnimation(panelType, effectName, state) {
    const container = document.getElementById(`${panelType}-effects-wrapper`);
    if (!container) return;
    const effects = [];
    if (effectName === 'apollo') {
        effects.push(container.querySelector('.effect-apollo-sun'), container.querySelector('.effect-apollo-domain'));
    } else {
        effects.push(container.querySelector('.' + effectName));
    }
    effects.forEach(element => {
        if (!element) return;
        if (state === 'start') {
            element.classList.remove('outro');
            element.classList.add('intro');
        } else {
            element.classList.remove('intro');
            element.classList.add('outro');
            element.addEventListener('animationend', () => element.classList.remove('outro'), { once: true });
        }
    });
}

function triggerAnimation(panelType, effectName) {
    const container = document.getElementById(`${panelType}-effects-wrapper`);
    if (!container) return;
    const element = container.querySelector('.' + effectName);
    if (!element || element.classList.contains('active')) return;
    element.classList.add('active');
    if (effectName === 'effect-mjolnir') { 
        const flash = document.getElementById('flash-overlay');
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 300);
    }
    element.addEventListener('animationend', () => {
      element.classList.remove('active');
    }, { once: true });
}

function toggleLoopingAnimation(panelType, effectName, state) {
    const container = document.getElementById(`${panelType}-effects-wrapper`);
    if (!container) return;
    const element = container.querySelector('.' + effectName);
    if (!element) return;
    element.classList.toggle('active', state === 'start');
}

// ===================================================================================
// --- 6. 戰鬥邏輯 (COMBAT LOGIC) ---
// ===================================================================================

function handleAttack(attackerType, defenderType) {
    const attacker = selectionState[attackerType];
    const defender = selectionState[defenderType];
    if (hasBuff(attacker, 'Stun') || hasBuff(attacker, 'Freeze')) return;
    if (defender.isInvincible) return;
    updateFinalStats(attackerType); 
    updateFinalStats(defenderType);
    incrementHitCounters(attacker, defender);
    let isCrit = Math.random() * 100 < attacker.finalStats.cri_rate;
    let damageMultiplier = 1;
    damageMultiplier *= triggerPreAttackEffects(attacker, defender, attackerType, defenderType);
    const critMultiplier = isCrit ? (1 + attacker.finalStats.cri_dmg / 100) : 1;
    const totalPhysicalDamage = (attacker.finalStats.dmg + attacker.finalStats.melee_dmg) * critMultiplier * (1 + attacker.finalStats.dmg_amp / 100) * damageMultiplier;
    const defenseMultiplier = 1 - (defender.finalStats.def * 0.025);
    let reductionMultiplier = 1 - (defender.finalStats.dmg_reduc / 100);
    reductionMultiplier *= triggerOnTakingDamageEffects(defender, attacker, defenderType, attackerType, totalPhysicalDamage);
    let finalDamage = Math.max(0, totalPhysicalDamage * defenseMultiplier * reductionMultiplier) + attacker.finalStats.true_dmg;
    const onHitResults = triggerOnHitEffects(attacker, defender, attackerType, defenderType, isCrit);
    finalDamage += onHitResults.extraDamage;
    handleDamageEffect(defenderType); 
    if (hasBuff(defender, 'Ares_Shield')) {
        finalDamage = 0;
        removeBuff(defender, 'Ares_Shield');
        toggleAnimation(defenderType, 'shield-ares', 'end');
    }
    if (defender.shield.hp > 0) {
        const damageToShield = Math.min(defender.shield.hp, finalDamage);
        defender.shield.hp -= damageToShield;
        finalDamage -= damageToShield;
        if (defender.shield.hp <= 0) {
            defender.shield.hp = 0; 
            const jormungandrBuff = getBuff(defender, 'Jormungandr_Shield');
            if (jormungandrBuff) {
                heal(defenderType, 6);
                defender.shield.max = Math.max(0, defender.shield.max - jormungandrBuff.value);
                removeBuff(defender, 'Jormungandr_Shield');
                toggleAnimation(defenderType, 'shield-jormungandr', 'end');
            }
            const belphegorShieldBuff = getBuff(defender, 'Belphegor_Shield_Timer');
            if(belphegorShieldBuff) {
                defender.shield.max = Math.max(0, defender.shield.max - belphegorShieldBuff.value);
                removeBuff(defender, 'Belphegor_Shield_Timer');
                toggleAnimation(defenderType, 'shield-sloth', 'end');
            }
        }
    }
    defender.currentHp -= finalDamage;
    showDamageAnimation(defenderType, finalDamage, isCrit ? 'crit' : 'normal');
    Object.keys(attacker.damageDealtInDuration).forEach(key => {
        attacker.damageDealtInDuration[key] += finalDamage;
    });
    const lifestealHeal = finalDamage * (attacker.finalStats.lifesteal / 100);
    if (lifestealHeal > 0) {
        heal(attackerType, lifestealHeal);
    }
    triggerPostHitEffects(attacker, defender, attackerType, defenderType, isCrit, finalDamage);
    if (defender.currentHp <= 0) {
        defender.currentHp = 0;
        triggerOnKillEffects(attacker, defender, attackerType, defenderType);
        setTimeout(() => {
            if (defender.baseStats.hp > 0) {
                defender.currentHp = defender.baseStats.hp;
                defender.activeBuffs = []; 
                defender.hitCounters = {};
                resetAllAnimations(defenderType);
                initializeHitCounters(defender); 
            }
        }, 300);
    }
    updateAllDisplays(attackerType);
    updateAllDisplays(defenderType);
}


function resetAllAnimations(panelType) {
    const wrapper = document.getElementById(`${panelType}-effects-wrapper`);
    if (!wrapper) return;

    // 1. 清理所有開關型動畫 (護盾、領域等)
    // 移除 intro 和 outro class，確保它們回到初始狀態
    const toggleableEffects = wrapper.querySelectorAll('.effect-frost-domain, .effect-apollo-sun, .effect-apollo-domain, .shield-base');
    toggleableEffects.forEach(el => {
        el.classList.remove('intro', 'outro');
    });

    // 2. 清理所有循環動畫 (火焰、冰凍)
    // 移除 active class
    const loopingEffects = wrapper.querySelectorAll('.effect-fire, .effect-ice');
    loopingEffects.forEach(el => {
        el.classList.remove('active');
    });

    // 注意：觸發型動畫 (如雷擊) 是瞬間播放完畢的，不需要手動重置。
}

// 【修改】讓動畫容器同步跳躍
function handleDamageEffect(panelType) {
    const image = document.getElementById(`${panelType}-image`);
    const effectsWrapper = document.getElementById(`${panelType}-effects-wrapper`); // 獲取動畫容器
    const state = selectionState[panelType];
    
    if (image.classList.contains('is-hit')) return;
    
    state.isInvincible = true;
    image.src = "dmg.png";
    image.classList.add('is-hit');
    effectsWrapper.classList.add('is-jumping'); // 同時讓動畫容器跳躍

    setTimeout(() => {
        image.src = 'player.png';
        image.classList.remove('is-hit');
        effectsWrapper.classList.remove('is-jumping'); // 同時停止跳躍
        state.isInvincible = false;
    }, 500);
}

function handleMutualAttack() {
    handleAttack('player', 'enemy');
    handleAttack('enemy', 'player');
}

// ===================================================================================
// --- 7. Buff/Debuff 與效果系統 (BUFF, EFFECTS & TIMERS) ---
// ===================================================================================

function updateFinalStats(panelType) {
    const state = selectionState[panelType];
    const finalStats = { ...state.baseStats };
    if (state.selections.weapons === "Zeus' Lighting 宙斯閃電") {
        const missingHpPercent = 100 - (state.currentHp / state.baseStats.hp * 100);
        finalStats.true_dmg += Math.floor(missingHpPercent / 2) * 0.16;
    }
    if (countSetPieces(state, 'ZEUS 宙斯') >= 4) {
        const missingHpPercent = 100 - (state.currentHp / state.baseStats.hp * 100);
        finalStats.lifesteal += missingHpPercent * 0.35;
    }
    if (countSetPieces(state, 'LUCIFER 傲慢') >= 4) {
        const missingHpPercent = 100 - (state.currentHp / state.baseStats.hp * 100);
        finalStats.dmg_amp += missingHpPercent * 0.8;
    }
    if (state.selections.shields === 'Steampunk Explorer Shield 蒸氣朋克盾') {
         const missingHpPercent = 100 - (state.currentHp / state.baseStats.hp * 100);
         finalStats.dmg_reduc += missingHpPercent * 0.25;
    }
    
    // 【修正】瓦爾基里變身邏輯移至 gameTick
    if (hasBuff(state, 'Valkyrie_Divine_Form')) {
        finalStats.lifesteal += 18;
        finalStats.true_dmg += 1;
    } else if (countSetPieces(state, 'VALKYRIE 瓦爾基里') >= 4) {
        finalStats.dmg_reduc += 18;
    }

    if (countSetPieces(state, 'SAMAEL 憤怒') >= 4) {
        const rage = state.hitCounters['憤怒值'] || 0;
        if (rage > 5) {
            finalStats.cri_rate += (rage - 5) * 5;
        }
    }
     if (state.selections.weapons === "Sin of Pride Sword 傲慢劍" && finalStats.dmg >= 40) {
        finalStats.lifesteal += 12;
    }
    state.activeBuffs.forEach(buff => {
        if (buff.stat) finalStats[buff.stat] = (finalStats[buff.stat] || 0) + buff.value;
        if (buff.multi_stat) buff.multi_stat.forEach(s => { finalStats[s.stat] = (finalStats[s.stat] || 0) + s.value; });
    });
    state.finalStats = finalStats;
    state.isCCImmune = (countSetPieces(state, 'LUCIFER 傲慢') >= 4 && (state.currentHp / state.baseStats.hp) < 0.3) || hasBuff(state, 'Poseidon_Crit_Buff');
}

function addBuff(state, buff) {
    if ((buff.name === 'Stun' || buff.name === 'Freeze') && state.isCCImmune) return; 
    removeBuff(state, buff.name, false); 
    state.activeBuffs.push(buff);
}

function removeBuff(state, buffName, updateUI = true) {
    state.activeBuffs = state.activeBuffs.filter(b => b.name !== buffName);
    if(updateUI) {
      const panelType = state === selectionState.player ? 'player' : 'enemy';
      updateAllDisplays(panelType);
    }
}

function hasBuff(state, buffName) {
    return state.activeBuffs.some(b => b.name === buffName);
}

function getBuff(state, buffName) {
    return state.activeBuffs.find(b => b.name === buffName);
}

function countSetPieces(state, setName) {
     return ['helmets', 'armors', 'legguards', 'boots', 'cloaks']
        .reduce((count, slot) => state.selections[slot] === setName ? count + 1 : count, 0);
}

function heal(panelType, amount) {
    const state = selectionState[panelType];
    if (state.currentHp <= 0) return;
    let healingMultiplier = 1 + (state.finalStats.healing_effect / 100);
    if(hasBuff(state, 'Grievous_Wounds') || hasBuff(state, 'Helheim_Poison') || hasBuff(state, 'Medusa_Poison')) {
        healingMultiplier /= 2;
    }
    const finalHeal = amount * healingMultiplier;
    state.currentHp = Math.min(state.finalStats.hp, state.currentHp + finalHeal);
    showDamageAnimation(panelType, finalHeal, 'heal');
}

function gameTick() {
    ['player', 'enemy'].forEach(panelType => {
        const state = selectionState[panelType];
        if (state.currentHp <= 0) return;

        // 【新增】瓦爾基里變身邏輯
        if (countSetPieces(state, 'VALKYRIE 瓦爾基里') >= 4) {
            const hpPercent = state.currentHp / state.baseStats.hp;
            if (hpPercent <= 0.4 && !hasBuff(state, 'Valkyrie_Divine_Form')) {
                addBuff(state, { name: 'Valkyrie_Divine_Form', displayName: '神之形態', duration: Infinity });
                triggerAnimation(panelType, 'effect-hermes'); // 觸發聖光
            } else if (hpPercent > 0.4 && hasBuff(state, 'Valkyrie_Divine_Form')) {
                removeBuff(state, 'Valkyrie_Divine_Form');
            }
        }

        let statsChanged = false;
        const currentBuffs = [...state.activeBuffs]; 
        currentBuffs.forEach(buff => {
            if (buff.duration === Infinity) return;
            buff.duration -= 100;

            // 【新增】阿波羅稱號燃燒邏輯
            if (buff.name === 'Apollo_Title_Burn' && buff.duration % 500 === 0) {
                state.currentHp -= 4;
                showDamageAnimation(panelType, 4, 'damage');
            }
             if (buff.name === 'Medusa_Poison' && buff.duration % 1000 === 0) {
                const poisonDmg = (selectionState[panelType].finalStats.dmg * 0.1) * (buff.stacks || 1);
                state.currentHp -= poisonDmg;
                showDamageAnimation(panelType, poisonDmg, 'damage');
            }
            if (buff.name === 'Greed_Scythe_Debuff' && buff.duration % 1000 === 0) {
                state.currentHp -= state.baseStats.hp * 0.04;
                showDamageAnimation(panelType, state.baseStats.hp * 0.04, 'damage');
            }
            if (buff.name === 'Silver_Knight_HoT' && buff.duration % 1000 === 0) {
                 heal(panelType, 2);
            }
            if (hasBuff(state, 'Apollo_Sun_Aura') && buff.duration % 1000 === 0) {
                const opponentType = panelType === 'player' ? 'enemy' : 'player';
                selectionState[opponentType].currentHp -= 6;
                showDamageAnimation(opponentType, 6, 'damage');
            }

            if(buff.duration <= 0) {
                statsChanged = true;
                if(buff.name === 'Apollo_Sun_Aura') toggleAnimation(panelType, 'apollo', 'end');
                if(buff.name === 'Ares_Shield') toggleAnimation(panelType, 'shield-ares', 'end');
                if (buff.name === 'Jormungandr_Shield') {
                    heal(panelType, 6);
                    state.shield.hp = Math.max(0, state.shield.hp - buff.value);
                    state.shield.max = Math.max(0, state.shield.max - buff.value);
                    toggleAnimation(panelType, 'shield-jormungandr', 'end');
                }
                if(buff.name === 'Fenrir_Rage') {
                    const healAmount = Math.min(25, (state.damageDealtInDuration['Fenrir_Rage'] || 0) * 0.25);
                    heal(panelType, healAmount);
                    delete state.damageDealtInDuration['Fenrir_Rage'];
                    toggleLoopingAnimation(panelType, 'effect-fire', 'end'); 
                }
                if (buff.name === 'BELPHEGOR_SLEEP') { 
                   const shieldAmount = Math.min(18, (state.damageDealtInDuration['BELPHEGOR_SLEEP'] || 0) * 0.5);
                   state.shield.hp += shieldAmount;
                   state.shield.max += shieldAmount;
                   addBuff(state, { name: 'Belphegor_Shield_Timer', duration: 5000, value: shieldAmount });
                   toggleAnimation(panelType, 'shield-sloth', 'start');
                   delete state.damageDealtInDuration['BELPHEGOR_SLEEP'];
                }
                if(buff.name === 'Belphegor_Shield_Timer') {
                    state.shield.hp = Math.max(0, state.shield.hp - buff.value);
                    state.shield.max = Math.max(0, state.shield.max - buff.value);
                    toggleAnimation(panelType, 'shield-sloth', 'end');
                }
                if(buff.name === 'Chione_Frost_Domain') toggleAnimation(panelType, 'effect-frost-domain', 'end');
                // 【新增】Buff結束時關閉動畫
                if(buff.name === 'Apollo_Title_Burn') toggleLoopingAnimation(panelType, 'effect-fire', 'end');
                if(buff.name === 'Freeze') toggleLoopingAnimation(panelType, 'effect-ice', 'end');
            }
        });
        state.activeBuffs = state.activeBuffs.filter(b => b.duration > 0 || b.duration === Infinity);
        if(statsChanged) updateAllDisplays(panelType);
    });
}

function handleRecovery() {
    ['player', 'enemy'].forEach(panelType => {
        const state = selectionState[panelType];
        if (state.currentHp <= 0 || state.currentHp >= state.finalStats.hp) return;
        if (state.baseStats.recovery > 0) heal(panelType, state.baseStats.recovery);
    });
}

// ===================================================================================
// --- 8. 技能效果處理函式 (COMBAT EFFECT HANDLERS) ---
// ===================================================================================

function triggerPreAttackEffects(attacker, defender, attackerType, defenderType) {
    let damageMultiplier = 1;
    if (countSetPieces(attacker, 'SAMAEL 憤怒') >= 4 && (attacker.hitCounters['憤怒值'] || 0) >= 10) {
        damageMultiplier *= 2.5;
        heal(attackerType, attacker.finalStats.hp * 0.5);
        attacker.hitCounters['憤怒值'] = 0;
    }
    const slothBladeBuff = getBuff(attacker, 'Sloth_Blade_Effect');
    if(slothBladeBuff) {
        damageMultiplier *= (1 + (2000 - slothBladeBuff.duration) / 1000); 
        removeBuff(attacker, 'Sloth_Blade_Effect');
    }
    return damageMultiplier;
}

function triggerOnTakingDamageEffects(defender, attacker, defenderType, attackerType, incomingDamage) {
    let reductionMultiplier = 1;
    if (countSetPieces(defender, 'THOR 索爾') >= 4) {
        if (attacker.finalStats.dmg > defender.finalStats.def) {
            reductionMultiplier *= (1 - 0.26);
        } else {
            heal(defenderType, 2);
        }
    }
    if (defender.selections.shields === 'Shield of Ares 阿瑞斯之盾' && Math.random() < 0.15) {
         addBuff(attacker, { name: 'Grievous_Wounds', displayName: '重創', duration: 3000 });
    }
    if(countSetPieces(defender, 'SAMAEL 憤怒') >= 4) {
        const currentRage = (defender.hitCounters['憤怒值'] || 0);
        defender.hitCounters['憤怒值'] = Math.min(10, currentRage + 1);
        if(currentRage < 5) {
            heal(defenderType, (Math.random() + 1) * currentRage);
        }
    }
    if (attacker.selections.weapons === 'Sin of Gluttony Blade 暴食劍') {
        const buff = getBuff(defender, 'Gluttony_Lifesteal') || { name: 'Gluttony_Lifesteal', displayName: '暴食吸血', duration: 4000, stat: 'lifesteal', value: 0, stacks: 0, counterName: '暴食層數' };
        if (buff.stacks < 6) {
            buff.stacks++;
            buff.value = buff.stacks * 8;
            buff.duration = 4000;
            addBuff(defender, buff);
        } else {
            attacker.currentHp -= 12; 
            showDamageAnimation(attackerType, 12, 'damage');
            addBuff(defender, { name: 'Gluttony_TrueDmg', displayName: '暴食真傷', duration: 2000, stat: 'true_dmg', value: 3 });
            removeBuff(defender, 'Gluttony_Lifesteal'); 
        }
    }
    return reductionMultiplier;
}

function triggerOnHitEffects(attacker, defender, attackerType, defenderType, isCrit) {
    let extraDamage = 0;
    const attackerWeapon = attacker.selections.weapons;
    const attackerTitle = attacker.selections.titles;
    if (attackerWeapon === "Sword of Hades 哈迪斯劍" && attacker.hitCounters['哈迪斯劍計數'] >= 4) {
         extraDamage += attacker.finalStats.hp * 0.06;
         heal(attackerType, attacker.finalStats.hp * 0.08);
         attacker.hitCounters['哈迪斯劍計數'] = 0;
    }
    if (attackerWeapon === "Spear of Ares 阿瑞斯矛" && attacker.hitCounters['阿瑞斯矛計數'] >= 3) {
        heal(attackerType, attacker.finalStats.hp * 0.05);
        addBuff(defender, { name: 'Ares_Spear_Def_Debuff', displayName: '破甲', duration: 5000, stat: 'def', value: -3 });
        attacker.hitCounters['阿瑞斯矛計數'] = 0;
    }
     if (attackerWeapon === 'Helheim Sword 冥府劍' && attacker.hitCounters['冥府劍計數'] >= 4) {
        const stealHp = defender.finalStats.def * 0.20;
        heal(attackerType, stealHp);
        addBuff(attacker, { name: 'Helheim_Steal_Dmg', displayName: '竊取傷害', duration: 1000, stat: 'dmg', value: 6 });
        attacker.hitCounters['冥府劍計數'] = 0;
    }
    if (attackerWeapon === "Hermes's Scepter Sword 赫爾莫斯權杖劍" && Math.random() < 0.35) {
        const executeDmg = Math.min(25, (defender.baseStats.hp - defender.currentHp) * 0.20);
        extraDamage += executeDmg;
        heal(attackerType, executeDmg * 0.4);
    }
    if (attackerWeapon === "Sin of Envy Blade 嫉妒劍") {
        extraDamage += attacker.finalStats.hp * 0.03;
        if (defender.currentHp > attacker.currentHp) {
            heal(attackerType, attacker.finalStats.hp * 0.04);
        }
    }
    if (attackerTitle === 'VALKYRIE 瓦爾基里稱') extraDamage += Math.random() * 2;
    if (attackerTitle === 'GOD OF FIRE 火神稱' && Math.random() < 0.25) {
        extraDamage += attacker.finalStats.hp * 0.03;
    }
    if (attackerTitle === 'Sins of Sloth 怠惰稱' && attacker.hitCounters['怠惰稱號計數'] >= 3) {
        addBuff(attacker, { name: 'Sloth_Title_TrueDmg', displayName: '怠惰真傷', duration: 2000, stat: 'true_dmg', value: 3 });
        attacker.hitCounters['怠惰稱號計數'] = 0;
    }
    if (attackerTitle === 'Sin of Pride 傲慢稱') {
        heal(attackerType, attacker.finalStats.def * 0.04);
    }
    if (attackerTitle === 'Sin of Envy 嫉妒稱' && Math.random() < 0.5) {
         heal(attackerType, attacker.finalStats.hp * 0.02);
    }
    if (attackerTitle === 'Sin of Greed 貪婪稱' && attacker.hitCounters['貪婪稱號計數'] >= 2) {
        const stealAmount = attacker.finalStats.hp * 0.01;
        heal(attackerType, stealAmount);
        defender.currentHp -= stealAmount;
        showDamageAnimation(defenderType, stealAmount, 'damage');
        attacker.hitCounters['貪婪稱號計數'] = 0;
    }
    return { extraDamage };
}

function triggerPostHitEffects(attacker, defender, attackerType, defenderType, isCrit, damageDealt) {
    if (isCrit) {
        if (countSetPieces(attacker, 'POSEIDON 海王') >= 4 && Math.random() < 0.35) addBuff(attacker, { name: 'Poseidon_Crit_Buff', displayName: '海王祝福', duration: 2000, stat: 'healing_effect', value: 100 });
        if (attacker.selections.shields === 'Poseidon\'s Shield 海王盾' && Math.random() < 0.5) heal(attackerType, 2);
        if (attacker.selections.titles === 'Sins of Wrath 憤怒稱' && Math.random() < 0.5) addBuff(attacker, { name: 'Wrath_Title_DR', displayName: '憤怒減傷', duration: 1000, stat: 'dmg_reduc', value: 10 });
        if(countSetPieces(attacker, 'SAMAEL 憤怒') >= 4) attacker.hitCounters['憤怒值'] = Math.min(10, (attacker.hitCounters['憤怒值'] || 0) + 2);
    }
    
    if (attacker.selections.titles === 'GOD OF THE SUN 阿波羅稱' && Math.random() < 0.15) {
        addBuff(defender, { name: 'Apollo_Title_Burn', displayName: '太陽神之燃', duration: 1000 });
        toggleLoopingAnimation(defenderType, 'effect-fire', 'start');
    }
    if (attacker.selections.weapons === "Apollo's Sun Sword 阿波羅日輪劍" && Math.random() < 0.20) addBuff(defender, { name: 'Stun', displayName: '暈眩', duration: 1000 });
    if (attacker.selections.weapons === "Permafrost Sword 臻冰劍" && attacker.hitCounters['臻冰劍計數'] >= 5) {
        addBuff(defender, { name: 'Freeze', displayName: '冰凍', duration: 2000 });
        toggleLoopingAnimation(defenderType, 'effect-ice', 'start');
        attacker.hitCounters['臻冰劍計數'] = 0;
    }
    if (attacker.selections.weapons === "Valkyrie's Divine Dual Blades 瓦爾基里雙刃" && Math.random() < 0.35) {
        if (!hasBuff(attacker, 'Valkyrie_Attacking_Again')) {
            addBuff(attacker, { name: 'Valkyrie_Attacking_Again', duration: 200 }); 
            setTimeout(() => handleAttack(attackerType, defenderType), 100);
        }
    }
    if (attacker.selections.weapons === 'Flame Excalibur 火神劍' && attacker.hitCounters['火神劍計數'] >= 4) {
        const hitTimes = Math.floor(Math.random() * 3) + 1; 
        for (let i = 0; i < hitTimes; i++) {
            const damage = attacker.finalStats.hp * 0.03;
            defender.currentHp -= damage;
            showDamageAnimation(defenderType, damage, 'damage');
            heal(attackerType, damage);
        }
        attacker.hitCounters['火神劍計數'] = 0;
    }
    if (attacker.selections.weapons === "Mjollnir 雷神之槌" && Math.random() < 0.25) {
        if ((attacker.hitCounters['靜電計數'] || 0) > 0) {
            triggerAnimation(defenderType, 'effect-mjolnir'); 
            const stacks = attacker.hitCounters['靜電計數'];
            const extraDmg = 3 * stacks;
            defender.currentHp -= extraDmg;
            showDamageAnimation(defenderType, extraDmg, 'damage');
            heal(attackerType, attacker.finalStats.dmg * 0.1 * stacks);
            attacker.hitCounters['靜電計數'] = 0;
        }
    }
    if (attacker.selections.weapons === 'Sin of Sloth Calamity Blade 怠惰劍') addBuff(attacker, { name: 'Sloth_Blade_Effect', displayName: '怠惰效果', duration: 2000 });
    if (attacker.selections.weapons === "Medusa's Spear 梅杜莎矛" && Math.random() < 0.25) {
        const buff = getBuff(defender, 'Medusa_Poison') || { name: 'Medusa_Poison', displayName: '梅杜莎劇毒', duration: 3000, stacks: 0 };
        if (buff.stacks < 3) buff.stacks++;
        buff.duration = 3000;
        addBuff(defender, buff);
    }
    if (attacker.selections.weapons === 'Sin of Greed Golden Scythe 貪婪之鐮' && Math.random() < 0.25) {
        const buff = getBuff(defender, 'Greed_Scythe_Debuff') || { name: 'Greed_Scythe_Debuff', displayName: '貪婪慾望', duration: 2000, stat: 'dmg_amp', value: 0, stacks: 0 };
        if (buff.stacks < 3) buff.stacks++;
        buff.value = buff.stacks * -15; 
        buff.duration = 2000;
        addBuff(defender, buff);
    }
    if (countSetPieces(attacker, 'ARES 阿瑞斯') >= 4 && attacker.hitCounters['戰神之盾計數'] >= 4) {
        if (!hasBuff(attacker, 'Ares_Shield')) {
            addBuff(attacker, { name: 'Ares_Shield', displayName: '戰神之盾', duration: 5000 });
            toggleAnimation(attackerType, 'shield-ares', 'start'); 
            attacker.hitCounters['戰神之盾計數'] = 0;
        }
    }
    if (countSetPieces(attacker, 'APOLLO 阿波羅') >= 4 && attacker.hitCounters['太陽光環計數'] >= 4) {
        if (!hasBuff(attacker, 'Apollo_Sun_Aura')) {
            addBuff(attacker, { name: 'Apollo_Sun_Aura', displayName: '太陽光環', duration: 3000 });
            toggleAnimation(attackerType, 'apollo', 'start'); 
            attacker.hitCounters['太陽光環計數'] = 0;
        }
    }
    if (countSetPieces(attacker, 'FENRIR 芬尼爾狼') >= 4 && attacker.hitCounters['芬尼爾狂暴計數'] >= 5) {
        if (!hasBuff(attacker, 'Fenrir_Rage')) {
            addBuff(attacker, { name: 'Fenrir_Rage', displayName: '芬尼爾狂暴', duration: 3000, multi_stat: [{ stat: 'dmg', value: 6 }, { stat: 'lifesteal', value: 25 }, { stat: 'def', value: -4 }]});
            toggleLoopingAnimation(attackerType, 'effect-fire', 'start'); 
            attacker.damageDealtInDuration['Fenrir_Rage'] = 0;
            attacker.hitCounters['芬尼爾狂暴計數'] = 0;
        }
    }
    if (countSetPieces(attacker, 'JORMUNGANDR 耶夢加得') >= 4 && attacker.hitCounters['耶夢加得之盾計數'] >= 4) {
        if (!hasBuff(attacker, 'Jormungandr_Shield')) {
            const shieldHP = attacker.finalStats.def * 0.25;
            attacker.shield.hp += shieldHP;
            attacker.shield.max += shieldHP;
            addBuff(attacker, { name: 'Jormungandr_Shield', duration: 3000, value: shieldHP });
            toggleAnimation(attackerType, 'shield-jormungandr', 'start'); 
            attacker.hitCounters['耶夢加得之盾計數'] = 0;
        }
    }
    if (countSetPieces(attacker, 'HELHEIM 海拉') >= 4 && attacker.hitCounters['海拉偷竊計數'] >= 4) {
        if (!hasBuff(defender, 'Helheim_Poison')) {
            const stealAmount = defender.finalStats.def * 0.25;
            heal(attackerType, stealAmount);
            addBuff(defender, { name: 'Helheim_Poison', displayName: '海拉劇毒', duration: 1000 });
            attacker.hitCounters['海拉偷竊計數'] = 0;
        }
    }
    if (countSetPieces(attacker, 'CHIONE 凜冬之神') >= 4 && attacker.hitCounters['霜凍領域計數'] >= 5) {
        if (!hasBuff(attacker, 'Chione_Frost_Domain')) {
            addBuff(attacker, { name: 'Chione_Frost_Domain', displayName: '霜凍領域', duration: 3000, multi_stat: [{ stat: 'def', value: 5 }, { stat: 'lifesteal', value: 15 }, { stat: 'healing_effect', value: 50 }]});
            addBuff(defender, { name: 'Freeze', displayName: '冰凍', duration: 1500 });
            toggleAnimation(attackerType, 'effect-frost-domain', 'start');
            toggleLoopingAnimation(defenderType, 'effect-ice', 'start');
            attacker.hitCounters['霜凍領域計數'] = 0;
        }
    }
    if (countSetPieces(attacker, 'MEOW 貓貓') >= 4 && attacker.hitCounters['貓貓隱身計數'] >= 5) {
        if (!hasBuff(attacker, 'Meow_Invisibility')) {
            const buff = { name: 'Meow_Invisibility', displayName: '貓貓隱身', duration: 3000, stat: 'true_dmg', value: 0, stacks: 0, counterName: '貓貓真傷層數' };
            addBuff(attacker, buff);
            attacker.damageDealtInDuration['Meow_Invisibility'] = 0; 
            attacker.hitCounters['貓貓隱身計數'] = 0;
        }
    }
    if (hasBuff(attacker, 'Meow_Invisibility')) { 
        const buff = getBuff(attacker, 'Meow_Invisibility');
        if (buff.stacks < 4) {
            buff.stacks++;
            buff.value = buff.stacks * 3;
            addBuff(attacker, buff); 
        }
    }
    if (countSetPieces(attacker, 'BELPHEGOR 怠惰') >= 4) {
        if (!hasBuff(attacker, 'BELPHEGOR_SLEEP') && !hasBuff(attacker, 'Belphegor_Shield_Timer')) {
            addBuff(attacker, { name: 'BELPHEGOR_SLEEP', displayName: '怠惰之眠', duration: 2000 });
            attacker.damageDealtInDuration['BELPHEGOR_SLEEP'] = 0;
        }
    }
     if (countSetPieces(attacker, 'LEVIATHAN 嫉妒') >= 4 && Math.random() < 0.45) {
        const buffs = [];
        if (defender.finalStats.dmg > attacker.finalStats.dmg) {
            buffs.push({ name: 'Leviathan_Buff_DEF', displayName: '嫉妒防禦', duration: 2000, stat: 'def', value: 5 });
            buffs.push({ name: 'Leviathan_Buff_DMG', displayName: '嫉妒攻擊', duration: 2000, stat: 'dmg', value: 12 });
        } else {
            buffs.push({ name: 'Leviathan_Buff_LS', displayName: '嫉妒吸血', duration: 2000, stat: 'lifesteal', value: 15 });
            buffs.push({ name: 'Leviathan_Buff_DR', displayName: '嫉妒減傷', duration: 2000, stat: 'dmg_reduc', value: 12 });
        }
        addBuff(attacker, buffs[Math.floor(Math.random() * buffs.length)]);
    }
    if (countSetPieces(attacker, 'MAMMON 貪婪') >= 4) {
        removeBuff(attacker, 'Mammon_Steal_DMG', false); removeBuff(attacker, 'Mammon_Steal_DR', false);
        removeBuff(defender, 'Mammon_Debuff_DMG', false); removeBuff(defender, 'Mammon_Debuff_DR', false);
        if (Math.random() < 0.5) {
            addBuff(attacker, { name: 'Mammon_Steal_DMG', displayName: '竊取攻擊', duration: 1000, stat: 'dmg', value: 4 });
            addBuff(defender, { name: 'Mammon_Debuff_DMG', displayName: '攻擊被竊', duration: 1000, stat: 'dmg', value: -4 });
        } else {
            addBuff(attacker, { name: 'Mammon_Steal_DR', displayName: '竊取減傷', duration: 1000, stat: 'dmg_reduc', value: 8 });
            addBuff(defender, { name: 'Mammon_Debuff_DR', displayName: '減傷被竊', duration: 1000, stat: 'dmg_reduc', value: -8 });
        }
    }
    handleStackingBuff(attacker, "Rainbow Cat Sword 彩虹貓劍", { name: 'Rainbow_Cat_Buff', displayName: '彩虹貓之力', duration: 4000, stat: 'dmg', valuePerStack: 2, maxStacks: 6 });
    handleStackingBuff(attacker, "Jormungandr's White Snake Sword 耶夢加得白蛇劍", { name: 'Jormungandr_TrueDmg', displayName: '白蛇真傷', duration: 4000, stat: 'true_dmg', valuePerStack: 1, maxStacks: 8 });
    handleStackingBuff(attacker, 'Sin of Pride Sword 傲慢劍', { name: 'Pride_Sword_Dmg', displayName: '傲慢之擊', duration: 4000, stat: 'dmg', valuePerStack: 2.5, maxStacks: 7 });
    handleStackingBuff(attacker, 'Sin of Wrath Demon Sword 憤怒劍', { name: 'Wrath_Sword_Crit', displayName: '憤怒爆率', duration: 4000, stat: 'cri_rate', valuePerStack: 12, maxStacks: 4 });
}

function triggerOnKillEffects(killer, victim, killerType, victimType) {
    if (killer.selections.titles === 'LORD OF HELHEIM 海拉稱') heal(killerType, killer.finalStats.hp * 0.20);
    if (killer.selections.titles === 'Scarlet Knight 緋紅騎士') heal(killerType, 3);
    if (killer.selections.titles === 'Silver Knight 銀牙騎士') addBuff(killer, { name: 'Silver_Knight_HoT', displayName: '銀牙騎士回覆', duration: 5000 });
    if (killer.selections.titles === 'ESCAPE DOMINATOR') {
        const domBuff = getBuff(killer, 'Dominator_Stack') || { name: 'Dominator_Stack', displayName: '統治者層數', duration: Infinity, value: 0 };
        domBuff.value = Math.min(3, domBuff.value + 1);
        addBuff(killer, domBuff);
        const ampBuff = getBuff(killer, 'Dominator_Dmg_Amp') || { name: 'Dominator_Dmg_Amp', displayName: '統治者增幅', duration: Infinity, stat: 'dmg_amp', value: 0 };
        ampBuff.value = domBuff.value * 3;
        addBuff(killer, ampBuff);
    }
}

function handleStackingBuff(state, weaponName, buffConfig) {
    if (state.selections.weapons !== weaponName) return;
    const existingBuff = getBuff(state, buffConfig.name);
    if (existingBuff) {
        if (existingBuff.stacks < buffConfig.maxStacks) {
            existingBuff.stacks++;
            existingBuff.value = existingBuff.stacks * buffConfig.valuePerStack;
        }
    } else {
        addBuff(state, { ...buffConfig, value: buffConfig.valuePerStack, stacks: 1 });
    }
}

function incrementHitCounters(attacker) {
    if (!hasBuff(attacker, 'Ares_Shield')) if (attacker.hitCounters['戰神之盾計數'] !== undefined) attacker.hitCounters['戰神之盾計數']++;
    if (!hasBuff(attacker, 'Apollo_Sun_Aura')) if (attacker.hitCounters['太陽光環計數'] !== undefined) attacker.hitCounters['太陽光環計數']++;
    if (!hasBuff(attacker, 'Fenrir_Rage')) if (attacker.hitCounters['芬尼爾狂暴計數'] !== undefined) attacker.hitCounters['芬尼爾狂暴計數']++;
    if (!hasBuff(attacker, 'Jormungandr_Shield')) if (attacker.hitCounters['耶夢加得之盾計數'] !== undefined) attacker.hitCounters['耶夢加得之盾計數']++;
    if (!hasBuff(attacker, 'Chione_Frost_Domain')) if (attacker.hitCounters['霜凍領域計數'] !== undefined) attacker.hitCounters['霜凍領域計數']++;
    if (!hasBuff(attacker, 'Meow_Invisibility')) if (attacker.hitCounters['貓貓隱身計數'] !== undefined) attacker.hitCounters['貓貓隱身計數']++;
    if (!hasBuff(attacker, 'Helheim_Poison')) if (attacker.hitCounters['海拉偷竊計數'] !== undefined) attacker.hitCounters['海拉偷竊計數']++;
    if (attacker.hitCounters['哈迪斯劍計數'] !== undefined) attacker.hitCounters['哈迪斯劍計數']++;
    if (attacker.hitCounters['阿瑞斯矛計數'] !== undefined) attacker.hitCounters['阿瑞斯矛計數']++;
    if (attacker.hitCounters['冥府劍計數'] !== undefined) attacker.hitCounters['冥府劍計數']++;
    if (attacker.hitCounters['臻冰劍計數'] !== undefined) attacker.hitCounters['臻冰劍計數']++;
    if (attacker.hitCounters['怠惰稱號計數'] !== undefined) attacker.hitCounters['怠惰稱號計數']++;
    if (attacker.hitCounters['貪婪稱號計數'] !== undefined) attacker.hitCounters['貪婪稱號計數']++;
    if (attacker.hitCounters['火神劍計數'] !== undefined) attacker.hitCounters['火神劍計數']++;
    if (attacker.hitCounters['靜電計數'] !== undefined) attacker.hitCounters['靜電計數']++;
}

function initializeHitCounters(state) {
    state.hitCounters = {}; 
    const selections = state.selections;
    if (selections.weapons === "Sword of Hades 哈迪斯劍") state.hitCounters['哈迪斯劍計數'] = 0;
    if (selections.weapons === "Spear of Ares 阿瑞斯矛") state.hitCounters['阿瑞斯矛計數'] = 0;
    if (selections.weapons === "Flame Excalibur 火神劍") state.hitCounters['火神劍計數'] = 0;
    if (selections.weapons === "Helheim Sword 冥府劍") state.hitCounters['冥府劍計數'] = 0;
    if (selections.weapons === "Permafrost Sword 臻冰劍") state.hitCounters['臻冰劍計數'] = 0;
    if (selections.weapons === "Mjollnir 雷神之槌") state.hitCounters['靜電計數'] = 0;
    if (selections.titles === 'Sins of Sloth 怠惰稱') state.hitCounters['怠惰稱號計數'] = 0;
    if (selections.titles === 'Sin of Greed 貪婪稱') state.hitCounters['貪婪稱號計數'] = 0;
    if (countSetPieces(state, 'ARES 阿瑞斯') >= 4) state.hitCounters['戰神之盾計數'] = 0;
    if (countSetPieces(state, 'APOLLO 阿波羅') >= 4) state.hitCounters['太陽光環計數'] = 0;
    if (countSetPieces(state, 'FENRIR 芬尼爾狼') >= 4) state.hitCounters['芬尼爾狂暴計數'] = 0;
    if (countSetPieces(state, 'JORMUNGANDR 耶夢加得') >= 4) state.hitCounters['耶夢加得之盾計數'] = 0;
    if (countSetPieces(state, 'CHIONE 凜冬之神') >= 4) state.hitCounters['霜凍領域計數'] = 0;
    if (countSetPieces(state, 'MEOW 貓貓') >= 4) state.hitCounters['貓貓隱身計數'] = 0;
    if (countSetPieces(state, 'HELHEIM 海拉') >= 4) state.hitCounters['海拉偷竊計數'] = 0;
    if (countSetPieces(state, 'SAMAEL 憤怒') >= 4) state.hitCounters['憤怒值'] = 0;
}

function updateAllDisplays(panelType) {
    if (!panelType) return;
    updateFinalStats(panelType);
    updateStatsDisplay(panelType);
    updateSkillsDisplay(panelType);
    updateCurrentHpDisplay(panelType);
}

// ===================================================================================
// --- 9. 初始化 (INITIALIZATION) ---
// ===================================================================================

function initializeCalculator() {
    ['player', 'enemy'].forEach(panelType => {
        const panel = document.getElementById(`${panelType}-panel`);
        const skillsDisplay = document.getElementById(`${panelType}-skills-display`);
        skillsDisplay.style.height = '280px'; 
        skillsDisplay.style.maxHeight = '280px';
        slotConfigs.forEach(config => {
            selectionState[panelType].selections[config.key] = "";
            selectionState[panelType].selectedAttributes[config.key] = null;
            panel.appendChild(createConfigRow(panelType, config));
        });
        const effectsWrapper = document.getElementById(`${panelType}-effects-wrapper`);
        effectsWrapper.innerHTML = `
            <div class="animated-effect effect-frost-domain"></div>
            <div class="animated-effect effect-apollo-sun"></div>
            <div class="animated-effect effect-apollo-domain"></div>
            <div class="animated-effect shield-base shield-ares"></div>
            <div class="animated-effect shield-base shield-jormungandr"></div>
            <div class="animated-effect shield-base shield-sloth"></div>
            <div class="animated-effect trigger-effect effect-hermes"></div>
            <div class="animated-effect trigger-effect effect-mjolnir"></div>
            <div class="animated-effect looping-effect effect-fire"></div>
            <div class="animated-effect looping-effect effect-ice"></div>
        `;
    });
    calculateAndDisplayStats('player', { isInitialSetup: true });
    calculateAndDisplayStats('enemy', { isInitialSetup: true });
    document.getElementById('attack-enemy-btn').addEventListener('click', () => handleAttack('player', 'enemy'));
    document.getElementById('attack-player-btn').addEventListener('click', () => handleAttack('enemy', 'player'));
    document.getElementById('mutual-attack-btn').addEventListener('click', handleMutualAttack);
    window.addEventListener('click', closeAllDropdowns);
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'e') {
            const isDropdownOpen = document.querySelector('.custom-options[style*="block"]');
            if (isDropdownOpen || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            event.preventDefault();
            handleMutualAttack();
        }
    });
    setInterval(handleRecovery, 4000);
    setInterval(gameTick, 100);
    setInterval(() => {
        updateAllDisplays('player');
        updateAllDisplays('enemy');
    }, 100);
    positionEffectWrappers();
    window.addEventListener('resize', positionEffectWrappers); 
    window.addEventListener('scroll', positionEffectWrappers); // 【新增】監聽滾動
}

document.addEventListener('DOMContentLoaded', () => {
    initializeCalculator();
    var coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
      coll[i].addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.maxHeight){
          content.style.maxHeight = null;
        } else {
          content.style.maxHeight = content.scrollHeight + "px";
        } 
      });
    }
    ['player', 'enemy'].forEach(panelType => {
        const fireContainer = document.querySelector(`#${panelType}-effects-wrapper .effect-fire`);
        if (!fireContainer) return;
        const particleCount = 40;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'fire-particle';
            // 【修正】使用 demo 中的粒子效果
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.bottom = `${Math.random() * 100}%`;
            particle.style.animationDuration = `${1 + Math.random() * 2}s`;
            particle.style.animationDelay = `${Math.random() * 2}s`;
            particle.style.transform = `scale(${0.5 + Math.random() * 0.5}) rotate(-45deg)`;
            fireContainer.appendChild(particle);
        }
    });
});