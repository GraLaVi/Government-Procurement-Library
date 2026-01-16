#!/bin/bash

# Development server management script
# Usage: ./scripts/dev.sh [start|stop|restart|status|clean]

PORT=${DEV_PORT:-3001}
APP_NAME="govt-procurement-library"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to find the PID of the dev server (multiple methods)
get_pid() {
    # Try lsof first
    PID=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "$PID"
        return
    fi
    
    # Try ss (socket statistics) - more reliable on some systems
    PID=$(ss -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | head -1)
    if [ -n "$PID" ]; then
        echo "$PID"
        return
    fi
    
    # Try fuser as fallback
    PID=$(fuser $PORT/tcp 2>/dev/null | awk '{print $1}')
    if [ -n "$PID" ]; then
        echo "$PID"
        return
    fi
    
    # Last resort: parse /proc/net/tcp (Linux specific)
    HEX_PORT=$(printf "%04X" $PORT)
    if [ -f /proc/net/tcp ]; then
        INODE=$(awk -v port="$HEX_PORT" '$2 ~ ":" port {print $10}' /proc/net/tcp 2>/dev/null | head -1)
        if [ -n "$INODE" ] && [ "$INODE" != "0" ]; then
            PID=$(find /proc/*/fd -lname "socket:\[$INODE\]" 2>/dev/null | cut -d/ -f3 | head -1)
            if [ -n "$PID" ] && [ "$PID" != "self" ]; then
                echo "$PID"
            fi
        fi
    fi
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

# Function to find all PIDs using a specific port (multiple methods)
find_port_pids() {
    local port=$1
    local pids=""
    
    # Method 1: ss (socket statistics) - most reliable on modern Linux
    if command -v ss >/dev/null 2>&1; then
        local ss_pids=$(ss -tlnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | sort -u)
        if [ -n "$ss_pids" ]; then
            pids="$pids $ss_pids"
        fi
    fi
    
    # Method 2: lsof (fallback)
    if command -v lsof >/dev/null 2>&1; then
        local lsof_pids=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$lsof_pids" ]; then
            pids="$pids $lsof_pids"
        fi
    fi
    
    # Method 3: fuser (another fallback)
    if command -v fuser >/dev/null 2>&1; then
        local fuser_output=$(fuser $port/tcp 2>/dev/null)
        local fuser_pids=$(echo "$fuser_output" | grep -oP '\d+' | sort -u)
        if [ -n "$fuser_pids" ]; then
            pids="$pids $fuser_pids"
        fi
    fi
    
    # Remove duplicates and return space-separated
    echo "$pids" | tr ' ' '\n' | grep -v '^$' | sort -u | tr '\n' ' '
}

# Function to check if a PID is using a specific port
pid_uses_port() {
    local pid=$1
    local port=$2
    
    # Check with ss
    if command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep -q "pid=$pid.*:$port "
        if [ $? -eq 0 ]; then
            return 0
        fi
    fi
    
    # Check with lsof
    if command -v lsof >/dev/null 2>&1; then
        lsof -p $pid 2>/dev/null | grep -q ":$port"
        if [ $? -eq 0 ]; then
            return 0
        fi
    fi
    
    return 1
}

# Function to clean up ghost processes
clean_processes() {
    echo "Cleaning up processes on port $PORT..."
    
    KILLED_COUNT=0
    
    # Find all PIDs using the port using multiple methods
    PORT_PIDS=$(find_port_pids $PORT)
    
    # Also check parent processes - sometimes child processes are orphaned
    # and we need to kill parent node processes
    if [ -n "$PORT_PIDS" ]; then
        PARENT_PIDS=""
        for PID in $PORT_PIDS; do
            # Get parent PID (use PARENT_PID instead of PPID since PPID is readonly)
            PARENT_PID=$(ps -o ppid= -p $PID 2>/dev/null | tr -d ' ')
            if [ -n "$PARENT_PID" ] && [ "$PARENT_PID" != "1" ]; then
                # Check if parent is a node/next process
                PARENT_CMD=$(ps -o comm= -p $PARENT_PID 2>/dev/null || echo "")
                if echo "$PARENT_CMD" | grep -qE "node|next"; then
                    PARENT_PIDS="$PARENT_PIDS $PARENT_PID"
                fi
            fi
        done
        if [ -n "$PARENT_PIDS" ]; then
            PORT_PIDS="$PORT_PIDS $PARENT_PIDS"
            PORT_PIDS=$(echo "$PORT_PIDS" | tr ' ' '\n' | sort -u | tr '\n' ' ')
        fi
    fi
    
    if [ -z "$PORT_PIDS" ]; then
        echo "No processes found on port $PORT"
    else
        echo "Found processes on port $PORT: $PORT_PIDS"
        for PID in $PORT_PIDS; do
            # Verify process still exists
            if ps -p $PID > /dev/null 2>&1; then
                # Get process info before killing
                PROCESS_INFO=$(ps -p $PID -o comm=,args= 2>/dev/null | head -1 | cut -c1-80 || echo "unknown")
                echo "Killing process $PID ($PROCESS_INFO)..."
                kill -9 $PID 2>/dev/null
                KILLED_COUNT=$((KILLED_COUNT + 1))
            fi
        done
        echo "Killed $KILLED_COUNT process(es) on port $PORT"
    fi
    
    # Wait a moment for cleanup to complete
    sleep 2
    
    # Verify cleanup - check port again
    REMAINING=$(find_port_pids $PORT)
    if [ -z "$REMAINING" ]; then
        echo "✓ Port $PORT is now free. Cleanup complete."
    else
        echo "⚠ Warning: Some processes may still be using port $PORT: $REMAINING"
        echo "You may need to manually kill these processes with: kill -9 $REMAINING"
        exit 1
    fi
}

# Function to show help message
show_help() {
    echo "Usage: $0 {start|stop|restart|status|clean}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the development server"
    echo "  stop    - Stop the development server"
    echo "  restart - Restart the development server"
    echo "  status  - Check if the server is running"
    echo "  clean   - Kill any ghost processes on port 3001 (or DEV_PORT)"
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
    clean)
        clean_processes
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
