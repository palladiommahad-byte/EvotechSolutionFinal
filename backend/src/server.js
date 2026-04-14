require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth.routes');
const contactsRoutes = require('./routes/contacts.routes');
const productsRoutes = require('./routes/products.routes');
const invoicesRoutes = require('./routes/invoices.routes');
const estimatesRoutes = require('./routes/estimates.routes');
const deliveryNotesRoutes = require('./routes/delivery-notes.routes');
const creditNotesRoutes = require('./routes/credit-notes.routes');
const purchaseOrdersRoutes = require('./routes/purchase-orders.routes');
const purchaseInvoicesRoutes = require('./routes/purchase-invoices.routes');
const treasuryRoutes = require('./routes/treasury.routes');
const settingsRoutes = require('./routes/settings.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const taxReportsRoutes = require('./routes/tax-reports.routes');
const reportsRoutes = require('./routes/reports.routes');
const prelevementsRoutes = require('./routes/prelevements.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { initCronJobs } = require('./services/cron-jobs');

// Import auto-migration system
const { runAutoMigrations } = require('./scripts/auto-migrate');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Cron Jobs
initCronJobs();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
        next();
    });
}

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'EvoTech Backend API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',

    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/estimates', estimatesRoutes);
app.use('/api/delivery-notes', deliveryNotesRoutes);
app.use('/api/credit-notes', creditNotesRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/purchase-invoices', purchaseInvoicesRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tax-reports', taxReportsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/prelevements', prelevementsRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
    });
});

// Start server with auto-migrations
async function startServer() {
    // Wait for database to be ready (Docker containers may start at different times)
    const MAX_RETRIES = 10;
    const RETRY_DELAY_MS = 3000;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await runAutoMigrations();
            break; // Success - proceed to start server
        } catch (error) {
            if (attempt === MAX_RETRIES) {
                console.error('❌ Could not connect to database after multiple attempts.');
                console.error('   The server will start anyway, but some features may not work.');
                break;
            }
            console.log(`⏳ Database not ready yet (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }

    app.listen(PORT, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║        EvoTech Solution Backend API Server             ║');
        console.log('╠════════════════════════════════════════════════════════╣');
        console.log(`║  🚀 Server running on: http://localhost:${PORT}            ║`);
        console.log(`║  📍 Health check:      http://localhost:${PORT}/api/health ║`);
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log('');
    });
}

startServer();
