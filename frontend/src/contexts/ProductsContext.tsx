import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { productsService, Product as ServiceProduct, StockItem as ServiceStockItem } from '@/services/products.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// UI-friendly Product interface (camelCase)
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit?: string;
  stock: number;
  minStock: number;
  price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastMovement: string;
  image?: string;
}

// UI-friendly StockItem interface
export interface StockItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: Record<string, number>; // Dynamic warehouse IDs
  minStock: number;
  movement: 'up' | 'down' | 'stable';
}

interface ProductsContextType {
  products: Product[];
  stockItems: StockItem[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, 'id'>, warehouseStock?: Record<string, number>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateStockItem: (id: string, stockItem: Partial<StockItem>) => Promise<void>;
  refreshProducts: () => Promise<void>;
  validateStockItems: (items: Array<{ productId?: string; quantity: number }>) => { isValid: boolean; warnings: string[] };
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

// Helper function to convert ServiceProduct to UI Product
const toUIProduct = (product: ServiceProduct): Product => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  description: product.description,
  category: product.category || '',
  unit: product.unit,
  stock: product.stock || 0,
  minStock: product.minStock || product.min_stock || 0,
  price: product.price,
  status: product.status || 'in_stock',
  lastMovement: product.lastMovement || product.last_movement || new Date().toISOString().split('T')[0],
  image: product.image,
});

// Helper function to convert products + stock_items to UI StockItem
const toUIStockItem = (product: ServiceProduct, stockItems: ServiceStockItem[]): StockItem => {
  const productStockItems = stockItems.filter(si => si.product_id === product.id);

  // Aggregate stock by warehouse
  const stockByWarehouse: Record<string, number> = {};

  let movement: 'up' | 'down' | 'stable' = 'stable';
  let minStock = product.minStock || product.min_stock || 0;

  productStockItems.forEach(si => {
    stockByWarehouse[si.warehouse_id] = si.quantity || 0;

    if (si.movement) {
      movement = si.movement;
    }
    if (si.min_quantity !== undefined) {
      minStock = si.min_quantity;
    }
  });

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category || '',
    stock: stockByWarehouse,
    minStock,
    movement,
  };
};

export const ProductsProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  // Fetch products
  const { data: productsData = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsService.getAll(),
    staleTime: 30000, // 30 seconds
  });

  // Fetch stock items
  const { data: stockItemsData = [], isLoading: isLoadingStockItems } = useQuery({
    queryKey: ['stockItems'],
    queryFn: () => productsService.getAllStockItems(),
    staleTime: 30000,
  });

  const isLoading = isLoadingProducts || isLoadingStockItems;

  // Convert to UI format
  const products: Product[] = useMemo(
    () => productsData.map(toUIProduct),
    [productsData]
  );

  const stockItems: StockItem[] = useMemo(
    () => productsData.map(product => toUIStockItem(product, stockItemsData)),
    [productsData, stockItemsData]
  );

  // Mutation for adding a product
  const addProductMutation = useMutation({
    mutationFn: async ({
      product,
      warehouseStock,
    }: {
      product: Omit<Product, 'id'>,
      warehouseStock?: Record<string, number>
    }) => {
      // Create product
      const createdProduct = await productsService.create({
        ...product,
        min_stock: product.minStock,
        last_movement: product.lastMovement,
        category: product.category || '',
      });

      // Create stock_items if warehouse stock provided
      if (warehouseStock) {
        for (const [warehouseId, quantity] of Object.entries(warehouseStock)) {
          if (quantity > 0) {
            await productsService.updateStockItem(
              createdProduct.id,
              warehouseId,
              quantity,
              product.minStock
            );
          }
        }
      }

      return createdProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
    },
  });

  // Mutation for updating a product
  const updateProductMutation = useMutation({
    mutationFn: ({ id, product }: { id: string; product: Partial<Product> }) =>
      productsService.update(id, {
        ...product,
        min_stock: product.minStock,
        minStock: product.minStock,
        last_movement: product.lastMovement,
        lastMovement: product.lastMovement,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
    },
  });

  // Mutation for deleting a product
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
    },
  });

  const addProduct = useCallback(
    async (
      product: Omit<Product, 'id'>,
      warehouseStock?: Record<string, number>
    ) => {
      await addProductMutation.mutateAsync({ product, warehouseStock });
    },
    [addProductMutation]
  );

  const updateProduct = useCallback(
    async (id: string, product: Partial<Product>) => {
      await updateProductMutation.mutateAsync({ id, product });
    },
    [updateProductMutation]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await deleteProductMutation.mutateAsync(id);
    },
    [deleteProductMutation]
  );

  const updateStockItem = useCallback(
    async (id: string, stockItem: Partial<StockItem>) => {
      // Update stock_items for each warehouse
      if (stockItem.stock) {
        let totalStock = 0;

        for (const [warehouseId, quantity] of Object.entries(stockItem.stock)) {
          await productsService.updateStockItem(
            id,
            warehouseId,
            quantity,
            stockItem.minStock,
            stockItem.movement
          );
          totalStock += quantity;
        }

        // Update total stock in products table
        await productsService.updateStock(id, totalStock);
      } else {
        // Update individual fields if stock not provided
        if (stockItem.minStock !== undefined) {
          await productsService.update(id, { minStock: stockItem.minStock, min_stock: stockItem.minStock });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
    },
    [queryClient]
  );

  const refreshProducts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    await queryClient.invalidateQueries({ queryKey: ['stockItems'] });
  }, [queryClient]);

  const validateStockItems = useCallback(
    (items: Array<{ productId?: string; quantity: number }>) => {
      const warnings: string[] = [];

      for (const item of items) {
        if (item.productId) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const currentStock = product.stock || 0;
            const minStock = product.minStock || 0;
            const projectedStock = currentStock - item.quantity;

            if (projectedStock <= minStock) {
              warnings.push(
                `${product.name} (Stock: ${currentStock}, Min: ${minStock}, Result: ${projectedStock})`
              );
            }
          }
        }
      }

      return {
        isValid: warnings.length === 0,
        warnings,
      };
    },
    [products]
  );

  return (
    <ProductsContext.Provider
      value={{
        products,
        stockItems,
        isLoading,
        addProduct,
        updateProduct,
        deleteProduct,
        updateStockItem,
        refreshProducts,
        validateStockItems,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};
