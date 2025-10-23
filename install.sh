#!/bin/bash

# Minecraft Server Wrapper - Ubuntu/Linux Installation Script
# ===========================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        DISTRO="rhel"
    elif [ -f /etc/debian_version ]; then
        DISTRO="debian"
    else
        DISTRO="unknown"
    fi
}

# Function to install Node.js based on distribution
install_nodejs() {
    print_info "Installing Node.js..."
    
    case $DISTRO in
        "ubuntu"|"debian")
            # Update package list
            sudo apt update
            
            # Install curl if not present
            if ! command -v curl &> /dev/null; then
                print_info "Installing curl..."
                sudo apt install -y curl
            fi
            
            # Install Node.js 18.x
            print_info "Adding NodeSource repository..."
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt install -y nodejs
            ;;
        "centos"|"rhel"|"fedora")
            # Install curl if not present
            if ! command -v curl &> /dev/null; then
                print_info "Installing curl..."
                if command -v dnf &> /dev/null; then
                    sudo dnf install -y curl
                else
                    sudo yum install -y curl
                fi
            fi
            
            # Install Node.js 18.x
            print_info "Adding NodeSource repository..."
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            if command -v dnf &> /dev/null; then
                sudo dnf install -y nodejs
            else
                sudo yum install -y nodejs
            fi
            ;;
        "arch")
            sudo pacman -Sy nodejs npm
            ;;
        *)
            print_error "Unsupported distribution: $DISTRO"
            print_info "Please install Node.js manually from: https://nodejs.org/"
            return 1
            ;;
    esac
}

# Function to install Java
install_java() {
    print_info "Installing Java..."
    
    case $DISTRO in
        "ubuntu"|"debian")
            sudo apt update
            sudo apt install -y openjdk-17-jre-headless
            ;;
        "centos"|"rhel"|"fedora")
            if command -v dnf &> /dev/null; then
                sudo dnf install -y java-17-openjdk-headless
            else
                sudo yum install -y java-17-openjdk-headless
            fi
            ;;
        "arch")
            sudo pacman -Sy jre17-openjdk-headless
            ;;
        *)
            print_warning "Could not install Java automatically for $DISTRO"
            print_info "Please install Java 17 or higher manually"
            return 1
            ;;
    esac
}

