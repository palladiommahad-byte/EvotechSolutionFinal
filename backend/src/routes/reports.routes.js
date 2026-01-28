const express = require('express');
const { generateStyledReport, generateStyledReportFromData } = require('../services/reportService');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/reports/export
 * Download styled Excel report
 * Query: type (inventory, sales-invoice, purchases-order, etc.)
 */
router.get('/export', asyncHandler(async (req, res) => {
    try {
        const { type } = req.query;
        const reportType = type || 'inventory';

        const buffer = await generateStyledReport(reportType);

        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `${reportType}_Report_${timestamp}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        res.send(buffer);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            error: 'Export Failed',
            message: 'Could not generate report. Please try again.'
        });
    }
}));

/**
 * POST /api/reports/export-custom
 * Download styled Excel report from provided data
 * Body: { data, columns, title }
 */
router.post('/export-custom', asyncHandler(async (req, res) => {
    try {
        const { data, columns, title } = req.body;

        if (!data || !Array.isArray(data) || !columns || !Array.isArray(columns)) {
            return res.status(400).json({ message: 'Invalid data or columns format' });
        }

        const buffer = await generateStyledReportFromData(data, columns, title);

        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `${title.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        res.send(buffer);
    } catch (error) {
        console.error('Custom Export error:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
}));

module.exports = router;
