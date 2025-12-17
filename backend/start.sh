#!/bin/bash

# Quick start script for Have I Been Sniped backend

echo "🎮 Have I Been Sniped - Backend Setup"
echo "======================================"
echo ""

# Check if config.yaml exists
if [ ! -f "config.yaml" ]; then
    echo "⚠️  config.yaml not found!"
    echo "📝 Creating from config.yaml.example..."
    cp config.yaml.example config.yaml
    echo ""
    echo "✅ config.yaml created!"
    echo "⚠️  IMPORTANT: Edit config.yaml and add your Riot API key before running the server."
    echo ""
    echo "Get your API key from: https://developer.riotgames.com/"
    echo ""
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created!"
    echo ""
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

echo "✅ Dependencies installed!"
echo ""

# Check if API key is set
if grep -q "RGAPI-YOUR-API-KEY-HERE" config.yaml; then
    echo "⚠️  WARNING: Default API key detected in config.yaml"
    echo "Please edit config.yaml and add your Riot API key."
    echo ""
    echo "Get your API key from: https://developer.riotgames.com/"
    echo ""
    exit 1
fi

echo "🚀 Starting backend server..."
echo "Backend will be available at: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python main.py

