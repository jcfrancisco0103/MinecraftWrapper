@echo off
echo Minecraft Server Wrapper - Administrator Installation
echo =====================================================
echo.
echo This script will run the installer with administrator privileges.
echo This is required when installing to system directories like Program Files.
echo.
pause

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python from https://python.org
    echo.
    pause
    exit /b 1
)

REM Check if installer exists
if not exist "installer_gui.py" (
    echo ERROR: installer_gui.py not found in current directory.
    echo Please make sure you're running this from the correct folder.
    echo.
    pause
    exit /b 1
)

echo Running installer with administrator privileges...
echo.

REM Run the installer as administrator
powershell -Command "Start-Process python -ArgumentList 'installer_gui.py' -Verb RunAs"

echo.
echo The installer should now be running with administrator privileges.
echo If you see a User Account Control prompt, click "Yes" to continue.
echo.
pause