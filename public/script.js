// Socket.io connection
const socket = io();

// Browser-compatible path utilities
function getParentPath(path) {
    if (!path || path === '/' || path === '.') return '/';
    
    // Handle Windows paths
    if (path.includes('\\')) {
        const parts = path.split('\\').filter(part => part !== '');
        if (parts.length <= 1) return path;
        return parts.slice(0, -1).join('\\') || '\\';
    }
    
    // Handle Unix paths
    const parts = path.split('/').filter(part => part !== '');
    if (parts.length <= 1) return '/';
    return '/' + parts.slice(0, -1).join('/');
}

function getBasename(path) {
    if (!path) return '';
    
    // Handle Windows paths
    if (path.includes('\\')) {
        const parts = path.split('\\');
        return parts[parts.length - 1] || '';
    }
    
    // Handle Unix paths
    const parts = path.split('/');
    return parts[parts.length - 1] || '';
}

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
    console.log('Initializing file manager - loading files');
    loadFiles();
    loadSystemInfo();
    loadServerConfig();
    
    // Add event listeners
    document.getElementById('saveConfigBtn').addEventListener('click', saveServerConfig);
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
    document.getElementById('refreshFiles').addEventListener('click', (e) => {
        e.preventDefault();
        loadFiles();
    });
    
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
    // Show loading indicator
    if (fileList) {
        fileList.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading files...</div>';
    }
    
    fetch(`/api/files?path=${encodeURIComponent(path)}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || `HTTP ${response.status}: ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
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
            console.error('File loading error:', error);
            
            // Show specific error message
            let errorMessage = 'Error loading files';
            if (error.message.includes('Path not found')) {
                errorMessage = 'Directory not found. It may have been moved or deleted.';
            } else if (error.message.includes('Permission denied')) {
                errorMessage = 'Permission denied. Check file system permissions.';
            } else if (error.message.includes('ENOENT')) {
                errorMessage = 'Directory does not exist or is inaccessible.';
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            showNotification(errorMessage, 'error');
            
            // Show error in file list
            if (fileList) {
                fileList.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Failed to Load Files</h3>
                        <p>${errorMessage}</p>
                        <button onclick="loadFiles(); return false;" class="btn btn-primary">
                            <i class="fas fa-retry"></i> Try Again
                        </button>
                    </div>
                `;
            }
        });
}

function displayFiles(items) {
    fileList.innerHTML = '';
    
    // Add parent directory link if not at root
    if (currentPath !== './minecraft-server') {
        const parentItem = createFileItem({
            name: '..',
            isDirectory: true,
            path: getParentPath(currentPath)
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
        // Rename button
        const renameBtn = document.createElement('button');
        renameBtn.className = 'btn btn-secondary';
        renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
        renameBtn.title = 'Rename';
        renameBtn.onclick = (e) => {
            e.stopPropagation();
            showRenameDialog(item);
        };
        actions.appendChild(renameBtn);
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete';
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
            loadFiles(getParentPath(currentPath));
        } else {
            loadFiles(item.path);
        }
    });
    
    return div;
}

function handleFileUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    console.log('File upload initiated, files count:', files.length);
    console.log('Current path for upload:', currentPath);
    
    // Show upload progress
    showNotification('Starting file upload...', 'info');
    
    let uploadCount = 0;
    const totalFiles = files.length;
    
    Array.from(files).forEach((file, index) => {
        console.log(`Processing file ${index + 1}/${totalFiles}:`, file.name, 'Size:', file.size);
        
        // Validate file size (100MB limit)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            console.log('File too large:', file.name, file.size);
            showNotification(`File ${file.name} is too large (max 100MB)`, 'error');
            return;
        }
        
        // Validate file type (basic security check)
        const allowedExtensions = ['.txt', '.json', '.yml', '.yaml', '.properties', '.cfg', '.conf', '.log', '.jar', '.zip'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!allowedExtensions.includes(fileExtension) && !file.name.includes('.')) {
            // Allow files without extensions (like 'eula.txt' might be 'eula')
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath);
        
        console.log('Uploading file:', file.name, 'to path:', currentPath);
        
        // Show individual file progress
        const progressId = `upload-${index}`;
        showUploadProgress(file.name, progressId);
        
        fetch('/api/files/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Upload response status:', response.status);
            if (!response.ok) {
                return response.json().then(err => {
                    console.log('Upload error response:', err);
                    throw new Error(err.error || `Upload failed: ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Upload success response:', data);
            uploadCount++;
            hideUploadProgress(progressId);
            showNotification(`File ${file.name} uploaded successfully`, 'success');
            
            // Refresh file list after all uploads complete
            if (uploadCount === totalFiles) {
                console.log('All uploads completed, refreshing file list');
                loadFiles(currentPath);
            }
        })
        .catch(error => {
            console.error('Upload fetch error for file:', file.name, error);
            hideUploadProgress(progressId);
            console.error('Upload error:', error);
            showNotification(`Error uploading ${file.name}: ${error.message}`, 'error');
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
            console.log('File deletion successful:', data);
            showNotification(data.message, 'success');
            loadFiles();
        })
        .catch(error => {
            console.error('File deletion error:', error);
            showNotification('Error deleting file', 'error');
        });
    }
}

