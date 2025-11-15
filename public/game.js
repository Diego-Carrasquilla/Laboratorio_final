class RPGGame {
    constructor() {
        this.player = null;
        this.monsters = [];
        this.currentBattle = null;
        this.baseUrl = window.location.origin;
        
        this.initializeGame();
    }

    initializeGame() {
        this.bindEvents();
        this.loadMonsters();
    }

    bindEvents() {
        // Eventos de la pantalla de inicio
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startGame();
        });

        // Eventos de la pantalla principal
        document.getElementById('heal-btn').addEventListener('click', () => this.healPlayer());
        document.getElementById('buy-potion-btn').addEventListener('click', () => this.buyPotion());

        // Eventos de combate
        document.getElementById('attack-normal-btn').addEventListener('click', () => this.attack('normal'));
        document.getElementById('attack-heavy-btn').addEventListener('click', () => this.attack('heavy'));
        document.getElementById('attack-quick-btn').addEventListener('click', () => this.attack('quick'));
        document.getElementById('heal-battle-btn').addEventListener('click', () => this.usePotion());
        document.getElementById('flee-btn').addEventListener('click', () => this.flee());

        // Evento de reinicio
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
    }

    async startGame() {
        const nameInput = document.getElementById('player-name');
        const playerName = nameInput.value.trim();

        if (!playerName) {
            this.showNotification('Por favor, ingresa tu nombre', 'error');
            return;
        }

        try {
            // Preguntar si quiere reiniciar si ya existe el jugador
            let reset = false;
            if (this.player && this.player.name === playerName) {
                reset = confirm('¿Quieres reiniciar tu personaje? Se perderá todo el progreso.');
            }

            const response = await fetch(`${this.baseUrl}/api/player/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: playerName, reset })
            });

            const data = await response.json();
            
            if (data.success) {
                this.player = data.player;
                this.showScreen('exploration-screen');
                this.updatePlayerDisplay();
                
                if (data.wasReset) {
                    this.showNotification(`¡Personaje reiniciado! Bienvenido de nuevo, ${playerName}!`, 'success');
                } else if (data.isNewPlayer) {
                    this.showNotification(`¡Bienvenido, ${playerName}!`, 'success');
                } else {
                    this.showNotification(`¡Bienvenido de vuelta, ${playerName}!`, 'success');
                }
            } else {
                this.showNotification('Error al crear personaje', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error de conexión', 'error');
        }
    }

    async loadMonsters() {
        try {
            const response = await fetch(`${this.baseUrl}/api/monsters`);
            const data = await response.json();
            this.monsters = data.monsters;
            this.displayMonsters();
        } catch (error) {
            console.error('Error loading monsters:', error);
        }
    }

    displayMonsters() {
        const monstersGrid = document.getElementById('monsters-grid');
        monstersGrid.innerHTML = '';

        this.monsters.forEach(monster => {
            const monsterCard = document.createElement('div');
            monsterCard.className = 'monster-card';
            
            // Determinar si el jugador puede enfrentar este monstruo
            const levelDiff = this.player ? Math.abs(monster.level - this.player.level) : 0;
            const isRecommended = levelDiff <= 1;
            const isDifficult = levelDiff > 2;
            
            monsterCard.innerHTML = `
                <h4>${this.getMonsterEmoji(monster.type || monster.name)} ${monster.name}</h4>
                <div class="monster-level ${isRecommended ? 'recommended' : isDifficult ? 'difficult' : ''}">
                    Nivel ${monster.level}
                </div>
                <div class="monster-stats">
                    <div>💚 HP: ${monster.hp}</div>
                    <div>⚔️ ATK: ${monster.attack}</div>
                    <div>🛡️ DEF: ${monster.defense}</div>
                    <div>🏆 Oro: ${monster.gold || 'Variable'}</div>
                </div>
            `;
            
            if (isDifficult) {
                monsterCard.classList.add('difficult-monster');
            } else if (isRecommended) {
                monsterCard.classList.add('recommended-monster');
            }
            
            monsterCard.addEventListener('click', () => this.startBattle(monster));
            monstersGrid.appendChild(monsterCard);
        });
    }

    getMonsterEmoji(monsterTypeOrName) {
        const emojis = {
            // Por tipo
            'beast': '🐺',
            'undead': '💀', 
            'demon': '👹',
            'dragon': '🐲',
            'elemental': '🔥',
            'construct': '🏛️',
            // Por nombre (compatibilidad)
            'Goblin': '👺',
            'Orc': '👹',
            'Troll': '🧌',
            'Dragon': '🐲',
            'Lobo': '🐺',
            'Esqueleto': '💀'
        };
        return emojis[monsterTypeOrName] || '👾';
    }

    async startBattle(monster) {
        if (!this.player) return;

        try {
            const response = await fetch(`${this.baseUrl}/api/battle/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerId: this.player.id,
                    monsterId: monster.id
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentBattle = data.battle;
                this.showScreen('battle-screen');
                this.updateBattleDisplay();
                this.clearBattleLog();
                this.addToBattleLog(`¡Encuentras un ${monster.name}! ¡Prepárate para el combate!`);
                this.showNotification(`¡Combate iniciado contra ${monster.name}!`, 'warning');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error al iniciar combate', 'error');
        }
    }

    async attack(attackType = 'normal') {
        if (!this.currentBattle) return;

        try {
            const response = await fetch(`${this.baseUrl}/api/battle/attack`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    battleId: this.currentBattle.id,
                    attackType: attackType
                })
            });

            const data = await response.json();
            
            if (data.success) {
                const result = data.result;
                
                // Actualizar HP del jugador y monstruo en la batalla actual
                if (result.playerAttack) {
                    this.currentBattle.monster.currentHp = result.playerAttack.monsterHp;
                }
                
                if (result.monsterAttack) {
                    this.currentBattle.player.currentHp = result.monsterAttack.playerHp;
                }
                
                // Mostrar log de combate
                result.battleLog.forEach(log => this.addToBattleLog(log));
                
                // Actualizar displays
                this.updateBattleDisplay();
                
                // Actualizar datos del jugador si hay victoria
                if (result.victory) {
                    // Actualizar jugador desde el servidor
                    await this.refreshPlayerData();
                    this.updatePlayerDisplay();
                    
                    // Dar tiempo para ver el resultado antes de cerrar
                    setTimeout(() => {
                        this.endBattle('victory');
                    }, 2000);
                } else if (result.defeat) {
                    // Actualizar jugador desde el servidor
                    await this.refreshPlayerData();
                    this.updatePlayerDisplay();
                    
                    // Dar tiempo para ver el resultado antes de cerrar
                    setTimeout(() => {
                        this.endBattle('defeat');
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error en el ataque', 'error');
        }
    }

    async refreshPlayerData() {
        try {
            const response = await fetch(`${this.baseUrl}/api/player/${this.player.id}`);
            const data = await response.json();
            if (data.player) {
                this.player = data.player;
            }
        } catch (error) {
            console.error('Error refreshing player data:', error);
        }
    }

    async usePotion() {
        if (!this.currentBattle) return;
        
        // Verificar si el inventario es un objeto o array
        let hasPotions = false;
        if (typeof this.player.inventory === 'object' && !Array.isArray(this.player.inventory)) {
            hasPotions = (this.player.inventory['Poción de vida'] || 0) > 0;
        } else {
            hasPotions = this.player.inventory.includes('Poción de vida');
        }
        
        if (!hasPotions) {
            this.showNotification('No tienes pociones de vida', 'error');
            return;
        }

        // Usar poción directamente en el combate
        try {
            const response = await fetch(`${this.baseUrl}/api/battle/use-potion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    battleId: this.currentBattle.id,
                    playerId: this.player.id
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Actualizar HP del jugador y monstruo en la batalla actual
                if (data.playerHp !== undefined) {
                    this.currentBattle.player.currentHp = data.playerHp;
                }
                if (data.monsterHp !== undefined) {
                    this.currentBattle.monster.currentHp = data.monsterHp;
                }
                
                // Actualizar jugador
                await this.refreshPlayerData();
                this.updatePlayerDisplay();
                this.updateBattleDisplay();
                
                // Mostrar log de combate
                data.battleLog.forEach(log => this.addToBattleLog(log));
                
                // Verificar resultado del combate
                if (data.defeat) {
                    // Dar tiempo para ver el resultado
                    setTimeout(() => {
                        this.endBattle('defeat');
                    }, 2000);
                }
            } else {
                this.showNotification(data.error || 'Error al usar poción', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error al usar poción', 'error');
        }
    }

    flee() {
        this.addToBattleLog('¡Huiste del combate!');
        setTimeout(() => {
            this.endBattle('flee');
        }, 1000);
    }

    endBattle(result) {
        this.currentBattle = null;
        this.showScreen('exploration-screen');
        this.updatePlayerDisplay();
        
        if (result === 'victory') {
            this.showNotification('¡Victoria! Has derrotado al enemigo', 'success');
        } else if (result === 'defeat') {
            this.showNotification('Has sido derrotado, pero puedes continuar', 'warning');
        } else if (result === 'flee') {
            this.showNotification('Escapaste del combate', 'warning');
        }
    }

    async healPlayer() {
        if (!this.player) return;

        try {
            const response = await fetch(`${this.baseUrl}/api/player/${this.player.id}/heal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.player = data.player;
                this.updatePlayerDisplay();
                this.showNotification('Te has curado completamente', 'success');
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error al curar', 'error');
        }
    }

    async buyPotion() {
        if (!this.player) return;

        try {
            const response = await fetch(`${this.baseUrl}/api/player/${this.player.id}/buy-potion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.player = data.player;
                this.updatePlayerDisplay();
                this.showNotification('Poción comprada', 'success');
            } else {
                this.showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Error al comprar poción', 'error');
        }
    }

    updatePlayerDisplay() {
        if (!this.player) return;

        document.getElementById('player-name-display').textContent = this.player.name;
        document.getElementById('player-level').textContent = this.player.level;
        document.getElementById('player-hp').textContent = this.player.hp;
        document.getElementById('player-max-hp').textContent = this.player.maxHp;
        document.getElementById('player-gold').textContent = this.player.gold;
        document.getElementById('player-exp').textContent = this.player.exp;
        document.getElementById('player-exp-next').textContent = this.player.expToNext;

        // Actualizar inventario
        const inventoryItems = document.getElementById('inventory-items');
        inventoryItems.innerHTML = '';
        
        // Si el inventario es un objeto, mostrar items con cantidades
        if (typeof this.player.inventory === 'object' && !Array.isArray(this.player.inventory)) {
            for (const [itemName, quantity] of Object.entries(this.player.inventory)) {
                if (quantity > 0) {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'inventory-item';
                    itemElement.innerHTML = `${itemName} <span class="item-count">(${quantity})</span>`;
                    inventoryItems.appendChild(itemElement);
                }
            }
        } else {
            // Si es un array (compatibilidad con versión anterior)
            this.player.inventory.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'inventory-item';
                itemElement.textContent = item;
                inventoryItems.appendChild(itemElement);
            });
        }
        
        if (inventoryItems.children.length === 0) {
            inventoryItems.innerHTML = '<div class="no-items">Sin objetos</div>';
        }

        // Actualizar botones según oro
        const healBtn = document.getElementById('heal-btn');
        const buyPotionBtn = document.getElementById('buy-potion-btn');
        
        if (healBtn) healBtn.disabled = this.player.gold < 20;
        if (buyPotionBtn) buyPotionBtn.disabled = this.player.gold < 30;
    }

    updateBattleDisplay() {
        if (!this.currentBattle) return;

        const player = this.currentBattle.player || this.player;
        const monster = this.currentBattle.monster;

        // Actualizar nombres
        document.getElementById('battle-player-name').textContent = player.name;
        document.getElementById('battle-monster-name').textContent = monster.name;

        // Actualizar HP - usar currentHp si existe, sino hp
        const playerCurrentHp = player.currentHp !== undefined ? player.currentHp : player.hp;
        const playerMaxHp = player.maxHp;
        const playerHpPercent = Math.max(0, (playerCurrentHp / playerMaxHp) * 100);
        
        const monsterCurrentHp = monster.currentHp !== undefined ? monster.currentHp : monster.hp;
        const monsterMaxHp = monster.hp;
        const monsterHpPercent = Math.max(0, (monsterCurrentHp / monsterMaxHp) * 100);

        document.getElementById('player-hp-bar').style.width = `${playerHpPercent}%`;
        document.getElementById('monster-hp-bar').style.width = `${monsterHpPercent}%`;

        document.getElementById('battle-player-hp').textContent = `${Math.floor(playerCurrentHp)}/${playerMaxHp}`;
        document.getElementById('battle-monster-hp').textContent = `${Math.floor(monsterCurrentHp)}/${monsterMaxHp}`;

        // Actualizar botones
        const healBattleBtn = document.getElementById('heal-battle-btn');
        let hasPotions = false;
        if (typeof this.player.inventory === 'object' && !Array.isArray(this.player.inventory)) {
            hasPotions = (this.player.inventory['Poción de vida'] || 0) > 0;
        } else {
            hasPotions = this.player.inventory.includes('Poción de vida');
        }
        healBattleBtn.disabled = !hasPotions;
    }

    addToBattleLog(message) {
        const logContent = document.getElementById('log-content');
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = message;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    clearBattleLog() {
        document.getElementById('log-content').innerHTML = '';
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        notifications.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    restartGame() {
        this.player = null;
        this.currentBattle = null;
        document.getElementById('player-name').value = '';
        this.showScreen('start-screen');
        this.showNotification('Nueva aventura iniciada', 'info');
    }
}

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new RPGGame();
});