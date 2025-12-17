@echo off
REM Quick start script for Have I Been Sniped backend (Windows)

echo.
echo 🎮 Have I Been Sniped - Backend Setup
echo ======================================
echo.

REM Check if config.yaml exists
if not exist config.yaml (
    echo ⚠️  config.yaml not found!
    echo 📝 Creating from config.yaml.example...
    copy config.yaml.example config.yaml
    echo.
    echo ✅ config.yaml created!
    echo ⚠️  IMPORTANT: Edit config.yaml and add your Riot API key before running the server.
    echo.
    echo Get your API key from: https://developer.riotgames.com/
    echo.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist venv (
    echo 📦 Creating virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created!
    echo.
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -q -r requirements.txt

echo ✅ Dependencies installed!
echo.

REM Check if API key is set
findstr /C:"RGAPI-YOUR-API-KEY-HERE" config.yaml >nul
if %errorlevel% equ 0 (
    echo ⚠️  WARNING: Default API key detected in config.yaml
    echo Please edit config.yaml and add your Riot API key.
    echo.
    echo Get your API key from: https://developer.riotgames.com/
    echo.
    pause
    exit /b 1
)

echo 🚀 Starting backend server...
echo Backend will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

python main.py

pause

