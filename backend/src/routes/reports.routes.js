const express = require('express');
const { generateStyledReport } = require('../services/reportService');
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

module.exports = router;
