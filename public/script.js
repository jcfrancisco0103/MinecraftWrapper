// Socket.io connection
const socket = io();

// Global variables
let currentPath = './minecraft-server';
let currentEditingFile = null;
let cpuChart, memoryChart, networkChart;
let systemStatsHistory = {
    cpu: [],
    memory: [],
    timestamps: []
};

// DOM elements
const serverStatusEl = document.getElementById('serverStatus');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const consoleOutput = document.getElementById('consoleOutput');
const commandInput = document.getElementById('commandInput');
const fileList = document.getElementById('fileList');
const currentPathEl = document.getElementById('currentPath');
const fileEditorModal = document.getElementById('fileEditorModal');
const fileEditor = document.getElementById('fileEditor');
const editorTitle = document.getElementById('editorTitle');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeServerControls();
    initializeConsole();
    initializeFileManager();
    initializeMonitoring();
    loadFiles();
    loadSystemInfo();
});

// Tab functionality
function initializeTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Initialize charts when monitoring tab is opened
            if (tabId === 'monitoring') {
                setTimeout(initializeCharts, 100);
            }
        });
    });
}

// Server control functionality
function initializeServerControls() {
    document.getElementById('startBtn').addEventListener('click', () => {
        fetch('/api/server/start', { method: 'POST' })
            .then(response => response.json())
            .then(data => showNotification(data.message, 'success'))
            .catch(error => showNotification('Error starting server', 'error'));
    });
    
    document.getElementById('stopBtn').addEventListener('click', () => {
        fetch('/api/server/stop', { method: 'POST' })
            .then(response => response.json())
            .then(data => showNotification(data.message, 'success'))
            .catch(error => showNotification('Error stopping server', 'error'));
    });
    
    document.getElementById('restartBtn').addEventListener('click', () => {
        fetch('/api/server/restart', { method: 'POST' })
            .then(response => response.json())
            .then(data => showNotification(data.message, 'success'))
            .catch(error => showNotification('Error restarting server', 'error'));
    });
    
    document.getElementById('killBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to kill the server process? This will force stop the server.')) {
            fetch('/api/server/kill', { method: 'POST' })
                .then(response => response.json())
                .then(data => showNotification(data.message, 'warning'))
                .catch(error => showNotification('Error killing server', 'error'));
        }
    });
}

// Console functionality
function initializeConsole() {
    document.getElementById('sendCommand').addEventListener('click', sendCommand);
    document.getElementById('clearConsole').addEventListener('click', clearConsole);
    
    commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendCommand();
        }
    });
}

function sendCommand() {
    const command = commandInput.value.trim();
    if (!command) return;
    
    fetch('/api/server/command', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command })
    })
    .then(response => response.json())
    .then(data => {
        commandInput.value = '';
    })
    .catch(error => {
        showNotification('Error sending command', 'error');
    });
}

function clearConsole() {
    consoleOutput.innerHTML = '';
}

function addConsoleOutput(type, data) {
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = data;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// File manager functionality
function initializeFileManager() {
    document.getElementById('uploadBtn').addEventListener('click', () => {
        document.getElementById('fileUpload').click();
    });
    
    document.getElementById('fileUpload').addEventListener('change', handleFileUpload);
    document.getElementById('refreshFiles').addEventListener('click', loadFiles);
    
    // Modal functionality
    document.querySelector('.close').addEventListener('click', closeFileEditor);
    document.getElementById('cancelEdit').addEventListener('click', closeFileEditor);
    document.getElementById('saveFile').addEventListener('click', saveFile);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === fileEditorModal) {
            closeFileEditor();
        }
    });
}

function loadFiles(path = currentPath) {
    fetch(`/api/files?path=${encodeURIComponent(path)}`)
        .then(response => response.json())
        .then(data => {
            if (data.isFile) {
                // Open file for editing
                openFileEditor(data.path, data.content);
            } else {
                currentPath = data.currentPath;
                currentPathEl.textContent = currentPath;
                displayFiles(data.items);
            }
        })
        .catch(error => {
            showNotification('Error loading files', 'error');
        });
}

function displayFiles(items) {
    fileList.innerHTML = '';
    
    // Add parent directory link if not at root
    if (currentPath !== './minecraft-server') {
        const parentItem = createFileItem({
            name: '..',
            isDirectory: true,
            path: require('path').dirname(currentPath)
        }, true);
        fileList.appendChild(parentItem);
    }
    
    // Sort items: directories first, then files
    items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });
    
    items.forEach(item => {
        const fileItem = createFileItem(item);
        fileList.appendChild(fileItem);
    });
}

function createFileItem(item, isParent = false) {
    const div = document.createElement('div');
    div.className = 'file-item';
    
    const icon = document.createElement('i');
    icon.className = `fas ${item.isDirectory ? 'fa-folder' : 'fa-file'} file-icon ${item.isDirectory ? 'folder' : 'file'}`;
    
    const info = document.createElement('div');
    info.className = 'file-info';
    
    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = item.name;
    
    const details = document.createElement('div');
    details.className = 'file-details';
    
    if (!isParent && !item.isDirectory) {
        details.textContent = `${formatFileSize(item.size)} • ${new Date(item.modified).toLocaleString()}`;
    } else if (!isParent) {
        details.textContent = `Directory • ${new Date(item.modified).toLocaleString()}`;
    }
    
    info.appendChild(name);
    info.appendChild(details);
    
    const actions = document.createElement('div');
    actions.className = 'file-actions-btn';
    
    if (!isParent) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteFile(item.path, item.name);
        };
        actions.appendChild(deleteBtn);
    }
    
    div.appendChild(icon);
    div.appendChild(info);
    div.appendChild(actions);
    
    div.addEventListener('click', () => {
        if (isParent) {
            loadFiles(require('path').dirname(currentPath));
        } else {
            loadFiles(item.path);
        }
    });
    
    return div;
}

function handleFileUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    Array.from(files).forEach(file => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath);
        
        fetch('/api/files/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            showNotification(`File ${file.name} uploaded successfully`, 'success');
            loadFiles();
        })
        .catch(error => {
            showNotification(`Error uploading ${file.name}`, 'error');
        });
    });
    
    e.target.value = '';
}

function deleteFile(filePath, fileName) {
    if (confirm(`Are you sure you want to delete ${fileName}?`)) {
        fetch('/api/files', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: filePath })
        })
        .then(response => response.json())
        .then(data => {
            showNotification(data.message, 'success');
            loadFiles();
        })
        .catch(error => {
            showNotification('Error deleting file', 'error');
        });
    }
}

function openFileEditor(filePath, content) {
    currentEditingFile = filePath;
    editorTitle.textContent = `Edit: ${require('path').basename(filePath)}`;
    fileEditor.value = content;
    fileEditorModal.style.display = 'block';
}

function closeFileEditor() {
    fileEditorModal.style.display = 'none';
    currentEditingFile = null;
}

function saveFile() {
    if (!currentEditingFile) return;
    
    fetch('/api/files/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            path: currentEditingFile,
            content: fileEditor.value
        })
    })
    .then(response => response.json())
    .then(data => {
        showNotification(data.message, 'success');
        closeFileEditor();
    })
    .catch(error => {
        showNotification('Error saving file', 'error');
    });
}

// Monitoring functionality
function initializeMonitoring() {
    // Load system info periodically
    setInterval(loadSystemInfo, 5000);
}

function loadSystemInfo() {
    fetch('/api/system')
        .then(response => response.json())
        .then(data => {
            updateQuickStats(data.cpu.usage, data.memory.usage);
            updateDiskInfo(data.disk);
        })
        .catch(error => {
            console.error('Error loading system info:', error);
        });
}

function updateQuickStats(cpu, memory) {
    document.getElementById('cpuUsage').textContent = `${cpu.toFixed(1)}%`;
    document.getElementById('memUsage').textContent = `${memory.toFixed(1)}%`;
}

function updateDiskInfo(disks) {
    const diskInfo = document.getElementById('diskInfo');
    diskInfo.innerHTML = '';
    
    disks.forEach(disk => {
        const diskItem = document.createElement('div');
        diskItem.className = 'disk-item';
        
        diskItem.innerHTML = `
            <div class="disk-name">${disk.fs}</div>
            <div class="disk-usage">
                <span>${formatFileSize(disk.used)} / ${formatFileSize(disk.size)}</span>
                <span>${disk.usage.toFixed(1)}%</span>
            </div>
            <div class="disk-bar">
                <div class="disk-bar-fill" style="width: ${disk.usage}%"></div>
            </div>
        `;
        
        diskInfo.appendChild(diskItem);
    });
}

function initializeCharts() {
    if (cpuChart) return; // Already initialized
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 100
            }
        },
        plugins: {
            legend: {
                display: false
            }
        }
    };
    
    // CPU Chart
    const cpuCtx = document.getElementById('cpuChart').getContext('2d');
    cpuChart = new Chart(cpuCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'CPU Usage (%)',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: chartOptions
    });
    
    // Memory Chart
    const memCtx = document.getElementById('memoryChart').getContext('2d');
    memoryChart = new Chart(memCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Memory Usage (%)',
                data: [],
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: chartOptions
    });
    
    // Network Chart
    const netCtx = document.getElementById('networkChart').getContext('2d');
    networkChart = new Chart(netCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Download (KB/s)',
                    data: [],
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Upload (KB/s)',
                    data: [],
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            ...chartOptions,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

function updateCharts(cpu, memory, timestamp) {
    if (!cpuChart) return;
    
    const timeLabel = new Date(timestamp).toLocaleTimeString();
    const maxDataPoints = 20;
    
    // Update CPU chart
    cpuChart.data.labels.push(timeLabel);
    cpuChart.data.datasets[0].data.push(cpu);
    
    if (cpuChart.data.labels.length > maxDataPoints) {
        cpuChart.data.labels.shift();
        cpuChart.data.datasets[0].data.shift();
    }
    
    cpuChart.update('none');
    
    // Update Memory chart
    memoryChart.data.labels.push(timeLabel);
    memoryChart.data.datasets[0].data.push(memory);
    
    if (memoryChart.data.labels.length > maxDataPoints) {
        memoryChart.data.labels.shift();
        memoryChart.data.datasets[0].data.shift();
    }
    
    memoryChart.update('none');
}

// Socket.io event handlers
socket.on('serverStatus', (data) => {
    serverStatusEl.textContent = data.status.charAt(0).toUpperCase() + data.status.slice(1);
    serverStatusEl.className = `status-badge ${data.status}`;
});

socket.on('consoleOutput', (data) => {
    addConsoleOutput(data.type, data.data);
});

socket.on('systemStats', (data) => {
    updateCharts(data.cpu, data.memory, data.timestamp);
});

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '9999',
        maxWidth: '300px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to DOM and animate in
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Polyfill for require (since we're in browser)
window.require = {
    path: {
        basename: (path) => path.split(/[\\/]/).pop(),
        dirname: (path) => path.split(/[\\/]/).slice(0, -1).join('/')
    }
};