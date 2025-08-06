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
        shield: { hp: 0, max: 0 }, damageDealtInDuration: {}, equippedSets: {},
        canAttack: true // 【新增】攻擊冷卻狀態
    };
}

const selectionState = {
    player: getDefaultState(),
    enemy: getDefaultState()
};

// ===================================================================================
// --- 3. UI 生成 (UI CREATION) ---
// ===================================================================================

// 槽位
function updateEquipmentDisplay(panelType) {
    const state = selectionState[panelType];
    // 定義要顯示的裝備類型和順序
    const slotKeys = ['helmets', 'legguards', 'cloaks', 'titles', 'armors', 'boots', 'shields', 'weapons'];

    slotKeys.forEach(key => {
        const slotElement = document.getElementById(`${panelType}-slot-${key}`);
        if (!slotElement) return;

        const imgElement = slotElement.querySelector('img');
        const selectedItemName = state.selections[key];
        
        if (selectedItemName && data[key]) {
            const itemData = data[key].find(item => item.name === selectedItemName);
            if (itemData && itemData.img) {
                imgElement.src = itemData.img;
                imgElement.alt = itemData.name;
                imgElement.style.display = 'block';
                // 如果是稱號，給予特殊 class
                if (key === 'titles') {
                    imgElement.classList.add('title-icon');
                } else {
                    imgElement.classList.remove('title-icon');
                }
            } else {
                imgElement.style.display = 'none'; // 找不到圖片則隱藏
            }
        } else {
            imgElement.src = '';
            imgElement.alt = '';
            imgElement.style.display = 'none'; // 沒有選擇任何物品則隱藏
        }
    });
}


