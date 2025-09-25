# Multi-stage build for production
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/js ./src/js
COPY vite.config.js ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./

# Build frontend assets
RUN npm run build

# FrankenPHP stage
FROM dunglas/frankenphp:1-php8.2

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install mbstring exif pcntl bcmath gd

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /app

# Copy existing application directory contents
COPY . .

# Copy built frontend assets from previous stage
COPY --from=frontend-builder /app/public/build ./public/build

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Create Caddyfile for FrankenPHP
COPY docker/Caddyfile /etc/caddy/Caddyfile

# Create necessary directories and set permissions
RUN mkdir -p /app/var/cache /app/var/log \
    && chown -R www-data:www-data /app \
    && chmod -R 755 /app/var

# Expose port 80 and 443
EXPOSE 80 443

# Start FrankenPHP
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
