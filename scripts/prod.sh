#!/bin/bash

# Govt Procurement Library Production Services Manager
# Full Docker deployment for production

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.production.yml"
LOG_DIR="/var/log/nginx/govtlib"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }

# Check Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker not installed!"
        print_status "Install with: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi

    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose not available!"
        print_status "Install Docker Compose plugin"
        exit 1
    fi
}

# Load environment
load_env() {
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        export $(grep -v '^#' "$PROJECT_DIR/.env.production" | xargs)
        print_success "Loaded .env.production"
        print_status "Environment: PRODUCTION"
        print_status "Web Domain: https://www.gphusa.com"
        print_status "API URL: $NEXT_PUBLIC_API_URL"
    else
        print_error ".env.production not found!"
        exit 1
    fi
}

# Create log directory
create_log_dir() {
    sudo mkdir -p "$LOG_DIR"
    sudo chmod 755 "$LOG_DIR"
    print_success "Log directory ready: $LOG_DIR"
}

# Build images
build() {
    print_status "Building Docker images for production..."
    check_docker
    load_env

    # Clean Next.js build artifacts and caches to avoid stale build errors
    print_status "Cleaning Next.js build artifacts and caches..."

    # Remove Next.js build output
    if [ -d "$PROJECT_DIR/.next" ]; then
        rm -rf "$PROJECT_DIR/.next"
        print_success "Next.js build output cleared"
    fi

    # Remove TypeScript build cache
    if [ -f "$PROJECT_DIR/tsconfig.tsbuildinfo" ]; then
        rm -f "$PROJECT_DIR/tsconfig.tsbuildinfo"
        print_success "TypeScript build cache cleared"
    fi

    # Remove ESLint cache
    if [ -f "$PROJECT_DIR/.eslintcache" ]; then
        rm -f "$PROJECT_DIR/.eslintcache"
        print_success "ESLint cache cleared"
    fi

    # Remove node_modules cache directories
    if [ -d "$PROJECT_DIR/node_modules/.cache" ]; then
        rm -rf "$PROJECT_DIR/node_modules/.cache"
        print_success "Node modules cache cleared"
    fi

    print_success "All Next.js caches and build artifacts cleaned"

    docker compose -f "$COMPOSE_FILE" build --no-cache
    print_success "Docker images built successfully"
}

# Start services
start() {
    print_status "Starting production services..."
    check_docker
    load_env
    create_log_dir

    # Check if services are already running
    if docker compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        print_warning "Some services already running. Use 'restart' to restart them."
    fi

    docker compose -f "$COMPOSE_FILE" up -d

    echo ""
    print_success "Production services started!"
    echo ""

    # Wait a moment for services to initialize
    sleep 3
    status
}

# Stop services
stop() {
    print_status "Stopping production services..."
    check_docker

    docker compose -f "$COMPOSE_FILE" down
    print_success "All services stopped"
}

# Restart services
restart() {
    print_status "Restarting production services..."
    stop
    sleep 2
    start
}

# Show status
status() {
    check_docker

    echo -e "${BLUE}═══ Govt Procurement Library Production Status ═══${NC}"
    echo ""

    docker compose -f "$COMPOSE_FILE" ps

    echo ""
    echo -e "${BLUE}═══ Service URLs ═══${NC}"
    echo -e "${GREEN}Web:${NC}  https://www.gphusa.com"
    echo -e "${GREEN}API:${NC}  https://api.gphusa.com"
    echo ""
    echo -e "${BLUE}═══ Health Status ═══${NC}"

    # Check Web health
    if docker compose -f "$COMPOSE_FILE" ps | grep -q "govtlib-web-prod.*Up"; then
        echo -e "Web Container:    ${GREEN}● Running${NC}"
    else
        echo -e "Web Container:    ${RED}○ Stopped${NC}"
    fi

    # Check nginx health
    if docker compose -f "$COMPOSE_FILE" ps | grep -q "govtlib-nginx-prod.*Up"; then
        echo -e "nginx:            ${GREEN}● Running${NC}"
    else
        echo -e "nginx:            ${RED}○ Stopped${NC}"
    fi
}

