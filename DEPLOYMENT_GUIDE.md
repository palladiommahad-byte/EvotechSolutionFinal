# EvoTech Solution - Deployment Guide

This guide explains how to deploy the EvoTech Solution application using Docker on a local machine or server.

## Prerequisites

- **Docker** and **Docker Compose** must be installed on the host machine.

## Setup Instructions

1.  **Environment Configuration**:
    - Build the project using the provided `docker-compose.yml` file.
    - Create a `.env` file in the root directory if it doesn't exist (copy `.env.example` if available, or use the template below).

    ```env
    # Database Configuration
    DB_USER=postgres
    DB_PASSWORD=secure_password
    DB_NAME=evotech_db

    # Backend Configuration
    JWT_SECRET=your_jwt_secret_key
    ```

    > **Important:** If deploying to a specific IP or domain on a local network, ensure the `CORS_ORIGIN` in `docker-compose.yml` (backend service) includes that IP (e.g., `http://192.168.1.100`).

2.  **Starting the Application**:

    **Windows:**
    - Double-click the `start-app.bat` file.

    **Linux / Mac:**
    - Run the script: `./start-app.sh`
    - Or manually: `docker-compose up -d`

3.  **Accessing the Application**:
    - Open your browser and navigate to `http://localhost` (or the server's IP address).

## Updating the Application

To update the application with the latest changes:

1.  Open a terminal/command prompt in the project folder.
2.  Run:
    ```bash
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    ```

## Troubleshooting

- **Database Persistence**: Data is stored in the `pgdata` Docker volume. It survives container restarts.
- **Port Conflicts**: Ensure ports `80`, `3000`, and `5432` are not being used by other applications. If they are, modify the `ports` mapping in `docker-compose.yml` (e.g., `"8080:80"`).
