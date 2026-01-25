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

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
    });
});

// Start server
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

module.exports = app;
