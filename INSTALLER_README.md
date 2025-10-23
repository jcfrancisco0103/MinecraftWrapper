# Minecraft Server Wrapper - Installation Guide

## GUI Installation Wizard

The GUI Installation Wizard provides a user-friendly interface for installing the Minecraft Server Wrapper with all necessary components and configurations.

### Features

- **Multi-step Installation Process**: Navigate through welcome, license, directory selection, components, installation progress, and completion screens
- **Professional Modern UI**: Clean, responsive design with proper theming
- **License Agreement**: Scrollable license text with required acceptance checkbox
- **Directory Selection**: Browse and validate installation location with permission checks
- **Component Selection**: Choose which components to install (Core, Service, Shortcuts, Examples)
- **Installation Progress**: Real-time progress bar with file status and time estimates
- **Completion Options**: Launch application and view README after installation

### Running the GUI Installer

```bash
# Interactive GUI installation
python installer_gui.py

# Or simply double-click the installer_gui.py file
```

### Installation Screens

1. **Welcome Screen**: Application overview and feature highlights
2. **License Agreement**: MIT license with acceptance requirement
3. **Directory Selection**: Choose installation location with validation
4. **Component Selection**: Select optional components to install
5. **Installation Progress**: Real-time installation with progress tracking
6. **Completion**: Installation summary with launch options

## Silent/Unattended Installation

The silent installer allows for automated, unattended installations perfect for deployment scripts, system administrators, or batch installations.

### Command Line Options

```bash
# Basic silent installation (requires license acceptance)
python installer_gui.py --silent --accept-license

# Silent installation with custom path
python installer_gui.py --silent --accept-license --install-path "C:\MyApps\MinecraftWrapper"

# Silent installation with configuration file
python installer_gui.py --silent --config-file installer_config.json

# Silent installation with specific options
python installer_gui.py --silent --accept-license --no-service --no-shortcuts --include-examples

# Verbose silent installation
python installer_gui.py --silent --accept-license --verbose
```

### Silent Installation Arguments

| Argument | Description |
|----------|-------------|
| `--silent`, `-S` | Run in silent mode |
| `--install-path`, `-p` | Custom installation directory |
| `--accept-license`, `-a` | Accept license agreement (required) |
| `--no-service` | Skip service installation |
| `--no-shortcuts` | Skip desktop shortcuts creation |
| `--include-examples` | Include example configurations |
| `--config-file`, `-c` | Use JSON configuration file |
| `--verbose`, `-v` | Enable verbose output |

### Configuration File Format

Create a JSON configuration file for complex installations:

```json
{
  "install_path": "C:\\Program Files\\Minecraft Server Wrapper",
  "accept_license": true,
  "components": {
    "core": true,
    "service": true,
    "shortcuts": true,
    "examples": false
  },
  "create_shortcuts": true,
  "install_service": true,
  "installation_options": {
    "create_desktop_shortcut": true,
    "create_start_menu_shortcut": true,
    "add_to_path": false,
    "auto_start_service": false
  },
  "server_configuration": {
    "default_port": 5900,
    "default_ram": "2G",
    "enable_aikar_flags": true,
    "minecraft_version": "latest"
  }
}
```

### Silent Installation Examples

#### Basic Installation
```bash
python installer_gui.py --silent --accept-license
```

#### Custom Installation Path
```bash
python installer_gui.py --silent --accept-license --install-path "D:\Games\MinecraftWrapper"
```

#### Minimal Installation (No Service, No Shortcuts)
```bash
python installer_gui.py --silent --accept-license --no-service --no-shortcuts
```

#### Full Installation with Examples
```bash
python installer_gui.py --silent --accept-license --include-examples --verbose
```

#### Configuration File Installation
```bash
python installer_gui.py --silent --config-file my_config.json --verbose
```

## Installation Components

### Core Application (Required)
- Main application files (app.js, package.json, etc.)
- Web interface files (HTML, CSS, JavaScript)
- Configuration scripts
- Size: ~15 MB

### Service Integration (Optional)
- Windows Service installation scripts
- Linux systemd service files
- Service management utilities
- Size: ~2 MB

### Desktop Shortcuts (Optional)
- Desktop shortcut creation
- Start menu entries (Windows)
- Application launcher (Linux)
- Size: ~1 MB

### Example Configurations (Optional)
- Sample server configurations
- Example Minecraft server setups
- Documentation and guides
- Size: ~5 MB

## Post-Installation Steps

After installation, follow these steps to complete the setup:

1. **Navigate to Installation Directory**
   ```bash
   cd "C:\Program Files\Minecraft Server Wrapper"
   ```

2. **Run Initial Setup** (Optional)
   ```bash
   node setup.js
   ```

3. **Install Dependencies** (If not already installed)
   ```bash
   npm install
   ```

4. **Start the Application**
   - Windows: Double-click `start.bat` or run from command line
   - Linux: Run `./start.sh` or use the desktop shortcut

5. **Access Web Interface**
   - Open browser and navigate to `http://localhost:5900`
   - Default port can be changed in configuration

## Troubleshooting

### Common Issues

#### Permission Errors (Windows Error 5: Access Denied)
This is the most common installation issue on Windows. Here are the solutions:

**Solution 1: Use Default User Directory (Recommended)**
- The installer now defaults to `%LOCALAPPDATA%\MinecraftServerWrapper` which doesn't require admin privileges
- This is the easiest and safest option for most users

**Solution 2: Run as Administrator**
- Right-click on `installer_gui.py` and select "Run as administrator"
- Or use the provided `run_installer_as_admin.bat` script
- Click "Yes" when prompted by User Account Control

**Solution 3: Choose a Different Installation Directory**
- During installation, browse to a user-accessible location such as:
  - `C:\Users\[YourUsername]\MinecraftWrapper`
  - `D:\MinecraftWrapper` (if you have a D: drive)
  - Any folder in your Documents or Desktop

**Why This Happens:**
- Windows protects system directories like `C:\Program Files` from unauthorized changes
- Installing to these locations requires administrator privileges for security reasons

#### Missing Dependencies
- Ensure Node.js and npm are installed
- Run `npm install` in installation directory

#### Port Conflicts
- Change default port in configuration
- Check for other applications using port 5900

#### Service Installation Issues
- Run service installation scripts as Administrator/sudo
- Check system service logs for errors

### Error Codes

| Code | Description |
|------|-------------|
| 0 | Installation successful |
| 1 | General installation error |
| 2 | License not accepted |
| 3 | Invalid installation path |
| 4 | Insufficient permissions |
| 5 | Missing dependencies |

## Advanced Usage

### Batch Deployment

Create a batch script for multiple installations:

```batch
@echo off
echo Installing Minecraft Server Wrapper on multiple machines...

python installer_gui.py --silent --accept-license --config-file deployment_config.json --verbose

if %ERRORLEVEL% EQU 0 (
    echo Installation successful!
) else (
    echo Installation failed with error code %ERRORLEVEL%
)
```

### Network Installation

For network deployments, copy the installer files to a network share and run:

```bash
# Map network drive (Windows)
net use Z: \\server\share

# Run installation from network location
python Z:\installer\installer_gui.py --silent --accept-license --install-path "C:\Apps\MinecraftWrapper"
```

## Support

For installation issues or questions:

1. Check the main README.md for general application information
2. Review the troubleshooting section above
3. Check system requirements and dependencies
4. Ensure proper permissions for installation directory

## License

This installer and the Minecraft Server Wrapper application are licensed under the MIT License. See the license agreement during installation for full terms.