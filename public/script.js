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
const fileEditor = document.getElementById('fileEditor');
const fileEditorTextarea = document.getElementById('fileEditorTextarea');
const editorTitle = document.getElementById('editorTitle');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeServerControls();
    initializeConsole();
    initializeFileManager();
    initializeMonitoring();
    initializeEditorSettings();
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
    
    document.getElementById('restartBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to restart the server? This will disconnect all players.')) {
            // Disable button and show loading state
            const restartBtn = document.getElementById('restartBtn');
            restartBtn.disabled = true;
            restartBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restarting...';
            
            try {
                const response = await fetch('/api/server/restart', {
                    method: 'POST'
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showNotification('Server restart completed successfully', 'success');
                } else {
                    showNotification(`Restart failed: ${data.error}`, 'error');
                }
            } catch (error) {
                showNotification(`Restart failed: ${error.message}`, 'error');
            } finally {
                // Re-enable button and restore original text
                restartBtn.disabled = false;
                restartBtn.innerHTML = '<i class="fas fa-redo"></i> Restart';
            }
        }
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
    
    // Editor functionality
    document.getElementById('saveFile').addEventListener('click', saveFile);
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
    const editorTitle = document.getElementById('editorTitle');
    const fileEditorTextarea = document.getElementById('fileEditorTextarea');
    const textEditorModal = document.getElementById('textEditorModal');
    
    editorTitle.textContent = `Edit: ${getBasename(filePath)}`;
    
    // Set content as plain text in textarea
    fileEditorTextarea.value = content;
    
    // Show the modal
    textEditorModal.style.display = 'block';
    
    // Load editor settings
    loadEditorSettings();
    
    // Update line numbers
    updateLineNumbers();
    
    // Focus on textarea
    fileEditorTextarea.focus();
    
    // Add keyboard shortcuts
    const handleKeyDown = (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveFile();
        }
        if (e.key === 'Escape') {
            closeFileEditor();
        }
    };
    
    // Remove existing event listener if any
    fileEditorTextarea.removeEventListener('keydown', handleKeyDown);
    // Add new event listener
    fileEditorTextarea.addEventListener('keydown', handleKeyDown);
    
    // Add event listeners for close and cancel buttons
    document.getElementById('closeEditor').onclick = closeFileEditor;
    document.getElementById('cancelEdit').onclick = closeFileEditor;
    
    // Close modal when clicking outside
    textEditorModal.onclick = function(event) {
        if (event.target === textEditorModal) {
            closeFileEditor();
        }
    };
}

function closeFileEditor() {
    const textEditorModal = document.getElementById('textEditorModal');
    
    // Hide the modal
    textEditorModal.style.display = 'none';
    currentEditingFile = null;
    
    // Hide settings panel if open
    const settingsPanel = document.getElementById('editorSettingsPanel');
    if (settingsPanel) {
        settingsPanel.classList.remove('active');
    }
}

function saveFile() {
    if (!currentEditingFile) return;
    
    const fileEditorTextarea = document.getElementById('fileEditorTextarea');
    
    // Get content from textarea
    const content = fileEditorTextarea.value;
    
    fetch('/api/files/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            path: currentEditingFile,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('File saved successfully', 'success');
            closeFileEditor();
            // Refresh the file list to show any changes
            loadFiles(currentPath);
        } else {
            showNotification('Error saving file: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error saving file:', error);
        showNotification('Error saving file: ' + error.message, 'error');
    });
}

