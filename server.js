const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Base de datos en memoria para el demo
const players = new Map();
const activeBattles = new Map();
const monsters = [
    { id: 1, name: 'Goblin', hp: 35, maxHp: 35, attack: 12, defense: 3, exp: 20, gold: 15, level: 1, type: 'basic' },
    { id: 2, name: 'Orc', hp: 60, maxHp: 60, attack: 18, defense: 6, exp: 35, gold: 25, level: 2, type: 'warrior' },
    { id: 3, name: 'Troll', hp: 100, maxHp: 100, attack: 25, defense: 8, exp: 60, gold: 40, level: 3, type: 'tank' },
    { id: 4, name: 'Skeleton Warrior', hp: 45, maxHp: 45, attack: 20, defense: 4, exp: 30, gold: 20, level: 2, type: 'undead' },
    { id: 5, name: 'Dark Wizard', hp: 55, maxHp: 55, attack: 30, defense: 3, exp: 50, gold: 35, level: 3, type: 'mage' },
    { id: 6, name: 'Dragon', hp: 180, maxHp: 180, attack: 35, defense: 15, exp: 150, gold: 100, level: 5, type: 'boss' }
];

// Función para crear un nuevo jugador
function createPlayer(name) {
    return {
        id: uuidv4(),
        name,
        level: 1,
        hp: 120,
        maxHp: 120,
        attack: 20,
        defense: 8,
        exp: 0,
        expToNext: 100,
        gold: 100,
        criticalChance: 0.15, // 15% posibilidad de crítico
        criticalMultiplier: 1.8, // x1.8 daño crítico
        battlesWon: 0,
        battlesLost: 0,
        monstersDefeated: {},
        inventory: {
            'Poción de vida': 3,
            'Poción de maná': 2,
            'Espada de hierro': 1
        },
        equipment: {
            weapon: 'Espada de hierro',
            armor: null,
            accessory: null
        },
        stats: {
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            criticalHits: 0,
            potionsUsed: 0
        }
    };
}

// Función para calcular daño avanzado
function calculateDamage(attacker, defender, attackType = 'normal') {
    let baseDamage = attacker.attack;
    const defense = defender.defense;
    let isCritical = false;
    let damageMultiplier = 1;
    
    // Variación de daño base (+/- 20%)
    const variation = (Math.random() * 0.4) - 0.2;
    baseDamage = Math.floor(baseDamage * (1 + variation));
    
    // Calcular crítico si es un jugador
    if (attacker.criticalChance && Math.random() < attacker.criticalChance) {
        isCritical = true;
        damageMultiplier = attacker.criticalMultiplier || 2.0;
    }
    
    // Tipos de ataque especiales
    if (attackType === 'heavy') {
        damageMultiplier *= 1.5;
        baseDamage = Math.floor(baseDamage * 1.3);
    } else if (attackType === 'quick') {
        damageMultiplier *= 0.7;
        baseDamage = Math.floor(baseDamage * 0.8);
    }
    
    // Calcular daño final
    let finalDamage = Math.max(1, (baseDamage * damageMultiplier) - defense);
    finalDamage = Math.floor(finalDamage);
    
    return {
        damage: finalDamage,
        isCritical,
        attackType,
        baseDamage: Math.floor(baseDamage / damageMultiplier),
        damageMultiplier
    };
}

// Función para obtener un monstruo aleatorio del nivel apropiado
function getRandomMonster(playerLevel) {
    const availableMonsters = monsters.filter(monster => {
        return monster.level <= playerLevel + 1 && monster.level >= Math.max(1, playerLevel - 1);
    });
    
    if (availableMonsters.length === 0) {
        return monsters[0]; // Fallback al primer monstruo
    }
    
    return availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
}

// Función para resetear estadísticas del jugador al crear uno nuevo
function resetPlayerForNewGame(player) {
    // Mantener el nombre e ID, resetear todo lo demás
    const originalName = player.name;
    const originalId = player.id;
    
    // Crear nuevo jugador con estadísticas frescas
    const newPlayerData = createPlayer(originalName);
    newPlayerData.id = originalId;
    
    return newPlayerData;
}

// Función para manejar la muerte del jugador
function handlePlayerDefeat(player) {
    player.battlesLost++;
    player.stats.totalDamageReceived += player.maxHp - player.hp;
    
    // Penalización por derrota
    player.gold = Math.max(0, Math.floor(player.gold * 0.8)); // Perder 20% del oro
    player.hp = Math.floor(player.maxHp * 0.25); // Revivir con 25% de HP
    
    return player;
}

