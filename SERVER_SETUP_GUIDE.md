# 🚀 Deployment Guide: Setting up on a New Server

This guide provides a step-by-step checklist for deploying the **EvoTech Solution** application on a fresh Windows or Linux server.

## 📋 Prerequisites

- [ ] **Docker Desktop** (Verified working on Windows/Linux)
- [ ] **Git** (Optional, for cloning if using a repo) or **File Transfer Tool** (e.g., SCP, FileZilla)

## 📂 Step 1: Transfer Files to Server

You need to copy the project files to your server. 

### Option A: Using a Zip File
1.  **Compress** the entire `EvotechSolutionFinal` folder on your local machine.
2.  **Upload** the zip file to your server (e.g., `C:\EvotechSolutionFinal` or `/opt/evotech`).
3.  **Extract** the files.

### Option B: Using Git
1.  Push your local code to a private repository (GitHub/GitLab).
2.  Clone it on the server:
    ```bash
    git clone https://github.com/your-repo/EvotechSolutionFinal.git
    cd EvotechSolutionFinal
    ```

---

## ⚙️ Step 2: Configuration

Ensure your environment variables are set correctly for the new server.

1.  **Backend Configuration**:
    - Open `backend/.env`.
    - Ensure `DB_HOST=postgres` (Use `postgres` for Docker, NOT `localhost`).
    - **CRITICAL**: If you changed it to `localhost` for local debugging earlier, CHANGE IT BACK TO `postgres` before deploying with Docker.
    
    **Correct `backend/.env` for Docker:**
    ```ini
    DB_HOST=postgres
    DB_NAME=EvotechSolution
    DB_USER=postgres
    DB_PASSWORD=HelloFace34
    PORT=5000
    ```

2.  **Frontend Configuration**:
    - Open `frontend/.env`.
    - Identify your server's public IP address or domain name.
    - Update `VITE_API_URL` if necessary (usually relative path `/api` is fine if served via Nginx).

---

## 🚀 Step 3: Launch the Application

1.  Open a terminal/command prompt inside the project folder.
2.  Run the build and start command:
    ```bash
    docker-compose up -d --build
    ```
3.  Wait for all containers to start (Frontend, Backend, Database).
    - Checks: `docker ps` to see if `evotech_client`, `evotech_server`, and `evotech_db` are running.

---

## 🗄️ Step 4: Initialize the Database (One-Time Setup)

Since this is a new server, the database will be empty. You must run the initialization command.

1.  Run the initialization script inside the backend container:
    ```bash
    docker-compose exec server npm run db:init
    ```
    
    **Expected Output:**
    ```
    > evotech-backend@1.0.0 db:init
    > node src/scripts/init-db.js
    ...
    ✅ 001_init_schema.sql applied successfully!
    ...
    🎉 All migrations applied successfully!
    ```

---

## ✅ Step 5: Verify Deployment

1.  **Access the Frontend**:
    - Open your browser and go to: `http://<YOUR_SERVER_IP>:8080`
    
2.  **Test Login**:
    - Default Admin User: `admin@evotech.ma`
    - Password: (As defined in your migrations/database)

---

## 🛠️ Troubleshooting

- **Port Conflicts**:
  - If port `3001` or `8080` is taken, edit `docker-compose.yml`:
    ```yaml
    services:
      server:
        ports:
          - "3002:5000" # Change 3001 to 3002
      client:
        ports:
          - "8081:80"   # Change 8080 to 8081
    ```
  - Restart: `docker-compose up -d`

- **Database Connection Error**:
  - Check container logs: `docker logs evotech_server`
  - Ensure `DB_HOST=postgres` in `.env` inside the container or `backend/.env`.