// Editor Settings and Customization
function initializeEditorSettings() {
    // Add event listeners for editor controls
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', toggleSettingsPanel);
    }
    
    const fontFamily = document.getElementById('editorFontFamily');
    if (fontFamily) {
        fontFamily.addEventListener('change', updateEditorFont);
    }
    
    const fontSize = document.getElementById('editorFontSize');
    if (fontSize) {
        fontSize.addEventListener('input', updateEditorFont);
    }
    
    const fontWeight = document.getElementById('editorFontWeight');
    if (fontWeight) {
        fontWeight.addEventListener('change', updateEditorFont);
    }
    
    const editorTheme = document.getElementById('editorTheme');
    if (editorTheme) {
        editorTheme.addEventListener('change', updateEditorTheme);
    }
    
    const lineNumbers = document.getElementById('lineNumbers');
    if (lineNumbers) {
        lineNumbers.addEventListener('change', toggleLineNumbers);
    }
    
    const resetSettings = document.getElementById('resetSettings');
    if (resetSettings) {
        resetSettings.addEventListener('click', resetEditorSettings);
    }
    
    const applySettings = document.getElementById('applySettings');
    if (applySettings) {
        applySettings.addEventListener('click', applyEditorSettings);
    }
    
    // Add event listeners for editor content changes
    const fileEditorTextarea = document.getElementById('fileEditorTextarea');
    if (fileEditorTextarea) {
        fileEditorTextarea.addEventListener('input', () => {
            updateLineNumbers();
        });
        
        fileEditorTextarea.addEventListener('scroll', syncGutterScroll);
    }
}

// Additional editor utility functions
function toggleWordWrap() {
    const editor = document.getElementById('fileEditorTextarea');
    if (editor.style.whiteSpace === 'pre-wrap') {
        editor.style.whiteSpace = 'pre';
        showNotification('Word wrap disabled', 'info');
    } else {
        editor.style.whiteSpace = 'pre-wrap';
        showNotification('Word wrap enabled', 'info');
    }
}

function showFindReplace() {
    // Simple find functionality - in a production app you'd want a proper find/replace dialog
    const searchTerm = prompt('Find text:');
    if (searchTerm) {
        const content = fileEditorTextarea.value;
        const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());
        if (index !== -1) {
            fileEditorTextarea.focus();
            fileEditorTextarea.setSelectionRange(index, index + searchTerm.length);
            showNotification(`Found "${searchTerm}"`, 'success');
        } else {
            showNotification(`"${searchTerm}" not found`, 'warning');
        }
    }
}

function toggleSettingsPanel() {
    const settingsPanel = document.getElementById('editorSettingsPanel');
    settingsPanel.classList.toggle('active');
}

function loadEditorSettings() {
    const settings = JSON.parse(localStorage.getItem('editorSettings')) || getDefaultSettings();
    
    // Apply font settings
    document.getElementById('fontFamily').value = settings.fontFamily;
    document.getElementById('fontSize').value = settings.fontSize;
    document.getElementById('fontSizeValue').textContent = settings.fontSize + 'px';
    document.getElementById('fontWeight').value = settings.fontWeight;
    document.getElementById('editorTheme').value = settings.theme;
    document.getElementById('syntaxHighlighting').checked = settings.syntaxHighlighting;
    document.getElementById('lineNumbers').checked = settings.lineNumbers;
    
    applyEditorSettings();
}

function getDefaultSettings() {
    return {
        fontFamily: 'Courier New',
        fontSize: 14,
        fontWeight: 'normal',
        theme: 'dark',
        syntaxHighlighting: true,
        lineNumbers: true
    };
}

function updateEditorFont() {
    const fontFamily = document.getElementById('fontFamily').value;
    const fontSize = document.getElementById('fontSize').value;
    const fontWeight = document.getElementById('fontWeight').value;
    
    document.getElementById('fontSizeValue').textContent = fontSize + 'px';
    
    fileEditorTextarea.style.fontFamily = fontFamily;
    fileEditorTextarea.style.fontSize = fontSize + 'px';
    fileEditorTextarea.style.fontWeight = fontWeight;
    
    // Update gutter font to match
    const gutter = document.getElementById('editorGutter');
    if (gutter) {
        gutter.style.fontFamily = fontFamily;
        gutter.style.fontSize = fontSize + 'px';
    }
    
    saveEditorSettings();
}