// Función para subir de nivel mejorada
function levelUp(player) {
    const oldLevel = player.level;
    player.level++;
    
    // Incrementos por nivel
    const hpIncrease = 25 + (player.level * 5);
    const attackIncrease = 4 + Math.floor(player.level / 2);
    const defenseIncrease = 3 + Math.floor(player.level / 3);
    
    player.maxHp += hpIncrease;
    player.hp = player.maxHp; // Curar completamente al subir de nivel
    player.attack += attackIncrease;
    player.defense += defenseIncrease;
    
    // Mejorar posibilidad de crítico cada 3 niveles
    if (player.level % 3 === 0) {
        player.criticalChance = Math.min(0.4, player.criticalChance + 0.05);
    }
    
    // Recompensas por subir de nivel
    const goldReward = player.level * 50;
    player.gold += goldReward;
    
    // Agregar poción de regalo cada 2 niveles
    if (player.level % 2 === 0) {
        player.inventory['Poción de vida'] = (player.inventory['Poción de vida'] || 0) + 1;
    }
    
    // EXP requerida para siguiente nivel (progresión exponencial)
    player.exp = 0;
    player.expToNext = Math.floor(100 * Math.pow(1.5, player.level - 1));
    
    return {
        player,
        levelUpRewards: {
            hpIncrease,
            attackIncrease,
            defenseIncrease,
            goldReward,
            newLevel: player.level,
            criticalChanceIncrease: player.level % 3 === 0 ? 0.05 : 0,
            potionReward: player.level % 2 === 0
        }
    };
}

// Rutas de la API

// Crear nuevo jugador o resetear existente
app.post('/api/player/create', (req, res) => {
    const { name, reset = false } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    let player;
    
    // Buscar jugador existente
    const existingPlayer = Array.from(players.values()).find(p => p.name === name);
    
    if (existingPlayer && reset) {
        // Resetear jugador existente
        player = resetPlayerForNewGame(existingPlayer);
        players.set(player.id, player);
    } else if (existingPlayer) {
        // Devolver jugador existente
        player = existingPlayer;
    } else {
        // Crear nuevo jugador
        player = createPlayer(name);
        players.set(player.id, player);
    }
    
    res.json({ 
        success: true, 
        player,
        isNewPlayer: !existingPlayer,
        wasReset: existingPlayer && reset
    });
});

// Obtener información del jugador
app.get('/api/player/:id', (req, res) => {
    const { id } = req.params;
    const player = players.get(id);
    
    if (!player) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    res.json({ player });
});

// Obtener lista de monstruos disponibles
app.get('/api/monsters', (req, res) => {
    res.json({ monsters });
});

// Obtener monstruo aleatorio basado en el nivel del jugador
app.get('/api/monsters/random/:playerId', (req, res) => {
    const { playerId } = req.params;
    const player = players.get(playerId);
    
    if (!player) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    const randomMonster = getRandomMonster(player.level);
    res.json({ monster: randomMonster });
});

// Iniciar combate
app.post('/api/battle/start', (req, res) => {
    const { playerId, monsterId } = req.body;
    const player = players.get(playerId);
    let monster = monsters.find(m => m.id === monsterId);
    
    if (!player) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    if (!monster) {
        // Si no se especifica monstruo, obtener uno aleatorio
        monster = getRandomMonster(player.level);
    }
    
    // Crear instancia del monstruo para el combate (clonar para no modificar el original)
    const battleMonster = { 
        ...monster, 
        currentHp: monster.hp,
        maxHp: monster.hp,
        battleId: uuidv4()
    };
    
    // Crear batalla
    const battle = {
        id: uuidv4(),
        player: { 
            ...player,
            currentHp: player.hp,
            battleStats: {
                totalDamageDealt: 0,
                totalDamageReceived: 0,
                criticalHits: 0,
                attacksLaunched: 0,
                monstersDefeated: 0,
                totalGoldEarned: 0,
                deaths: 0
            }
        },
        monster: battleMonster,
        turn: 'player',
        turnCount: 0,
        battleLog: [],
        startTime: new Date().toISOString()
    };
    
    // Guardar batalla activa
    activeBattles.set(battle.id, battle);
    
    res.json({
        success: true,
        battle: {
            id: battle.id,
            player: battle.player,
            monster: battle.monster,
            turn: battle.turn
        }
    });
});

