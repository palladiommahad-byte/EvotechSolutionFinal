FROM node:18-bookworm-slim

WORKDIR /app

COPY backend/package*.json ./

# Build bcrypt in the Linux image. This prevents Windows-native bcrypt binaries
# from causing "Exec format error" when the backend container starts.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && npm_config_build_from_source=true npm install

COPY backend/ .

# Fail the Docker build immediately if the native authentication dependency is unusable.
RUN node -e "require('bcrypt'); console.log('bcrypt loaded successfully')"

# Keep the Docker configuration beside each application-created database backup.
COPY docker-compose.yml nginx.conf /app/backup-config/
COPY backend/Dockerfile /app/backup-config/backend.Dockerfile
COPY frontend/Dockerfile /app/backup-config/frontend.Dockerfile
COPY frontend/nginx.docker.conf /app/backup-config/frontend.nginx.docker.conf

EXPOSE 3000

CMD ["npm", "start"]
