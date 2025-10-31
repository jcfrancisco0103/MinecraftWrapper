// Global variables and configuration
let BASE_URL = '';
let socket = null;
let currentPath = './minecraft-server';
let currentTab = 'dashboard';
let serverStatus = 'offline';
let systemInfo = {};
let serverConfig = {};
let fileEditor = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set BASE_URL dynamically
    BASE_URL = window.location.origin;
    
    // Initialize the app
    initializeApp();
});

async function initializeApp() {
    try {
        // Show loading screen
        showLoadingScreen();
        
        // Initialize event listeners
        initializeEventListeners();
        
        // Load initial data
        await loadInitialData();
        
        // Initialize WebSocket connection
        initializeWebSocket();
        
        // Hide loading screen and show main content
        hideLoadingScreen();
        
        // Set default tab
        switchTab('dashboard');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showNotification('Failed to initialize application', 'error');
        hideLoadingScreen();
    }
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainContainer = document.getElementById('main-container');
    
    console.log('Hiding loading screen...');
    console.log('Loading screen element:', loadingScreen);
    console.log('Main container element:', mainContainer);
    
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            console.log('Loading screen hidden');
            
            // Show the main container after hiding loading screen
            if (mainContainer) {
                mainContainer.style.display = 'flex';
                console.log('Main container shown');
            } else {
                console.error('Main container not found!');
            }
        }, 500); // Reduced delay from 1000ms to 500ms
    } else {
        console.error('Loading screen not found!');
    }
}

function initializeEventListeners() {
    // Navigation menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.getAttribute('data-tab');
            if (tab) {
                switchTab(tab);
            }
        });
    });
    
    // Server control buttons
    const startBtn = document.getElementById('start-server');
    const stopBtn = document.getElementById('stop-server');
    const restartBtn = document.getElementById('restart-server');
    const killBtn = document.getElementById('kill-server');
    
    if (startBtn) startBtn.addEventListener('click', startServer);
    if (stopBtn) stopBtn.addEventListener('click', stopServer);
    if (restartBtn) restartBtn.addEventListener('click', restartServer);
    if (killBtn) killBtn.addEventListener('click', killServer);
    
    // Console command input
    const consoleInput = document.getElementById('console-command');
    const sendBtn = document.getElementById('send-command');
    
    if (consoleInput) {
        consoleInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendCommand();
            }
        });
    }
    
    if (sendBtn) sendBtn.addEventListener('click', sendCommand);
    
    // Console controls
    const clearConsoleBtn = document.getElementById('clear-console');
    if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', clearConsole);
    
    // File manager controls
    const refreshFilesBtn = document.getElementById('refresh-files');
    const uploadFileBtn = document.getElementById('upload-file');
    
    if (refreshFilesBtn) refreshFilesBtn.addEventListener('click', () => loadFiles(currentPath));
    if (uploadFileBtn) uploadFileBtn.addEventListener('click', uploadFile);
    
    // Settings save button
    const saveConfigBtn = document.getElementById('save-config');
    if (saveConfigBtn) saveConfigBtn.addEventListener('click', saveServerConfig);
    
    // Modal close functionality
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
            closeModal();
        }
    });
    
    // Sidebar toggle for mobile
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
}

function switchTab(tabName) {
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        }
    });
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Update breadcrumb
    updateBreadcrumb(tabName);
    
    // Load tab-specific data
    loadTabData(tabName);
    
    currentTab = tabName;
}

function updateBreadcrumb(tabName) {
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
        const tabNames = {
            'dashboard': 'Dashboard',
            'console': 'Server Console',
            'files': 'File Manager',
            'players': 'Player Management',
            'plugins': 'Plugin Manager',
            'monitoring': 'Server Monitoring',
            'backups': 'Backup Manager',
            'settings': 'Server Settings'
        };
        breadcrumb.textContent = `Home / ${tabNames[tabName] || tabName}`;
    }
}

async function loadTabData(tabName) {
    try {
        switch (tabName) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'console':
                // Console is handled by WebSocket
                break;
            case 'files':
                await loadFiles(currentPath);
                break;
            case 'players':
                await loadPlayers();
                break;
            case 'plugins':
                await loadPlugins();
                break;
            case 'monitoring':
                await loadMonitoringData();
                break;
            case 'backups':
                await loadBackups();
                break;
            case 'settings':
                await loadServerConfig();
                break;
        }
    } catch (error) {
        console.error(`Failed to load ${tabName} data:`, error);
        showNotification(`Failed to load ${tabName} data`, 'error');
    }
}