function updateEditorTheme() {
    const theme = document.getElementById('editorTheme').value;
    
    // Remove all theme classes
    fileEditorTextarea.className = fileEditorTextarea.className.replace(/theme-\w+/g, '');
    
    // Add new theme class
    fileEditorTextarea.classList.add(`theme-${theme}`);
    
    // Update gutter theme
    const gutter = document.getElementById('editorGutter');
    if (gutter) {
        gutter.className = gutter.className.replace(/theme-\w+/g, '');
        gutter.classList.add(`theme-${theme}`);
    }
    
    saveEditorSettings();
}

function toggleSyntaxHighlighting() {
    const syntaxElement = document.getElementById('syntaxHighlighting');
    if (!syntaxElement) return;
    
    const enabled = syntaxElement.checked;
    
    if (enabled) {
        applySyntaxHighlighting();
    } else {
        // Remove syntax highlighting
        fileEditorTextarea.innerHTML = fileEditorTextarea.value;
    }
    
    saveEditorSettings();
}

function toggleLineNumbers() {
    const lineNumbersElement = document.getElementById('lineNumbers');
    if (!lineNumbersElement) return;
    
    const enabled = lineNumbersElement.checked;
    const gutter = document.getElementById('editorGutter');
    
    if (gutter) {
        gutter.style.display = enabled ? 'block' : 'none';
    }
    
    saveEditorSettings();
}

