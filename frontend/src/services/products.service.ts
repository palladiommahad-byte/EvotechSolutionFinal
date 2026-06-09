/**
 * Products Service
 * Handles all API operations for products
 */

import { apiClient } from '@/lib/api-client';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  price: number;
  stock: number;
  min_stock?: number;
  minStock?: number;
  image?: string;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  last_movement?: string;
  lastMovement?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StockItem {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  min_quantity?: number;
  movement?: 'up' | 'down' | 'stable';
  last_updated?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  type: string;
  reference_id?: string;
  description?: string;
  created_at: string;
  product_name?: string;
  product_sku?: string;
  product_category?: string;
  document_number?: string;
  client_name?: string;
  supplier_name?: string;
}

export interface MovementFilters {
  type?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export const productsService = {
  /**
   * Get all products
   */
  async getAll(): Promise<Product[]> {
    try {
      return await apiClient.get<Product[]>('/products');
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },

  /**
   * Get product by ID
   */
  async getById(id: string): Promise<Product | null> {
    try {
      return await apiClient.get<Product>(`/products/${id}`);
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  },

  /**
   * Get product by SKU
   */
  async getBySku(sku: string): Promise<Product | null> {
    try {
      return await apiClient.get<Product>(`/products/sku/${sku}`);
    } catch (error) {
      console.error('Error fetching product by SKU:', error);
      return null;
    }
  },

  /**
   * Create a new product
   */
  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'minStock' | 'lastMovement'> & { min_stock?: number; last_movement?: string }): Promise<Product> {
    return await apiClient.post<Product>('/products', product);
  },

  /**
   * Update a product
   */
  async update(id: string, product: Partial<Product> & { min_stock?: number; minStock?: number; last_movement?: string; lastMovement?: string }): Promise<Product> {
    return await apiClient.put<Product>(`/products/${id}`, product);
  },

  /**
   * Delete a product
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  /**
   * Get stock items for a product
   */
  async getStockItems(productId: string): Promise<StockItem[]> {
    try {
      return await apiClient.get<StockItem[]>(`/products/${productId}/stock-items`);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      return [];
    }
  },

  /**
   * Get all stock items
   */
  async getAllStockItems(): Promise<StockItem[]> {
    try {
      return await apiClient.get<StockItem[]>('/products/stock-items');
    } catch (error) {
      console.error('Error fetching stock items:', error);
      return [];
    }
  },

  /**
   * Update stock for a product
   */
  async updateStock(productId: string, quantity: number): Promise<void> {
    await apiClient.put(`/products/${productId}/stock`, { quantity });
  },

  /**
   * Update stock item for a specific warehouse
   */
  async updateStockItem(productId: string, warehouseId: string, quantity: number, minQuantity?: number, movement?: 'up' | 'down' | 'stable'): Promise<StockItem> {
    return await apiClient.put<StockItem>(`/products/${productId}/stock-items/${warehouseId}`, {
      quantity,
      min_quantity: minQuantity,
      movement,
    });
  },

  /**
   * Search products by name or SKU
   */
  async search(query: string): Promise<Product[]> {
    try {
      return await apiClient.get<Product[]>(`/products?search=${encodeURIComponent(query)}`);
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  },

  /**
   * Get products by category
   */
  async getByCategory(category: string): Promise<Product[]> {
    try {
      return await apiClient.get<Product[]>(`/products?category=${encodeURIComponent(category)}`);
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }
  },

  /**
   * Get low stock products
   */
  async getLowStock(): Promise<Product[]> {
    try {
      return await apiClient.get<Product[]>('/products/low-stock');
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    }
  },

  /**
   * Get stock movements
   */
  async getMovements(limit = 200, filters?: MovementFilters): Promise<StockMovement[]> {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (filters?.type && filters.type !== 'all')   params.set('type', filters.type);
      if (filters?.start_date)  params.set('start_date', filters.start_date);
      if (filters?.end_date)    params.set('end_date', filters.end_date);
      if (filters?.search)      params.set('search', filters.search);
      return await apiClient.get<StockMovement[]>(`/products/movements?${params}`);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      return [];
    }
  },
};