async function loadInitialData() {
    try {
        // Load system information
        await loadSystemInfo();
        
        // Load server configuration
        await loadServerConfig();
        
        // Update server status
        await updateServerStatus();
        
    } catch (error) {
        console.error('Failed to load initial data:', error);
        throw error;
    }
}

// Backup Management
function createBackup() {
    if (!socket) {
        showNotification('Not connected to server', 'error');
        return;
    }
    
    const backupName = prompt('Enter backup name (optional):') || `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    
    showNotification('Creating backup...', 'info');
    socket.emit('create-backup', { name: backupName });
}

// Tab Management
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    
    // Remove active class from all sidebar menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Remove active class from all action buttons
    const tabButtons = document.querySelectorAll('.action-btn');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show the selected tab content
    const selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
    }
    
    // Add active class to the corresponding sidebar menu item
    const activeMenuItem = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
    
    // Add active class to the clicked button (if from Quick Actions)
    const activeButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Update page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        const titles = {
            'dashboard': 'Dashboard',
            'console': 'Console',
            'files': 'File Manager',
            'players': 'Players',
            'plugins': 'Plugins',
            'monitoring': 'Monitoring',
            'backups': 'Backups',
            'settings': 'Settings'
        };
        pageTitle.textContent = titles[tabName] || 'Dashboard';
    }
    
    // Initialize tab-specific functionality
    if (tabName === 'files') {
        loadFiles('./minecraft-server');
    } else if (tabName === 'console') {
        // Console is already initialized
    } else if (tabName === 'plugins') {
        // Plugin functionality can be added here
    }
}

function initializeWebSocket() {
    try {
        // Use Socket.IO with better configuration
        socket = io({
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            maxReconnectionAttempts: 5
        });
        
        socket.on('connect', function() {
            console.log('Socket.IO connected successfully');
            showNotification('Connected to server', 'success');
            // Request current server status
            socket.emit('requestStatus');
        });
        
        socket.on('serverStatus', function(data) {
            updateServerStatusUI(data.status);
        });
        
        socket.on('consoleOutput', function(data) {
            console.log('Received console output:', data); // Debug log
            const message = data.data || data.message || 'Unknown message';
            const level = data.type || data.level || 'info';
            appendConsoleOutput(message, level);
        });
        
        socket.on('systemInfo', function(data) {
            updateSystemInfoUI(data.info);
        });
        
        socket.on('disconnect', function() {
            console.log('Socket.IO disconnected');
            showNotification('Disconnected from server', 'warning');
        });
        
        socket.on('connect_error', function(error) {
            console.error('Socket.IO connection error:', error);
            showNotification('Connection error: ' + error.message, 'error');
        });
        
        socket.on('reconnect', function(attemptNumber) {
            console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
            showNotification('Reconnected to server', 'success');
        });
        
        socket.on('reconnect_error', function(error) {
            console.error('Socket.IO reconnection error:', error);
        });
        
        socket.on('reconnect_failed', function() {
            console.error('Socket.IO reconnection failed');
            showNotification('Failed to reconnect to server', 'error');
        });
        
    } catch (error) {
        console.error('Failed to initialize Socket.IO:', error);
    }
}



// Server Control Functions
async function startServer() {
    try {
        console.log('Starting server...');
        appendConsoleOutput('Sending start command to server...', 'system');
        
        const response = await fetch(`${BASE_URL}/api/server/start`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Server start response:', result);
            appendConsoleOutput('Server start command sent successfully', 'success');
            showNotification('Server start command sent', 'success');
            updateServerStatusUI('starting');
        } else {
            const result = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Server start error:', result);
            appendConsoleOutput(`Error starting server: ${result.error}`, 'error');
            throw new Error('Failed to start server');
        }
    } catch (error) {
        console.error('Error starting server:', error);
        appendConsoleOutput(`Failed to start server: ${error.message}`, 'error');
        showNotification('Failed to start server', 'error');
    }
}

async function stopServer() {
    try {
        const response = await fetch(`${BASE_URL}/api/server/stop`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            showNotification('Server stop command sent', 'success');
            updateServerStatusUI('stopping');
        } else {
            throw new Error('Failed to stop server');
        }
    } catch (error) {
        console.error('Error stopping server:', error);
        showNotification('Failed to stop server', 'error');
    }
}

async function restartServer() {
    try {
        const response = await fetch(`${BASE_URL}/api/server/restart`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            showNotification('Server restart command sent', 'success');
            updateServerStatusUI('restarting');
        } else {
            throw new Error('Failed to restart server');
        }
    } catch (error) {
        console.error('Error restarting server:', error);
        showNotification('Failed to restart server', 'error');
    }
}

async function killServer() {
    if (!confirm('Are you sure you want to force kill the server? This may cause data loss.')) {
        return;
    }
    
    try {
        const response = await fetch(`${BASE_URL}/api/server/kill`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            showNotification('Server kill command sent', 'warning');
            updateServerStatusUI('offline');
        } else {
            throw new Error('Failed to kill server');
        }
    } catch (error) {
        console.error('Error killing server:', error);
        showNotification('Failed to kill server', 'error');
    }
}

async function updateServerStatus() {
    try {
        const response = await fetch(`${BASE_URL}/api/server/status`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateServerStatusUI(data.status);
        }
    } catch (error) {
        console.error('Error fetching server status:', error);
    }
}

function updateServerStatusUI(status) {
    serverStatus = status;
    
    // Update status indicators
    const statusIndicators = document.querySelectorAll('.status-indicator');
    const statusTexts = document.querySelectorAll('.server-status span:last-child');
    
    statusIndicators.forEach(indicator => {
        indicator.className = 'status-indicator';
        indicator.classList.add(status);
    });
    
    statusTexts.forEach(text => {
        text.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    });
    
    // Update server control buttons
    const startBtn = document.getElementById('start-server');
    const stopBtn = document.getElementById('stop-server');
    const restartBtn = document.getElementById('restart-server');
    const killBtn = document.getElementById('kill-server');
    
    if (startBtn) startBtn.disabled = (status === 'online' || status === 'starting');
    if (stopBtn) stopBtn.disabled = (status === 'offline' || status === 'stopping');
    if (restartBtn) restartBtn.disabled = (status === 'offline');
    if (killBtn) killBtn.disabled = (status === 'offline');
}

// Console Functions
function sendCommand() {
    const input = document.getElementById('console-command');
    if (!input || !input.value.trim()) return;
    
    const command = input.value.trim();
    
    if (socket && socket.connected) {
        socket.emit('sendCommand', {
            command: command
        });
        
        // Add command to console output
        appendConsoleOutput(`> ${command}`, 'command');
        
        // Clear input
        input.value = '';
    } else {
        showNotification('Not connected to server', 'error');
    }
}

function appendConsoleOutput(message, level = 'info') {
    const consoleOutput = document.getElementById('console-output');
    if (!consoleOutput) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `console-line ${level}`;
    
    line.innerHTML = `
        <span class="timestamp">[${timestamp}]</span>
        <span class="message">${escapeHtml(message)}</span>
    `;
    
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    
    // Limit console lines to prevent memory issues
    const lines = consoleOutput.children;
    if (lines.length > 1000) {
        consoleOutput.removeChild(lines[0]);
    }
}

function clearConsole() {
    const consoleOutput = document.getElementById('console-output');
    if (consoleOutput) {
        consoleOutput.innerHTML = '';
        showNotification('Console cleared', 'info');
    }
}

// System Information Functions
async function loadSystemInfo() {
    try {
        const response = await fetch(`${BASE_URL}/api/system`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            systemInfo = await response.json();
            updateSystemInfoUI(systemInfo);
        }
    } catch (error) {
        console.error('Error loading system info:', error);
    }
}

function updateSystemInfoUI(info) {
    // Update CPU usage
    const cpuUsage = document.getElementById('cpu-usage');
    const cpuProgress = document.getElementById('cpu-progress');
    if (cpuUsage && info.cpu) {
        cpuUsage.textContent = `${info.cpu.toFixed(1)}%`;
        if (cpuProgress) cpuProgress.style.width = `${info.cpu}%`;
    }
    
    // Update Memory usage
    const memoryUsage = document.getElementById('memory-usage');
    const memoryProgress = document.getElementById('memory-progress');
    if (memoryUsage && info.memory) {
        const memPercent = (info.memory.used / info.memory.total * 100);
        memoryUsage.textContent = `${memPercent.toFixed(1)}%`;
        if (memoryProgress) memoryProgress.style.width = `${memPercent}%`;
    }
    
    // Update Disk usage
    const diskUsage = document.getElementById('disk-usage');
    const diskProgress = document.getElementById('disk-progress');
    if (diskUsage && info.disk) {
        const diskPercent = (info.disk.used / info.disk.total * 100);
        diskUsage.textContent = `${diskPercent.toFixed(1)}%`;
        if (diskProgress) diskProgress.style.width = `${diskPercent}%`;
    }
    
    // Update uptime
    const uptime = document.getElementById('uptime');
    if (uptime && info.uptime) {
        uptime.textContent = formatUptime(info.uptime);
    }
}

// File Manager Functions
async function loadFiles(path = './minecraft-server') {
    try {
        const loadingElement = document.getElementById('loading-files');
        const fileList = document.getElementById('file-list');
        
        if (loadingElement) loadingElement.style.display = 'flex';
        if (fileList) fileList.innerHTML = '';
        
        const response = await fetch(`${BASE_URL}/api/files?path=${encodeURIComponent(path)}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Handle both directory listing and file content responses
            if (data.items) {
                // Directory listing response
                displayFiles(data.items, path);
                updateFileBreadcrumb(data.currentPath || path);
                currentPath = data.currentPath || path;
            } else if (data.isFile) {
                // File content response - handle appropriately
                console.log('File content received:', data.path);
                // You might want to display file content in an editor here
            } else {
                // Fallback for old format
                displayFiles(data, path);
                updateFileBreadcrumb(path);
                currentPath = path;
            }
        } else {
            throw new Error('Failed to load files');
        }
        
        if (loadingElement) loadingElement.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading files:', error);
        showNotification('Failed to load files', 'error');
        
        const loadingElement = document.getElementById('loading-files');
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

