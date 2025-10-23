@echo off
setlocal enabledelayedexpansion

:: Minecraft Server Wrapper - Windows Installation Script
:: ====================================================

echo.
echo ========================================
echo  Minecraft Server Wrapper Installer
echo ========================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] This script should be run as Administrator for best results.
    echo [WARNING] Some features may not work properly without admin privileges.
    echo.
    pause
)

:: Color codes for output
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo %BLUE%[INFO]%NC% Starting installation process...
echo.

:: Check if Node.js is installed
echo %BLUE%[INFO]%NC% Checking Node.js installation...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo %RED%[ERROR]%NC% Node.js is not installed or not in PATH.
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Recommended version: 18.x or higher
    echo.
    echo After installing Node.js, please run this script again.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo %GREEN%[SUCCESS]%NC% Node.js found: !NODE_VERSION!
)

:: Check if npm is available
echo %BLUE%[INFO]%NC% Checking npm installation...
npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo %RED%[ERROR]%NC% npm is not available.
    echo Please reinstall Node.js with npm included.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo %GREEN%[SUCCESS]%NC% npm found: !NPM_VERSION!
)

:: Check if Java is installed
echo %BLUE%[INFO]%NC% Checking Java installation...
java -version >nul 2>&1
if %errorLevel% neq 0 (
    echo %YELLOW%[WARNING]%NC% Java is not installed or not in PATH.
    echo.
    echo Java is required to run Minecraft servers.
    echo Please install Java 17 or higher from: https://adoptium.net/
    echo.
    echo You can continue the installation and install Java later.
    set /p CONTINUE="Continue without Java? (y/n): "
    if /i "!CONTINUE!" neq "y" (
        echo Installation cancelled.
        pause
        exit /b 1
    )
) else (
    echo %GREEN%[SUCCESS]%NC% Java found and available.
)

echo.
echo %BLUE%[INFO]%NC% Installing Node.js dependencies...
call npm install
if %errorLevel% neq 0 (
    echo %RED%[ERROR]%NC% Failed to install dependencies.
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo %GREEN%[SUCCESS]%NC% Dependencies installed successfully!

:: Create minecraft-server directory
echo %BLUE%[INFO]%NC% Setting up minecraft-server directory...
if not exist "minecraft-server" (
    mkdir minecraft-server
    echo %GREEN%[SUCCESS]%NC% Created minecraft-server directory.
) else (
    echo %YELLOW%[INFO]%NC% minecraft-server directory already exists.
)

:: Create sample server.properties if it doesn't exist
if not exist "minecraft-server\server.properties" (
    echo %BLUE%[INFO]%NC% Creating default server.properties...
    (
        echo # Minecraft server properties
        echo server-port=25565
        echo gamemode=survival
        echo difficulty=easy
        echo max-players=20
        echo online-mode=true
        echo white-list=false
        echo motd=A Minecraft Server managed by Minecraft Server Wrapper
        echo enable-rcon=false
    ) > minecraft-server\server.properties
    echo %GREEN%[SUCCESS]%NC% Created default server.properties.
)

:: Create EULA file
if not exist "minecraft-server\eula.txt" (
    echo %BLUE%[INFO]%NC% Creating EULA file...
    echo # By changing the setting below to TRUE you are indicating your agreement to our EULA > minecraft-server\eula.txt
    echo # https://account.mojang.com/documents/minecraft_eula >> minecraft-server\eula.txt
    echo eula=false >> minecraft-server\eula.txt
    echo %YELLOW%[WARNING]%NC% Created EULA file with eula=false.
    echo %YELLOW%[WARNING]%NC% You must set eula=true in minecraft-server\eula.txt to run the server.
)

:: Create start script
echo %BLUE%[INFO]%NC% Creating start script...
(
    echo @echo off
    echo echo Starting Minecraft Server Wrapper...
    echo echo Access the web interface at: http://localhost:5900
    echo echo.
    echo npm start
    echo pause
) > start.bat
echo %GREEN%[SUCCESS]%NC% Created start.bat script.

:: Create service installation script
echo %BLUE%[INFO]%NC% Creating service installation script...
(
    echo @echo off
    echo :: Install Minecraft Server Wrapper as Windows Service
    echo :: Requires NSSM ^(Non-Sucking Service Manager^)
    echo.
    echo echo This script requires NSSM to install the service.
    echo echo Download NSSM from: https://nssm.cc/download
    echo echo.
    echo set /p NSSM_PATH="Enter path to nssm.exe (or press Enter to skip): "
    echo if "%%NSSM_PATH%%"=="" (
    echo     echo Service installation skipped.
    echo     pause
    echo     exit /b 0
    echo ^)
    echo.
    echo echo Installing service...
    echo "%%NSSM_PATH%%" install MinecraftWrapper "%%~dp0node.exe" "%%~dp0server.js"
    echo "%%NSSM_PATH%%" set MinecraftWrapper AppDirectory "%%~dp0"
    echo "%%NSSM_PATH%%" set MinecraftWrapper DisplayName "Minecraft Server Wrapper"
    echo "%%NSSM_PATH%%" set MinecraftWrapper Description "Web-based Minecraft Server Management Tool"
    echo "%%NSSM_PATH%%" set MinecraftWrapper Start SERVICE_AUTO_START
    echo.
    echo echo Service installed successfully!
    echo echo Use 'net start MinecraftWrapper' to start the service.
    echo pause
) > install-service.bat
echo %GREEN%[SUCCESS]%NC% Created install-service.bat script.

:: Create desktop shortcut
echo %BLUE%[INFO]%NC% Creating desktop shortcut...
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\Minecraft Server Wrapper.lnk"
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%~dp0start.bat'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.IconLocation = '%SystemRoot%\System32\shell32.dll,43'; $Shortcut.Description = 'Minecraft Server Wrapper'; $Shortcut.Save()" 2>nul
if exist "%SHORTCUT_PATH%" (
    echo %GREEN%[SUCCESS]%NC% Desktop shortcut created.
) else (
    echo %YELLOW%[WARNING]%NC% Could not create desktop shortcut.
)

echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo %GREEN%[SUCCESS]%NC% Minecraft Server Wrapper has been installed successfully!
echo.
echo %BLUE%Next steps:%NC%
echo 1. Place your Minecraft server JAR file in the 'minecraft-server' folder
echo 2. Rename it to 'server.jar'
echo 3. Edit 'minecraft-server\eula.txt' and set eula=true
echo 4. Run 'start.bat' or double-click the desktop shortcut
echo 5. Open your browser to http://localhost:5900
echo.
echo %BLUE%Optional:%NC%
echo - Run 'install-service.bat' to install as a Windows service
echo - Check the README.md file for detailed instructions
echo.
echo %YELLOW%[NOTE]%NC% If you don't have a Minecraft server JAR file, download it from:
echo https://www.minecraft.net/en-us/download/server
echo.
pause