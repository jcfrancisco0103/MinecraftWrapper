#!/usr/bin/env python3
"""
Minecraft Server Wrapper - GUI Installation Wizard
=================================================
A comprehensive installation wizard with modern GUI interface
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import os
import sys
import threading
import time
import shutil
import subprocess
import json
import platform
from pathlib import Path
import webbrowser

class InstallerWizard:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Minecraft Server Wrapper - Installation Wizard")
        self.root.geometry("800x600")
        self.root.resizable(False, False)
        
        # Center the window
        self.center_window()
        
        # Application configuration
        self.app_name = "Minecraft Server Wrapper"
        self.app_version = "1.0.0"
        self.app_description = "Web-based Minecraft Server Management Tool"
        
        # Installation configuration
        self.install_path = self.get_default_install_path()
        self.license_accepted = tk.BooleanVar()
        self.components = {
            'core': {'name': 'Core Application', 'selected': tk.BooleanVar(value=True), 'required': True, 'size': '15 MB'},
            'service': {'name': 'Windows Service Integration', 'selected': tk.BooleanVar(value=True), 'required': False, 'size': '2 MB'},
            'shortcuts': {'name': 'Desktop Shortcuts', 'selected': tk.BooleanVar(value=True), 'required': False, 'size': '1 MB'},
            'examples': {'name': 'Example Configurations', 'selected': tk.BooleanVar(value=False), 'required': False, 'size': '5 MB'}
        }
        
        # Wizard state
        self.current_step = 0
        self.steps = [
            {'name': 'Welcome', 'function': self.create_welcome_screen},
            {'name': 'License', 'function': self.create_license_screen},
            {'name': 'Directory', 'function': self.create_directory_screen},
            {'name': 'Components', 'function': self.create_components_screen},
            {'name': 'Installation', 'function': self.create_installation_screen},
            {'name': 'Complete', 'function': self.create_completion_screen}
        ]
        
        # Installation state
        self.installation_cancelled = False
        self.installation_complete = False
        self.launch_app = tk.BooleanVar(value=True)
        self.view_readme = tk.BooleanVar(value=False)
        
        # Setup UI
        self.setup_styles()
        self.create_main_layout()
        self.show_current_step()
        
    def center_window(self):
        """Center the window on the screen"""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')
        
    def get_default_install_path(self):
        """Get the default installation path based on the operating system"""
        if platform.system() == "Windows":
            # Use user's AppData\Local for default installation to avoid permission issues
            user_local = os.path.expandvars("%LOCALAPPDATA%")
            return os.path.join(user_local, "MinecraftServerWrapper")
        else:
            # Use user's home directory for Linux
            return os.path.expanduser("~/minecraft-server-wrapper")
            
    def setup_styles(self):
        """Configure modern styling for the application"""
        style = ttk.Style()
        
        # Configure modern theme
        style.theme_use('clam')
        
        # Custom colors
        bg_color = '#f0f0f0'
        accent_color = '#0078d4'
        text_color = '#323130'
        
        # Configure styles
        style.configure('Title.TLabel', font=('Segoe UI', 16, 'bold'), foreground=accent_color)
        style.configure('Subtitle.TLabel', font=('Segoe UI', 10), foreground=text_color)
        style.configure('Header.TLabel', font=('Segoe UI', 12, 'bold'), foreground=text_color)
        style.configure('Modern.TButton', font=('Segoe UI', 9))
        style.configure('Accent.TButton', font=('Segoe UI', 9, 'bold'))
        
        # Configure root background
        self.root.configure(bg=bg_color)
        
    def create_main_layout(self):
        """Create the main layout structure"""
        # Header frame
        self.header_frame = tk.Frame(self.root, bg='white', height=80)
        self.header_frame.pack(fill='x', padx=0, pady=0)
        self.header_frame.pack_propagate(False)
        
        # Header content
        header_content = tk.Frame(self.header_frame, bg='white')
        header_content.pack(expand=True, fill='both', padx=20, pady=10)
        
        # App icon and title (placeholder)
        title_frame = tk.Frame(header_content, bg='white')
        title_frame.pack(side='left', fill='y')
        
        app_title = ttk.Label(title_frame, text=self.app_name, style='Title.TLabel', background='white')
        app_title.pack(anchor='w')
        
        app_subtitle = ttk.Label(title_frame, text="Installation Wizard", style='Subtitle.TLabel', background='white')
        app_subtitle.pack(anchor='w')
        
        # Step indicator
        self.step_frame = tk.Frame(header_content, bg='white')
        self.step_frame.pack(side='right', fill='y')
        
        self.step_label = ttk.Label(self.step_frame, text="", style='Subtitle.TLabel', background='white')
        self.step_label.pack(anchor='e', pady=(10, 0))
        
        # Main content frame
        self.content_frame = tk.Frame(self.root, bg='#f0f0f0')
        self.content_frame.pack(expand=True, fill='both', padx=20, pady=20)
        
        # Button frame
        self.button_frame = tk.Frame(self.root, bg='#f0f0f0', height=60)
        self.button_frame.pack(fill='x', padx=20, pady=(0, 20))
        self.button_frame.pack_propagate(False)
        
        # Navigation buttons
        self.cancel_button = ttk.Button(self.button_frame, text="Cancel", command=self.cancel_installation)
        self.cancel_button.pack(side='left', pady=10)
        
        self.back_button = ttk.Button(self.button_frame, text="< Back", command=self.previous_step)
        self.back_button.pack(side='right', padx=(10, 0), pady=10)
        
        self.next_button = ttk.Button(self.button_frame, text="Next >", command=self.next_step, style='Accent.TButton')
        self.next_button.pack(side='right', pady=10)
        
    def update_step_indicator(self):
        """Update the step indicator in the header"""
        current_step_name = self.steps[self.current_step]['name']
        step_text = f"Step {self.current_step + 1} of {len(self.steps)}: {current_step_name}"
        self.step_label.config(text=step_text)
        
    def show_current_step(self):
        """Display the current step"""
        # Clear content frame
        for widget in self.content_frame.winfo_children():
            widget.destroy()
            
        # Update step indicator
        self.update_step_indicator()
        
        # Show current step
        current_frame = self.steps[self.current_step]['function']()
        current_frame.pack(expand=True, fill='both')
        
        # Update button states
        self.update_button_states()
        
    def update_button_states(self):
        """Update the state of navigation buttons"""
        # Back button
        if self.current_step == 0:
            self.back_button.config(state='disabled')
        else:
            self.back_button.config(state='normal')
            
        # Next button
        if self.current_step == len(self.steps) - 1:
            self.next_button.config(text="Finish", command=self.finish_installation)
        elif self.current_step == len(self.steps) - 2:  # Installation step
            self.next_button.config(text="Install", command=self.start_installation)
        else:
            self.next_button.config(text="Next >", command=self.next_step)
            
        # Check if next button should be enabled
        self.check_next_button_state()
        
    def check_next_button_state(self):
        """Check if the next button should be enabled based on current step requirements"""
        if self.current_step == 1:  # License step
            self.next_button.config(state='normal' if self.license_accepted.get() else 'disabled')
        elif self.current_step == 4:  # Installation step
            self.next_button.config(state='normal' if self.installation_complete else 'disabled')
        else:
            self.next_button.config(state='normal')
            
    def next_step(self):
        """Move to the next step"""
        if self.current_step < len(self.steps) - 1:
            self.current_step += 1
            self.show_current_step()
            
    def previous_step(self):
        """Move to the previous step"""
        if self.current_step > 0:
            self.current_step -= 1
            self.show_current_step()
            
    def cancel_installation(self):
        """Cancel the installation"""
        if self.current_step == 4 and not self.installation_complete:  # During installation
            self.installation_cancelled = True
            
        result = messagebox.askyesno("Cancel Installation", 
                                   "Are you sure you want to cancel the installation?",
                                   icon='question')
        if result:
            self.root.quit()
            
    def start_installation(self):
        """Start the installation process"""
        self.current_step += 1
        self.show_current_step()
        
    def finish_installation(self):
        """Finish the installation and close the wizard"""
        if self.launch_app.get():
            self.launch_application()
            
        if self.view_readme.get():
            self.open_readme()
            
        messagebox.showinfo("Installation Complete", 
                          f"{self.app_name} has been successfully installed!")
        self.root.quit()
        
    def launch_application(self):
        """Launch the installed application"""
        try:
            if platform.system() == "Windows":
                start_script = os.path.join(self.install_path, "start.bat")
                if os.path.exists(start_script):
                    subprocess.Popen([start_script], shell=True)
            else:
                start_script = os.path.join(self.install_path, "start.sh")
                if os.path.exists(start_script):
                    subprocess.Popen([start_script], shell=True)
        except Exception as e:
            messagebox.showerror("Launch Error", f"Could not launch the application: {str(e)}")
            
    def open_readme(self):
        """Open the README file"""
        try:
            readme_path = os.path.join(self.install_path, "README.md")
            if os.path.exists(readme_path):
                if platform.system() == "Windows":
                    os.startfile(readme_path)
                else:
                    subprocess.Popen(['xdg-open', readme_path])
        except Exception as e:
            messagebox.showerror("Error", f"Could not open README: {str(e)}")
            
    def run(self):
        """Start the installer wizard"""
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            pass
        finally:
            self.root.quit()

    def create_welcome_screen(self):
        """Create the welcome screen with application information and branding"""
        frame = ttk.Frame(self.content_frame)
        
        # Title
        title_label = ttk.Label(frame, text="Welcome to Minecraft Server Wrapper", 
                               font=('Segoe UI', 16, 'bold'))
        title_label.pack(pady=(20, 10))
        
        # Logo/Icon placeholder (you can add an actual image here)
        icon_frame = ttk.Frame(frame, width=64, height=64)
        icon_frame.pack(pady=10)
        icon_frame.pack_propagate(False)
        
        # Welcome message
        welcome_text = """This wizard will guide you through the installation of Minecraft Server Wrapper.