function displayFiles(files, path) {
    const fileList = document.getElementById('file-list');
    if (!fileList) return;
    
    fileList.innerHTML = '';
    
    // Add parent directory link if not at root
    if (path !== './minecraft-server') {
        const parentPath = path.split('/').slice(0, -1).join('/') || './minecraft-server';
        const parentItem = createFileItem('..', 'folder', parentPath, true);
        fileList.appendChild(parentItem);
    }
    
    // Ensure files is an array before sorting
    if (!Array.isArray(files)) {
        console.error('Files is not an array:', files);
        files = [];
    }
    
    // Sort files: directories first, then files
    files.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    files.forEach(file => {
        const fileType = file.isDirectory ? 'directory' : 'file';
        const item = createFileItem(file.name, fileType, `${path}/${file.name}`);
        fileList.appendChild(item);
    });
}

function createFileItem(name, type, fullPath, isParent = false) {
    const item = document.createElement('div');
    item.className = 'file-item';
    
    const icon = type === 'directory' ? 'fas fa-folder' : 'fas fa-file';
    const displayName = isParent ? '.. (Parent Directory)' : name;
    
    item.innerHTML = `
        <i class="${icon}"></i>
        <span>${escapeHtml(displayName)}</span>
        <div class="file-actions">
            ${!isParent && type === 'file' ? '<button class="btn btn-sm btn-secondary edit-file-btn"><i class="fas fa-edit"></i></button>' : ''}
        </div>
    `;
    
    // Add event listeners
    if (type === 'directory' || isParent) {
        item.addEventListener('click', () => loadFiles(fullPath));
        item.style.cursor = 'pointer';
    }
    
    // Add edit button event listener for files
    if (!isParent && type === 'file') {
        const editBtn = item.querySelector('.edit-file-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering parent click
                console.log('Edit button clicked for:', fullPath);
                openFileEditor(fullPath);
            });
        }
    }
    
    return item;
}