// Atacar en combate
app.post('/api/battle/attack', (req, res) => {
    console.log('Recibida petición de ataque:', req.body);
    const { battleId, attackType = 'normal' } = req.body;
    const battle = activeBattles.get(battleId);
    
    console.log('Battle ID:', battleId);
    console.log('Batalla encontrada:', !!battle);
    console.log('Batallas activas:', activeBattles.size);
    
    if (!battle) {
        console.log('Error: Batalla no encontrada');
        return res.status(404).json({ error: 'Batalla no encontrada' });
    }
    
    if (battle.turn !== 'player') {
        return res.status(400).json({ error: 'No es el turno del jugador' });
    }
    
    let result = {};
    let battleEnded = false;
    
    try {
        console.log('Calculando daño...');
        // Calcular daño del jugador
        const playerDamage = calculateDamage(battle.player, battle.monster, attackType);
        console.log('Daño calculado:', playerDamage);
        
        battle.monster.currentHp = Math.max(0, battle.monster.currentHp - playerDamage.damage);
        
        // Actualizar estadísticas del jugador
        battle.player.battleStats.totalDamageDealt += playerDamage.damage;
        battle.player.battleStats.attacksLaunched++;
        if (playerDamage.isCritical) {
            battle.player.battleStats.criticalHits++;
        }
        
        const battleLog = [`Atacas al ${battle.monster.name} con ${attackType === 'heavy' ? 'ataque poderoso' : attackType === 'quick' ? 'ataque rápido' : 'ataque normal'}`];
        battleLog.push(`Infliges ${playerDamage.damage} puntos de daño${playerDamage.isCritical ? ' (¡CRÍTICO!)' : ''}`);
        
        result.playerAttack = {
            damage: playerDamage.damage,
            isCritical: playerDamage.isCritical,
            attackType: attackType,
            monsterHp: battle.monster.currentHp
        };
        
        // Verificar si el monstruo murió
        if (battle.monster.currentHp <= 0) {
            battleEnded = true;
            const expGained = Math.floor(battle.monster.level * 10 * (1 + Math.random() * 0.5));
            const goldGained = battle.monster.gold || Math.floor(battle.monster.level * 5 * (1 + Math.random() * 0.3));
            
            battleLog.push(`¡Has derrotado al ${battle.monster.name}!`);
            battleLog.push(`Ganas ${expGained} puntos de experiencia y ${goldGained} monedas de oro`);
            
            // Actualizar jugador real
            const realPlayer = players.get(battle.player.id);
            if (realPlayer) {
                realPlayer.exp += expGained;
                realPlayer.gold += goldGained;
                
                // Verificar subida de nivel
                let leveledUp = false;
                while (realPlayer.exp >= realPlayer.expToNext) {
                    realPlayer.exp -= realPlayer.expToNext;
                    const oldLevel = realPlayer.level;
                    levelUp(realPlayer);
                    leveledUp = true;
                    battleLog.push(`¡Subiste de nivel! Ahora eres nivel ${realPlayer.level}`);
                }
                
                result.victory = {
                    expGained,
                    goldGained,
                    leveledUp,
                    newLevel: realPlayer.level,
                    newStats: leveledUp ? {
                        hp: realPlayer.maxHp,
                        attack: realPlayer.attack,
                        defense: realPlayer.defense
                    } : null
                };
            }
            
            // Eliminar batalla
            activeBattles.delete(battleId);
        } else {
            // Turno del monstruo
            const monsterDamage = calculateDamage(battle.monster, battle.player, 'normal');
            const actualDamage = Math.max(1, monsterDamage.damage);
            battle.player.currentHp = Math.max(0, battle.player.currentHp - actualDamage);
            
            battleLog.push(`El ${battle.monster.name} te ataca`);
            battleLog.push(`Recibes ${actualDamage} puntos de daño${monsterDamage.isCritical ? ' (¡CRÍTICO!)' : ''}`);
            
            result.monsterAttack = {
                damage: actualDamage,
                isCritical: monsterDamage.isCritical,
                playerHp: battle.player.currentHp
            };
            
            // Verificar si el jugador murió
            if (battle.player.currentHp <= 0) {
                battleEnded = true;
                battleLog.push('¡Has sido derrotado!');
                
                // Actualizar jugador real con pérdida
                const realPlayer = players.get(battle.player.id);
                if (realPlayer) {
                    realPlayer.hp = Math.floor(realPlayer.maxHp * 0.1); // Revivir con 10% de vida
                }
                
                result.defeat = true;
                activeBattles.delete(battleId);
            }
        }
        
        battle.turnCount++;
        result.battleLog = battleLog;
        result.battleEnded = battleEnded;
        result.turnCount = battle.turnCount;
        
        console.log('Resultado del combate:', result);
        res.json({ success: true, result });
        
    } catch (error) {
        console.error('Error en combate:', error);
        res.status(500).json({ error: 'Error interno en el combate', details: error.message });
    }
});

// Funciones auxiliares
function getRandomMonster(playerLevel) {
    // Filtrar monstruos apropiados para el nivel del jugador
    const suitableMonsters = monsters.filter(monster => {
        const levelDiff = Math.abs(monster.level - playerLevel);
        return levelDiff <= 2; // Monstruos dentro de 2 niveles
    });
    
    if (suitableMonsters.length === 0) {
        // Si no hay monstruos apropiados, usar uno aleatorio
        return monsters[Math.floor(Math.random() * monsters.length)];
    }
    
    return suitableMonsters[Math.floor(Math.random() * suitableMonsters.length)];
}