// 資訊
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
            const setName = itemName.split(' ')[0];
            equippedSets[setName] = (equippedSets[setName] || 0) + 1;
        }
    });
    state.equippedSets = equippedSets;

    if ((state.equippedSets['POSEIDON'] || 0) >= 2) stats.cri_rate += 15;
    if ((state.equippedSets['POSEIDON'] || 0) >= 4) stats.cri_dmg += 90;
    if ((state.equippedSets['ZEUS'] || 0) >= 2 && stats.hp >= 110) stats.hp += 10;
    if ((state.equippedSets['HADES'] || 0) >= 2 && stats.def >= 28) stats.hp += 20;
    if ((state.equippedSets['ARES'] || 0) >= 2) stats.dmg += 3;
    if ((state.equippedSets['APOLLO'] || 0) >= 2 && stats.def >= 26) stats.def += 1;
    if ((state.equippedSets['FENRIR'] || 0) >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if ((state.equippedSets['VALKYRIE'] || 0) >= 2 && stats.def >= 26) stats.hp += 15;
    if ((state.equippedSets['JORMUNGANDR'] || 0) >= 2 && stats.def >= 26) stats.dmg_reduc += 12;
    if ((state.equippedSets['THOR'] || 0) >= 2 && stats.hp >= 110) stats.def += 1.5;
    if ((state.equippedSets['HELHEIM'] || 0) >= 2 && stats.hp >= 110) stats.def += 1.5;
    if ((state.equippedSets['HERMES'] || 0) >= 2 && stats.hp >= 110) stats.dmg_reduc += 12;
    if ((state.equippedSets['HEPHAESTUS'] || 0) >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if ((state.equippedSets['HEPHAESTUS'] || 0) >= 4) stats.dmg_reduc += 8;
    if ((state.equippedSets['CHIONE'] || 0) >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if ((state.equippedSets['MEDUSA'] || 0) >= 2 && stats.dmg >= 32) stats.dmg_reduc += 12;
    if ((state.equippedSets['MEOW'] || 0) >= 2 && stats.hp >= 140) stats.dmg_reduc += 8;
    if ((state.equippedSets['LUCIFER'] || 0) >= 2 && stats.hp >= 110) stats.dmg_reduc += 12;
    if ((state.equippedSets['LEVIATHAN'] || 0) >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if ((state.equippedSets['BEELZEBUB'] || 0) >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if ((state.equippedSets['SAMAEL'] || 0) >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if ((state.equippedSets['MAMMON'] || 0) >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    if ((state.equippedSets['BELPHEGOR'] || 0) >= 2 && stats.hp >= 140) stats.dmg_reduc += 12;
    
    state.baseStats = stats;

    if (isInitialSetup || equipmentChanged) {
        state.currentHp = stats.hp;
        const buffsToRemove = [...state.activeBuffs]; 
        // 遍歷副本，並使用 removeBuff 逐一移除，以確保觸發動畫關閉
        buffsToRemove.forEach(buff => {
            // 傳入 false 以避免在迴圈中不必要地重複更新UI
            removeBuff(panelType, buff.name, false); 
        });
        state.hitCounters = {}; 
        state.shield = { hp: 0, max: 0 };
        state.canAttack = true;
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
    
    Object.entries(state.equippedSets).forEach(([setName, count]) => {
        const fullSetName = Object.values(data).flat().find(item => item.name.startsWith(setName))?.name;
        if (fullSetName) {
            if (count >= 2) activeSkills.add(`${fullSetName} (2)`);
            if (count >= 4) activeSkills.add(`${fullSetName} (4)`);
        }
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

function queueDamageAnimation(panelType, amount, type) {
    showDamageAnimation(panelType, amount, type);
}

// ===================================================================================
// --- 6. 戰鬥邏輯 (COMBAT LOGIC) ---
// ===================================================================================

function handleAttack(attackerType, defenderType) {
    const attacker = selectionState[attackerType];
    const defender = selectionState[defenderType];
    
    if (!attacker.canAttack) return;
    if (hasBuff(attacker, 'Stun') || hasBuff(attacker, 'Freeze') || hasBuff(attacker, 'Petrify')) return;
    
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
    const onTakingDamageResults = triggerOnTakingDamageEffects(defender, attacker, defenderType, attackerType, totalPhysicalDamage);
    reductionMultiplier *= onTakingDamageResults.reductionMultiplier;
    let finalDamage = Math.max(0, totalPhysicalDamage * defenseMultiplier * reductionMultiplier) + attacker.finalStats.true_dmg + onTakingDamageResults.extraDamage;
    const onHitResults = triggerOnHitEffects(attacker, defender, attackerType, defenderType, isCrit);
    finalDamage += onHitResults.extraDamage;

    if (hasBuff(defender, 'Ares_Shield')) {
        finalDamage = 0;
        removeBuff(defenderType, 'Ares_Shield');
    }

    if (defender.shield.hp > 0) {
        const damageToShield = Math.min(defender.shield.hp, finalDamage);
        defender.shield.hp -= damageToShield;
        finalDamage -= damageToShield;
        if (defender.shield.hp <= 0) {
            defender.shield.hp = 0; 
            const jormungandrBuff = getBuff(defender, 'Jormungandr_Shield');
            if (jormungandrBuff) {
                handleHpChange(defenderType, 6, 'heal');
                defender.shield.max = Math.max(0, defender.shield.max - jormungandrBuff.value);
                removeBuff(defenderType, 'Jormungandr_Shield');
            }
            const belphegorShieldBuff = getBuff(defender, 'Belphegor_Shield_Timer');
            if(belphegorShieldBuff) {
                defender.shield.max = Math.max(0, defender.shield.max - belphegorShieldBuff.value);
                removeBuff(defenderType, 'Belphegor_Shield_Timer');
            }
        }
    }
    
    if (finalDamage > 0) {
        handleHpChange(defenderType, -finalDamage, isCrit ? 'crit' : 'normal', attackerType);
    }

    Object.keys(attacker.damageDealtInDuration).forEach(key => {
        attacker.damageDealtInDuration[key] += finalDamage;
    });
    const lifestealHeal = finalDamage * (attacker.finalStats.lifesteal / 100);
    if (lifestealHeal > 0) {
        handleHpChange(attackerType, lifestealHeal, 'heal', attackerType);
    }
    triggerPostHitEffects(attacker, defender, attackerType, defenderType, isCrit, finalDamage);

    attacker.canAttack = false;
    setTimeout(() => { attacker.canAttack = true; }, 500);

    if (!defender.isInvincible) {
        updateAllDisplays(attackerType);
        updateAllDisplays(defenderType);
    }
}


function handleDamageEffect(panelType) {
    // START: 修改這一行
    const container = document.getElementById(`${panelType}-image-container`);
    // END: 修改這一行
    
    // START: 檢查 class 是否在 container 上
    if (container.classList.contains('is-hit')) return;
    
    container.classList.add('is-hit');
    // END: 檢查 class 是否在 container 上

    // START: 找到圖片元素來改變 src
    const image = document.getElementById(`${panelType}-image`);
    image.src = "./dmg.webp";
    // END: 找到圖片元素來改變 src

    setTimeout(() => {
        image.src = 'player.png';
        // START: 從 container 移除 class
        container.classList.remove('is-hit');
        // END: 從 container 移除 class
    }, 500);
}

function handleMutualAttack() {
    handleAttack('player', 'enemy');
    handleAttack('enemy', 'player');
}

// ===================================================================================
// --- 7. Buff/Debuff 與效果系統 (BUFF, EFFECTS & TIMERS) ---
// ===================================================================================
// START: 添加此函式
/**
 * @description 根據 Buff 名稱和狀態觸發或關閉對應的視覺特效
 * @param {string} panelType - 'player' 或 'enemy'
 * @param {string} buffName - 觸發特效的 Buff 名稱
 * @param {boolean} isActive - true 為啟動, false 為關閉
 */
function triggerVisualEffect(panelType, buffName, isActive) {
    // 檢查 EffectsController 是否已初始化
    if (typeof EffectsController === 'undefined' || !EffectsController.triggerEffect) {
        return;
    }
    EffectsController.triggerEffect(panelType, buffName, isActive);
}



function updateFinalStats(panelType) {
    const state = selectionState[panelType];
    const finalStats = { ...state.baseStats };

    if (state.selections.weapons === "Zeus' Lighting 宙斯閃電") {
        const missingHpPercent = 100 - (state.currentHp / state.baseStats.hp * 100);
        finalStats.true_dmg += Math.floor(missingHpPercent / 2) * 0.16;
    }
    if (state.selections.weapons === "Hermes's Scepter Sword 赫爾莫斯權杖劍") {
        const missingHpPercent = 100 - (state.currentHp / state.baseStats.hp * 100);
        finalStats.speed += Math.floor(missingHpPercent / 10) * 1.5;
    }
    if (getSetPieces(state, 'ZEUS') >= 4) {
        const missingHpPercent = 100 - (state.currentHp / state.baseStats.hp * 100);
        finalStats.lifesteal += missingHpPercent * 0.35;
    }
    if (getSetPieces(state, 'LUCIFER') >= 4) {
        const missingHpPercent = 100 - (state.currentHp / state.baseStats.hp * 100);
        finalStats.dmg_amp += missingHpPercent * 0.8;
    }
    if (state.selections.shields === 'Steampunk Explorer Shield 蒸氣朋克盾') {
         const missingHpPercent = 100 - (state.currentHp / state.baseStats.hp * 100);
         finalStats.dmg_reduc += missingHpPercent * 0.25;
    }
    
    const dominatorBuff = getBuff(state, 'Dominator_Stack');
    if (dominatorBuff) {
        finalStats.dmg_amp += dominatorBuff.value * 3;
    }
    
    if (hasBuff(state, 'Valkyrie_Divine_Form')) {
        finalStats.lifesteal += 18;
        finalStats.true_dmg += 1;
    } else if (getSetPieces(state, 'VALKYRIE') >= 4) {
        finalStats.dmg_reduc += 18;
    }

    if (getSetPieces(state, 'SAMAEL') >= 4) {
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
    state.isCCImmune = state.isCCImmune = hasBuff(state, 'Lucifer_CC_Immunity') || hasBuff(state, 'Poseidon_Crit_Buff');
}

function addBuff(panelType, buff) {
    const state = selectionState[panelType];
    if ((buff.name === 'Stun' || buff.name === 'Freeze' || buff.name === 'Petrify') && state.isCCImmune) return; 
    
    const existingBuff = getBuff(state, buff.name);
    if (existingBuff) {
        Object.assign(existingBuff, buff);
    } else {
        state.activeBuffs.push(buff);
    }
    triggerVisualEffect(panelType, buff.name, true);
}

function removeBuff(panelType, buffName, updateUI = true) {
    const state = selectionState[panelType];
    state.activeBuffs = state.activeBuffs.filter(b => b.name !== buffName);
    triggerVisualEffect(panelType, buffName, false);
    if(updateUI) {
      updateAllDisplays(panelType);
    }
}

function hasBuff(state, buffName) {
    return state.activeBuffs.some(b => b.name === buffName);
}

function getBuff(state, buffName) {
    return state.activeBuffs.find(b => b.name === buffName);
}

function getSetPieces(state, setName) {
     return state.equippedSets[setName] || 0;
}

function handleHpChange(panelType, amount, type, sourcePanelType = null) {
    const state = selectionState[panelType];
    if (state.currentHp <= 0 && amount < 0) return;

    const isHeal = amount > 0;
    let finalAmount = amount;

    if (isHeal) {
        let healingMultiplier = 1 + (state.finalStats.healing_effect / 100);
        if(hasBuff(state, 'Grievous_Wounds') || hasBuff(state, 'Helheim_Poison') || hasBuff(state, 'Medusa_Poison')) {
            healingMultiplier /= 2;
        }
        finalAmount *= healingMultiplier;
        state.currentHp = Math.min(state.finalStats.hp, state.currentHp + finalAmount);
    } else {
        state.currentHp += finalAmount;
    }
    
    queueDamageAnimation(panelType, finalAmount, type);
    if (amount < 0) {
        handleDamageEffect(panelType);
    }

    if (state.currentHp <= 0) {
        state.currentHp = 0;
        handleDeath(panelType, sourcePanelType);
    }
}

function handleDeath(victimType, killerType) {
    const victim = selectionState[victimType];
    if (killerType) {
         triggerOnKillEffects(selectionState[killerType], victim, killerType, victimType);
    }
    
    setTimeout(() => {
        if (victim.baseStats.hp > 0) {

            const buffsToRemove = [...victim.activeBuffs]; // 複製一份當前的 Buff 列表
            buffsToRemove.forEach(buff => {
                // 呼叫 removeBuff，並傳入 false 來避免不必要的重複畫面更新
                removeBuff(victimType, buff.name, false); 
            });

            const dominatorBuff = getBuff(victim, 'Dominator_Stack');
            //victim.activeBuffs = [];
            
            if (dominatorBuff && dominatorBuff.value > 0) {
                dominatorBuff.value -= 1;
                if (dominatorBuff.value > 0) {
                     addBuff(victimType, dominatorBuff);
                }
            }

            victim.currentHp = victim.baseStats.hp;
            victim.hitCounters = {};
            victim.canAttack = true;
            initializeHitCounters(victim); 
        }
    }, 500);
}


function gameTick() {
    ['player', 'enemy'].forEach(panelType => {
        const state = selectionState[panelType];
        if (state.currentHp <= 0) return;

        const opponentType = panelType === 'player' ? 'enemy' : 'player';
        const opponent = selectionState[opponentType];

        if (getSetPieces(state, 'VALKYRIE') >= 4) {
            const hpPercent = state.currentHp / state.baseStats.hp;
            if (hpPercent <= 0.4 && !hasBuff(state, 'Valkyrie_Divine_Form')) {
                handleHpChange(opponentType, -10, 'damage', panelType);
                addBuff(panelType, { name: 'Valkyrie_Divine_Form', displayName: '神之形態', duration: Infinity });
            } else if (hpPercent > 0.4 && hasBuff(state, 'Valkyrie_Divine_Form')) {
                removeBuff(panelType, 'Valkyrie_Divine_Form');
            }
        }

        if (getSetPieces(state, 'LUCIFER') >= 4) {
            const hpPercent = state.currentHp / state.baseStats.hp;

            if (hpPercent < 0.3 && !hasBuff(state, 'Lucifer_CC_Immunity')) {
                addBuff(panelType, { name: 'Lucifer_CC_Immunity', displayName: '傲慢控場免疫', duration: Infinity });
            }
            else if (hpPercent >= 0.3 && hasBuff(state, 'Lucifer_CC_Immunity')) {
                removeBuff(panelType, 'Lucifer_CC_Immunity'); 
            }
        }

        let statsChanged = false;
        const currentBuffs = [...state.activeBuffs]; 
        currentBuffs.forEach(buff => {
            if (buff.duration === Infinity) return;
            buff.duration -= 100;

            if (buff.name === 'Apollo_Title_Burn' && buff.duration % 500 === 0) {
                handleHpChange(panelType, -4, 'damage', null);
            }
            if (buff.name === 'Medusa_Poison' && buff.duration % 1000 === 0) {
                const poisonDmg = (state.finalStats.dmg * 0.1) * (buff.stacks || 1);
                handleHpChange(panelType, -poisonDmg, 'damage', opponentType);
                handleHpChange(opponentType, poisonDmg, 'heal', opponentType);
            }
            if (buff.name === 'Greed_Scythe_Debuff' && buff.duration % 1000 === 0) {
                handleHpChange(panelType, -(state.baseStats.hp * 0.04), 'damage', null);
            }
            if (buff.name === 'Silver_Knight_HoT' && buff.duration % 1000 === 0) {
                 handleHpChange(panelType, 2, 'heal');
            }
            if (hasBuff(state, 'Apollo_Sun_Aura') && buff.duration % 1000 === 0) {
                handleHpChange(opponentType, -6, 'damage', panelType);
            }
            if (buff.name === 'Flame_Vortex_Debuff' && buff.duration % 666 === 0) {
                 const damage = buff.value;
                 handleHpChange(panelType, -damage, 'damage', buff.source);
                 handleHpChange(buff.source, damage, 'heal', buff.source);
            }

            if(buff.duration <= 0) {
                statsChanged = true;
                if (buff.name === 'Jormungandr_Shield') {
                    handleHpChange(panelType, 6, 'heal');
                    state.shield.hp = Math.max(0, state.shield.hp - buff.value);
                    state.shield.max = Math.max(0, state.shield.max - buff.value);
                }
                if(buff.name === 'Fenrir_Rage') {
                    const healAmount = Math.min(25, (state.damageDealtInDuration['Fenrir_Rage'] || 0) * 0.25);
                    handleHpChange(panelType, healAmount, 'heal');
                    delete state.damageDealtInDuration['Fenrir_Rage'];
                }
                if(buff.name === 'Meow_Invisibility') {
                    const healAmount = Math.min(20, (state.damageDealtInDuration['Meow_Invisibility'] || 0) * 0.25);
                    handleHpChange(panelType, healAmount, 'heal');
                    delete state.damageDealtInDuration['Meow_Invisibility'];
                }
                if (buff.name === 'BELPHEGOR_SLEEP') { 
                   const shieldAmount = Math.min(18, (state.damageDealtInDuration['BELPHEGOR_SLEEP'] || 0) * 0.5);
                   state.shield.hp += shieldAmount;
                   state.shield.max += shieldAmount;
                   addBuff(panelType, { name: 'Belphegor_Shield_Timer', displayName: '怠惰之盾', duration: 5000, value: shieldAmount });
                   delete state.damageDealtInDuration['BELPHEGOR_SLEEP'];
                }
                if(buff.name === 'Belphegor_Shield_Timer') {
                    state.shield.hp = Math.max(0, state.shield.hp - buff.value);
                    state.shield.max = Math.max(0, state.shield.max - buff.value);
                }
                if(buff.name === 'Medusa_Gaze') removeBuff(opponentType, 'Petrify', false);

                removeBuff(panelType, buff.name, false);
            }
        });
        
        if(statsChanged) updateAllDisplays(panelType);
    });
}

function handleRecovery() {
    ['player', 'enemy'].forEach(panelType => {
        const state = selectionState[panelType];
        if (state.currentHp <= 0 || state.currentHp >= state.finalStats.hp) return;
        if (state.baseStats.recovery > 0) handleHpChange(panelType, state.baseStats.recovery, 'heal');
    });
}

// ===================================================================================
// --- 8. 技能效果處理函式 (COMBAT EFFECT HANDLERS) ---
// ===================================================================================

function triggerPreAttackEffects(attacker, defender, attackerType, defenderType) {
    let damageMultiplier = 1;
    if (getSetPieces(attacker, 'SAMAEL') >= 4 && (attacker.hitCounters['憤怒值'] || 0) >= 10) {
        damageMultiplier *= 2.5;
        handleHpChange(attackerType, attacker.finalStats.hp * 0.5, 'heal');
        attacker.hitCounters['憤怒值'] = 0;
        triggerVisualEffect(attackerType, 'Samael_Full_Rage', true);
    }
    const slothBladeBuff = getBuff(attacker, 'Sloth_Blade_Effect');
    if(slothBladeBuff) {
        damageMultiplier *= (1 + (2000 - slothBladeBuff.duration) / 1000); 
        removeBuff(attackerType, 'Sloth_Blade_Effect');
    }
    return damageMultiplier;
}

function triggerOnTakingDamageEffects(defender, attacker, defenderType, attackerType, incomingDamage) {
    let reductionMultiplier = 1;
    let extraDamage = 0;

    if (hasBuff(defender, 'Freeze')) {
        extraDamage += Math.floor(Math.random() * 5) + 1;
        removeBuff(defenderType, 'Freeze', false);
    }

    const meowBuff = getBuff(defender, 'Meow_Invisibility');
    if (meowBuff && meowBuff.stacks > 0) {
        meowBuff.stacks--;
        meowBuff.value = meowBuff.stacks * 3;
    }

    const fenrirTitleBuff = getBuff(defender, 'Fenrir_Title_DMG');
    if (fenrirTitleBuff && Math.random() < 0.36) {
        fenrirTitleBuff.stacks = Math.max(0, fenrirTitleBuff.stacks - 1);
        fenrirTitleBuff.value = fenrirTitleBuff.stacks * 1;
    }
    
    const hephaestusBuff = getBuff(defender, 'Hephaestus_Fireballs');
    if (hephaestusBuff && hephaestusBuff.stacks > 0) {
        hephaestusBuff.stacks--;
        const damage = defender.finalStats.hp * 0.04;
        handleHpChange(attackerType, -damage, 'damage', defenderType);
        handleHpChange(defenderType, damage, 'heal', defenderType);
        if (hephaestusBuff.stacks <= 0) removeBuff(defenderType, 'Hephaestus_Fireballs');
    }

    if (getSetPieces(defender, 'THOR') >= 4) {
        if (attacker.finalStats.dmg > defender.finalStats.def) {
            reductionMultiplier *= (1 - 0.26);
        } else {
            handleHpChange(defenderType, 2, 'heal');
        }
    }
    if (defender.selections.shields === 'Shield of Ares 阿瑞斯之盾' && Math.random() < 0.15) {
         addBuff(attackerType, { name: 'Grievous_Wounds', displayName: '重創', duration: 3000 });
    }
    if(getSetPieces(defender, 'SAMAEL') >= 4) {
        const currentRage = (defender.hitCounters['憤怒值'] || 0);
        defender.hitCounters['憤怒值'] = Math.min(10, currentRage + 1);
        if(currentRage < 5) {
            handleHpChange(defenderType, (Math.random() + 1) * currentRage, 'heal');
        }
    }
    if (defender.selections.weapons === 'Sin of Gluttony Blade 暴食劍') {
        const buff = getBuff(defender, 'Gluttony_Lifesteal') || { name: 'Gluttony_Lifesteal', displayName: '暴食吸血', duration: 4000, stat: 'lifesteal', value: 0, stacks: 0 };
        if (buff.stacks < 6) {
            buff.stacks++;
            buff.value = buff.stacks * 8;
            buff.duration = 4000;
            addBuff(defenderType, buff);
        } else {
            handleHpChange(attackerType, -12, 'damage', defenderType);
            addBuff(defenderType, { name: 'Gluttony_TrueDmg', displayName: '暴食真傷', duration: 2000, stat: 'true_dmg', value: 3 });
            removeBuff(defenderType, 'Gluttony_Lifesteal'); 
        }
    }
    
    const jormungandrBuff = getBuff(defender, 'Jormungandr_TrueDmg');
    if (jormungandrBuff && Math.random() < 0.36) {
        jormungandrBuff.stacks = Math.max(0, jormungandrBuff.stacks - 1);
        jormungandrBuff.value = jormungandrBuff.stacks * 1;
    }
    const rainbowCatBuff = getBuff(defender, 'Rainbow_Cat_Buff');
    if (rainbowCatBuff && Math.random() < 0.30) {
        rainbowCatBuff.stacks = Math.max(0, rainbowCatBuff.stacks - 1);
        rainbowCatBuff.value = rainbowCatBuff.stacks * 2;
    }
    const wrathSwordBuff = getBuff(defender, 'Wrath_Sword_Crit');
    if (wrathSwordBuff && Math.random() < 0.36) {
        wrathSwordBuff.stacks = Math.max(0, wrathSwordBuff.stacks - 1);
        wrathSwordBuff.value = wrathSwordBuff.stacks * 12;
    }

    return { reductionMultiplier, extraDamage };
}

function triggerOnHitEffects(attacker, defender, attackerType, defenderType, isCrit) {
    let extraDamage = 0;
    const attackerWeapon = attacker.selections.weapons;
    const attackerTitle = attacker.selections.titles;

    if (hasBuff(defender, 'Petrify')) {
        const bonusDamage = attacker.finalStats.dmg * 0.15;
        extraDamage += bonusDamage;
        handleHpChange(attackerType, bonusDamage, 'heal');
        removeBuff(defenderType, 'Petrify');
    }

    if (attackerWeapon === "Sword of Hades 哈迪斯劍" && attacker.hitCounters['哈迪斯劍計數'] >= 4) {
         extraDamage += attacker.finalStats.hp * 0.06;
         handleHpChange(attackerType, attacker.finalStats.hp * 0.08, 'heal');
         attacker.hitCounters['哈迪斯劍計數'] = 0;
    }
    if (attackerWeapon === "Spear of Ares 阿瑞斯矛" && attacker.hitCounters['阿瑞斯矛計數'] >= 3) {
        handleHpChange(attackerType, attacker.finalStats.hp * 0.05, 'heal');
        addBuff(defenderType, { name: 'Ares_Spear_Def_Debuff', displayName: '破甲', duration: 5000, stat: 'def', value: -3 });
        attacker.hitCounters['阿瑞斯矛計數'] = 0;
    }
    if (attackerWeapon === 'Helheim Sword 冥府劍' && attacker.hitCounters['冥府劍計數'] >= 4) {
        const stealAmount = defender.finalStats.def * 0.20;
        handleHpChange(defenderType, -stealAmount, 'damage', attackerType);
        handleHpChange(attackerType, stealAmount, 'heal', attackerType);
        addBuff(attackerType, { name: 'Helheim_Steal_Dmg', displayName: '竊取傷害', duration: 1000, stat: 'dmg', value: 6 });
        addBuff(defenderType, { name: 'Helheim_Stolen_Dmg', displayName: '傷害被竊', duration: 1000, stat: 'dmg', value: -6 });
        attacker.hitCounters['冥府劍計數'] = 0;
    }
    if (attackerWeapon === "Fenrir's God-Killing Sword 芬尼爾弒神劍" && attacker.hitCounters['芬尼爾弒神劍計數'] >= 4) {
        handleHpChange(defenderType, -8, 'damage', attackerType);
        attacker.hitCounters['芬尼爾弒神劍計數'] = 0;
    }
    if (attackerWeapon === "Hermes's Scepter Sword 赫爾莫斯權杖劍" && Math.random() < 0.35) {
        const executeDmg = Math.min(25, (defender.baseStats.hp - defender.currentHp) * 0.20);
        extraDamage += executeDmg;
        handleHpChange(attackerType, executeDmg * 0.4, 'heal');
    }
    if (attackerWeapon === "Sin of Envy Blade 嫉妒劍") {
        extraDamage += attacker.finalStats.hp * 0.03;
        if (defender.currentHp > attacker.currentHp) {
            handleHpChange(attackerType, attacker.finalStats.hp * 0.04, 'heal');
        }
    }

    if (attackerTitle === 'VALKYRIE 瓦爾基里稱') extraDamage += Math.random() * 2;
    if (attackerTitle === 'GOD OF FIRE 火神稱' && Math.random() < 0.25) {
        extraDamage += attacker.finalStats.hp * 0.03;
    }
    if (attackerTitle === 'Sins of Sloth 怠惰稱' && attacker.hitCounters['怠惰稱號計數'] >= 3) {
        addBuff(attackerType, { name: 'Sloth_Title_TrueDmg', displayName: '怠惰真傷', duration: 2000, stat: 'true_dmg', value: 3 });
        attacker.hitCounters['怠惰稱號計數'] = 0;
    }
    if (attackerTitle === 'Sin of Pride 傲慢稱') {
        handleHpChange(attackerType, attacker.finalStats.def * 0.04, 'heal');
    }
    if (attackerTitle === 'Sin of Envy 嫉妒稱' && Math.random() < 0.5) {
         handleHpChange(attackerType, attacker.finalStats.hp * 0.02, 'heal');
    }
    if (attackerTitle === 'Sins of Gluttony 暴食稱' && Math.random() < 0.30) {
        const damage = (attacker.baseStats.hp - attacker.currentHp) * 0.03;
        extraDamage += damage;
        handleHpChange(attackerType, damage, 'heal');
    }
    if (attackerTitle === 'Sin of Greed 貪婪稱' && attacker.hitCounters['貪婪稱號計數'] >= 2) {
        const stealAmount = attacker.finalStats.hp * 0.01;
        handleHpChange(attackerType, stealAmount, 'heal');
        handleHpChange(defenderType, -stealAmount, 'damage', attackerType);
        attacker.hitCounters['貪婪稱號計數'] = 0;
    }

    return { extraDamage };
}

function triggerPostHitEffects(attacker, defender, attackerType, defenderType, isCrit, damageDealt) {
    if (isCrit) {
        if (getSetPieces(attacker, 'POSEIDON') >= 4 && Math.random() < 0.35) addBuff(attackerType, { name: 'Poseidon_Crit_Buff', displayName: '海王祝福', duration: 2000, stat: 'healing_effect', value: 100 });
        if (attacker.selections.shields === 'Poseidon\'s Shield 海王盾' && Math.random() < 0.5) handleHpChange(attackerType, 2, 'heal');
        if (attacker.selections.titles === 'Sins of Wrath 憤怒稱' && Math.random() < 0.5) addBuff(attackerType, { name: 'Wrath_Title_DR', displayName: '憤怒減傷', duration: 1000, stat: 'dmg_reduc', value: 10 });
        if(getSetPieces(attacker, 'SAMAEL') >= 4) attacker.hitCounters['憤怒值'] = Math.min(10, (attacker.hitCounters['憤怒值'] || 0) + 2);
    }
    
    if (attacker.selections.titles === 'GOD OF THE SUN 阿波羅稱' && Math.random() < 0.15) {
        addBuff(defenderType, { name: 'Apollo_Title_Burn', displayName: '太陽神之燃', duration: 1000 });
    }
    if (attacker.selections.titles === 'THE GORGON 梅杜莎稱' && Math.random() < 0.15) {
        addBuff(defenderType, { name: 'Gorgon_Slow', displayName: '石化凝視減速', duration: 2000, stat: 'speed', value: -15 });
    }
    if (attacker.selections.shields === 'Star & Moon Ring 星月戒指' && attacker.hitCounters['星月戒指計數'] >= 4) {
        addBuff(attackerType, { name: 'Star_Moon_Speed', displayName: '星月之速', duration: 2000, stat: 'speed', value: 20 });
        attacker.hitCounters['星月戒指計數'] = 0;
    }
    if (attacker.selections.titles === 'Supereme' && attacker.hitCounters['至高計數'] >= 4) {
        addBuff(attackerType, { name: 'Supereme_Speed', displayName: '至高之速', duration: 1500, stat: 'speed', value: 10 });
        attacker.hitCounters['至高計數'] = 0;
    }

    if (attacker.selections.weapons === "Apollo's Sun Sword 阿波羅日輪劍" && Math.random() < 0.20) addBuff(defenderType, { name: 'Stun', displayName: '暈眩', duration: 1000 });
    if (attacker.selections.weapons === "Permafrost Sword 臻冰劍" && attacker.hitCounters['臻冰劍計數'] >= 5) {
        addBuff(defenderType, { name: 'Freeze', displayName: '冰凍', duration: 2000 });
        attacker.hitCounters['臻冰劍計數'] = 0;
    }
    if (attacker.selections.weapons === "Valkyrie's Divine Dual Blades 瓦爾基里雙刃" && Math.random() < 0.35) {
        if (!hasBuff(attacker, 'Valkyrie_Attacking_Again')) {
            addBuff(attackerType, { name: 'Valkyrie_Attacking_Again', duration: 200 }); 
            setTimeout(() => {attacker.canAttack = true; handleAttack(attackerType, defenderType)}, 200);
        }
    }
    
    if (attacker.selections.weapons === 'Flame Excalibur 火神劍' && attacker.hitCounters['火神劍計數'] >= 4) {
        attacker.hitCounters['火神劍計數'] = 0;
        addBuff(defenderType, { name: 'Flame_Vortex', displayName: '火焰漩渦', duration: 2000 });
        const hitTimes = Math.floor(Math.random() * 3) + 1;
        const damagePerHit = attacker.finalStats.hp * 0.03;
        for (let i = 0; i < hitTimes; i++) {
             setTimeout(() => {
                if (defender.currentHp > 0) {
                   handleHpChange(defenderType, -damagePerHit, 'damage', attackerType);
                   handleHpChange(attackerType, damagePerHit, 'heal', attackerType);
                }
            }, (i + 1) * 500);
        }
    }

    if (attacker.selections.weapons === "Mjollnir 雷神之槌" && Math.random() < 0.25) {
        if ((attacker.hitCounters['靜電計數'] || 0) > 0) {
            const stacks = attacker.hitCounters['靜電計數'];
            const extraDmg = 3 * stacks;
            handleHpChange(defenderType, -extraDmg, 'damage', attackerType);
            handleHpChange(attackerType, attacker.finalStats.dmg * 0.1 * stacks, 'heal');
            attacker.hitCounters['靜電計數'] = 0;
            triggerVisualEffect(defenderType, 'Mjollnir_Release', true);
        }
    }
    if (attacker.selections.weapons === 'Sin of Sloth Calamity Blade 怠惰劍') addBuff(attackerType, { name: 'Sloth_Blade_Effect', displayName: '怠惰效果', duration: 2000 });
    if (attacker.selections.weapons === "Medusa's Spear 梅杜莎矛" && Math.random() < 0.25) {
        const buff = getBuff(defender, 'Medusa_Poison') || { name: 'Medusa_Poison', displayName: '梅杜莎劇毒', duration: 3000, stacks: 0 };
        if (buff.stacks < 3) buff.stacks++;
        buff.duration = 3000;
        addBuff(defenderType, buff);
    }

    if (attacker.selections.weapons === 'Sin of Greed Golden Scythe 貪婪之鐮' && Math.random() < 0.25) {
        const buff = getBuff(defender, 'Greed_Scythe_Debuff') || { name: 'Greed_Scythe_Debuff', displayName: '貪婪慾望', duration: 2000, stat: 'dmg_amp', value: 0, stacks: 0 };
        if (buff.stacks < 3) buff.stacks++;
        buff.value = buff.stacks * -15; 
        buff.duration = 2000;
        addBuff(defenderType, buff);
    }
    
    if (getSetPieces(attacker, 'ARES') >= 4 && attacker.hitCounters['戰神之盾計數'] >= 4) {
        if (!hasBuff(attacker, 'Ares_Shield')) {
            addBuff(attackerType, { name: 'Ares_Shield', displayName: '戰神之盾', duration: 5000 });
            attacker.hitCounters['戰神之盾計數'] = 0;
        }
    }
    if (getSetPieces(attacker, 'APOLLO') >= 4 && attacker.hitCounters['太陽光環計數'] >= 4) {
        if (!hasBuff(attacker, 'Apollo_Sun_Aura')) {
            addBuff(attackerType, { name: 'Apollo_Sun_Aura', displayName: '太陽光環', duration: 3000 });
            attacker.hitCounters['太陽光環計數'] = 0;
        }
    }
    if (getSetPieces(attacker, 'FENRIR') >= 4 && attacker.hitCounters['芬尼爾狂暴計數'] >= 5) {
        if (!hasBuff(attacker, 'Fenrir_Rage')) {
            addBuff(attackerType, { name: 'Fenrir_Rage', displayName: '芬尼爾狂暴', duration: 3000, multi_stat: [{ stat: 'dmg', value: 6 }, { stat: 'lifesteal', value: 25 }, { stat: 'def', value: -4 }]});
            attacker.damageDealtInDuration['Fenrir_Rage'] = 0;
            attacker.hitCounters['芬尼爾狂暴計數'] = 0;
        }
    }
    if (getSetPieces(attacker, 'JORMUNGANDR') >= 4 && attacker.hitCounters['耶夢加得之盾計數'] >= 4) {
        if (!hasBuff(attacker, 'Jormungandr_Shield')) {
            const shieldHP = attacker.finalStats.def * 0.25;
            attacker.shield.hp += shieldHP;
            attacker.shield.max += shieldHP;
            addBuff(attackerType, { name: 'Jormungandr_Shield', duration: 3000, value: shieldHP });
            attacker.hitCounters['耶夢加得之盾計數'] = 0;
        }
    }
    if (getSetPieces(attacker, 'HELHEIM') >= 4 && attacker.hitCounters['海拉偷竊計數'] >= 4) {
        if (!hasBuff(defender, 'Helheim_Poison')) {
            const stealAmount = defender.finalStats.def * 0.25;
            handleHpChange(attackerType, stealAmount, 'heal');
            addBuff(defenderType, { name: 'Helheim_Poison', displayName: '海拉劇毒', duration: 1000 });
            attacker.hitCounters['海拉偷竊計數'] = 0;
        }
    }
    if (getSetPieces(attacker, 'CHIONE') >= 4 && attacker.hitCounters['霜凍領域計數'] >= 5) {
        if (!hasBuff(attacker, 'Chione_Frost_Domain')) {
            addBuff(attackerType, { name: 'Chione_Frost_Domain', displayName: '霜凍領域', duration: 3000, multi_stat: [{ stat: 'def', value: 5 }, { stat: 'lifesteal', value: 15 }, { stat: 'healing_effect', value: 50 }]});
            addBuff(defenderType, { name: 'Freeze', displayName: '冰凍', duration: 1500 });
            attacker.hitCounters['霜凍領域計數'] = 0;
        }
    }
    
    if (getSetPieces(attacker, 'HEPHAESTUS') >= 4) {
        addBuff(attackerType, { name: 'Hephaestus_DR_Buff', displayName: '火神減傷', duration: 5000, stat: 'dmg_reduc', value: 2 });
        if (!hasBuff(attacker, 'Hephaestus_Fireballs')) {
            attacker.hitCounters['火神能量計數']++;
            if (!hasBuff(attacker, 'Hephaestus_energy')) {
                if (attacker.hitCounters['火神能量計數'] > 0) {
                    addBuff(attackerType, { name: 'Hephaestus_energy', displayName: '火球能量', duration: Infinity });
                }
            }
            if (attacker.hitCounters['火神能量計數'] >= 12) {
                removeBuff(attackerType, 'Hephaestus_energy')
                addBuff(attackerType, { name: 'Hephaestus_Fireballs', displayName: '火球', duration: 3000, stacks: 3 });
                attacker.hitCounters['火神能量計數'] = 0;
            }
        }
    }
    if (getSetPieces(attacker, 'MEDUSA') >= 4 && attacker.hitCounters['梅杜莎石化計數'] >= 5) {
        attacker.hitCounters['梅杜莎石化計數'] = 0;
        addBuff(attackerType, { name: 'Medusa_Gaze', displayName: '石化凝視', duration: 3000 });
        addBuff(defenderType, { name: 'Medusa_Slow', displayName: '石化減速', duration: 1000, stat: 'speed', value: -20 });
        setTimeout(() => {
            addBuff(defenderType, { name: 'Petrify', displayName: '石化', duration: 2000 });
        }, 1000);
    }
    
    if (getSetPieces(attacker, 'MEOW') >= 4 && attacker.hitCounters['貓貓隱身計數'] >= 5) {
        if (!hasBuff(attacker, 'Meow_Invisibility')) {
            const buff = { name: 'Meow_Invisibility', displayName: '貓貓隱身', duration: 3000, stat: 'true_dmg', value: 0, stacks: 0 };
            addBuff(attackerType, buff);
            attacker.damageDealtInDuration['Meow_Invisibility'] = 0; 
            attacker.hitCounters['貓貓隱身計數'] = 0;
        }
    }
    if (hasBuff(attacker, 'Meow_Invisibility')) { 
        const buff = getBuff(attacker, 'Meow_Invisibility');
        if (buff.stacks < 4) {
            buff.stacks++;
            buff.value = buff.stacks * 3;
        }
    }
    if (getSetPieces(attacker, 'BELPHEGOR') >= 4) {
        if (!hasBuff(attacker, 'BELPHEGOR_SLEEP') && !hasBuff(attacker, 'Belphegor_Shield_Timer')) {
            addBuff(attackerType, { name: 'BELPHEGOR_SLEEP', displayName: '怠惰之眠', duration: 2000 });
            attacker.damageDealtInDuration['BELPHEGOR_SLEEP'] = 0;
        }
    }
     if (getSetPieces(attacker, 'LEVIATHAN') >= 4 && Math.random() < 0.45) {
        const buffs = [];
        if (defender.finalStats.dmg > attacker.finalStats.dmg) {
            buffs.push({ name: 'Leviathan_Buff_DEF', displayName: '嫉妒防禦', duration: 2000, stat: 'def', value: 5 });
            buffs.push({ name: 'Leviathan_Buff_DMG', displayName: '嫉妒攻擊', duration: 2000, stat: 'dmg', value: 12 });
        } else {
            buffs.push({ name: 'Leviathan_Buff_LS', displayName: '嫉妒吸血', duration: 2000, stat: 'lifesteal', value: 15 });
            buffs.push({ name: 'Leviathan_Buff_DR', displayName: '嫉妒減傷', duration: 2000, stat: 'dmg_reduc', value: 12 });
        }
        addBuff(attackerType, buffs[Math.floor(Math.random() * buffs.length)]);
    }
    if (getSetPieces(attacker, 'MAMMON') >= 4) {
        removeBuff(attackerType, 'Mammon_Steal_DMG', false); removeBuff(attackerType, 'Mammon_Steal_DR', false); removeBuff(attackerType, 'Mammon_Steal_HP', false);
        removeBuff(defenderType, 'Mammon_Debuff_DMG', false); removeBuff(defenderType, 'Mammon_Debuff_DR', false); removeBuff(defenderType, 'Mammon_Debuff_HP', false);
        
        const rand = Math.random();
        if (rand < 0.33) {
            addBuff(attackerType, { name: 'Mammon_Steal_DMG', displayName: '竊取攻擊', duration: 1000, stat: 'dmg', value: 4 });
            addBuff(defenderType, { name: 'Mammon_Debuff_DMG', displayName: '攻擊被竊', duration: 1000, stat: 'dmg', value: -4 });
        } else if (rand < 0.66) {
            addBuff(attackerType, { name: 'Mammon_Steal_DR', displayName: '竊取減傷', duration: 1000, stat: 'dmg_reduc', value: 8 });
            addBuff(defenderType, { name: 'Mammon_Debuff_DR', displayName: '減傷被竊', duration: 1000, stat: 'dmg_reduc', value: -8 });
        } else {
            const stealAmount = defender.finalStats.hp * 0.02;
            handleHpChange(attackerType, stealAmount, 'heal');
            handleHpChange(defenderType, -stealAmount, 'damage', attackerType);
            addBuff(attackerType, { name: 'Mammon_Steal_HP', displayName: '竊取生命', duration: 1000 });
            addBuff(defenderType, { name: 'Mammon_Debuff_HP', displayName: '生命被竊', duration: 1000 });
        }
    }
    handleStackingBuff(attacker, attackerType, "Rainbow Cat Sword 彩虹貓劍", { name: 'Rainbow_Cat_Buff', displayName: '彩虹貓之力', duration: 4000, stat: 'dmg', valuePerStack: 2, maxStacks: 6 });
    handleStackingBuff(attacker, attackerType, "Jormungandr's White Snake Sword 耶夢加得白蛇劍", { name: 'Jormungandr_TrueDmg', displayName: '白蛇真傷', duration: 4000, stat: 'true_dmg', valuePerStack: 1, maxStacks: 8 });
    handleStackingBuff(attacker, attackerType, 'Sin of Pride Sword 傲慢劍', { name: 'Pride_Sword_Dmg', displayName: '傲慢之擊', duration: 4000, stat: 'dmg', valuePerStack: 2.5, maxStacks: 7 });
    handleStackingBuff(attacker, attackerType, 'Sin of Wrath Demon Sword 憤怒劍', { name: 'Wrath_Sword_Crit', displayName: '憤怒爆率', duration: 4000, stat: 'cri_rate', valuePerStack: 12, maxStacks: 4 });
    handleStackingBuff(attacker, attackerType, 'FENRIR WOLF 芬尼爾狼稱', { name: 'Fenrir_Title_DMG', displayName: '芬尼爾狼稱號', duration: 4000, stat: 'dmg', valuePerStack: 1, maxStacks: 6 });
}

function triggerOnKillEffects(killer, victim, killerType, victimType) {
    if (killer.selections.titles === 'LORD OF HELHEIM 海拉稱') handleHpChange(killerType, killer.finalStats.hp * 0.20, 'heal');
    if (killer.selections.titles === 'Scarlet Knight 緋紅騎士') handleHpChange(killerType, 3, 'heal');
    if (killer.selections.titles === 'Silver Knight 銀牙騎士') addBuff(killerType, { name: 'Silver_Knight_HoT', displayName: '銀牙騎士回覆', duration: 5000 });
    if (killer.selections.titles === 'ESCAPE DOMINATOR') {
        const domBuff = getBuff(killer, 'Dominator_Stack') || { name: 'Dominator_Stack', displayName: '統治者層數', duration: Infinity, value: 0 };
        domBuff.value = Math.min(3, domBuff.value + 1);
        addBuff(killerType, domBuff);
    }
}

function handleStackingBuff(state, panelType, itemName, buffConfig) {
    if (state.selections.weapons !== itemName && state.selections.titles !== itemName) return;
    const existingBuff = getBuff(state, buffConfig.name);
    let newBuff;
    if (existingBuff) {
        newBuff = existingBuff;
        if (newBuff.stacks < buffConfig.maxStacks) {
            newBuff.stacks++;
        }
    } else {
        newBuff = { ...buffConfig, stacks: 1 };
    }
    newBuff.value = newBuff.stacks * buffConfig.valuePerStack;
    newBuff.duration = buffConfig.duration;
    addBuff(panelType, newBuff);
}


function incrementHitCounters(attacker) {
    if (!hasBuff(attacker, 'Ares_Shield')) if (attacker.hitCounters['戰神之盾計數'] !== undefined) attacker.hitCounters['戰神之盾計數']++;
    if (!hasBuff(attacker, 'Apollo_Sun_Aura')) if (attacker.hitCounters['太陽光環計數'] !== undefined) attacker.hitCounters['太陽光環計數']++;
    if (!hasBuff(attacker, 'Fenrir_Rage')) if (attacker.hitCounters['芬尼爾狂暴計數'] !== undefined) attacker.hitCounters['芬尼爾狂暴計數']++;
    if (!hasBuff(attacker, 'Jormungandr_Shield')) if (attacker.hitCounters['耶夢加得之盾計數'] !== undefined) attacker.hitCounters['耶夢加得之盾計數']++;
    if (!hasBuff(attacker, 'Chione_Frost_Domain')) if (attacker.hitCounters['霜凍領域計數'] !== undefined) attacker.hitCounters['霜凍領域計數']++;
    if (!hasBuff(attacker, 'Meow_Invisibility')) if (attacker.hitCounters['貓貓隱身計數'] !== undefined) attacker.hitCounters['貓貓隱身計數']++;
    if (!hasBuff(attacker, 'Medusa_Gaze')) if (attacker.hitCounters['梅杜莎石化計數'] !== undefined) attacker.hitCounters['梅杜莎石化計數']++;
    if (attacker.hitCounters['海拉偷竊計數'] !== undefined) attacker.hitCounters['海拉偷竊計數']++;
    if (attacker.hitCounters['哈迪斯劍計數'] !== undefined) attacker.hitCounters['哈迪斯劍計數']++;
    if (attacker.hitCounters['阿瑞斯矛計數'] !== undefined) attacker.hitCounters['阿瑞斯矛計數']++;
    if (attacker.hitCounters['冥府劍計數'] !== undefined) attacker.hitCounters['冥府劍計數']++;
    if (attacker.hitCounters['臻冰劍計數'] !== undefined) attacker.hitCounters['臻冰劍計數']++;
    if (attacker.hitCounters['怠惰稱號計數'] !== undefined) attacker.hitCounters['怠惰稱號計數']++;
    if (attacker.hitCounters['貪婪稱號計數'] !== undefined) attacker.hitCounters['貪婪稱號計數']++;
    if (attacker.hitCounters['火神劍計數'] !== undefined) attacker.hitCounters['火神劍計數']++;
    if (attacker.hitCounters['靜電計數'] !== undefined) attacker.hitCounters['靜電計數']++;
    if (attacker.hitCounters['芬尼爾弒神劍計數'] !== undefined) attacker.hitCounters['芬尼爾弒神劍計數']++;
    if (attacker.hitCounters['星月戒指計數'] !== undefined) attacker.hitCounters['星月戒指計數']++;
    if (attacker.hitCounters['至高計數'] !== undefined) attacker.hitCounters['至高計數']++;
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
    if (selections.weapons === "Fenrir's God-Killing Sword 芬尼爾弒神劍") state.hitCounters['芬尼爾弒神劍計數'] = 0;
    if (selections.shields === 'Star & Moon Ring 星月戒指') state.hitCounters['星月戒指計數'] = 0;
    if (selections.titles === 'Sins of Sloth 怠惰稱') state.hitCounters['怠惰稱號計數'] = 0;
    if (selections.titles === 'Sin of Greed 貪婪稱') state.hitCounters['貪婪稱號計數'] = 0;
    if (selections.titles === 'Supereme') state.hitCounters['至高計數'] = 0;
    if (getSetPieces(state, 'ARES') >= 4) state.hitCounters['戰神之盾計數'] = 0;
    if (getSetPieces(state, 'APOLLO') >= 4) state.hitCounters['太陽光環計數'] = 0;
    if (getSetPieces(state, 'FENRIR') >= 4) state.hitCounters['芬尼爾狂暴計數'] = 0;
    if (getSetPieces(state, 'JORMUNGANDR') >= 4) state.hitCounters['耶夢加得之盾計數'] = 0;
    if (getSetPieces(state, 'CHIONE') >= 4) state.hitCounters['霜凍領域計數'] = 0;
    if (getSetPieces(state, 'MEOW') >= 4) state.hitCounters['貓貓隱身計數'] = 0;
    if (getSetPieces(state, 'HELHEIM') >= 4) state.hitCounters['海拉偷竊計數'] = 0;
    if (getSetPieces(state, 'SAMAEL') >= 4) state.hitCounters['憤怒值'] = 0;
    if (getSetPieces(state, 'HEPHAESTUS') >= 4) state.hitCounters['火神能量計數'] = 0;
    if (getSetPieces(state, 'MEDUSA') >= 4) state.hitCounters['梅杜莎石化計數'] = 0;
}

function updateAllDisplays(panelType) {
    if (!panelType) return;
    updateFinalStats(panelType);
    updateStatsDisplay(panelType);
    updateSkillsDisplay(panelType);
    updateCurrentHpDisplay(panelType);
    updateEquipmentDisplay(panelType);
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
    setInterval(() => {
        gameTick();
        updateAllDisplays('player');
        updateAllDisplays('enemy');
    }, 100);
    EffectsController.init();
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

});

