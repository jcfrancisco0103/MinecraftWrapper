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

- Node.js (v14 or higher)
- Java (for running Minecraft server)
- Minecraft server JAR file

## Installation

1. **Clone or download this project**
   ```bash
   git clone <repository-url>
   cd MinecraftWrapper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your Minecraft server**
   - Create a `minecraft-server` folder in the project root
   - Place your Minecraft server JAR file in the folder and rename it to `server.jar`
   - Ensure you have accepted the EULA by creating/editing `eula.txt` with `eula=true`

4. **Start the wrapper**
   ```bash
   npm start
   ```

5. **Access the web interface**
   - Open your browser and go to `http://localhost:5900`

## Configuration

### Port Configuration
The default port is 5900. You can change it by setting the `PORT` environment variable:
```bash
PORT=8080 npm start
```

### RAM Allocation
You can configure RAM allocation through the web interface or by modifying the `ramAmount` variable in `server.js`.

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
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── public/                # Web interface files
│   ├── index.html        # Main HTML file
│   ├── style.css         # Styles
│   └── script.js         # Client-side JavaScript
├── minecraft-server/      # Your Minecraft server files
│   ├── server.jar        # Minecraft server JAR
│   ├── eula.txt          # EULA acceptance
│   └── ...               # Other server files
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