function resetPlayerForNewGame(player) {
    const newPlayer = createPlayer(player.name);
    newPlayer.id = player.id; // Mantener el mismo ID
    return newPlayer;
}

// Curar jugador en la ciudad
app.post('/api/player/:id/heal', (req, res) => {
    const { id } = req.params;
    const player = players.get(id);
    
    if (!player) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    const healCost = 20;
    if (player.gold < healCost) {
        return res.status(400).json({ error: 'No tienes suficiente oro' });
    }
    
    player.gold -= healCost;
    player.hp = player.maxHp;
    
    players.set(id, player);
    
    res.json({ success: true, message: 'Te has curado completamente', player });
});

// Comprar poción
app.post('/api/player/:id/buy-potion', (req, res) => {
    const { id } = req.params;
    const player = players.get(id);
    
    if (!player) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    const potionCost = 30;
    if (player.gold < potionCost) {
        return res.status(400).json({ error: 'No tienes suficiente oro' });
    }
    
    player.gold -= potionCost;
    
    // Verificar si el inventario es un objeto o array
    if (typeof player.inventory === 'object' && !Array.isArray(player.inventory)) {
        player.inventory['Poción de vida'] = (player.inventory['Poción de vida'] || 0) + 1;
    } else {
        player.inventory.push('Poción de vida');
    }
    
    players.set(id, player);
    
    res.json({ success: true, message: 'Poción comprada', player });
});

// Usar poción en combate
app.post('/api/battle/use-potion', (req, res) => {
    const { battleId, playerId } = req.body;
    const battle = activeBattles.get(battleId);
    const realPlayer = players.get(playerId);
    
    if (!battle) {
        return res.status(404).json({ error: 'Batalla no encontrada' });
    }
    
    if (!realPlayer) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    // Verificar si tiene pociones
    let hasPotions = false;
    if (typeof realPlayer.inventory === 'object' && !Array.isArray(realPlayer.inventory)) {
        hasPotions = (realPlayer.inventory['Poción de vida'] || 0) > 0;
    } else {
        hasPotions = realPlayer.inventory.includes('Poción de vida');
    }
    
    if (!hasPotions) {
        return res.status(400).json({ error: 'No tienes pociones de vida' });
    }
    
    const battleLog = [];
    
    // Usar poción
    const healAmount = Math.floor(realPlayer.maxHp * 0.5);
    const oldHp = battle.player.currentHp;
    battle.player.currentHp = Math.min(realPlayer.maxHp, battle.player.currentHp + healAmount);
    const actualHeal = battle.player.currentHp - oldHp;
    
    // Actualizar HP del jugador real
    realPlayer.hp = battle.player.currentHp;
    
    // Remover poción del inventario
    if (typeof realPlayer.inventory === 'object' && !Array.isArray(realPlayer.inventory)) {
        realPlayer.inventory['Poción de vida']--;
    } else {
        const index = realPlayer.inventory.indexOf('Poción de vida');
        if (index > -1) {
            realPlayer.inventory.splice(index, 1);
        }
    }
    
    battleLog.push('Usas una Poción de vida');
    battleLog.push(`Recuperas ${actualHeal} puntos de vida`);
    
    // Turno del monstruo
    const monsterDamage = calculateDamage(battle.monster, battle.player, 'normal');
    const actualDamage = Math.max(1, monsterDamage.damage);
    battle.player.currentHp = Math.max(0, battle.player.currentHp - actualDamage);
    realPlayer.hp = battle.player.currentHp;
    
    battleLog.push(`El ${battle.monster.name} te ataca`);
    battleLog.push(`Recibes ${actualDamage} puntos de daño${monsterDamage.isCritical ? ' (¡CRÍTICO!)' : ''}`);
    
    // Verificar si el jugador murió
    let defeat = false;
    if (battle.player.currentHp <= 0) {
        defeat = true;
        battleLog.push('¡Has sido derrotado!');
        realPlayer.hp = Math.floor(realPlayer.maxHp * 0.1);
        activeBattles.delete(battleId);
    }
    
    battle.turnCount++;
    players.set(playerId, realPlayer);
    
    res.json({ 
        success: true, 
        battleLog, 
        defeat,
        playerHp: battle.player.currentHp,
        monsterHp: battle.monster.currentHp
    });
});

// Verificación de salud del servidor
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        players: players.size,
        activeBattles: activeBattles.size
    });
});

// Servir archivos estáticos del frontend
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Servidor RPG funcionando en puerto ${PORT}`);
});