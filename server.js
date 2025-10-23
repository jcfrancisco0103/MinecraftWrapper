const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const { spawn } = require('child_process');
const si = require('systeminformation');
const cors = require('cors');
const archiver = require('archiver');
const unzipper = require('unzipper');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = req.body.path || './minecraft-server';
        
        // Auto-redirect .jar files to plugins folder if uploading to root minecraft-server directory
        const isJarFile = file.originalname.toLowerCase().endsWith('.jar');
        const isRootMinecraftDir = uploadPath.endsWith('minecraft-server') || uploadPath.endsWith('minecraft-server\\') || uploadPath.endsWith('minecraft-server/');
        
        if (isJarFile && isRootMinecraftDir) {
            uploadPath = path.join(uploadPath, 'plugins');
            console.log('Redirecting .jar file to plugins folder:', uploadPath);
        }
        
        fs.ensureDirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Global variables
let minecraftProcess = null;
let serverStatus = 'stopped';
let serverPath = './minecraft-server';
let jarFile = 'server.jar';

// Server configuration
let serverConfig = {
    ramAllocation: '2G',
    useAikarFlags: true
};

// Aikar's flags for optimization
const aikarFlags = [
    '-XX:+UseG1GC',
    '-XX:+ParallelRefProcEnabled',
    '-XX:MaxGCPauseMillis=200',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+DisableExplicitGC',
    '-XX:+AlwaysPreTouch',
    '-XX:G1NewSizePercent=30',
    '-XX:G1MaxNewSizePercent=40',
    '-XX:G1HeapRegionSize=8M',
    '-XX:G1ReservePercent=20',
    '-XX:G1HeapWastePercent=5',
    '-XX:G1MixedGCCountTarget=4',
    '-XX:InitiatingHeapOccupancyPercent=15',
    '-XX:G1MixedGCLiveThresholdPercent=90',
    '-XX:G1RSetUpdatingPauseTimePercent=5',
    '-XX:SurvivorRatio=32',
    '-XX:+PerfDisableSharedMem',
    '-XX:MaxTenuringThreshold=1'
];

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// File manager routes
app.get('/api/files', async (req, res) => {
    try {
        const requestedPath = req.query.path || serverPath;
        
        // Add logging for debugging
        console.log('Files API request - path parameter:', requestedPath);
        
        // Validate path parameter
        if (typeof requestedPath !== 'string' || requestedPath.trim() === '') {
            console.log('Invalid path parameter:', requestedPath);
            return res.status(400).json({ error: 'Invalid path parameter' });
        }
        
        const fullPath = path.resolve(requestedPath);
        console.log('Resolved full path:', fullPath);
        
        if (!await fs.pathExists(fullPath)) {
            console.log('Path not found:', fullPath);
            return res.status(404).json({ error: 'Path not found' });
        }

        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
            const items = await fs.readdir(fullPath);
            const fileList = [];
            
            for (const item of items) {
                const itemPath = path.join(fullPath, item);
                const itemStats = await fs.stat(itemPath);
                
                fileList.push({
                    name: item,
                    path: itemPath,
                    isDirectory: itemStats.isDirectory(),
                    size: itemStats.size,
                    modified: itemStats.mtime
                });
            }
            
            res.json({
                currentPath: fullPath,
                items: fileList
            });
        } else {
            const content = await fs.readFile(fullPath, 'utf8');
            res.json({
                isFile: true,
                content: content,
                path: fullPath
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/upload', upload.single('file'), (req, res) => {
    try {
        console.log('Upload request received');
        console.log('Request body path:', req.body.path);
        console.log('File info:', req.file ? {
            originalname: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            path: req.file.path
        } : 'No file');
        
        if (!req.file) {
            console.log('No file uploaded in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Validate file size (100MB limit)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (req.file.size > maxSize) {
            console.log('File too large:', req.file.size, 'bytes');
            // Remove the uploaded file
            fs.removeSync(req.file.path);
            return res.status(413).json({ error: 'File too large (max 100MB)' });
        }
        
        console.log('File uploaded successfully:', req.file.filename);
        res.json({ 
            message: 'File uploaded successfully', 
            path: req.file.path,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        console.error('Upload error stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/files', async (req, res) => {
    try {
        const filePath = req.body.path;
        if (!filePath) {
            return res.status(400).json({ error: 'Path is required' });
        }
        
        await fs.remove(filePath);
        res.json({ message: 'File/folder deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/files/save', async (req, res) => {
    try {
        const { path: filePath, content } = req.body;
        await fs.writeFile(filePath, content, 'utf8');
        res.json({ success: true, message: 'File saved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/files/rename', async (req, res) => {
    try {
        const { oldPath, newName } = req.body;
        
        // Debug logging
        console.log('Rename request received:');
        console.log('  oldPath:', oldPath);
        console.log('  newName:', newName);
        
        if (!oldPath || !newName) {
            return res.status(400).json({ error: 'Old path and new name are required' });
        }
        
        // Resolve the path to handle both relative and absolute paths
        const resolvedOldPath = path.resolve(oldPath);
        console.log('  resolvedOldPath:', resolvedOldPath);
        console.log('  oldPath exists:', await fs.pathExists(resolvedOldPath));
        
        // Validate new name
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(newName)) {
            return res.status(400).json({ error: 'Invalid characters in filename' });
        }
        
        // Get directory and create new path
        const directory = path.dirname(resolvedOldPath);
        const newPath = path.join(directory, newName);
        
        console.log('  directory:', directory);
        console.log('  newPath:', newPath);
        
        // Check if target already exists
        if (await fs.pathExists(newPath)) {
            return res.status(409).json({ error: 'A file or folder with that name already exists' });
        }
        
        // Check if source exists
        if (!await fs.pathExists(resolvedOldPath)) {
            console.log('  ERROR: Source file not found at:', resolvedOldPath);
            return res.status(404).json({ error: 'Source file or folder not found' });
        }
        
        // Perform rename
        await fs.rename(resolvedOldPath, newPath);
        
        res.json({ 
            message: 'File renamed successfully',
            oldPath: resolvedOldPath,
            newPath: newPath
        });
    } catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Server configuration routes
app.get('/api/server/config', (req, res) => {
    res.json(serverConfig);
});

app.post('/api/server/config', (req, res) => {
    try {
        const { ramAllocation, useAikarFlags } = req.body;
        
        if (!ramAllocation || typeof useAikarFlags !== 'boolean') {
            return res.status(400).json({ error: 'Invalid configuration data' });
        }
        
        // Validate RAM allocation
        const validRamValues = ['1G', '2G', '4G', '8G', '16G', '24G', '32G'];
        if (!validRamValues.includes(ramAllocation)) {
            return res.status(400).json({ error: 'Invalid RAM allocation value' });
        }
        
        serverConfig.ramAllocation = ramAllocation;
        serverConfig.useAikarFlags = useAikarFlags;
        
        // Save configuration to file
        saveServerConfig();
        
        res.json({ 
            message: 'Server configuration saved successfully',
            config: serverConfig
        });
    } catch (error) {
        console.error('Error saving server config:', error);
        res.status(500).json({ error: error.message });
    }
});

// Server management routes
app.post('/api/server/start', (req, res) => {
    if (serverStatus !== 'stopped') {
        return res.status(400).json({ error: 'Server is already running or starting' });
    }
    
    startMinecraftServer();
    res.json({ message: 'Starting Minecraft server...' });
});

app.post('/api/server/stop', (req, res) => {
    if (serverStatus === 'stopped') {
        return res.status(400).json({ error: 'Server is already stopped' });
    }
    
    stopMinecraftServer();
    res.json({ message: 'Stopping Minecraft server...' });
});

app.post('/api/server/restart', async (req, res) => {
    try {
        await restartMinecraftServerWithVerification();
        res.json({ message: 'Server restart completed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/server/kill', (req, res) => {
    killMinecraftServer();
    res.json({ message: 'Killing Minecraft server process...' });
});

app.post('/api/server/command', (req, res) => {
    const { command } = req.body;
    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }
    
    sendCommand(command);
    res.json({ message: 'Command sent' });
});

app.get('/api/server/status', (req, res) => {
    res.json({ status: serverStatus });
});

// Configuration persistence functions
function loadServerConfig() {
    try {
        if (fs.existsSync('./server-config.json')) {
            const configData = fs.readFileSync('./server-config.json', 'utf8');
            const loadedConfig = JSON.parse(configData);
            serverConfig = { ...serverConfig, ...loadedConfig };
            console.log('Server configuration loaded:', serverConfig);
        }
    } catch (error) {
        console.error('Error loading server config:', error);
    }
}

function saveServerConfig() {
    try {
        fs.writeFileSync('./server-config.json', JSON.stringify(serverConfig, null, 2));
        console.log('Server configuration saved:', serverConfig);
    } catch (error) {
        console.error('Error saving server config:', error);
    }
}

// System monitoring route
app.get('/api/system', async (req, res) => {
    try {
        const [cpu, mem, fsSize, networkStats] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.networkStats()
        ]);

        res.json({
            cpu: {
                usage: cpu.currentLoad,
                cores: cpu.cpus.length
            },
            memory: {
                total: mem.total,
                used: mem.used,
                free: mem.free,
                usage: (mem.used / mem.total) * 100
            },
            disk: fsSize.map(disk => ({
                fs: disk.fs,
                size: disk.size,
                used: disk.used,
                available: disk.available,
                usage: disk.use
            })),
            network: networkStats.map(net => ({
                iface: net.iface,
                rx_bytes: net.rx_bytes,
                tx_bytes: net.tx_bytes,
                rx_sec: net.rx_sec,
                tx_sec: net.tx_sec
            }))
        });
    } catch (error) {
        console.error('Files API error:', error);
        console.error('Request path:', req.query.path);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
});

// Minecraft server management functions
function startMinecraftServer() {
    if (minecraftProcess) {
        return;
    }
    
    serverStatus = 'starting';
    io.emit('serverStatus', { status: serverStatus });
    
    const ramAmount = serverConfig.ramAllocation || '2G';
    const useAikar = serverConfig.useAikarFlags !== false;
    
    const javaArgs = [
        `-Xms${ramAmount}`,
        `-Xmx${ramAmount}`,
        ...(useAikar ? aikarFlags : []),
        '-jar',
        jarFile,
        'nogui'
    ];
    
    console.log(`Starting Minecraft server with ${ramAmount} RAM, Aikar flags: ${useAikar}`);
    
    minecraftProcess = spawn('java', javaArgs, {
        cwd: serverPath,
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    minecraftProcess.stdout.on('data', (data) => {
        const output = data.toString();
        io.emit('consoleOutput', { type: 'stdout', data: output });
        
        if (output.includes('Done (') && output.includes('s)! For help, type "help"')) {
            serverStatus = 'running';
            io.emit('serverStatus', { status: serverStatus });
        }
    });
    
    minecraftProcess.stderr.on('data', (data) => {
        const output = data.toString();
        io.emit('consoleOutput', { type: 'stderr', data: output });
    });
    
    minecraftProcess.on('close', (code) => {
        serverStatus = 'stopped';
        minecraftProcess = null;
        io.emit('serverStatus', { status: serverStatus });
        io.emit('consoleOutput', { type: 'system', data: `Server process exited with code ${code}` });
    });
    
    minecraftProcess.on('error', (error) => {
        serverStatus = 'error';
        io.emit('serverStatus', { status: serverStatus });
        io.emit('consoleOutput', { type: 'error', data: `Error: ${error.message}` });
    });
}

function stopMinecraftServer() {
    return new Promise((resolve, reject) => {
        if (!minecraftProcess) {
            resolve();
            return;
        }
        
        io.emit('consoleOutput', { type: 'system', data: 'Initiating graceful server shutdown...' });
        
        // Send stop command
        sendCommand('stop');
        
        // Set up timeout for force kill
        const forceKillTimeout = setTimeout(() => {
            if (minecraftProcess) {
                io.emit('consoleOutput', { type: 'system', data: 'Force killing server process...' });
                minecraftProcess.kill('SIGKILL');
                minecraftProcess = null;
                serverStatus = 'stopped';
                io.emit('serverStatus', { status: serverStatus });
                reject(new Error('Server stop timeout - process was force killed'));
            }
        }, 15000); // Wait 15 seconds before force killing
        
        // Listen for process close
        const onClose = (code) => {
            clearTimeout(forceKillTimeout);
            minecraftProcess = null;
            serverStatus = 'stopped';
            io.emit('serverStatus', { status: serverStatus });
            io.emit('consoleOutput', { type: 'system', data: `Server stopped gracefully with code ${code}` });
            resolve();
        };
        
        minecraftProcess.once('close', onClose);
    });
}

async function restartMinecraftServerWithVerification() {
    try {
        // Stage 1: Check current server state and stop if running
        io.emit('consoleOutput', { type: 'system', data: '=== RESTART SEQUENCE INITIATED ===' });
        io.emit('consoleOutput', { type: 'system', data: 'Stage 1/5: Checking server state...' });
        
        if (minecraftProcess && serverStatus !== 'stopped') {
            io.emit('consoleOutput', { type: 'system', data: 'Server is running, stopping gracefully...' });
            try {
                await stopMinecraftServer();
            } catch (stopError) {
                io.emit('consoleOutput', { type: 'warning', data: `Stop error: ${stopError.message}` });
                // Continue with restart even if stop had issues
            }
        } else {
            io.emit('consoleOutput', { type: 'system', data: 'No server running, proceeding to start...' });
        }
        
        // Stage 2: Verify server has fully stopped
        io.emit('consoleOutput', { type: 'system', data: 'Stage 2/5: Verifying server shutdown...' });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        // Force cleanup if process still exists
        if (minecraftProcess) {
            io.emit('consoleOutput', { type: 'system', data: 'Force cleaning up existing process...' });
            try {
                minecraftProcess.kill('SIGKILL');
            } catch (killError) {
                // Ignore kill errors, process might already be dead
            }
            minecraftProcess = null;
            serverStatus = 'stopped';
        }
        
        io.emit('consoleOutput', { type: 'system', data: 'Server shutdown verified successfully' });
        
        // Stage 3: Initialize fresh server instance
        io.emit('consoleOutput', { type: 'system', data: 'Stage 3/5: Initializing fresh server instance...' });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
        
        try {
            startMinecraftServer();
        } catch (startError) {
            throw new Error(`Failed to start server: ${startError.message}`);
        }
        
        // Stage 4: Wait for server to start and confirm accessibility
        io.emit('consoleOutput', { type: 'system', data: 'Stage 4/5: Waiting for server to start...' });
        
        await new Promise((resolve, reject) => {
            const startTimeout = setTimeout(() => {
                reject(new Error('Server start timeout - failed to start within 60 seconds'));
            }, 60000);
            
            let checkCount = 0;
            const maxChecks = 60; // Maximum 60 checks (60 seconds)
            
            const checkStatus = () => {
                checkCount++;
                if (serverStatus === 'running') {
                    clearTimeout(startTimeout);
                    resolve();
                } else if (serverStatus === 'error') {
                    clearTimeout(startTimeout);
                    reject(new Error('Server failed to start - check console for errors'));
                } else if (checkCount >= maxChecks) {
                    clearTimeout(startTimeout);
                    reject(new Error('Server start timeout - maximum checks reached'));
                } else {
                    setTimeout(checkStatus, 1000);
                }
            };
            
            checkStatus();
        });
        
        // Stage 5: Final verification and completion
        io.emit('consoleOutput', { type: 'system', data: 'Stage 5/5: Verifying server accessibility...' });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Final verification pause
        
        if (serverStatus !== 'running') {
            throw new Error('Server restart failed - server is not running');
        }
        
        io.emit('consoleOutput', { type: 'system', data: '=== RESTART SEQUENCE COMPLETED SUCCESSFULLY ===' });
        io.emit('consoleOutput', { type: 'system', data: 'Server is now running and accessible' });
        
    } catch (error) {
        io.emit('consoleOutput', { type: 'error', data: `=== RESTART SEQUENCE FAILED ===` });
        io.emit('consoleOutput', { type: 'error', data: `Error: ${error.message}` });
        
        // Ensure clean state on failure
        if (minecraftProcess) {
            try {
                minecraftProcess.kill('SIGKILL');
            } catch (killError) {
                // Ignore kill errors
            }
            minecraftProcess = null;
        }
        serverStatus = 'stopped';
        io.emit('serverStatus', { status: serverStatus });
        
        throw error;
    }
}

function killMinecraftServer() {
    if (minecraftProcess) {
        minecraftProcess.kill('SIGKILL');
        minecraftProcess = null;
        serverStatus = 'stopped';
        io.emit('serverStatus', { status: serverStatus });
        io.emit('consoleOutput', { type: 'system', data: 'Server process killed forcefully' });
    }
}

function sendCommand(command) {
    if (minecraftProcess && serverStatus === 'running') {
        minecraftProcess.stdin.write(command + '\n');
        io.emit('consoleOutput', { type: 'command', data: `> ${command}` });
    }
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send current server status
    socket.emit('serverStatus', { status: serverStatus });
    
    socket.on('sendCommand', (data) => {
        sendCommand(data.command);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Ensure minecraft-server directory exists
fs.ensureDirSync(serverPath);

// Start system monitoring
setInterval(async () => {
    try {
        const [cpu, mem] = await Promise.all([
            si.currentLoad(),
            si.mem()
        ]);
        
        io.emit('systemStats', {
            cpu: cpu.currentLoad,
            memory: (mem.used / mem.total) * 100,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error getting system stats:', error);
    }
}, 2000); // Update every 2 seconds

// Enhanced error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large' });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field' });
    }
    
    // Handle file system errors
    if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'File or directory not found' });
    }
    
    if (err.code === 'EACCES' || err.code === 'EPERM') {
        return res.status(403).json({ error: 'Permission denied' });
    }
    
    if (err.code === 'ENOSPC') {
        return res.status(507).json({ error: 'Insufficient storage space' });
    }
    
    // Default error response
    res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
    console.log(`Minecraft Server Wrapper running on port ${PORT}`);
    console.log(`Access the web interface at: http://localhost:${PORT}`);
    
    // Load server configuration after server starts
    loadServerConfig();
});