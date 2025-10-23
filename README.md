# Minecraft Server Wrapper

A beautiful, cross-platform web-based Minecraft server management tool with real-time monitoring, file management, and console access.

## Features

- 🚀 **Server Management**: Start, stop, restart, and kill Minecraft server processes
- 🎛️ **Aikar's Flag Optimization**: Built-in performance optimization flags
- 💻 **Real-time Console**: Execute commands and monitor server output in real-time
- 📁 **File Manager**: Upload, delete, edit, and browse server files through web interface
- 📊 **System Monitoring**: Real-time graphs for CPU, RAM, Network, and Disk usage
- 🌐 **Cross-platform**: Compatible with both Windows and Ubuntu
- 📱 **Responsive Design**: Beautiful, modern UI that works on all devices
- 🔄 **Real-time Updates**: Socket.io powered real-time communication

## Prerequisites

### System Requirements
- **Operating System**: Windows 10/11 or Ubuntu 18.04+ (or compatible Linux distributions)
- **RAM**: Minimum 4GB (8GB+ recommended for better server performance)
- **Storage**: At least 2GB free space (more depending on world size)
- **Network**: Internet connection for initial setup and multiplayer

### Required Software
- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- **Java** (version 17 or higher) - [Download here](https://adoptium.net/)
- **Minecraft Server JAR** - [Download here](https://www.minecraft.net/en-us/download/server)

### Ubuntu/Linux Additional Dependencies
Before running the application on Ubuntu or other Linux distributions, ensure you have the following packages installed:

#### Essential Build Tools
```bash
sudo apt update
sudo apt install -y build-essential curl wget git
```

#### For Ubuntu/Debian Systems
```bash
# Update package list
sudo apt update

# Install essential packages
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Node.js 18.x (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Java 17 (required for modern Minecraft servers)
sudo apt install -y openjdk-17-jre-headless openjdk-17-jdk-headless

# Install additional utilities (optional but recommended)
sudo apt install -y \
    htop \
    screen \
    tmux \
    nano \
    vim \
    unzip \
    zip
```

#### For CentOS/RHEL/Fedora Systems
```bash
# For Fedora/newer systems with dnf
sudo dnf update
sudo dnf install -y \
    curl \
    wget \
    git \
    gcc \
    gcc-c++ \
    make \
    nodejs \
    npm \
    java-17-openjdk-headless \
    java-17-openjdk-devel

# For older CentOS/RHEL systems with yum
sudo yum update
sudo yum install -y \
    curl \
    wget \
    git \
    gcc \
    gcc-c++ \
    make \
    java-17-openjdk-headless \
    java-17-openjdk-devel

# Install Node.js via NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs  # or sudo dnf install -y nodejs
```

#### For Arch Linux Systems
```bash
sudo pacman -Syu
sudo pacman -S \
    curl \
    wget \
    git \
    base-devel \
    nodejs \
    npm \
    jre17-openjdk-headless \
    jdk17-openjdk
```

#### Verify Installations
After installing the dependencies, verify they are working correctly:

```bash
# Check Node.js version (should be 14+)
node --version

# Check npm version
npm --version

# Check Java version (should be 17+)
java --version

# Check if build tools are available
gcc --version
make --version
```

## Installation

### Quick Installation

#### Windows
1. **Download** or clone this repository
2. **Run the installer** as Administrator:
   ```cmd
   install.bat
   ```
3. **Follow the prompts** - the installer will:
   - Check and install Node.js (if needed)
   - Check and install Java (if needed)
   - Install all dependencies
   - Set up the project structure
   - Create desktop shortcuts and start scripts

#### Ubuntu/Linux
1. **Download** or clone this repository
2. **Make the installer executable** and run it:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
3. **Follow the prompts** - the installer will:
   - Detect your Linux distribution
   - Install Node.js and Java (if needed)
   - Install all dependencies
   - Set up the project structure
   - Create systemd service files

### Manual Installation

#### Prerequisites
- **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
- **Java** (version 17 or higher) - [Download here](https://adoptium.net/)
- **Minecraft Server JAR** - [Download here](https://www.minecraft.net/en-us/download/server)

#### Setup Steps
1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Create minecraft-server directory**:
   ```bash
   mkdir minecraft-server
   ```
4. **Place your Minecraft server JAR** in the `minecraft-server` folder and rename it to `server.jar`
5. **Accept the EULA** by editing `minecraft-server/eula.txt` and setting `eula=true`
6. **Start the wrapper**:
   ```bash
   npm start
   ```
7. **Access the web interface** at `http://localhost:5900`

### Interactive Setup
After installation, you can run the interactive setup to configure your server:
```bash
node setup.js
```
This will guide you through configuring:
- Web interface port
- RAM allocation
- Aikar's optimization flags
- Minecraft server settings
- RCON configuration

## Configuration

### Port Configuration
The default port is 5900. You can change it by setting the `PORT` environment variable:
```bash
PORT=8080 npm start
```

### RAM Allocation
You can configure RAM allocation through the web interface. The wrapper now includes a **Save Configuration** button that allows you to:

- **Select RAM Amount**: Choose from 1GB, 2GB, 4GB, 8GB, or 16GB
- **Toggle Aikar's Flags**: Enable or disable performance optimization flags
- **Persistent Settings**: Your configuration is automatically saved and will be used when the server starts

The saved configuration is stored in `server-config.json` and will persist across server restarts. When you start the Minecraft server, it will use your saved RAM allocation and flag preferences.

### Aikar's Flags
The wrapper includes Aikar's optimization flags by default. These can be toggled through the web interface.

## Usage

### Dashboard
- **Server Control**: Start, stop, restart, or kill your Minecraft server
- **Configuration**: Adjust RAM allocation and optimization settings
- **Quick Stats**: View real-time CPU and memory usage

### Console
- **Real-time Output**: See server logs and chat messages in real-time
- **Command Execution**: Send commands directly to the server
- **Clear Console**: Clear the console output for better readability

### File Manager
- **Browse Files**: Navigate through your server files and folders
- **Upload Files**: Drag and drop or select files to upload
- **Edit Files**: Click on text files to edit them in the built-in editor
- **Delete Files**: Remove unwanted files and folders

### Monitoring
- **CPU Usage**: Real-time CPU usage graph
- **Memory Usage**: RAM usage monitoring with historical data
- **Network Activity**: Upload/download speed monitoring
- **Disk Usage**: View disk space usage for all drives

## File Structure

```
MinecraftWrapper/
├── server.js              # Main server application
├── package.json           # Node.js dependencies
├── index.html            # Web interface
├── style.css             # Web interface styles
├── script.js             # Client-side JavaScript
├── setup.js              # Interactive setup script
├── config.json           # Wrapper configuration (created by setup)
├── install.bat           # Windows installer
├── install.sh            # Linux/Ubuntu installer
├── uninstall.bat         # Windows uninstaller
├── start.bat             # Windows start script (created by installer)
├── start.sh              # Linux start script (created by installer)
├── install-service.bat   # Windows service installer (created by installer)
├── install-service.sh    # Linux service installer (created by installer)
├── minecraft-wrapper.service # Systemd service file (created by installer)
├── minecraft-server/     # Minecraft server directory
│   ├── server.jar        # Your Minecraft server JAR
│   ├── server.properties # Server configuration
│   ├── eula.txt          # Minecraft EULA
│   ├── world/            # World files
│   ├── logs/             # Server logs
│   └── plugins/          # Server plugins (if applicable)
└── README.md             # This file
```

## API Endpoints

### Server Management
- `POST /api/server/start` - Start the server
- `POST /api/server/stop` - Stop the server
- `POST /api/server/restart` - Restart the server
- `POST /api/server/kill` - Kill the server process
- `POST /api/server/command` - Send command to server
- `GET /api/server/status` - Get server status
- `GET /api/server/config` - Get server configuration (RAM, flags)
- `POST /api/server/config` - Save server configuration (RAM, flags)

### File Management
- `GET /api/files` - List files/folders or get file content
- `POST /api/files/upload` - Upload files
- `DELETE /api/files` - Delete files/folders
- `POST /api/files/save` - Save file content

### System Monitoring
- `GET /api/system` - Get system information

## Troubleshooting

### Server Won't Start
1. Ensure Java is installed and accessible from command line
2. Check that `server.jar` exists in the `minecraft-server` folder
3. Verify EULA is accepted (`eula=true` in `eula.txt`)
4. Check console output for error messages

### File Upload Issues
1. Ensure the target directory exists
2. Check file permissions
3. Verify disk space availability

### Performance Issues
1. Adjust RAM allocation based on your system
2. Enable Aikar's flags for better performance
3. Monitor system resources in the monitoring tab

## Security Notes

- This wrapper is intended for local or trusted network use
- Do not expose it directly to the internet without proper security measures
- Consider using a reverse proxy with authentication for remote access

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this project.

## License

This project is licensed under the MIT License.