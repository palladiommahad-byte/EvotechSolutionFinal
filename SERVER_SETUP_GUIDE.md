# 🚀 Deployment Guide: Setting up on Server (192.168.100.241)

This guide provides a step-by-step checklist for deploying the **EvoTech Solution** application on your server.

## 📋 Prerequisites

- [ ] **Docker Desktop** (Verified working on Windows/Linux)
- [ ] **Git** (for cloning the repository)

## 📂 Step 1: Get the Code

1.  Open a terminal/command prompt on the server.
2.  Clone the repository:
    ```bash
    git clone https://github.com/palladiommahad-byte/EvotechSolutionFinal.git
    cd EvotechSolutionFinal
    ```

---

## ⚙️ Step 2: Configuration

Ensure your environment variables are set correctly.

1.  **Backend Configuration**:
    - Create/Edit `backend/.env`.
    - **CRITICAL**: Ensure `DB_HOST=postgres` and `PORT=3000`.
    
    **`backend/.env` Content:**
    ```ini
    DB_HOST=postgres
    DB_NAME=EvotechSolution
    DB_USER=postgres
    DB_PASSWORD=HelloFace34
    PORT=3000
    JWT_SECRET=evotech_secret_key_2026
    CORS_ORIGIN=*
    ```

2.  **Frontend Configuration**:
    - Create/Edit `frontend/.env`.
    - **CRITICAL**: `VITE_API_URL` must be `/api`.

    **`frontend/.env` Content:**
    ```ini
    VITE_API_URL=/api
    ```

---

## 🚀 Step 3: Launch the Application

1.  Stop any running instances (if updating):
    ```bash
    docker-compose down
    ```
2.  Build and start the containers:
    ```bash
    docker-compose up -d --build
    ```
3.  Wait for all containers to start.

---

## 🗄️ Step 4: Initialize the Database (First Time Only)

If this is a fresh install or you wiped the database, run:

```bash
docker-compose exec server npm run db:init
```

**Expected Output:** `✅ ... applied successfully!`

---

## ✅ Step 5: Verify Deployment

1.  **Access the Application**:
    - Open your browser and go to: `http://192.168.100.241:8080`
    
2.  **Test Login**:
    - Default Admin User: `admin@evotech.ma`
    - Password: (As defined in database)

---

## 🛠️ Troubleshooting

- **Check Logs**:
  ```bash
  docker-compose logs -f server
  ```
- **Restart Containers**:
  ```bash
  docker-compose restart
  ```
