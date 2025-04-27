#!/bin/bash

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Document Analyzer Setup Script ===${NC}"

# Check if Python 3.8+ is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3.8+ is required. Please install it and try again.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
if [ $PYTHON_MAJOR -lt 3 ] || { [ $PYTHON_MAJOR -eq 3 ] && [ $PYTHON_MINOR -lt 8 ]; }; then
    echo -e "${RED}Error: Python 3.8+ is required, found $PYTHON_VERSION.${NC}"
    exit 1
fi
echo -e "${GREEN}Python $PYTHON_VERSION found.${NC}"

# Create and activate virtual environment
VENV_DIR="venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${BLUE}Creating virtual environment...${NC}"
    python3 -m venv $VENV_DIR
fi
source $VENV_DIR/bin/activate
echo -e "${GREEN}Virtual environment activated.${NC}"

# Install dependencies
echo -e "${BLUE}Installing Python dependencies...${NC}"
pip install --upgrade pip
pip install flask pdfminer.six spacy textblob datefinder flask-cors

# Download spaCy model
echo -e "${BLUE}Installing spaCy model...${NC}"
python -m spacy download en_core_web_sm

# Check if required files exist
if [ ! -f "app.py" ] || [ ! -f "index.html" ]; then
    echo -e "${RED}Error: app.py or index.html is missing. Please ensure both files are in the current directory.${NC}"
    exit 1
fi

# Check if port 4000 is available
if lsof -i:4000 &> /dev/null; then
    echo -e "${RED}Error: Port 4000 is in use. Please free it or change the port in app.py and index.html.${NC}"
    exit 1
fi

# Check if port 8000 is available
if lsof -i:8000 &> /dev/null; then
    echo -e "${RED}Error: Port 8000 is in use. Please free it or use a different port for the frontend server.${NC}"
    exit 1
fi

# Start Flask backend in the background
echo -e "${BLUE}Starting Flask backend on http://localhost:4000...${NC}"
python app.py > backend.log 2>&1 &
FLASK_PID=$!
sleep 2  # Wait for server to start

# Check if Flask server is running
if curl -s http://localhost:4000/health | grep -q "healthy"; then
    echo -e "${GREEN}Flask backend started successfully.${NC}"
else
    echo -e "${RED}Error: Flask backend failed to start. Check backend.log for details.${NC}"
    cat backend.log
    kill $FLASK_PID 2>/dev/null || true
    exit 1
fi

# Start frontend server
echo -e "${BLUE}Starting frontend server on http://localhost:8000...${NC}"
python -m http.server 8000 > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend server to start
sleep 2

# Verify frontend server
if curl -s http://localhost:8000 | grep -q "Document Analyzer"; then
    echo -e "${GREEN}Frontend server started successfully.${NC}"
else
    echo -e "${RED}Error: Frontend server failed to start. Check frontend.log for details.${NC}"
    cat frontend.log
    kill $FRONTEND_PID 2>/dev/null || true
    kill $FLASK_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}Setup complete! Open http://localhost:8000 in your browser to use the Document Analyzer.${NC}"
echo -e "${BLUE}To stop the servers, run:${NC}"
echo -e "${BLUE}  kill $FLASK_PID $FRONTEND_PID${NC}"
echo -e "${BLUE}Logs are saved in backend.log and frontend.log.${NC}"

# Keep script running to prevent immediate exit
wait