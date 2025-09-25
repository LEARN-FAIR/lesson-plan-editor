#!/bin/bash

# Development helper script for LEARN-FAIR Lesson Plan Editor

set -e

echo "🚀 Starting LEARN-FAIR Lesson Plan Editor Development Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if SSL certificates exist
if [ ! -f "ssl/localhost.crt" ] || [ ! -f "ssl/localhost.key" ]; then
    echo "⚠️  SSL certificates not found in ssl/ directory"
    echo "   You may need to generate them for HTTPS to work properly"
fi

# Start development environment
echo "🐳 Starting Docker containers..."
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Development environment started!"
echo ""
echo "🌐 Access the application at:"
echo "   - Main app (HTTPS): https://localhost:8443"
echo "   - Main app (HTTP): http://localhost:8080 (redirects to HTTPS)"
echo "   - Frontend dev server: https://localhost:3000"
echo ""
echo "📝 To stop the environment, press Ctrl+C"
