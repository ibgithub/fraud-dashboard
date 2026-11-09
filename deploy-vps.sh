#!/bin/bash
# Quick deploy script for VPS

set -e

echo "🚀 Starting deployment..."
echo ""

# Navigate to project
cd /home/dwidasa/anvaia-bag

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull github main

# Build backend
echo "🔨 Building backend..."
cd backend/executive-service
./mvnw clean package -DskipTests

# Stop existing service
echo "🛑 Stopping existing service..."
pkill -f executive-service || echo "No existing service found"
sleep 2

# Start new service
echo "▶️  Starting new service..."
nohup java -jar target/executive-service-0.0.1-SNAPSHOT.jar > logs/app.log 2>&1 &
sleep 3

# Check if running
if pgrep -f executive-service > /dev/null; then
    echo "✅ Service started successfully!"
    echo ""
    echo "📋 Last 30 lines of log:"
    tail -n 30 logs/app.log
    echo ""
    echo "=============================================="
    echo "✅ DEPLOYMENT COMPLETE!"
    echo "=============================================="
    echo ""
    echo "Now:"
    echo "1. Refresh Hot Target page in browser"
    echo "2. To see live logs: tail -f logs/app.log"
    echo ""
else
    echo "❌ Service failed to start!"
    echo "Check logs:"
    tail -n 50 logs/app.log
    exit 1
fi
