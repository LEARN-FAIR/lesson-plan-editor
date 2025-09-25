#!/bin/bash

# Installation script for LEARN-FAIR Lesson Plan Editor

set -e

echo "🔧 Installing LEARN-FAIR Lesson Plan Editor dependencies..."

# Install PHP dependencies
echo "📦 Installing PHP dependencies..."
composer install

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Clear Symfony cache
echo "🧹 Clearing Symfony cache..."
php bin/console cache:clear

echo "✅ Installation complete!"
echo ""
echo "🚀 You can now start the development environment with:"
echo "   ./scripts/dev.sh"
