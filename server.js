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

const PORT = process.env.PORT || 5900;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = req.body.path || './minecraft-server';
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
        const fullPath = path.resolve(requestedPath);
        
        if (!await fs.pathExists(fullPath)) {
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
        res.json({ message: 'File uploaded successfully', path: req.file.path });
    } catch (error) {
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
        res.json({ message: 'File saved successfully' });
    } catch (error) {
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

app.post('/api/server/restart', (req, res) => {
    restartMinecraftServer();
    res.json({ message: 'Restarting Minecraft server...' });
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
    
    const ramAmount = '2G'; // Default 2GB, can be made configurable
    const javaArgs = [
        `-Xms${ramAmount}`,
        `-Xmx${ramAmount}`,
        ...aikarFlags,
        '-jar',
        jarFile,
        'nogui'
    ];
    
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
    if (minecraftProcess) {
        sendCommand('stop');
        setTimeout(() => {
            if (minecraftProcess) {
                minecraftProcess.kill('SIGTERM');
            }
        }, 10000); // Wait 10 seconds before force killing
    }
}

function restartMinecraftServer() {
    if (minecraftProcess) {
        stopMinecraftServer();
        setTimeout(() => {
            startMinecraftServer();
        }, 5000); // Wait 5 seconds before restarting
    } else {
        startMinecraftServer();
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

server.listen(PORT, () => {
    console.log(`Minecraft Server Wrapper running on port ${PORT}`);
    console.log(`Access the web interface at: http://localhost:${PORT}`);
});