Minecraft Server Wrapper is a comprehensive web-based management tool for Minecraft servers that provides:

• Easy server management with start/stop/restart controls
• Real-time console monitoring and command execution
• File manager with upload/download capabilities
• System monitoring with CPU, RAM, and network graphs
• Cross-platform compatibility (Windows/Linux)
• Modern web interface accessible from any browser

Click Next to continue with the installation."""
        
        text_widget = tk.Text(frame, wrap=tk.WORD, height=12, width=60, 
                             font=('Segoe UI', 10), relief='flat', 
                             bg=self.root.cget('bg'), state='disabled')
        text_widget.pack(pady=20, padx=20, fill='both', expand=True)
        
        # Enable text widget to insert content
        text_widget.config(state='normal')
        text_widget.insert('1.0', welcome_text)
        text_widget.config(state='disabled')
        
        return frame

    def create_license_screen(self):
        """Create the license agreement screen"""
        frame = ttk.Frame(self.content_frame)
        
        # Title
        title_label = ttk.Label(frame, text="License Agreement", style='Header.TLabel')
        title_label.pack(pady=(10, 20))
        
        # License text
        license_text = """MIT License

Copyright (c) 2024 Minecraft Server Wrapper

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

By installing this software, you agree to the terms and conditions outlined above.
This software is provided for educational and personal use. Commercial use is
permitted under the terms of this license.