function applySyntaxHighlighting() {
    const syntaxElement = document.getElementById('syntaxHighlighting');
    if (!syntaxElement || !syntaxElement.checked) return;
    
    const content = fileEditorTextarea.value;
    const fileExtension = currentEditingFile ? currentEditingFile.split('.').pop().toLowerCase() : '';
    
    // Basic syntax highlighting for common file types
    let highlightedContent = content;
    
    if (['js', 'json', 'java', 'py', 'cpp', 'c', 'cs'].includes(fileExtension)) {
        // Keywords
        highlightedContent = highlightedContent.replace(
            /\b(function|var|let|const|if|else|for|while|return|class|public|private|protected|static|void|int|string|boolean|true|false|null|undefined|import|export|from|as|default|async|await|try|catch|finally|throw|new|this|super|extends|implements)\b/g,
            '<span class="syntax-keyword">$1</span>'
        );
        
        // Strings
        highlightedContent = highlightedContent.replace(
            /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
            '<span class="syntax-string">$1$2$1</span>'
        );
        
        // Comments
        highlightedContent = highlightedContent.replace(
            /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
            '<span class="syntax-comment">$1</span>'
        );
        
        // Numbers
        highlightedContent = highlightedContent.replace(
            /\b(\d+\.?\d*)\b/g,
            '<span class="syntax-number">$1</span>'
        );
        
        // Functions
        highlightedContent = highlightedContent.replace(
            /\b(\w+)(?=\s*\()/g,
            '<span class="syntax-function">$1</span>'
        );
    }
    
    // For now, we'll keep it simple and not replace the textarea content
    // as it would interfere with editing. In a production environment,
    // you'd want to use a proper code editor like CodeMirror or Monaco Editor
}

function updateLineNumbers() {
    if (!document.getElementById('lineNumbers').checked) return;
    
    const gutter = document.getElementById('editorGutter');
    if (!gutter) return;
    
    const lines = fileEditorTextarea.value.split('\n');
    const lineNumbers = lines.map((_, index) => index + 1).join('\n');
    gutter.textContent = lineNumbers;
}

function syncGutterScroll() {
    const gutter = document.getElementById('editorGutter');
    if (gutter) {
        gutter.scrollTop = fileEditorTextarea.scrollTop;
    }
}

function saveEditorSettings() {
    const fontFamilyEl = document.getElementById('fontFamily');
    const fontSizeEl = document.getElementById('fontSize');
    const fontWeightEl = document.getElementById('fontWeight');
    const themeEl = document.getElementById('editorTheme');
    const syntaxEl = document.getElementById('syntaxHighlighting');
    const lineNumbersEl = document.getElementById('lineNumbers');
    
    const settings = {
        fontFamily: fontFamilyEl ? fontFamilyEl.value : 'monospace',
        fontSize: fontSizeEl ? parseInt(fontSizeEl.value) : 14,
        fontWeight: fontWeightEl ? fontWeightEl.value : 'normal',
        theme: themeEl ? themeEl.value : 'light',
        syntaxHighlighting: syntaxEl ? syntaxEl.checked : true,
        lineNumbers: lineNumbersEl ? lineNumbersEl.checked : true
    };
    
    localStorage.setItem('editorSettings', JSON.stringify(settings));
}

function resetEditorSettings() {
    const defaultSettings = getDefaultSettings();
    
    document.getElementById('fontFamily').value = defaultSettings.fontFamily;
    document.getElementById('fontSize').value = defaultSettings.fontSize;
    document.getElementById('fontSizeValue').textContent = defaultSettings.fontSize + 'px';
    document.getElementById('fontWeight').value = defaultSettings.fontWeight;
    document.getElementById('editorTheme').value = defaultSettings.theme;
    document.getElementById('syntaxHighlighting').checked = defaultSettings.syntaxHighlighting;
    document.getElementById('lineNumbers').checked = defaultSettings.lineNumbers;
    
    applyEditorSettings();
    showNotification('Editor settings reset to defaults', 'success');
}

function applyEditorSettings() {
    updateEditorFont();
    updateEditorTheme();
    toggleSyntaxHighlighting();
    toggleLineNumbers();
    saveEditorSettings();
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

// Find & Replace functionality
let currentSearchResults = [];
let currentSearchIndex = -1;

function toggleFindReplace() {
    const panel = document.getElementById('findReplacePanel');
    const isVisible = panel.style.display !== 'none';
    
    if (isVisible) {
        closeFindReplace();
    } else {
        panel.style.display = 'block';
        document.getElementById('findInput').focus();
    }
}

function closeFindReplace() {
    const panel = document.getElementById('findReplacePanel');
    panel.style.display = 'none';
    clearSearchHighlights();
    currentSearchResults = [];
    currentSearchIndex = -1;
}

function performFind() {
    const searchTerm = document.getElementById('findInput').value;
    const editor = document.getElementById('fileEditorTextarea');
    
    clearSearchHighlights();
    currentSearchResults = [];
    currentSearchIndex = -1;
    
    if (!searchTerm) {
        updateFindCount();
        return;
    }
    
    const content = editor.innerHTML;
    const matchCase = document.getElementById('matchCaseCheck').checked;
    const wholeWord = document.getElementById('wholeWordCheck').checked;
    const regex = document.getElementById('regexCheck').checked;
    
    let searchPattern;
    if (regex) {
        try {
            searchPattern = new RegExp(searchTerm, matchCase ? 'g' : 'gi');
        } catch (e) {
            updateFindCount();
            return;
        }
    } else {
        let escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (wholeWord) {
            escapedTerm = '\\b' + escapedTerm + '\\b';
        }
        searchPattern = new RegExp(escapedTerm, matchCase ? 'g' : 'gi');
    }
    
    const textContent = editor.textContent || editor.innerText;
    let match;
    while ((match = searchPattern.exec(textContent)) !== null) {
        currentSearchResults.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0]
        });
    }
    
    if (currentSearchResults.length > 0) {
        currentSearchIndex = 0;
        highlightSearchResults();
        scrollToCurrentMatch();
    }
    
    updateFindCount();
}

function findNext() {
    if (currentSearchResults.length === 0) return;
    
    currentSearchIndex = (currentSearchIndex + 1) % currentSearchResults.length;
    highlightSearchResults();
    scrollToCurrentMatch();
    updateFindCount();
}

function findPrevious() {
    if (currentSearchResults.length === 0) return;
    
    currentSearchIndex = currentSearchIndex <= 0 ? currentSearchResults.length - 1 : currentSearchIndex - 1;
    highlightSearchResults();
    scrollToCurrentMatch();
    updateFindCount();
}

function replaceOne() {
    if (currentSearchResults.length === 0 || currentSearchIndex === -1) return;
    
    const replaceText = document.getElementById('replaceInput').value;
    const editor = document.getElementById('fileEditorTextarea');
    const currentMatch = currentSearchResults[currentSearchIndex];
    
    // Replace the current match
    const textContent = editor.textContent || editor.innerText;
    const newContent = textContent.substring(0, currentMatch.start) + 
                      replaceText + 
                      textContent.substring(currentMatch.end);
    
    editor.textContent = newContent;
    
    // Refresh search results
    setTimeout(() => performFind(), 10);
}

