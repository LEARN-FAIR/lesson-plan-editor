#!/bin/bash

# Production deployment script for LEARN-FAIR Lesson Plan Editor

set -e

echo "🚀 Starting LEARN-FAIR Lesson Plan Editor Production Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start production environment
echo "🐳 Building and starting Docker containers..."
docker-compose up --build -d

echo "✅ Production environment started!"
echo ""
echo "🌐 Access the application at:"
echo "   - Main app (HTTPS): https://localhost:8443"
echo "   - Main app (HTTP): http://localhost:8080 (redirects to HTTPS)"
echo ""
echo "📊 To view logs:"
echo "   docker-compose logs -f app"
echo ""
echo "🛑 To stop the environment:"
echo "   docker-compose down"
