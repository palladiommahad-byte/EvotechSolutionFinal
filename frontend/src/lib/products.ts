export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  unit?: string;  // Unit of measure (e.g. Piece, kg, m²) — from products.unit column
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastMovement: string;
}

// Mock data removed - all products now come from database via ProductsContext
