#!/bin/bash

# Setup script for local speech service
echo "🎤 Setting up local speech service..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "✅ Setup complete!"
echo ""
echo "ℹ️  Note: If PyAudio installation fails, you may need to install PortAudio first:"
echo "   - macOS: brew install portaudio"
echo "   - Ubuntu/Debian: sudo apt-get install portaudio19-dev"
echo "   - Windows: Download from http://www.portaudio.com/"