# Main installation function
main() {
    echo
    echo "========================================"
    echo "  Minecraft Server Wrapper Installer"
    echo "========================================"
    echo
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root. This is not recommended for security reasons."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Installation cancelled."
            exit 1
        fi
    fi
    
    # Detect distribution
    detect_distro
    print_info "Detected distribution: $DISTRO"
    
    # Check if Node.js is installed
    print_info "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed."
        read -p "Install Node.js automatically? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            print_error "Node.js is required. Please install it manually and run this script again."
            exit 1
        fi
        
        install_nodejs
        if [ $? -ne 0 ]; then
            print_error "Failed to install Node.js."
            exit 1
        fi
    else
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    fi
    
    # Check if npm is available
    print_info "Checking npm installation..."
    if ! command -v npm &> /dev/null; then
        print_error "npm is not available. Please reinstall Node.js with npm included."
        exit 1
    else
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    fi
    
    # Check if Java is installed
    print_info "Checking Java installation..."
    if ! command -v java &> /dev/null; then
        print_warning "Java is not installed."
        print_info "Java is required to run Minecraft servers."
        read -p "Install Java automatically? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            install_java
        else
            print_warning "You can install Java later, but it's required to run Minecraft servers."
        fi
    else
        print_success "Java found and available."
    fi
    
    # Install Node.js dependencies
    echo
    print_info "Installing Node.js dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies."
        print_info "Please check your internet connection and try again."
        exit 1
    fi
    print_success "Dependencies installed successfully!"
    
    # Create minecraft-server directory
    print_info "Setting up minecraft-server directory..."
    if [ ! -d "minecraft-server" ]; then
        mkdir minecraft-server
        print_success "Created minecraft-server directory."
    else
        print_info "minecraft-server directory already exists."
    fi
    
    # Create sample server.properties if it doesn't exist
    if [ ! -f "minecraft-server/server.properties" ]; then
        print_info "Creating default server.properties..."
        cat > minecraft-server/server.properties << EOF
# Minecraft server properties
server-port=25565
gamemode=survival
difficulty=easy
max-players=20
online-mode=true
white-list=false
motd=A Minecraft Server managed by Minecraft Server Wrapper
enable-rcon=false
EOF
        print_success "Created default server.properties."
    fi
    
    # Create EULA file
    if [ ! -f "minecraft-server/eula.txt" ]; then
        print_info "Creating EULA file..."
        cat > minecraft-server/eula.txt << EOF
# By changing the setting below to TRUE you are indicating your agreement to our EULA
# https://account.mojang.com/documents/minecraft_eula
eula=false
EOF
        print_warning "Created EULA file with eula=false."
        print_warning "You must set eula=true in minecraft-server/eula.txt to run the server."
    fi
    
    # Create start script
    print_info "Creating start script..."
    cat > start.sh << 'EOF'
#!/bin/bash
echo "Starting Minecraft Server Wrapper..."
echo "Access the web interface at: http://localhost:5900"
echo
npm start
EOF
    chmod +x start.sh
    print_success "Created start.sh script."
    
    # Create systemd service file
    print_info "Creating systemd service file..."
    cat > minecraft-wrapper.service << EOF
[Unit]
Description=Minecraft Server Wrapper
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    print_success "Created minecraft-wrapper.service file."
    
    # Create service installation script
    print_info "Creating service installation script..."
    cat > install-service.sh << 'EOF'
#!/bin/bash

# Install Minecraft Server Wrapper as systemd service

if [ "$EUID" -ne 0 ]; then
    echo "This script must be run as root (use sudo)"
    exit 1
fi

echo "Installing systemd service..."

# Copy service file
cp minecraft-wrapper.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable minecraft-wrapper.service

echo "Service installed successfully!"
echo "Use 'sudo systemctl start minecraft-wrapper' to start the service."
echo "Use 'sudo systemctl status minecraft-wrapper' to check the status."
EOF
    chmod +x install-service.sh
    print_success "Created install-service.sh script."
    
    # Create uninstall script
    print_info "Creating uninstall script..."
    cat > uninstall.sh << 'EOF'
#!/bin/bash

echo "Uninstalling Minecraft Server Wrapper..."

# Stop and disable service if it exists
if systemctl is-active --quiet minecraft-wrapper; then
    echo "Stopping service..."
    sudo systemctl stop minecraft-wrapper
fi

if systemctl is-enabled --quiet minecraft-wrapper; then
    echo "Disabling service..."
    sudo systemctl disable minecraft-wrapper
fi

if [ -f /etc/systemd/system/minecraft-wrapper.service ]; then
    echo "Removing service file..."
    sudo rm /etc/systemd/system/minecraft-wrapper.service
    sudo systemctl daemon-reload
fi

echo "Uninstall complete!"
echo "Note: This script does not remove Node.js, Java, or your Minecraft server files."
EOF
    chmod +x uninstall.sh
    print_success "Created uninstall.sh script."
    
    echo
    echo "========================================"
    echo "  Installation Complete!"
    echo "========================================"
    echo
    print_success "Minecraft Server Wrapper has been installed successfully!"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Place your Minecraft server JAR file in the 'minecraft-server' folder"
    echo "2. Rename it to 'server.jar'"
    echo "3. Edit 'minecraft-server/eula.txt' and set eula=true"
    echo "4. Run './start.sh' to start the wrapper"
    echo "5. Open your browser to http://localhost:5900"
    echo
    echo -e "${BLUE}Optional:${NC}"
    echo "- Run 'sudo ./install-service.sh' to install as a systemd service"
    echo "- Check the README.md file for detailed instructions"
    echo
    print_warning "If you don't have a Minecraft server JAR file, download it from:"
    echo "https://www.minecraft.net/en-us/download/server"
    echo
}

# Run main function
main "$@"