function updateFileBreadcrumb(path) {
    const breadcrumbNav = document.querySelector('.breadcrumb-nav');
    if (!breadcrumbNav) return;
    
    breadcrumbNav.innerHTML = '';
    
    const parts = path.split('/').filter(part => part && part !== '.');
    let currentPath = '.';
    
    // Add root
    const rootItem = document.createElement('span');
    rootItem.className = 'breadcrumb-item';
    rootItem.textContent = 'minecraft-server';
    rootItem.addEventListener('click', () => loadFiles('./minecraft-server'));
    breadcrumbNav.appendChild(rootItem);
    
    // Add path parts
    parts.forEach((part, index) => {
        if (part === 'minecraft-server') return;
        
        currentPath += '/' + part;
        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        if (index === parts.length - 1) {
            item.classList.add('active');
        }
        item.textContent = part;
        
        const pathToNavigate = currentPath;
        item.addEventListener('click', () => loadFiles(pathToNavigate));
        
        breadcrumbNav.appendChild(item);
    });
}

async function openFileEditor(filePath) {
    try {
        console.log('Opening file editor for:', filePath);
        
        const response = await fetch(`${BASE_URL}/api/files?path=${encodeURIComponent(filePath)}`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('File data received:', data);
            
            if (data.isFile && data.content !== undefined) {
                showFileEditor(filePath, data.content);
            } else {
                throw new Error('Invalid file response format');
            }
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to read file:', response.status, errorData);
            throw new Error(errorData.error || 'Failed to read file');
        }
    } catch (error) {
        console.error('Error opening file:', error);
        showNotification(`Failed to open file: ${error.message}`, 'error');
    }
}