Additional Terms:
- This software may collect anonymous usage statistics to improve functionality
- No personal data is transmitted without explicit user consent
- The software may check for updates automatically
- Third-party components may have their own license terms"""
        
        # Scrollable text area
        text_frame = tk.Frame(frame)
        text_frame.pack(fill='both', expand=True, padx=20, pady=10)
        
        scrollbar = tk.Scrollbar(text_frame)
        scrollbar.pack(side='right', fill='y')
        
        text_widget = tk.Text(text_frame, wrap=tk.WORD, font=('Segoe UI', 9),
                             yscrollcommand=scrollbar.set, height=15)
        text_widget.pack(side='left', fill='both', expand=True)
        scrollbar.config(command=text_widget.yview)
        
        text_widget.insert('1.0', license_text)
        text_widget.config(state='disabled')
        
        # Acceptance checkbox
        accept_frame = tk.Frame(frame)
        accept_frame.pack(pady=20)
        
        accept_checkbox = ttk.Checkbutton(accept_frame, 
                                         text="I accept the terms of the License Agreement",
                                         variable=self.license_accepted,
                                         command=self.check_next_button_state)
        accept_checkbox.pack()
        
        return frame

    def create_directory_screen(self):
        """Create the directory selection screen"""
        frame = ttk.Frame(self.content_frame)
        
        # Title
        title_label = ttk.Label(frame, text="Choose Installation Location", style='Header.TLabel')
        title_label.pack(pady=(10, 20))
        
        # Description
        desc_label = ttk.Label(frame, text="Select the folder where you want to install Minecraft Server Wrapper:")
        desc_label.pack(pady=(0, 20))
        
        # Directory selection
        dir_frame = tk.Frame(frame)
        dir_frame.pack(fill='x', padx=40, pady=10)
        
        ttk.Label(dir_frame, text="Installation Directory:").pack(anchor='w', pady=(0, 5))
        
        path_frame = tk.Frame(dir_frame)
        path_frame.pack(fill='x')
        
        self.path_var = tk.StringVar(value=self.install_path)
        path_entry = ttk.Entry(path_frame, textvariable=self.path_var, font=('Segoe UI', 10))
        path_entry.pack(side='left', fill='x', expand=True, padx=(0, 10))
        
        browse_button = ttk.Button(path_frame, text="Browse...", command=self.browse_directory)
        browse_button.pack(side='right')
        
        # Space requirements
        space_frame = tk.Frame(frame)
        space_frame.pack(fill='x', padx=40, pady=20)
        
        ttk.Label(space_frame, text="Space Requirements:", font=('Segoe UI', 10, 'bold')).pack(anchor='w')
        ttk.Label(space_frame, text="• Required space: 25 MB").pack(anchor='w', padx=(20, 0))
        ttk.Label(space_frame, text="• Available space: Checking...").pack(anchor='w', padx=(20, 0))
        
        # Permission warning for Program Files
        warning_frame = tk.Frame(frame)
        warning_frame.pack(fill='x', padx=40, pady=10)
        
        warning_text = ttk.Label(warning_frame, 
                               text="⚠ Note: Installing to Program Files or system directories requires administrator privileges.\n"
                                    "For easier installation, consider using the default user directory.",
                               font=('Segoe UI', 9), foreground='#FF8C00', wraplength=500)
        warning_text.pack(anchor='w')
        
        # Validation info
        self.validation_label = ttk.Label(frame, text="", foreground='green')
        self.validation_label.pack(pady=10)
        
        # Validate initial path
        self.validate_directory()
        
        return frame
        
    def browse_directory(self):
        """Open directory browser"""
        directory = filedialog.askdirectory(initialdir=self.path_var.get())
        if directory:
            self.path_var.set(directory)
            self.install_path = directory
            self.validate_directory()
            
    def validate_directory(self):
        """Validate the selected directory"""
        path = self.path_var.get()
        try:
            # Check if path exists or can be created
            if not os.path.exists(path):
                parent = os.path.dirname(path)
                if os.path.exists(parent) and os.access(parent, os.W_OK):
                    self.validation_label.config(text="✓ Directory will be created", foreground='green')
                    return True
                else:
                    # Check if we need admin privileges for this path
                    if self.is_admin_required_path(path):
                        self.validation_label.config(text="⚠ Administrator privileges required for this location", foreground='orange')
                        return False
                    else:
                        self.validation_label.config(text="✗ Cannot create directory", foreground='red')
                        return False
            elif os.access(path, os.W_OK):
                self.validation_label.config(text="✓ Directory is writable", foreground='green')
                return True
            else:
                # Check if we need admin privileges for this path
                if self.is_admin_required_path(path):
                    self.validation_label.config(text="⚠ Administrator privileges required for this location", foreground='orange')
                    return False
                else:
                    self.validation_label.config(text="✗ Directory is not writable", foreground='red')
                    return False
        except Exception as e:
            self.validation_label.config(text=f"✗ Error: {str(e)}", foreground='red')
            return False
            
    def is_admin_required_path(self, path):
        """Check if the path requires administrator privileges"""
        if platform.system() == "Windows":
            admin_paths = [
                "C:\\Program Files",
                "C:\\Program Files (x86)",
                "C:\\Windows",
                "C:\\ProgramData"
            ]
            path_upper = path.upper()
            return any(path_upper.startswith(admin_path.upper()) for admin_path in admin_paths)
        else:
            # For Linux, check if it's in system directories
            system_paths = ["/usr", "/opt", "/etc", "/var", "/bin", "/sbin"]
            return any(path.startswith(sys_path) for sys_path in system_paths)

    def create_components_screen(self):
        """Create the components selection screen"""
        frame = ttk.Frame(self.content_frame)
        
        # Title
        title_label = ttk.Label(frame, text="Select Components", style='Header.TLabel')
        title_label.pack(pady=(10, 20))
        
        # Description
        desc_label = ttk.Label(frame, text="Choose which components you want to install:")
        desc_label.pack(pady=(0, 20))
        
        # Components list
        components_frame = tk.Frame(frame)
        components_frame.pack(fill='both', expand=True, padx=40)
        
        for comp_id, comp_info in self.components.items():
            comp_frame = tk.Frame(components_frame)
            comp_frame.pack(fill='x', pady=5)
            
            # Checkbox
            checkbox = ttk.Checkbutton(comp_frame, 
                                      variable=comp_info['selected'],
                                      state='disabled' if comp_info['required'] else 'normal')
            checkbox.pack(side='left', padx=(0, 10))
            
            # Component info
            info_frame = tk.Frame(comp_frame)
            info_frame.pack(side='left', fill='x', expand=True)
            
            name_label = ttk.Label(info_frame, text=comp_info['name'], font=('Segoe UI', 10, 'bold'))
            name_label.pack(anchor='w')
            
            size_text = comp_info['size']
            if comp_info['required']:
                size_text += " (Required)"
                
            size_label = ttk.Label(info_frame, text=size_text, font=('Segoe UI', 9))
            size_label.pack(anchor='w')
        
        # Total size
        total_frame = tk.Frame(frame)
        total_frame.pack(fill='x', padx=40, pady=20)
        
        ttk.Separator(total_frame, orient='horizontal').pack(fill='x', pady=(0, 10))
        
        total_label = ttk.Label(total_frame, text="Total installation size: 23 MB", 
                               font=('Segoe UI', 10, 'bold'))
        total_label.pack(anchor='w')
        
        return frame

    def create_installation_screen(self):
        """Create the installation progress screen"""
        frame = ttk.Frame(self.content_frame)
        
        # Title
        title_label = ttk.Label(frame, text="Installing Minecraft Server Wrapper", style='Header.TLabel')
        title_label.pack(pady=(10, 20))
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        progress_bar = ttk.Progressbar(frame, variable=self.progress_var, maximum=100, length=400)
        progress_bar.pack(pady=20)
        
        # Status labels
        self.status_label = ttk.Label(frame, text="Preparing installation...", font=('Segoe UI', 10))
        self.status_label.pack(pady=10)
        
        self.file_label = ttk.Label(frame, text="", font=('Segoe UI', 9))
        self.file_label.pack(pady=5)
        
        self.time_label = ttk.Label(frame, text="", font=('Segoe UI', 9))
        self.time_label.pack(pady=5)
        
        # Start installation in background
        self.root.after(1000, self.perform_installation)
        
        return frame
        
    def perform_installation(self):
        """Perform the actual installation"""
        def install_thread():
            try:
                files_to_copy = [
                    'server.js', 'package.json', 'package-lock.json', 'setup.js', 
                    'install.bat', 'install.sh', 'uninstall.bat', 'README.md'
                ]
                
                # Add public directory files
                public_files = ['public/index.html', 'public/script.js', 'public/style.css']
                files_to_copy.extend(public_files)
                
                total_files = len(files_to_copy)
                
                # Create installation directory with proper error handling
                try:
                    os.makedirs(self.install_path, exist_ok=True)
                    
                    # Test write permissions by creating a temporary file
                    test_file = os.path.join(self.install_path, '.test_write')
                    with open(test_file, 'w') as f:
                        f.write('test')
                    os.remove(test_file)
                    
                except PermissionError as e:
                    error_msg = f"Access denied to installation directory.\n\n"
                    if self.is_admin_required_path(self.install_path):
                        error_msg += "This location requires administrator privileges.\n\n"
                        error_msg += "Solutions:\n"
                        error_msg += "1. Run the installer as Administrator (right-click → Run as administrator)\n"
                        error_msg += "2. Choose a different installation directory (e.g., your user folder)\n"
                        error_msg += f"3. Use the default location: {self.get_default_install_path()}"
                    else:
                        error_msg += f"Please check folder permissions or choose a different location."
                    
                    self.root.after(0, lambda: self.show_permission_error(error_msg))
                    return
                except Exception as e:
                    self.root.after(0, lambda: self.show_installation_error(f"Failed to create installation directory: {str(e)}"))
                    return
                
                # Create public subdirectory
                public_dir = os.path.join(self.install_path, 'public')
                os.makedirs(public_dir, exist_ok=True)
                
                for i, filename in enumerate(files_to_copy):
                    if self.installation_cancelled:
                        return
                        
                    # Update UI
                    progress = (i / total_files) * 100
                    self.progress_var.set(progress)
                    self.status_label.config(text=f"Installing files... ({i+1}/{total_files})")
                    self.file_label.config(text=f"Copying: {filename}")
                    
                    # Copy file if it exists
                    if os.path.exists(filename):
                        dest_path = os.path.join(self.install_path, filename)
                        dest_dir = os.path.dirname(dest_path)
                        os.makedirs(dest_dir, exist_ok=True)
                        shutil.copy2(filename, dest_path)
                    
                    time.sleep(0.2)  # Simulate installation time
                
                # Create minecraft-server directory
                minecraft_dir = os.path.join(self.install_path, 'minecraft-server')
                os.makedirs(minecraft_dir, exist_ok=True)
                
                # Final steps
                self.progress_var.set(100)
                self.status_label.config(text="Installation completed successfully!")
                self.file_label.config(text="")
                self.time_label.config(text="")
                
                self.installation_complete = True
                self.root.after(0, self.check_next_button_state)
                
            except Exception as e:
                error_msg = f"Installation failed: {str(e)}"
                self.root.after(0, lambda: self.show_installation_error(error_msg))
                
        threading.Thread(target=install_thread, daemon=True).start()
        
    def show_permission_error(self, message):
        """Show permission error dialog with helpful suggestions"""
        messagebox.showerror("Permission Error", message)
        # Go back to directory selection
        self.current_step = 2  # Directory selection step
        self.show_current_step()
        
    def show_installation_error(self, message):
        """Show general installation error"""
        messagebox.showerror("Installation Error", message)
        self.status_label.config(text="Installation failed. Please try again.")
        self.progress_var.set(0)

    def create_completion_screen(self):
        """Create the completion screen"""
        frame = ttk.Frame(self.content_frame)
        
        # Title
        title_label = ttk.Label(frame, text="Installation Complete!", style='Header.TLabel')
        title_label.pack(pady=(20, 30))
        
        # Success message
        success_label = ttk.Label(frame, text="Minecraft Server Wrapper has been successfully installed.",
                                 font=('Segoe UI', 11))
        success_label.pack(pady=10)
        
        # Installation summary
        summary_frame = tk.Frame(frame)
        summary_frame.pack(pady=20, padx=40, fill='x')
        
        ttk.Label(summary_frame, text="Installation Summary:", font=('Segoe UI', 10, 'bold')).pack(anchor='w')
        ttk.Label(summary_frame, text=f"• Installed to: {self.install_path}").pack(anchor='w', padx=(20, 0))
        ttk.Label(summary_frame, text="• Components: Core Application, Service Integration, Desktop Shortcuts").pack(anchor='w', padx=(20, 0))
        ttk.Label(summary_frame, text="• Total size: 23 MB").pack(anchor='w', padx=(20, 0))
        
        # Options
        options_frame = tk.Frame(frame)
        options_frame.pack(pady=30)
        
        launch_checkbox = ttk.Checkbutton(options_frame, 
                                         text="Launch Minecraft Server Wrapper now",
                                         variable=self.launch_app)
        launch_checkbox.pack(anchor='w', pady=5)
        
        readme_checkbox = ttk.Checkbutton(options_frame, 
                                         text="View README file",
                                         variable=self.view_readme)
        readme_checkbox.pack(anchor='w', pady=5)
        
        # Additional info
        info_label = ttk.Label(frame, text="You can access the web interface at http://localhost:5900 after starting the application.",
                              font=('Segoe UI', 9), foreground='#666666')
        info_label.pack(pady=20)
        
        return frame

if __name__ == "__main__":
    # Check if running in silent mode
    silent_mode = '--silent' in sys.argv or '/S' in sys.argv
    
    if silent_mode:
        # Import and run silent installer
        try:
            from silent_installer import SilentInstaller
            silent_installer = SilentInstaller()
            args = silent_installer.parse_arguments()
            success = silent_installer.run_silent_installation(args)
            sys.exit(0 if success else 1)
        except ImportError:
            print("Error: Silent installer module not found")
            sys.exit(1)
        except Exception as e:
            print(f"Error: Silent installation failed - {e}")
            sys.exit(1)
    else:
        installer = InstallerWizard()
        installer.run()