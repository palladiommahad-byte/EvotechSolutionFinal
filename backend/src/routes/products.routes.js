const express = require('express');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/products
 * Get all products
 */
router.get('/', asyncHandler(async (req, res) => {
    const { search, category, status } = req.query;

    let sql = 'SELECT * FROM products WHERE is_deleted = false';
    const params = [];
    let paramIndex = 1;

    if (search) {
        sql += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    if (category) {
        sql += ` AND category = $${paramIndex++}`;
        params.push(category);
    }

    if (status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(status);
    }

    sql += ' ORDER BY name ASC';

    const result = await query(sql, params);

    const products = result.rows.map(product => ({
        ...product,
        minStock: product.min_stock,
        lastMovement: product.last_movement,
    }));

    res.json(products);
}));

/**
 * GET /api/products/low-stock
 * Get low stock products
 */
router.get('/low-stock', asyncHandler(async (req, res) => {
    const result = await query(
        `SELECT * FROM products 
     WHERE is_deleted = false 
       AND min_stock IS NOT NULL 
       AND stock <= min_stock
     ORDER BY stock ASC`
    );

    const products = result.rows.map(product => ({
        ...product,
        minStock: product.min_stock,
        lastMovement: product.last_movement,
    }));

    res.json(products);
}));

/**
 * GET /api/products/stock-items
 * Get all stock items
 */
router.get('/stock-items', asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM stock_items ORDER BY product_id ASC');
    res.json(result.rows);
}));

/**
 * GET /api/products/movements
 * Get stock movements
 */
router.get('/movements', asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;

    const result = await query(
        `SELECT sm.*, p.name as product_name, p.sku as product_sku
     FROM stock_movements sm
     LEFT JOIN products p ON sm.product_id = p.id
     ORDER BY sm.created_at DESC
     LIMIT $1`,
        [parseInt(limit)]
    );

    res.json(result.rows);
}));

/**
 * GET /api/products/:id
 * Get product by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await query(
        'SELECT * FROM products WHERE id = $1 AND is_deleted = false',
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Product not found',
        });
    }

    const product = result.rows[0];
    res.json({
        ...product,
        minStock: product.min_stock,
        lastMovement: product.last_movement,
    });
}));

/**
 * GET /api/products/sku/:sku
 * Get product by SKU
 */
router.get('/sku/:sku', asyncHandler(async (req, res) => {
    const { sku } = req.params;

    const result = await query(
        'SELECT * FROM products WHERE sku = $1 AND is_deleted = false',
        [sku]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Product not found',
        });
    }

    const product = result.rows[0];
    res.json({
        ...product,
        minStock: product.min_stock,
        lastMovement: product.last_movement,
    });
}));

/**
 * GET /api/products/:id/stock-items
 * Get stock items for a product
 */
router.get('/:id/stock-items', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await query(
        'SELECT * FROM stock_items WHERE product_id = $1',
        [id]
    );

    res.json(result.rows);
}));

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', asyncHandler(async (req, res) => {
    const {
        sku,
        name,
        description,
        category,
        unit = 'Piece',
        price,
        stock = 0,
        min_stock = 0,
        minStock,
        image,
    } = req.body;

    if (!sku || !name) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'SKU and name are required',
        });
    }

    const actualMinStock = min_stock || minStock || 0;

    // Calculate status
    let status = 'in_stock';
    if (stock === 0) {
        status = 'out_of_stock';
    } else if (actualMinStock > 0 && stock <= actualMinStock) {
        status = 'low_stock';

        // NOTIFICATION: Low Stock Warning
        await query(
            `INSERT INTO notifications (title, message, type, action_url, action_label, created_at)
             VALUES ($1, $2, 'warning', $3, 'View Product', NOW())`,
            [
                'Low Stock Alert',
                `New Product "${name}" (${sku}) created with low stock. Current: ${stock}, Min: ${actualMinStock}`,
                '/inventory/products'
            ]
        );
    }

    const result = await query(
        `INSERT INTO products (sku, name, description, category, unit, price, stock, min_stock, image, status, last_movement)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE)
     RETURNING *`,
        [sku, name, description, category || '', unit, price || 0, stock, actualMinStock, image, status]
    );

    const product = result.rows[0];
    res.status(201).json({
        ...product,
        minStock: product.min_stock,
        lastMovement: product.last_movement,
    });
}));

