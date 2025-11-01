#!/bin/bash

# AI Agent Wallet Production Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ai-agent-wallet"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    log_success "Dependencies check passed"
}

check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "Environment file $ENV_FILE not found. Creating from template..."
        if [ -f ".env.example" ]; then
            cp .env.example "$ENV_FILE"
            log_warning "Please edit $ENV_FILE with your production values before running this script again."
            exit 1
        else
            log_error "Neither $ENV_FILE nor .env.example found. Please create $ENV_FILE manually."
            exit 1
        fi
    fi

    log_success "Environment file found"
}

validate_env_vars() {
    log_info "Validating environment variables..."

    required_vars=(
        "DB_USER"
        "DB_PASSWORD"
        "JWT_SECRET"
        "REDIS_PASSWORD"
        "GRAFANA_PASSWORD"
    )

    missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables:"
        printf '  - %s\n' "${missing_vars[@]}"
        log_error "Please set these in your environment or $ENV_FILE"
        exit 1
    fi

    log_success "Environment variables validated"
}

build_images() {
    log_info "Building Docker images..."

    # Build backend image
    log_info "Building backend image..."
    docker build -f backend/Dockerfile.prod -t $PROJECT_NAME-backend:latest ./backend

    # Build frontend image
    log_info "Building frontend image..."
    docker build -f frontend/Dockerfile.prod -t $PROJECT_NAME-frontend:latest ./frontend

    log_success "Docker images built successfully"
}

start_services() {
    log_info "Starting services with Docker Compose..."

    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    fi

    # Start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

    log_success "Services started successfully"
}

wait_for_services() {
    log_info "Waiting for services to be healthy..."

    # Wait for database
    log_info "Waiting for PostgreSQL..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres sh -c 'while ! pg_isready -U $POSTGRES_USER -d $POSTGRES_DB; do sleep 1; done'

    # Wait for Redis
    log_info "Waiting for Redis..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis sh -c 'while ! redis-cli --raw incr ping; do sleep 1; done'

    # Wait for backend
    log_info "Waiting for backend..."
    timeout=60
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if curl -f http://localhost:3000/health &>/dev/null; then
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    if [ $elapsed -ge $timeout ]; then
        log_error "Backend failed to start within $timeout seconds"
        exit 1
    fi

    log_success "All services are healthy"
}

run_migrations() {
    log_info "Running database migrations..."

    # Run migrations if they exist
    if [ -f "backend/database/migrate.sh" ]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec backend sh -c './database/migrate.sh'
    else
        log_warning "No migration script found. Skipping migrations."
    fi

    log_success "Database migrations completed"
}

run_tests() {
    log_info "Running tests..."

    # Run backend tests
    if [ -f "backend/package.json" ] && grep -q '"test"' backend/package.json; then
        log_info "Running backend tests..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec backend npm test
    fi

    log_success "Tests completed"
}

show_status() {
    log_info "Deployment status:"

    echo ""
    echo "Services:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps

    echo ""
    echo "Access URLs:"
    echo "  Frontend:     http://localhost"
    echo "  API:          http://localhost/api"
    echo "  Health Check: http://localhost/health"
    echo "  Prometheus:   http://localhost/prometheus"
    echo "  Grafana:      http://localhost/grafana"
    echo "  AlertManager: http://localhost:9093"

    echo ""
    echo "Monitoring:"
    echo "  Grafana admin password: $GRAFANA_PASSWORD"
}

cleanup() {
    log_info "Cleaning up..."

    # Remove dangling images
    docker image prune -f

    # Remove unused volumes
    docker volume prune -f

    log_success "Cleanup completed"
}

rollback() {
    log_error "Deployment failed. Rolling back..."

    # Stop services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down

    # Remove images
    docker rmi $PROJECT_NAME-backend:latest $PROJECT_NAME-frontend:latest 2>/dev/null || true

    log_info "Rollback completed"
}

# Main deployment flow
main() {
    log_info "Starting AI Agent Wallet production deployment..."

    # Trap errors for rollback
    trap rollback ERR

    check_dependencies
    check_env_file
    validate_env_vars
    build_images
    start_services
    wait_for_services
    run_migrations
    run_tests
    cleanup
    show_status

    log_success "🎉 Deployment completed successfully!"
    log_info "Your AI Agent Wallet is now running in production mode."
}

# Parse command line arguments
case "${1:-}" in
    "build")
        check_dependencies
        build_images
        ;;
    "start")
        check_dependencies
        check_env_file
        validate_env_vars
        start_services
        ;;
    "stop")
        log_info "Stopping services..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
        log_success "Services stopped"
        ;;
    "restart")
        log_info "Restarting services..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" restart
        log_success "Services restarted"
        ;;
    "logs")
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    "rollback")
        rollback
        ;;
    *)
        main
        ;;
esac
