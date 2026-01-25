module.exports = {
    apps: [
        {
            name: 'evotech-backend',
            script: './backend/src/server.js',
            cwd: './',

            // ========================================
            // Development Environment
            // ========================================
            env: {
                NODE_ENV: 'development',
                PORT: 3000
            },

            // ========================================
            // Production Environment
            // ========================================
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            },

            // ========================================
            // Cluster Mode (Production)
            // ========================================
            instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
            exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',

            // ========================================
            // Process Management
            // ========================================
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',

            // ========================================
            // Logging
            // ========================================
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            merge_logs: true,

            // ========================================
            // Restart Strategy
            // ========================================
            exp_backoff_restart_delay: 100,
            max_restarts: 10,
            min_uptime: '5s'
        }
    ],

    // ========================================
    // Deployment Configuration (Optional)
    // ========================================
    deploy: {
        production: {
            user: 'your_user',
            host: 'your_vps_ip',
            ref: 'origin/main',
            repo: 'git@github.com:your_username/EvotechSolution.git',
            path: '/var/www/evotechsolution',
            'pre-deploy-local': '',
            'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.config.js --env production',
            'pre-setup': ''
        }
    }
};