function openFileEditor(filePath, content) {
    currentEditingFile = filePath;
    editorTitle.textContent = `Edit: ${getBasename(filePath)}`;
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

// Upload progress functions
function showUploadProgress(fileName, progressId) {
    const progressContainer = document.getElementById('uploadProgress') || createUploadProgressContainer();
    
    const progressItem = document.createElement('div');
    progressItem.id = progressId;
    progressItem.className = 'upload-progress-item';
    progressItem.innerHTML = `
        <div class="upload-info">
            <i class="fas fa-upload"></i>
            <span>${fileName}</span>
        </div>
        <div class="upload-spinner">
            <i class="fas fa-spinner fa-spin"></i>
        </div>
    `;
    
    progressContainer.appendChild(progressItem);
}

function hideUploadProgress(progressId) {
    const progressItem = document.getElementById(progressId);
    if (progressItem) {
        progressItem.remove();
    }
    
    // Remove container if empty
    const progressContainer = document.getElementById('uploadProgress');
    if (progressContainer && progressContainer.children.length === 0) {
        progressContainer.remove();
    }
}

function createUploadProgressContainer() {
    const container = document.createElement('div');
    container.id = 'uploadProgress';
    container.className = 'upload-progress-container';
    document.body.appendChild(container);
    return container;
}

// Rename functionality
function showRenameDialog(item) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content rename-modal">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Rename ${item.isDirectory ? 'Folder' : 'File'}</h3>
                <button class="close-btn" onclick="closeRenameDialog()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="newFileName">New name:</label>
                    <input type="text" id="newFileName" value="${item.name}" class="form-control">
                    <small class="form-text">Enter the new name for this ${item.isDirectory ? 'folder' : 'file'}</small>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="closeRenameDialog()" class="btn btn-secondary">Cancel</button>
                <button onclick="performRename('${item.path}', '${item.name}')" class="btn btn-primary">Rename</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus on input and select text
    const input = document.getElementById('newFileName');
    input.focus();
    input.select();
    
    // Handle Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performRename(item.path, item.name);
        }
    });
    
    // Handle Escape key
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeRenameDialog();
        }
    });
}

function closeRenameDialog() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function performRename(oldPath, oldName) {
    const newName = document.getElementById('newFileName').value.trim();
    
    if (!newName) {
        showNotification('Please enter a valid name', 'error');
        return;
    }
    
    if (newName === oldName) {
        closeRenameDialog();
        return;
    }
    
    // Validate filename
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newName)) {
        showNotification('Invalid characters in filename. Avoid: < > : " / \\ | ? *', 'error');
        return;
    }
    
    // Show loading
    const renameBtn = document.querySelector('.rename-modal .btn-primary');
    if (renameBtn) {
        renameBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Renaming...';
        renameBtn.disabled = true;
    }
    
    fetch('/api/files/rename', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            oldPath: oldPath,
            newName: newName
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || `Rename failed: ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        showNotification(`Successfully renamed "${oldName}" to "${newName}"`, 'success');
        closeRenameDialog();
        loadFiles(); // Refresh file list
    })
    .catch(error => {
        console.error('Rename error:', error);
        showNotification(`Error renaming file: ${error.message}`, 'error');
        
        // Reset button
        if (renameBtn) {
            renameBtn.innerHTML = 'Rename';
            renameBtn.disabled = false;
        }
    });
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

// Server configuration functions
function loadServerConfig() {
    fetch('/api/server/config')
        .then(response => response.json())
        .then(config => {
            document.getElementById('ramSelect').value = config.ramAllocation || '2G';
            document.getElementById('aikarFlags').checked = config.useAikarFlags !== false;
        })
        .catch(error => {
            console.error('Error loading server config:', error);
            // Use defaults if config can't be loaded
        });
}

function saveServerConfig() {
    const ramAllocation = document.getElementById('ramSelect').value;
    const useAikarFlags = document.getElementById('aikarFlags').checked;
    
    const config = {
        ramAllocation: ramAllocation,
        useAikarFlags: useAikarFlags
    };
    
    const saveBtn = document.getElementById('saveConfigBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    fetch('/api/server/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || `HTTP ${response.status}: ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        showNotification('Server configuration saved successfully!', 'success');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error saving server config:', error);
        showNotification(`Error saving configuration: ${error.message}`, 'error');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    });
}

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