/**
 * PUT /api/products/:id
 * Update a product
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        sku,
        name,
        description,
        category,
        unit,
        price,
        stock,
        min_stock,
        minStock,
        image,
    } = req.body;

    // Get current product to calculate status
    const currentResult = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Product not found',
        });
    }

    const current = currentResult.rows[0];
    const newStock = stock !== undefined ? stock : current.stock;
    const newMinStock = min_stock !== undefined ? min_stock : (minStock !== undefined ? minStock : current.min_stock);

    // Calculate status
    let status = 'in_stock';
    if (newStock === 0) {
        status = 'out_of_stock';
    } else if (newMinStock > 0 && newStock <= newMinStock) {
        status = 'low_stock';

        // NOTIFICATION: Low Stock Warning
        // Check if we already have an unread notification to avoid spam
        const existing = await query(
            "SELECT id FROM notifications WHERE title = 'Low Stock Alert' AND message LIKE $1 AND read = false",
            [`%${newStock}%`] // Simple check to see if we notified for this exact stock level recently
        );

        if (existing.rows.length === 0) {
            await query(
                `INSERT INTO notifications (title, message, type, action_url, action_label, created_at)
                 VALUES ($1, $2, 'warning', $3, 'View Product', NOW())`,
                [
                    'Low Stock Alert',
                    `Product "${name || current.name}" is running low. Current: ${newStock}, Min: ${newMinStock}`,
                    `/inventory/products/${id}`
                ]
            );
        }
    }

    const result = await query(
        `UPDATE products 
     SET sku = COALESCE($1, sku),
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         category = COALESCE($4, category),
         unit = COALESCE($5, unit),
         price = COALESCE($6, price),
         stock = COALESCE($7, stock),
         min_stock = COALESCE($8, min_stock),
         image = COALESCE($9, image),
         status = $10,
         updated_at = NOW()
     WHERE id = $11 AND is_deleted = false
     RETURNING *`,
        [sku, name, description, category, unit, price, stock, min_stock || minStock, image, status, id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Product not found',
        });
    }

    const product = result.rows[0];
    res.json({
        ...product,
        minStock: product.min_stock,
        lastMovement: product.last_movement,
    });
}));

/**
 * PUT /api/products/:id/stock
 * Update product stock
 */
router.put('/:id/stock', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Quantity is required',
        });
    }

    const result = await query(
        'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [quantity, id]
    );

    // NOTIFICATION: Low Stock Warning
    if (result.rows.length > 0) {
        const product = result.rows[0];
        const minStock = product.min_stock || 0;

        if (minStock > 0 && product.stock <= minStock) {
            await query(
                `INSERT INTO notifications (title, message, type, action_url, action_label, created_at)
                 VALUES ($1, $2, 'warning', $3, 'View Product', NOW())`,
                [
                    'Low Stock Alert',
                    `Product "${product.name}" stock manually updated. Current: ${product.stock}, Min: ${minStock}`,
                    `/inventory/products/${id}`
                ]
            );
        }
    }

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Product not found',
        });
    }

    res.json(result.rows[0]);
}));

/**
 * PUT /api/products/:productId/stock-items/:warehouseId
 * Update stock item for a specific warehouse
 */
router.put('/:productId/stock-items/:warehouseId', asyncHandler(async (req, res) => {
    const { productId, warehouseId } = req.params;
    const { quantity, min_quantity, movement = 'stable' } = req.body;

    const result = await query(
        `INSERT INTO stock_items (product_id, warehouse_id, quantity, min_quantity, movement, last_updated)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (product_id, warehouse_id) 
     DO UPDATE SET quantity = $3, min_quantity = $4, movement = $5, last_updated = NOW()
     RETURNING *`,
        [productId, warehouseId, quantity, min_quantity, movement]
    );

    res.json(result.rows[0]);
}));

/**
 * DELETE /api/products/:id
 * Soft delete a product
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await query(
        'UPDATE products SET is_deleted = true, updated_at = NOW() WHERE id = $1 RETURNING id',
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Product not found',
        });
    }

    res.status(204).send();
}));

module.exports = router;
