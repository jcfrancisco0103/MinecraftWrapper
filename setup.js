#!/usr/bin/env node

/**
 * Minecraft Server Wrapper - Setup Configuration Script
 * ====================================================
 * Interactive setup script for configuring the Minecraft server
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Helper function to print colored text
function colorLog(color, text) {
    console.log(colors[color] + text + colors.reset);
}

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promisify readline question
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Default configuration
const defaultConfig = {
    wrapper: {
        port: 5900,
        maxRam: '2G',
        minRam: '1G',
        useAikarsFlags: true
    },
    minecraft: {
        serverPort: 25565,
        gamemode: 'survival',
        difficulty: 'easy',
        maxPlayers: 20,
        onlineMode: true,
        whiteList: false,
        motd: 'A Minecraft Server managed by Minecraft Server Wrapper',
        enableRcon: false,
        rconPort: 25575,
        rconPassword: ''
    }
};

// Server properties mapping
const serverPropertiesMap = {
    'server-port': 'serverPort',
    'gamemode': 'gamemode',
    'difficulty': 'difficulty',
    'max-players': 'maxPlayers',
    'online-mode': 'onlineMode',
    'white-list': 'whiteList',
    'motd': 'motd',
    'enable-rcon': 'enableRcon',
    'rcon.port': 'rconPort',
    'rcon.password': 'rconPassword'
};

// Validation functions
function validatePort(port) {
    const num = parseInt(port);
    return !isNaN(num) && num >= 1 && num <= 65535;
}

function validateRam(ram) {
    return /^\d+[GMgm]$/.test(ram);
}

function validateGamemode(gamemode) {
    return ['survival', 'creative', 'adventure', 'spectator'].includes(gamemode.toLowerCase());
}

function validateDifficulty(difficulty) {
    return ['peaceful', 'easy', 'normal', 'hard'].includes(difficulty.toLowerCase());
}

// Setup functions
async function setupWrapperConfig() {
    colorLog('cyan', '\n=== Wrapper Configuration ===');
    
    const config = { ...defaultConfig.wrapper };
    
    // Web interface port
    const portInput = await question(`Web interface port (${config.port}): `);
    if (portInput && validatePort(portInput)) {
        config.port = parseInt(portInput);
    } else if (portInput) {
        colorLog('yellow', 'Invalid port, using default: ' + config.port);
    }
    
    // RAM settings
    const maxRamInput = await question(`Maximum RAM (${config.maxRam}): `);
    if (maxRamInput && validateRam(maxRamInput)) {
        config.maxRam = maxRamInput.toUpperCase();
    } else if (maxRamInput) {
        colorLog('yellow', 'Invalid RAM format, using default: ' + config.maxRam);
    }
    
    const minRamInput = await question(`Minimum RAM (${config.minRam}): `);
    if (minRamInput && validateRam(minRamInput)) {
        config.minRam = minRamInput.toUpperCase();
    } else if (minRamInput) {
        colorLog('yellow', 'Invalid RAM format, using default: ' + config.minRam);
    }
    
    // Aikar's flags
    const aikarsInput = await question(`Use Aikar's optimization flags? (${config.useAikarsFlags ? 'Y/n' : 'y/N'}): `);
    if (aikarsInput.toLowerCase() === 'n' || aikarsInput.toLowerCase() === 'no') {
        config.useAikarsFlags = false;
    } else if (aikarsInput.toLowerCase() === 'y' || aikarsInput.toLowerCase() === 'yes') {
        config.useAikarsFlags = true;
    }
    
    return config;
}

async function setupMinecraftConfig() {
    colorLog('cyan', '\n=== Minecraft Server Configuration ===');
    
    const config = { ...defaultConfig.minecraft };
    
    // Server port
    const portInput = await question(`Minecraft server port (${config.serverPort}): `);
    if (portInput && validatePort(portInput)) {
        config.serverPort = parseInt(portInput);
    } else if (portInput) {
        colorLog('yellow', 'Invalid port, using default: ' + config.serverPort);
    }
    
    // Gamemode
    const gamemodeInput = await question(`Gamemode [survival/creative/adventure/spectator] (${config.gamemode}): `);
    if (gamemodeInput && validateGamemode(gamemodeInput)) {
        config.gamemode = gamemodeInput.toLowerCase();
    } else if (gamemodeInput) {
        colorLog('yellow', 'Invalid gamemode, using default: ' + config.gamemode);
    }
    
    // Difficulty
    const difficultyInput = await question(`Difficulty [peaceful/easy/normal/hard] (${config.difficulty}): `);
    if (difficultyInput && validateDifficulty(difficultyInput)) {
        config.difficulty = difficultyInput.toLowerCase();
    } else if (difficultyInput) {
        colorLog('yellow', 'Invalid difficulty, using default: ' + config.difficulty);
    }
    
    // Max players
    const maxPlayersInput = await question(`Maximum players (${config.maxPlayers}): `);
    if (maxPlayersInput && !isNaN(parseInt(maxPlayersInput))) {
        config.maxPlayers = parseInt(maxPlayersInput);
    } else if (maxPlayersInput) {
        colorLog('yellow', 'Invalid number, using default: ' + config.maxPlayers);
    }
    
    // Online mode
    const onlineModeInput = await question(`Online mode (${config.onlineMode ? 'Y/n' : 'y/N'}): `);
    if (onlineModeInput.toLowerCase() === 'n' || onlineModeInput.toLowerCase() === 'no') {
        config.onlineMode = false;
    } else if (onlineModeInput.toLowerCase() === 'y' || onlineModeInput.toLowerCase() === 'yes') {
        config.onlineMode = true;
    }
    
    // Whitelist
    const whiteListInput = await question(`Enable whitelist (${config.whiteList ? 'Y/n' : 'y/N'}): `);
    if (whiteListInput.toLowerCase() === 'y' || whiteListInput.toLowerCase() === 'yes') {
        config.whiteList = true;
    } else if (whiteListInput.toLowerCase() === 'n' || whiteListInput.toLowerCase() === 'no') {
        config.whiteList = false;
    }
    
    // MOTD
    const motdInput = await question(`Server MOTD (${config.motd}): `);
    if (motdInput.trim()) {
        config.motd = motdInput.trim();
    }
    
    // RCON
    const rconInput = await question(`Enable RCON (${config.enableRcon ? 'Y/n' : 'y/N'}): `);
    if (rconInput.toLowerCase() === 'y' || rconInput.toLowerCase() === 'yes') {
        config.enableRcon = true;
        
        const rconPortInput = await question(`RCON port (${config.rconPort}): `);
        if (rconPortInput && validatePort(rconPortInput)) {
            config.rconPort = parseInt(rconPortInput);
        }
        
        const rconPasswordInput = await question('RCON password (leave empty for random): ');
        if (rconPasswordInput.trim()) {
            config.rconPassword = rconPasswordInput.trim();
        } else {
            config.rconPassword = Math.random().toString(36).substring(2, 15);
            colorLog('green', 'Generated RCON password: ' + config.rconPassword);
        }
    } else if (rconInput.toLowerCase() === 'n' || rconInput.toLowerCase() === 'no') {
        config.enableRcon = false;
    }
    
    return config;
}

function saveWrapperConfig(config) {
    const configPath = path.join(__dirname, 'config.json');
    
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        colorLog('green', 'Wrapper configuration saved to config.json');
    } catch (error) {
        colorLog('red', 'Error saving wrapper configuration: ' + error.message);
    }
}

function saveServerProperties(config) {
    const serverDir = path.join(__dirname, 'minecraft-server');
    const propertiesPath = path.join(serverDir, 'server.properties');
    
    // Ensure minecraft-server directory exists
    if (!fs.existsSync(serverDir)) {
        fs.mkdirSync(serverDir, { recursive: true });
    }
    
    // Generate server.properties content
    const properties = [
        '# Minecraft server properties',
        '# Generated by Minecraft Server Wrapper Setup',
        `server-port=${config.serverPort}`,
        `gamemode=${config.gamemode}`,
        `difficulty=${config.difficulty}`,
        `max-players=${config.maxPlayers}`,
        `online-mode=${config.onlineMode}`,
        `white-list=${config.whiteList}`,
        `motd=${config.motd}`,
        `enable-rcon=${config.enableRcon}`,
        `rcon.port=${config.rconPort}`,
        `rcon.password=${config.rconPassword}`,
        'spawn-protection=16',
        'allow-nether=true',
        'level-name=world',
        'enable-query=false',
        'allow-flight=false',
        'prevent-proxy-connections=false',
        'server-ip=',
        'network-compression-threshold=256',
        'max-world-size=29999984',
        'require-resource-pack=false',
        'max-tick-time=60000',
        'use-native-transport=true',
        'enable-jmx-monitoring=false',
        'enable-status=true',
        'enable-command-block=false',
        'broadcast-rcon-to-ops=true',
        'view-distance=10',
        'resource-pack-prompt=',
        'allow-animals=true',
        'level-type=default',
        'hardcore=false',
        'enable-whitelist=false',
        'broadcast-console-to-ops=true',
        'pvp=true',
        'spawn-npcs=true',
        'generate-structures=true',
        'spawn-animals=true',
        'snooper-enabled=true',
        'function-permission-level=2',
        'level-seed=',
        'force-gamemode=false',
        'op-permission-level=4'
    ];
    
    try {
        fs.writeFileSync(propertiesPath, properties.join('\n'));
        colorLog('green', 'Server properties saved to minecraft-server/server.properties');
    } catch (error) {
        colorLog('red', 'Error saving server properties: ' + error.message);
    }
}

function createEulaFile() {
    const serverDir = path.join(__dirname, 'minecraft-server');
    const eulaPath = path.join(serverDir, 'eula.txt');
    
    if (!fs.existsSync(eulaPath)) {
        const eulaContent = [
            '# By changing the setting below to TRUE you are indicating your agreement to our EULA',
            '# https://account.mojang.com/documents/minecraft_eula',
            'eula=false'
        ];
        
        try {
            fs.writeFileSync(eulaPath, eulaContent.join('\n'));
            colorLog('yellow', 'Created EULA file. You must set eula=true to run the server.');
        } catch (error) {
            colorLog('red', 'Error creating EULA file: ' + error.message);
        }
    }
}

async function main() {
    console.clear();
    colorLog('bright', '========================================');
    colorLog('bright', '  Minecraft Server Wrapper Setup');
    colorLog('bright', '========================================');
    
    colorLog('blue', '\nThis setup will help you configure your Minecraft server wrapper.');
    colorLog('blue', 'Press Enter to use default values shown in parentheses.\n');
    
    try {
        // Setup wrapper configuration
        const wrapperConfig = await setupWrapperConfig();
        
        // Setup Minecraft configuration
        const minecraftConfig = await setupMinecraftConfig();
        
        // Save configurations
        colorLog('cyan', '\n=== Saving Configuration ===');
        saveWrapperConfig(wrapperConfig);
        saveServerProperties(minecraftConfig);
        createEulaFile();
        
        // Summary
        colorLog('green', '\n========================================');
        colorLog('green', '  Setup Complete!');
        colorLog('green', '========================================');
        
        colorLog('blue', '\nConfiguration Summary:');
        colorLog('blue', `- Web interface: http://localhost:${wrapperConfig.port}`);
        colorLog('blue', `- Minecraft server port: ${minecraftConfig.serverPort}`);
        colorLog('blue', `- RAM allocation: ${wrapperConfig.minRam} - ${wrapperConfig.maxRam}`);
        colorLog('blue', `- Aikar's flags: ${wrapperConfig.useAikarsFlags ? 'Enabled' : 'Disabled'}`);
        colorLog('blue', `- Gamemode: ${minecraftConfig.gamemode}`);
        colorLog('blue', `- Difficulty: ${minecraftConfig.difficulty}`);
        colorLog('blue', `- Max players: ${minecraftConfig.maxPlayers}`);
        colorLog('blue', `- RCON: ${minecraftConfig.enableRcon ? 'Enabled' : 'Disabled'}`);
        
        colorLog('yellow', '\nNext steps:');
        colorLog('yellow', '1. Place your Minecraft server JAR file in the minecraft-server folder');
        colorLog('yellow', '2. Rename it to "server.jar"');
        colorLog('yellow', '3. Edit minecraft-server/eula.txt and set eula=true');
        colorLog('yellow', '4. Start the wrapper with npm start or ./start.sh');
        
    } catch (error) {
        colorLog('red', '\nSetup failed: ' + error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run setup if called directly
if (require.main === module) {
    main();
}

module.exports = { main };