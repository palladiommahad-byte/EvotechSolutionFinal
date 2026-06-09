/**
 * RH Module — Main Router
 * Aggregates all RH sub-routers under /api/rh.
 * Registered in server.js as: app.use('/api/rh', rhRouter)
 */

const express = require('express');
const { verifyToken } = require('../middleware/auth.middleware');

const employeesRouter    = require('./rh/employees.routes');
const payrollRouter      = require('./rh/payroll.routes');
const leavesRouter       = require('./rh/leaves.routes');
const taxConfigRouter    = require('./rh/taxConfig.routes');
const attestationsRouter = require('./rh/attestations.routes');

const router = express.Router();

router.use(verifyToken);

router.use('/employees',    employeesRouter);
router.use('/payroll',      payrollRouter);
router.use('/leaves',       leavesRouter);
router.use('/tax-config',   taxConfigRouter);
router.use('/attestations', attestationsRouter);

module.exports = router;
