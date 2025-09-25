# LEARN-FAIR Lesson Plan Editor - Docker Setup

This project has been restructured to use a unified codebase with Symfony backend and React frontend, built with Vite and served by FrankenPHP.

## Project Structure

```
├── src/                      # Unified source directory
│   ├── js/                  # React application
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   └── Controller/          # Symfony controllers
├── public/
│   └── build/              # Built frontend assets (generated)
├── config/                 # Symfony configuration
├── templates/              # Twig templates
├── docker/                 # Docker configuration files
├── vite.config.js          # Vite configuration
├── package.json            # Frontend dependencies
├── composer.json           # Backend dependencies
├── Dockerfile              # Production build
├── Dockerfile.dev          # Development build
├── docker-compose.yml      # Production setup
└── docker-compose.dev.yml  # Development setup
```

## Development Setup

### Prerequisites
- Docker and Docker Compose
- SSL certificates in `ssl/` directory (for HTTPS)

### Quick Start

1. **Development with hot reloading:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Production build:**
   ```bash
   docker-compose up --build
   ```

### Services

- **App (FrankenPHP)**: `https://localhost:8443` (primary), `http://localhost:8080` (redirects to HTTPS)
- **Frontend Dev Server**: `https://localhost:3000` (development only)

### Development Workflow

1. **Backend changes**: Edit files in `src/` - FrankenPHP will automatically reload
2. **Frontend changes**: Edit files in `src/js/` - Vite dev server provides hot reloading

### Building Frontend Assets

For production, frontend assets are built during the Docker build process. For development:

```bash
# Enter the frontend-dev container
docker-compose -f docker-compose.dev.yml exec frontend-dev sh

# Build assets manually
npm run build
```

### Environment Variables

Key environment variables (set in docker-compose files):
- `APP_ENV`: Symfony environment (dev/prod)
- `APP_DEBUG`: Enable Symfony debug mode
- `NODE_ENV`: Node.js environment

### SSL/HTTPS

The application expects SSL certificates in the `ssl/` directory:
- `ssl/localhost.crt`
- `ssl/localhost.key`

For development, you can generate self-signed certificates or use mkcert.

## Technology Stack

- **Backend**: Symfony 6.4 with PHP 8.2
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 5
- **Server**: FrankenPHP (Caddy + PHP)
- **Containerization**: Docker with multi-stage builds

## Key Features

- **Unified Codebase**: Single repository for backend and frontend
- **Modern Build Process**: Vite for fast development and optimized production builds
- **High Performance**: FrankenPHP provides excellent performance with HTTP/2 and HTTP/3 support
- **Hot Reloading**: Development setup with instant frontend updates
- **Production Ready**: Optimized Docker images with asset caching

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 8080 and 3000 are available
2. **SSL issues**: Ensure SSL certificates are present and valid
3. **Permission issues**: Check that Docker has proper file system access

### Logs

View logs for specific services:
```bash
docker-compose logs app
docker-compose logs frontend-dev
```

### Rebuilding

Force rebuild after major changes:
```bash
docker-compose down
docker-compose up --build --force-recreate
```
