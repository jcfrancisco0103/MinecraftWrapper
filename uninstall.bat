@echo off
setlocal enabledelayedexpansion

:: Minecraft Server Wrapper - Windows Uninstall Script
:: ==================================================

echo.
echo ========================================
echo  Minecraft Server Wrapper Uninstaller
echo ========================================
echo.

:: Color codes for output
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo %BLUE%[INFO]%NC% Starting uninstallation process...
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo %YELLOW%[WARNING]%NC% This script should be run as Administrator for complete removal.
    echo %YELLOW%[WARNING]%NC% Some cleanup operations may fail without admin privileges.
    echo.
    pause
)

:: Stop the service if it's running
echo %BLUE%[INFO]%NC% Checking for running services...
sc query MinecraftWrapper >nul 2>&1
if %errorLevel% equ 0 (
    echo %BLUE%[INFO]%NC% Stopping MinecraftWrapper service...
    net stop MinecraftWrapper >nul 2>&1
    if %errorLevel% equ 0 (
        echo %GREEN%[SUCCESS]%NC% Service stopped successfully.
    ) else (
        echo %YELLOW%[WARNING]%NC% Could not stop service or service was not running.
    )
    
    echo %BLUE%[INFO]%NC% Removing MinecraftWrapper service...
    sc delete MinecraftWrapper >nul 2>&1
    if %errorLevel% equ 0 (
        echo %GREEN%[SUCCESS]%NC% Service removed successfully.
    ) else (
        echo %YELLOW%[WARNING]%NC% Could not remove service.
    )
) else (
    echo %BLUE%[INFO]%NC% No MinecraftWrapper service found.
)

:: Remove desktop shortcut
echo %BLUE%[INFO]%NC% Removing desktop shortcut...
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\Minecraft Server Wrapper.lnk"
if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%" >nul 2>&1
    if %errorLevel% equ 0 (
        echo %GREEN%[SUCCESS]%NC% Desktop shortcut removed.
    ) else (
        echo %YELLOW%[WARNING]%NC% Could not remove desktop shortcut.
    )
) else (
    echo %BLUE%[INFO]%NC% No desktop shortcut found.
)

:: Ask about removing configuration and server files
echo.
echo %YELLOW%[QUESTION]%NC% What would you like to remove?
echo.
echo 1. Wrapper files only (keep Minecraft server and worlds)
echo 2. Everything except worlds (remove wrapper + server JAR)
echo 3. Complete removal (remove everything including worlds)
echo 4. Cancel uninstallation
echo.
set /p CHOICE="Enter your choice (1-4): "

if "%CHOICE%"=="4" (
    echo %BLUE%[INFO]%NC% Uninstallation cancelled.
    pause
    exit /b 0
)

if "%CHOICE%"=="1" (
    echo %BLUE%[INFO]%NC% Removing wrapper files only...
    
    :: Remove wrapper-specific files
    if exist "server.js" del "server.js" >nul 2>&1
    if exist "package.json" del "package.json" >nul 2>&1
    if exist "package-lock.json" del "package-lock.json" >nul 2>&1
    if exist "config.json" del "config.json" >nul 2>&1
    if exist "setup.js" del "setup.js" >nul 2>&1
    if exist "start.bat" del "start.bat" >nul 2>&1
    if exist "install-service.bat" del "install-service.bat" >nul 2>&1
    if exist "README.md" del "README.md" >nul 2>&1
    if exist "index.html" del "index.html" >nul 2>&1
    if exist "style.css" del "style.css" >nul 2>&1
    if exist "script.js" del "script.js" >nul 2>&1
    
    :: Remove node_modules
    if exist "node_modules" (
        echo %BLUE%[INFO]%NC% Removing node_modules directory...
        rmdir /s /q "node_modules" >nul 2>&1
    )
    
    echo %GREEN%[SUCCESS]%NC% Wrapper files removed. Minecraft server files preserved.
)

if "%CHOICE%"=="2" (
    echo %BLUE%[INFO]%NC% Removing wrapper and server files (preserving worlds)...
    
    :: Remove wrapper files
    if exist "server.js" del "server.js" >nul 2>&1
    if exist "package.json" del "package.json" >nul 2>&1
    if exist "package-lock.json" del "package-lock.json" >nul 2>&1
    if exist "config.json" del "config.json" >nul 2>&1
    if exist "setup.js" del "setup.js" >nul 2>&1
    if exist "start.bat" del "start.bat" >nul 2>&1
    if exist "install-service.bat" del "install-service.bat" >nul 2>&1
    if exist "README.md" del "README.md" >nul 2>&1
    if exist "index.html" del "index.html" >nul 2>&1
    if exist "style.css" del "style.css" >nul 2>&1
    if exist "script.js" del "script.js" >nul 2>&1
    
    :: Remove node_modules
    if exist "node_modules" (
        echo %BLUE%[INFO]%NC% Removing node_modules directory...
        rmdir /s /q "node_modules" >nul 2>&1
    )
    
    :: Remove server files but preserve worlds
    if exist "minecraft-server\server.jar" del "minecraft-server\server.jar" >nul 2>&1
    if exist "minecraft-server\server.properties" del "minecraft-server\server.properties" >nul 2>&1
    if exist "minecraft-server\eula.txt" del "minecraft-server\eula.txt" >nul 2>&1
    if exist "minecraft-server\logs" rmdir /s /q "minecraft-server\logs" >nul 2>&1
    if exist "minecraft-server\cache" rmdir /s /q "minecraft-server\cache" >nul 2>&1
    
    echo %GREEN%[SUCCESS]%NC% Wrapper and server files removed. World files preserved.
)

if "%CHOICE%"=="3" (
    echo %RED%[WARNING]%NC% This will remove EVERYTHING including your worlds!
    set /p CONFIRM="Are you absolutely sure? Type 'DELETE' to confirm: "
    
    if /i "!CONFIRM!"=="DELETE" (
        echo %BLUE%[INFO]%NC% Performing complete removal...
        
        :: Remove all files and directories
        for %%f in (*.js *.json *.html *.css *.md *.bat) do (
            if exist "%%f" del "%%f" >nul 2>&1
        )
        
        if exist "node_modules" rmdir /s /q "node_modules" >nul 2>&1
        if exist "minecraft-server" rmdir /s /q "minecraft-server" >nul 2>&1
        
        echo %GREEN%[SUCCESS]%NC% Complete removal finished.
    ) else (
        echo %BLUE%[INFO]%NC% Complete removal cancelled.
    )
)

:: Final cleanup
echo.
echo %BLUE%[INFO]%NC% Performing final cleanup...

:: Remove this uninstall script last
echo %BLUE%[INFO]%NC% Removing uninstall script...
(
    echo @echo off
    echo timeout /t 2 /nobreak ^>nul
    echo del "%~f0" ^>nul 2^>^&1
    echo echo Uninstall script removed.
    echo pause
) > "%TEMP%\cleanup_uninstall.bat"

echo.
echo ========================================
echo  Uninstallation Complete!
echo ========================================
echo.
echo %GREEN%[SUCCESS]%NC% Minecraft Server Wrapper has been uninstalled.
echo.
echo %BLUE%[INFO]%NC% The following items were NOT removed:
echo - Node.js installation
echo - Java installation
echo - Any manually created files
echo.
echo %BLUE%[INFO]%NC% Thank you for using Minecraft Server Wrapper!
echo.
pause

:: Execute cleanup script and exit
start "" "%TEMP%\cleanup_uninstall.bat"
exit