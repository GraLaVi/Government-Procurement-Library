#!/bin/bash

# Development server management script
# Usage: ./scripts/dev.sh [start|stop|restart|status]

PORT=${DEV_PORT:-3001}
APP_NAME="govt-procurement-library"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to find the PID of the dev server
get_pid() {
    lsof -ti:$PORT 2>/dev/null
}

# Function to check if dependencies are installed
check_dependencies() {
    cd "$PROJECT_DIR"
    
    # Check if node_modules directory exists
    if [ ! -d "node_modules" ]; then
        echo "Error: Dependencies not found. Please run 'npm install' first."
        exit 1
    fi
    
    # Check if next is available
    if [ ! -f "node_modules/.bin/next" ] && ! command -v next &> /dev/null; then
        echo "Error: Next.js not found. Please run 'npm install' to install dependencies."
        exit 1
    fi
}

# Function to start the dev server
start_server() {
    PID=$(get_pid)
    if [ -n "$PID" ]; then
        echo "Dev server is already running on port $PORT (PID: $PID)"
        exit 1
    fi

    # Check dependencies before starting
    check_dependencies

    echo "Starting $APP_NAME dev server on port $PORT..."
    cd "$PROJECT_DIR"
    npm run dev -- -p $PORT &

    # Wait a moment and check if it started
    sleep 2
    PID=$(get_pid)
    if [ -n "$PID" ]; then
        echo "Dev server started successfully (PID: $PID)"
        echo "Access at: http://localhost:$PORT"
    else
        echo "Failed to start dev server"
        exit 1
    fi
}

# Function to stop the dev server
stop_server() {
    PID=$(get_pid)
    if [ -z "$PID" ]; then
        echo "Dev server is not running on port $PORT"
        exit 0
    fi

    echo "Stopping dev server (PID: $PID)..."
    kill $PID 2>/dev/null

    # Wait for graceful shutdown
    sleep 2

    # Force kill if still running
    PID=$(get_pid)
    if [ -n "$PID" ]; then
        echo "Force killing dev server..."
        kill -9 $PID 2>/dev/null
    fi

    echo "Dev server stopped"
}

# Function to restart the dev server
restart_server() {
    stop_server
    sleep 1
    start_server
}

# Function to check server status
server_status() {
    PID=$(get_pid)
    if [ -n "$PID" ]; then
        echo "Dev server is running on port $PORT (PID: $PID)"
        echo "Access at: http://localhost:$PORT"
    else
        echo "Dev server is not running"
    fi
}

# Function to show help message
show_help() {
    echo "Usage: $0 {start|stop|restart|status}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the development server"
    echo "  stop    - Stop the development server"
    echo "  restart - Restart the development server"
    echo "  status  - Check if the server is running"
    echo ""
    echo "Environment variables:"
    echo "  DEV_PORT - Port to run the server on (default: 3001)"
}

# Main script logic
case "${1:-help}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        server_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Error: Unknown command '$1'"
        echo ""
        show_help
        exit 1
        ;;
esac
