#!/usr/bin/env python3
"""
Minecraft Server Wrapper - Silent Installation Module
===================================================
Handles unattended/silent installation mode
"""

import os
import sys
import shutil
import json
import platform
import argparse
from pathlib import Path

class SilentInstaller:
    def __init__(self):
        self.app_name = "Minecraft Server Wrapper"
        self.app_version = "1.0.0"
        self.default_install_path = self.get_default_install_path()
        
        # Default configuration
        self.config = {
            'install_path': self.default_install_path,
            'components': {
                'core': True,
                'service': True,
                'shortcuts': True,
                'examples': False
            },
            'accept_license': False,
            'create_shortcuts': True,
            'install_service': True
        }
        
    def get_default_install_path(self):
        """Get the default installation path based on the operating system"""
        if platform.system() == "Windows":
            return os.path.join(os.environ.get('PROGRAMFILES', 'C:\\Program Files'), self.app_name)
        else:
            return os.path.join(os.path.expanduser('~'), 'MinecraftWrapper')
            
    def parse_arguments(self):
        """Parse command line arguments for silent installation"""
        parser = argparse.ArgumentParser(description='Minecraft Server Wrapper Silent Installer')
        
        parser.add_argument('--silent', '-S', action='store_true',
                          help='Run in silent mode')
        parser.add_argument('--install-path', '-p', type=str,
                          help='Installation directory path')
        parser.add_argument('--accept-license', '-a', action='store_true',
                          help='Accept license agreement')
        parser.add_argument('--no-service', action='store_true',
                          help='Skip service installation')
        parser.add_argument('--no-shortcuts', action='store_true',
                          help='Skip desktop shortcuts creation')
        parser.add_argument('--include-examples', action='store_true',
                          help='Include example configurations')
        parser.add_argument('--config-file', '-c', type=str,
                          help='Configuration file for installation settings')
        parser.add_argument('--verbose', '-v', action='store_true',
                          help='Verbose output')
        
        return parser.parse_args()
        
    def load_config_file(self, config_file):
        """Load configuration from JSON file"""
        try:
            with open(config_file, 'r') as f:
                file_config = json.load(f)
                self.config.update(file_config)
                return True
        except Exception as e:
            print(f"Error loading config file: {e}")
            return False
            
    def validate_installation_path(self, path):
        """Validate the installation path"""
        try:
            # Check if path exists or can be created
            if not os.path.exists(path):
                parent = os.path.dirname(path)
                if not os.path.exists(parent):
                    return False, "Parent directory does not exist"
                if not os.access(parent, os.W_OK):
                    return False, "No write permission to parent directory"
            elif not os.access(path, os.W_OK):
                return False, "No write permission to installation directory"
                
            return True, "Path is valid"
        except Exception as e:
            return False, str(e)
            
    def install_files(self, verbose=False):
        """Install application files"""
        files_to_copy = [
            'app.js', 'package.json', 'script.js', 'index.html', 'style.css',
            'install.bat', 'install.sh', 'setup.js', 'uninstall.bat', 'uninstall.sh',
            'README.md'
        ]
        
        try:
            # Create installation directory
            os.makedirs(self.config['install_path'], exist_ok=True)
            
            copied_files = 0
            for filename in files_to_copy:
                if os.path.exists(filename):
                    if verbose:
                        print(f"Copying {filename}...")
                    shutil.copy2(filename, self.config['install_path'])
                    copied_files += 1
                elif verbose:
                    print(f"Warning: {filename} not found, skipping...")
                    
            if verbose:
                print(f"Copied {copied_files} files to {self.config['install_path']}")
                
            return True, f"Successfully copied {copied_files} files"
        except Exception as e:
            return False, f"Error copying files: {e}"
            
    def create_shortcuts(self, verbose=False):
        """Create desktop shortcuts"""
        if not self.config['create_shortcuts']:
            return True, "Shortcuts creation skipped"
            
        try:
            if platform.system() == "Windows":
                # Create Windows shortcut
                desktop = os.path.join(os.path.expanduser('~'), 'Desktop')
                shortcut_path = os.path.join(desktop, f"{self.app_name}.lnk")
                
                # Simple batch file shortcut for Windows
                batch_content = f"""@echo off
cd /d "{self.config['install_path']}"
start.bat
"""
                batch_path = os.path.join(desktop, f"{self.app_name}.bat")
                with open(batch_path, 'w') as f:
                    f.write(batch_content)
                    
                if verbose:
                    print(f"Created desktop shortcut: {batch_path}")
                    
            else:
                # Create Linux desktop entry
                desktop = os.path.join(os.path.expanduser('~'), 'Desktop')
                os.makedirs(desktop, exist_ok=True)
                
                desktop_entry = f"""[Desktop Entry]
Name={self.app_name}
Comment=Minecraft Server Management Tool
Exec={os.path.join(self.config['install_path'], 'start.sh')}
Icon=application-x-executable
Terminal=false
Type=Application
Categories=Game;
"""
                desktop_file = os.path.join(desktop, f"{self.app_name.replace(' ', '_')}.desktop")
                with open(desktop_file, 'w') as f:
                    f.write(desktop_entry)
                    
                # Make executable
                os.chmod(desktop_file, 0o755)
                
                if verbose:
                    print(f"Created desktop entry: {desktop_file}")
                    
            return True, "Shortcuts created successfully"
        except Exception as e:
            return False, f"Error creating shortcuts: {e}"
            
    def install_service(self, verbose=False):
        """Install system service"""
        if not self.config['install_service']:
            return True, "Service installation skipped"
            
        try:
            if platform.system() == "Windows":
                # Copy service installation script
                service_script = os.path.join(self.config['install_path'], 'install-service.bat')
                if os.path.exists(service_script):
                    if verbose:
                        print("Service installation script available at:", service_script)
                        print("Run as administrator to install the service")
                else:
                    if verbose:
                        print("Warning: Service installation script not found")
            else:
                # Copy systemd service file
                service_script = os.path.join(self.config['install_path'], 'install-service.sh')
                if os.path.exists(service_script):
                    if verbose:
                        print("Service installation script available at:", service_script)
                        print("Run with sudo to install the service")
                else:
                    if verbose:
                        print("Warning: Service installation script not found")
                        
            return True, "Service installation prepared"
        except Exception as e:
            return False, f"Error preparing service installation: {e}"
            
    def create_uninstaller(self, verbose=False):
        """Create uninstaller"""
        try:
            uninstall_info = {
                'app_name': self.app_name,
                'app_version': self.app_version,
                'install_path': self.config['install_path'],
                'installed_components': self.config['components'],
                'install_date': str(os.path.getctime(self.config['install_path']))
            }
            
            info_file = os.path.join(self.config['install_path'], 'install_info.json')
            with open(info_file, 'w') as f:
                json.dump(uninstall_info, f, indent=2)
                
            if verbose:
                print(f"Created uninstall information: {info_file}")
                
            return True, "Uninstaller created"
        except Exception as e:
            return False, f"Error creating uninstaller: {e}"
            
    def run_silent_installation(self, args):
        """Run the complete silent installation"""
        verbose = args.verbose
        
        if verbose:
            print(f"Starting silent installation of {self.app_name} v{self.app_version}")
            print("=" * 60)
            
        # Load configuration file if provided
        if args.config_file:
            if not self.load_config_file(args.config_file):
                print("Error: Failed to load configuration file")
                return False
                
        # Apply command line arguments
        if args.install_path:
            self.config['install_path'] = args.install_path
        if args.accept_license:
            self.config['accept_license'] = True
        if args.no_service:
            self.config['install_service'] = False
        if args.no_shortcuts:
            self.config['create_shortcuts'] = False
        if args.include_examples:
            self.config['components']['examples'] = True
            
        # Validate license acceptance
        if not self.config['accept_license']:
            print("Error: License must be accepted for silent installation")
            print("Use --accept-license or set 'accept_license': true in config file")
            return False
            
        # Validate installation path
        valid, message = self.validate_installation_path(self.config['install_path'])
        if not valid:
            print(f"Error: Invalid installation path - {message}")
            return False
            
        if verbose:
            print(f"Installation path: {self.config['install_path']}")
            print(f"Components: {', '.join([k for k, v in self.config['components'].items() if v])}")
            print()
            
        # Perform installation steps
        steps = [
            ("Installing files", self.install_files),
            ("Creating shortcuts", self.create_shortcuts),
            ("Preparing service installation", self.install_service),
            ("Creating uninstaller", self.create_uninstaller)
        ]
        
        for step_name, step_func in steps:
            if verbose:
                print(f"{step_name}...")
                
            success, message = step_func(verbose)
            if not success:
                print(f"Error: {step_name} failed - {message}")
                return False
                
            if verbose:
                print(f"✓ {message}")
                print()
                
        if verbose:
            print("=" * 60)
            print(f"Installation completed successfully!")
            print(f"Application installed to: {self.config['install_path']}")
            print()
            print("Next steps:")
            print("1. Navigate to the installation directory")
            print("2. Run setup.js for initial configuration")
            print("3. Start the application using start.bat (Windows) or start.sh (Linux)")
            
        return True

def main():
    installer = SilentInstaller()
    args = installer.parse_arguments()
    
    if args.silent:
        success = installer.run_silent_installation(args)
        sys.exit(0 if success else 1)
    else:
        print("Silent installer module")
        print("Use --silent flag to run silent installation")
        print("Use --help for more options")

if __name__ == "__main__":
    main()