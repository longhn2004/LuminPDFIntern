#!/bin/bash

# LuminPDF Deployment Script
# Usage: ./deploy.sh [local|production|stop|logs]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .example.env..."
        if [ -f backend/.example.env ]; then
            cp backend/.example.env .env
            print_warning "Please update .env with your configuration"
        else
            print_error "No .example.env found. Please create .env file manually."
            exit 1
        fi
    fi
}

# Build and start services
deploy_local() {
    print_status "Starting local deployment with Docker Compose..."
    
    check_env
    
    # Build and start services
    docker-compose down --remove-orphans
    docker-compose build --no-cache
    docker-compose up -d
    
    print_success "Local deployment started!"
    print_status "Services:"
    print_status "- Frontend: http://localhost:3000"
    print_status "- Backend: http://localhost:5000"
    print_status "- Backend Health: http://localhost:5000/health"
    print_status "- MongoDB: localhost:27017"
    print_status "- Redis: localhost:6379"
    
    print_status "To view logs: ./deploy.sh logs"
    print_status "To stop services: ./deploy.sh stop"
}

# Production deployment with Nginx proxy
deploy_production() {
    print_status "Starting production deployment with Nginx proxy..."
    
    check_env
    
    # Build and start with nginx proxy
    docker-compose --profile proxy down --remove-orphans
    docker-compose --profile proxy build --no-cache
    docker-compose --profile proxy up -d
    
    print_success "Production deployment started!"
    print_status "Services:"
    print_status "- Application: http://localhost"
    print_status "- Direct Frontend: http://localhost:3000"
    print_status "- Direct Backend: http://localhost:5000"
    print_status "- Health Check: http://localhost/health"
}

# Stop all services
stop_services() {
    print_status "Stopping all services..."
    
    docker-compose --profile proxy down --remove-orphans
    docker-compose down --remove-orphans
    
    print_success "All services stopped!"
}

# Show logs
show_logs() {
    if [ -z "$2" ]; then
        print_status "Showing logs for all services..."
        docker-compose logs -f
    else
        print_status "Showing logs for $2..."
        docker-compose logs -f "$2"
    fi
}

# Test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Wait for services to start
    sleep 10
    
    # Test backend health
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Test frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend check passed"
    else
        print_error "Frontend check failed"
        return 1
    fi
    
    print_success "All tests passed!"
}

# MongoDB migration helper
migrate_mongodb() {
    print_status "Running MongoDB migration to Atlas..."
    
    cd backend
    npm run test:mongodb
    
    if [ $? -eq 0 ]; then
        print_status "MongoDB Atlas connection test passed"
        print_status "Running migration dry run..."
        npm run migrate:mongodb:dry-run
        
        read -p "Proceed with actual migration? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm run migrate:mongodb:backup
            print_success "MongoDB migration completed!"
        else
            print_status "Migration cancelled"
        fi
    else
        print_error "MongoDB Atlas connection failed. Please check configuration."
    fi
    
    cd ..
}

# Clean up Docker resources
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    docker-compose down --remove-orphans --volumes
    docker system prune -f
    docker volume prune -f
    
    print_success "Cleanup completed!"
}

# Show help
show_help() {
    echo "LuminPDF Deployment Script"
    echo "========================="
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  local       Start local development deployment"
    echo "  production  Start production deployment with Nginx"
    echo "  stop        Stop all services"
    echo "  logs [service]  Show logs (optionally for specific service)"
    echo "  test        Test deployment health"
    echo "  migrate     Run MongoDB Atlas migration"
    echo "  cleanup     Clean up Docker resources"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 local              # Start local deployment"
    echo "  $0 logs backend       # Show backend logs"
    echo "  $0 test               # Test deployment"
    echo "  $0 migrate            # Migrate to MongoDB Atlas"
}

# Main script logic
case "$1" in
    "local")
        deploy_local
        ;;
    "production")
        deploy_production
        ;;
    "stop")
        stop_services
        ;;
    "logs")
        show_logs "$@"
        ;;
    "test")
        test_deployment
        ;;
    "migrate")
        migrate_mongodb
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        print_error "No command specified"
        show_help
        exit 1
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 