function replaceAll() {
    if (currentSearchResults.length === 0) return;
    
    const replaceText = document.getElementById('replaceInput').value;
    const editor = document.getElementById('fileEditorTextarea');
    let content = editor.textContent || editor.innerText;
    
    // Replace all matches from end to start to maintain indices
    for (let i = currentSearchResults.length - 1; i >= 0; i--) {
        const match = currentSearchResults[i];
        content = content.substring(0, match.start) + 
                 replaceText + 
                 content.substring(match.end);
    }
    
    editor.textContent = content;
    
    // Clear search results
    clearSearchHighlights();
    currentSearchResults = [];
    currentSearchIndex = -1;
    updateFindCount();
}

function highlightSearchResults() {
    // This is a simplified implementation
    // In a real editor, you'd need more sophisticated text highlighting
    updateFindCount();
}

function clearSearchHighlights() {
    // Clear any existing highlights
    const editor = document.getElementById('fileEditorTextarea');
    const highlights = editor.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize();
    });
}

function scrollToCurrentMatch() {
    // Scroll to current match if needed
    const editor = document.getElementById('fileEditorTextarea');
    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateFindCount() {
    const countElement = document.getElementById('findCount');
    if (currentSearchResults.length === 0) {
        countElement.textContent = '0 of 0';
    } else {
        countElement.textContent = `${currentSearchIndex + 1} of ${currentSearchResults.length}`;
    }
}

// Spell check functionality
let spellCheckEnabled = false;

function toggleSpellCheck() {
    const editor = document.getElementById('fileEditorTextarea');
    const btn = document.getElementById('spellCheckBtn');
    
    spellCheckEnabled = !spellCheckEnabled;
    
    if (spellCheckEnabled) {
        editor.setAttribute('spellcheck', 'true');
        btn.classList.add('active');
        performSpellCheck();
    } else {
        editor.setAttribute('spellcheck', 'false');
        btn.classList.remove('active');
        clearSpellCheckHighlights();
    }
}

function performSpellCheck() {
    // This is a basic implementation
    // In a real application, you'd integrate with a proper spell checking service
    const editor = document.getElementById('fileEditorTextarea');
    const text = editor.textContent || editor.innerText;
    
    // Simple word validation (you'd replace this with actual spell checking)
    const words = text.split(/\s+/);
    const misspelledWords = words.filter(word => {
        // Basic check - words with numbers or very short words are likely correct
        return word.length > 3 && !/\d/.test(word) && Math.random() < 0.1; // Random for demo
    });
    
    // Highlight misspelled words (simplified)
    misspelledWords.forEach(word => {
        // In a real implementation, you'd properly highlight these in the editor
        console.log('Potentially misspelled:', word);
    });
}

function clearSpellCheckHighlights() {
    const editor = document.getElementById('fileEditorTextarea');
    const misspelled = editor.querySelectorAll('.misspelled');
    misspelled.forEach(element => {
        element.classList.remove('misspelled');
    });
}

// Fullscreen functionality
function toggleFullscreen() {
    const editor = document.querySelector('.file-editor');
    const btn = document.getElementById('fullscreenBtn');
    
    if (editor.classList.contains('fullscreen')) {
        editor.classList.remove('fullscreen');
        btn.innerHTML = '<i class="fas fa-expand"></i>';
        btn.title = 'Enter Fullscreen';
    } else {
        editor.classList.add('fullscreen');
        btn.innerHTML = '<i class="fas fa-compress"></i>';
        btn.title = 'Exit Fullscreen';
    }
}

// Polyfill for require (since we're in browser)
window.require = {
    path: {
        basename: (path) => path.split(/[\\/]/).pop(),
        dirname: (path) => path.split(/[\\/]/).slice(0, -1).join('/')
    }
};