# View logs
logs() {
    check_docker

    local service=${1:-}
    local follow=${2:--f}

    if [ -z "$service" ]; then
        print_status "Showing logs for all services (Ctrl+C to exit)"
        docker compose -f "$COMPOSE_FILE" logs -f --tail=50
    else
        case $service in
            web|nextjs)
                docker compose -f "$COMPOSE_FILE" logs $follow --tail=100 web
                ;;
            nginx)
                docker compose -f "$COMPOSE_FILE" logs $follow --tail=100 nginx
                ;;
            *)
                print_error "Unknown service: $service"
                echo "Available services: web, nginx"
                exit 1
                ;;
        esac
    fi
}

# Pull latest images (for deployment updates)
pull() {
    print_status "Pulling latest images..."
    check_docker

    docker compose -f "$COMPOSE_FILE" pull
    print_success "Images updated"
}

# Clean up old images
cleanup() {
    print_status "Cleaning up unused Docker resources..."
    check_docker

    docker system prune -f
    docker volume prune -f
    print_success "Cleanup complete"
}

# Execute command in container
exec_cmd() {
    check_docker

    local service=$1
    shift

    case $service in
        web|nextjs)
            docker compose -f "$COMPOSE_FILE" exec web "$@"
            ;;
        *)
            print_error "Unknown service: $service"
            echo "Available services: web"
            exit 1
            ;;
    esac
}

# Main command handler
case "${1:-help}" in
    build)
        build
        ;;

    start)
        start
        ;;

    stop)
        stop
        ;;

    restart)
        restart
        ;;

    status)
        status
        ;;

    logs)
        logs "$2" "$3"
        ;;

    pull)
        pull
        ;;

    cleanup)
        cleanup
        ;;

    exec)
        shift
        exec_cmd "$@"
        ;;

    help|*)
        cat << EOF
${BLUE}Govt Procurement Library Production Services Manager${NC}

${GREEN}Setup & Deployment:${NC}
  ./prod.sh build        Build Docker images (auto-clears Next.js cache)
  ./prod.sh start        Start all production services
  ./prod.sh stop         Stop all services
  ./prod.sh restart      Restart all services

${GREEN}Monitoring:${NC}
  ./prod.sh status       Show service status
  ./prod.sh logs         Show logs for all services
  ./prod.sh logs web     Show Next.js logs
  ./prod.sh logs nginx   Show nginx logs

${GREEN}Maintenance:${NC}
  ./prod.sh pull         Pull latest Docker images
  ./prod.sh cleanup      Clean up unused Docker resources
  ./prod.sh exec web sh  Execute command in web container

${YELLOW}Production Deployment Workflow:${NC}
  1. Copy project to production server:
     ${BLUE}rsync -av --exclude 'node_modules' --exclude '.next' \\
           --exclude '.git' \\
           ./ user@prod:/path/to/govt-procurement-library/${NC}

  2. On production server:
     ${BLUE}cd /path/to/govt-procurement-library${NC}
     ${BLUE}./scripts/prod.sh build${NC}    # Build images (clears caches automatically)
     ${BLUE}./scripts/prod.sh start${NC}    # Start services

  3. Check status:
     ${BLUE}./scripts/prod.sh status${NC}
     ${BLUE}./scripts/prod.sh logs${NC}

${YELLOW}Prerequisites:${NC}
  - SSL certificates for *.gralavi.com in nginx/certs/:
    - star_gralavi_com_fullchain.crt
    - star_gralavi_com.key
  - DNS record: www.gphusa.com -> server IP

${YELLOW}URLs:${NC}
  Web:  https://www.gphusa.com
  API:  https://api.gphusa.com (external)

${YELLOW}Configuration:${NC}
  Environment:  .env.production
  Compose File: docker-compose.production.yml
  Nginx Config: nginx/nginx.production.conf
  Logs:         $LOG_DIR

For development, use: ./scripts/dev.sh

EOF
        ;;
esac