function showFileEditor(filePath, content) {
    console.log('showFileEditor called with:', filePath, 'content length:', content.length);
    
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');
    
    // Check if elements exist
    if (!modalTitle || !modalBody || !modalFooter) {
        console.error('Modal elements not found:', { modalTitle, modalBody, modalFooter });
        showNotification('Error: Modal elements not found', 'error');
        return;
    }
    
    modalTitle.textContent = `Edit: ${filePath.split('/').pop()}`;
    
    modalBody.innerHTML = `
        <textarea id="file-editor-content" style="
            width: 100%; 
            height: 600px; 
            font-family: 'Courier New', Consolas, monospace; 
            font-size: 14px; 
            line-height: 1.5;
            padding: 15px; 
            border: 1px solid var(--border-color); 
            border-radius: var(--radius-md); 
            background: var(--bg-primary); 
            color: var(--text-primary);
            resize: vertical;
            tab-size: 4;
            white-space: pre;
            overflow-wrap: normal;
            overflow-x: auto;
        ">${escapeHtml(content)}</textarea>
    `;
    
    modalFooter.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveFile('${escapeHtml(filePath)}')">Save</button>
    `;
    
    console.log('Modal content set, calling showModal()');
    showModal();
}

async function saveFile(filePath) {
    try {
        const content = document.getElementById('file-editor-content').value;
        console.log('Saving file:', filePath);
        
        const response = await fetch(`${BASE_URL}/api/files/save`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                path: filePath,
                content: content
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('File saved successfully:', result);
            showNotification('File saved successfully', 'success');
            closeModal();
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to save file:', response.status, errorData);
            throw new Error(errorData.error || 'Failed to save file');
        }
    } catch (error) {
        console.error('Error saving file:', error);
        showNotification(`Failed to save file: ${error.message}`, 'error');
    }
}

function uploadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    
    input.onchange = async function(e) {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) {
            console.log('No files selected');
            return;
        }
        
        console.log('Selected files:', files.map(f => f.name));
        console.log('Current path for upload:', currentPath);
        
        for (const file of files) {
            try {
                console.log(`Uploading file: ${file.name} to path: ${currentPath}`);
                
                const formData = new FormData();
                formData.append('file', file);
                formData.append('path', currentPath || './minecraft-server');
                
                const response = await fetch(`${BASE_URL}/api/files/upload`, {
                    method: 'POST',
                    credentials: 'same-origin',
                    body: formData
                });
                
                console.log('Upload response status:', response.status);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Upload successful:', result);
                    showNotification(`${file.name} uploaded successfully`, 'success');
                } else {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                    console.error('Upload failed:', response.status, errorData);
                    throw new Error(errorData.error || `Failed to upload ${file.name}`);
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                showNotification(`Failed to upload ${file.name}: ${error.message}`, 'error');
            }
        }
        
        // Refresh file list
        console.log('Refreshing file list after upload');
        loadFiles(currentPath || './minecraft-server');
    };
    
    input.click();
}

// Server Configuration Functions
async function loadServerConfig() {
    try {
        const response = await fetch(`${BASE_URL}/api/server/config`, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
            serverConfig = await response.json();
            updateServerConfigUI(serverConfig);
        }
    } catch (error) {
        console.error('Error loading server config:', error);
    }
}

function updateServerConfigUI(config) {
    // Update RAM allocation
    const ramInput = document.getElementById('ram-allocation');
    if (ramInput && config.ram) {
        ramInput.value = config.ram;
    }
    
    // Update Aikar flags
    const aikarCheckbox = document.getElementById('aikar-flags');
    if (aikarCheckbox) {
        aikarCheckbox.checked = config.aikarFlags || false;
    }
    
    // Update other settings as needed
    Object.keys(config).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = config[key];
            } else {
                element.value = config[key];
            }
        }
    });
}

async function saveServerConfig() {
    try {
        const formData = new FormData(document.getElementById('server-config-form'));
        const config = Object.fromEntries(formData.entries());
        
        // Convert checkbox values
        const checkboxes = document.querySelectorAll('#server-config-form input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            config[checkbox.name] = checkbox.checked;
        });
        
        const response = await fetch(`${BASE_URL}/api/server/config`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            showNotification('Configuration saved successfully', 'success');
            serverConfig = config;
        } else {
            throw new Error('Failed to save configuration');
        }
    } catch (error) {
        console.error('Error saving server config:', error);
        showNotification('Failed to save configuration', 'error');
    }
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        // Load system info
        await loadSystemInfo();
        
        // Update server status
        await updateServerStatus();
        
        // Load recent activity (mock data for now)
        updateRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateRecentActivity() {
    const activityList = document.getElementById('recent-activity');
    if (!activityList) return;
    
    // Mock activity data
    const activities = [
        { icon: 'fas fa-play', text: 'Server started', time: '2 minutes ago' },
        { icon: 'fas fa-user-plus', text: 'Player joined: Steve', time: '5 minutes ago' },
        { icon: 'fas fa-save', text: 'World saved', time: '10 minutes ago' },
        { icon: 'fas fa-download', text: 'Plugin updated: WorldEdit', time: '1 hour ago' },
        { icon: 'fas fa-shield-alt', text: 'Backup completed', time: '2 hours ago' }
    ];
    
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

// Mock functions for features not yet implemented
async function loadPlayers() {
    const playersList = document.getElementById('players-list');
    if (playersList) {
        playersList.innerHTML = `
            <div class="no-players">
                <i class="fas fa-users"></i>
                <p>No players online</p>
            </div>
        `;
    }
}

async function loadPlugins() {
    const pluginsList = document.getElementById('plugins-list');
    if (pluginsList) {
        pluginsList.innerHTML = `
            <div class="loading-plugins">
                <i class="fas fa-puzzle-piece"></i>
                <p>Plugin management coming soon</p>
            </div>
        `;
    }
}

async function loadMonitoringData() {
    // Mock monitoring data
    const charts = document.querySelectorAll('.chart-placeholder');
    charts.forEach(chart => {
        chart.innerHTML = `
            <i class="fas fa-chart-line"></i>
            <p>Performance charts coming soon</p>
        `;
    });
}

async function loadBackups() {
    const backupsList = document.getElementById('backups-list');
    if (backupsList) {
        backupsList.innerHTML = `
            <div class="no-backups">
                <i class="fas fa-archive"></i>
                <p>No backups found</p>
            </div>
        `;
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: var(--${type === 'error' ? 'danger' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info'}-color);
        color: white;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 10001;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function showModal() {
    console.log('showModal called');
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.add('active');
        console.log('Modal overlay shown');
    } else {
        console.error('Modal overlay not found');
    }
}

function closeModal() {
    console.log('closeModal called');
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
        console.log('Modal overlay hidden');
    } else {
        console.error('Modal overlay not found');
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);