#!/bin/bash
# HBS Sentinel — Start Script
set -e

echo "Starting HBS Sentinel..."

# Start backend
cd /home/ubuntu/hbs-sentinel/backend
python3 main.py &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Wait for backend
sleep 2

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║         HBS Sentinel is running                  ║"
echo "║                                                   ║"
echo "║  App:     http://localhost:8000                   ║"
echo "║  API:     http://localhost:8000/api               ║"
echo "║                                                   ║"
echo "║  Admin:   admin@hbs.edu / sentinel2026            ║"
echo "║  Student: priya.mehta@hbs.edu / hbs2026           ║"
echo "╚══════════════════════════════════════════════════╝"

wait $BACKEND_PID
