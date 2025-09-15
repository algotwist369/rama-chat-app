#!/bin/bash

# RAMA Chat - Server Startup Script
echo "🚀 Starting RAMA Chat Application..."

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo "🔄 Killing process on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || echo "No process found on port $port"
    sleep 2
}

# Kill existing processes
echo "🧹 Cleaning up existing processes..."
kill_port 5173
kill_port 9080

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if check_port 9080; then
    echo "✅ Backend started successfully on port 9080"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend server..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 5

# Check if frontend is running
if check_port 5173; then
    echo "✅ Frontend started successfully on port 5173"
else
    echo "❌ Frontend failed to start"
    exit 1
fi

echo ""
echo "🎉 RAMA Chat Application is now running!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:9080"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    kill_port 5173
    kill_port 9080
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
