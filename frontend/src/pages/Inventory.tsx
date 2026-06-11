import { useState, useRef, ChangeEvent, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Download, ArrowUpDown, Package, Eye, Edit, Trash2, FolderPlus, FileText, FileSpreadsheet, ChevronDown, Upload, X, TrendingUp, AlertTriangle, BarChart2, Activity, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useWarehouse, type Warehouse } from '@/contexts/WarehouseContext';
import { useProducts, Product } from '@/contexts/ProductsContext';
import { formatMAD } from '@/lib/moroccan-utils';
import { MapPin, Building2, Check } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { generateInventoryPDF } from '@/lib/pdf-generator';
import { generateInventoryExcel } from '@/lib/excel-generator';
import { generateInventoryCSV } from '@/lib/csv-generator';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

const productUnits = ['Piece', 'kg', 'Liter', 'Box', 'Pack', 'Meter', 'Square Meter', 'Cubic Meter', 'Ton', 'Gram'] as const;

export const Inventory = () => {
  const { t } = useTranslation();
  const { warehouseInfo, isAllWarehouses, activeWarehouse, setActiveWarehouse, warehouses } = useWarehouse();
  const { toast } = useToast();
  const { products, stockItems, addProduct, updateProduct, deleteProduct, updateStockItem } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState<'all' | 'new' | 'old'>('all');
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('inventory_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Product>>({});
  const [editWarehouseStock, setEditWarehouseStock] = useState<Record<string, number>>({});
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [newProductData, setNewProductData] = useState<Partial<Product>>({
    sku: '',
    name: '',
    description: '',
    category: '',
    unit: 'Piece',
    stock: 0,
    minStock: 3,
    price: 0,
    status: 'in_stock',
    lastMovement: new Date().toISOString().split('T')[0],
  });
  const [warehouseStock, setWarehouseStock] = useState<Record<string, number>>({});

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectCategory = (productIds: string[]) => {
    const newSelected = new Set(selectedProducts);
    const allSelected = productIds.every(id => newSelected.has(id));

    if (allSelected) {
      productIds.forEach(id => newSelected.delete(id));
    } else {
      productIds.forEach(id => newSelected.add(id));
    }
    setSelectedProducts(newSelected);
  };


  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;

    // Filter by new/old products (based on last movement date - new: last 30 days, old: older than 30 days)
    let matchesAge = true;
    if (ageFilter !== 'all') {
      const lastMovementDate = new Date(product.lastMovement);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (ageFilter === 'new') {
        matchesAge = lastMovementDate >= thirtyDaysAgo;
      } else if (ageFilter === 'old') {
        matchesAge = lastMovementDate < thirtyDaysAgo;
      }
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesAge;
  });

  const getStatusBadge = (status: Product['status']) => {
    switch (status) {
      case 'in_stock':
        return <StatusBadge status="success">{t('inventory.inStock')}</StatusBadge>;
      case 'low_stock':
        return <StatusBadge status="warning">{t('inventory.lowStock')}</StatusBadge>;
      case 'out_of_stock':
        return <StatusBadge status="danger">{t('inventory.outOfStock')}</StatusBadge>;
    }
  };

  const productCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const allCategories = [...new Set([...productCategories, ...customCategories])].sort();

  // Get stock for a product based on selected warehouse
  const getProductStock = (productId: string): number => {
    const stockItem = stockItems.find(si => si.id === productId);
    if (!stockItem) {
      // Fallback to product stock if no stock item found
      const product = products.find(p => p.id === productId);
      return product?.stock || 0;
    }

    if (isAllWarehouses) {
      // Return total stock across all warehouses
      return Object.values(stockItem.stock).reduce((sum, qty) => sum + qty, 0);
    } else {
      // Return stock for specific warehouse
      return stockItem.stock[activeWarehouse as string] || 0;
    }
  };

  const handleCreateCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (trimmedName && !allCategories.includes(trimmedName)) {
      const updated = [...customCategories, trimmedName];
      setCustomCategories(updated);
      localStorage.setItem('inventory_custom_categories', JSON.stringify(updated));
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
      setCategoryFilter(trimmedName);
      toast({
        title: t('inventory.categoryCreated'),
        description: t('inventory.categoryCreatedDescription', { name: trimmedName }),
        variant: "success",
      });
    }
  };

  const handleRenameCategory = () => {
    const trimmed = renameValue.trim();
    if (!trimmed || !renamingCategory || trimmed === renamingCategory) {
      setRenamingCategory(null);
      return;
    }
    // Update customCategories list
    const updatedCustom = customCategories.map(c => c === renamingCategory ? trimmed : c);
    setCustomCategories(updatedCustom);
    localStorage.setItem('inventory_custom_categories', JSON.stringify(updatedCustom));
    // Update all products that use this category
    products
      .filter(p => p.category === renamingCategory)
      .forEach(p => updateProduct(p.id, { ...p, category: trimmed }));
    if (categoryFilter === renamingCategory) setCategoryFilter(trimmed);
    setRenamingCategory(null);
    setRenameValue('');
    toast({ title: 'Catégorie renommée', description: `"${renamingCategory}" → "${trimmed}"`, variant: 'success' });
  };

  const handleDeleteCategory = (category: string) => {
    const updatedCustom = customCategories.filter(c => c !== category);
    setCustomCategories(updatedCustom);
    localStorage.setItem('inventory_custom_categories', JSON.stringify(updatedCustom));
    // Move products in this category to Uncategorized
    products
      .filter(p => p.category === category)
      .forEach(p => updateProduct(p.id, { ...p, category: 'Uncategorized' }));
    if (categoryFilter === category) setCategoryFilter('all');
    setDeletingCategory(null);
    toast({ title: 'Catégorie supprimée', description: `"${category}" a été supprimée.`, variant: 'destructive' });
  };

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      category: product.category,
      unit: product.unit || 'Piece',
      stock: product.stock,
      minStock: product.minStock,
      price: product.price,
      status: product.status,
      lastMovement: product.lastMovement,
      image: product.image,
    });

    // Populate warehouse stock for editing
    const stockItem = stockItems.find(si => si.id === product.id);
    if (stockItem) {
      setEditWarehouseStock({ ...stockItem.stock });
    } else {
      setEditWarehouseStock({});
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: t('inventory.imageSizeError'),
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        if (isEdit) {
          setEditFormData({ ...editFormData, image: imageUrl });
        } else {
          setNewProductData({ ...newProductData, image: imageUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData({ ...editFormData, image: undefined });
    } else {
      setNewProductData({ ...newProductData, image: undefined });
    }
  };

  const handleSaveProduct = async () => {
    if (editingProduct) {
      if (!editFormData.name || !editFormData.sku || !editFormData.category) {
        toast({
          title: t('common.error'),
          description: t('inventory.addValidProductData'),
          variant: "destructive",
        });
        return;
      }
      const productName = editFormData.name || editingProduct.name;
      try {
        await updateProduct(editingProduct.id, {
          name: editFormData.name,
          sku: editFormData.sku,
          category: editFormData.category,
          unit: editFormData.unit,
          description: editFormData.description,
          minStock: editFormData.minStock,
          price: editFormData.price,
          status: editFormData.status,
          lastMovement: editFormData.lastMovement,
          image: editFormData.image,
        });

        // Update stock items
        if (Object.keys(editWarehouseStock).length > 0) {
          await updateStockItem(editingProduct.id, {
            stock: editWarehouseStock,
            minStock: editFormData.minStock,
          });
        }

        setEditingProduct(null);
        setEditWarehouseStock({});
        toast({
          title: t('inventory.productUpdated'),
          description: t('inventory.productUpdatedDescription', { name: editFormData.name }),
          variant: "success",
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: t('common.error'),
          description: t('common.errorOccurred'), // Assuming generic error key exists or t('inventory.failedToUpdate')
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateProduct = () => {
    setIsCreatingProduct(true);
    setNewProductData({
      sku: '',
      name: '',
      description: '',
      category: '',
      unit: 'Piece',
      stock: 0,
      minStock: 3,
      price: 0,
      status: 'in_stock',
      lastMovement: new Date().toISOString().split('T')[0],
      image: undefined,
    });
  };

  const handleSaveNewProduct = async () => {
    if (!newProductData.name || !newProductData.sku || !newProductData.category || !newProductData.price) {
      toast({
        title: t('common.error'),
        description: t('inventory.addValidProductData'),
        variant: "destructive",
      });
      return;
    }

    // Check if SKU already exists
    if (products.some(p => p.sku === newProductData.sku)) {
      toast({
        title: t('common.error'),
        description: t('inventory.skuExists'),
        variant: "destructive",
      });
      return;
    }

    // Calculate total stock from warehouse allocations
    const totalStock = Object.values(warehouseStock).reduce((sum, qty) => sum + qty, 0);

    const newProduct: Omit<Product, 'id'> = {
      sku: newProductData.sku || '',
      name: newProductData.name || '',
      description: newProductData.description || '',
      category: newProductData.category || '',
      unit: newProductData.unit || 'Piece',
      stock: totalStock,
      minStock: newProductData.minStock || 3,
      price: newProductData.price || 0,
      status: 'in_stock', // Will be calculated by the service
      lastMovement: newProductData.lastMovement || new Date().toISOString().split('T')[0],
      image: newProductData.image || undefined,
    };

    try {
      await addProduct(newProduct, warehouseStock);
      setIsCreatingProduct(false);
      setNewProductData({
        sku: '',
        name: '',
        description: '',
        category: '',
        unit: 'Piece',
        stock: 0,
        minStock: 3,
        price: 0,
        status: 'in_stock',
        lastMovement: new Date().toISOString().split('T')[0],
        image: undefined,
      });
      setWarehouseStock({});
      toast({
        title: t('inventory.productCreated'),
        description: t('inventory.productCreatedDescription', { name: newProduct.name }),
        variant: "success",
      });
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product);
  };

  const confirmDeleteProduct = async () => {
    if (deletingProduct) {
      const productName = deletingProduct.name;
      try {
        await deleteProduct(deletingProduct.id);
        setDeletingProduct(null);
        toast({
          title: t('inventory.productDeleted'),
          description: t('inventory.productDeletedDescription', { name: productName }),
          variant: "destructive",
        });
      } catch (error) {
        console.error('Error deleting product:', error);
        toast({
          title: t('common.error'),
          description: t('common.errorOccurred'),
          variant: "destructive",
        });
      }
    }
  };

  // ── Inventory KPI & chart data ─────────────────────────────────────────
  const inStockCount   = products.filter(p => { const s = getProductStock(p.id); return s > 0 && s >= (p.minStock || 0); }).length;
  const lowStockCount  = products.filter(p => { const s = getProductStock(p.id); return s > 0 && s < (p.minStock || 0); }).length;
  const outStockCount  = products.filter(p => getProductStock(p.id) === 0).length;
  const totalInventoryValue = products.reduce((acc, p) => acc + p.price * getProductStock(p.id), 0);
  const alertCount = lowStockCount + outStockCount;

  const categoryBarData = useMemo(() => {
    const colors = ['#6366f1','#8b5cf6','#a78bfa','#06b6d4','#3b82f6','#10b981','#f59e0b','#f97316'];
    return allCategories
      .map((cat, i) => ({
        name: cat.length > 14 ? cat.slice(0, 13) + '…' : cat,
        stock: products.filter(prd => prd.category === cat).reduce((s, prd) => s + getProductStock(prd.id), 0),
        color: colors[i % colors.length],
      }))
      .filter(d => d.stock > 0)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 8);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, allCategories, stockItems, activeWarehouse]);

  const statusPieData = [
    { name: 'En stock',     value: inStockCount,  color: '#10b981' },
    { name: 'Stock faible', value: lowStockCount, color: '#f59e0b' },
    { name: 'Rupture',      value: outStockCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{t('inventory.title')}</h1>
          <p className="text-muted-foreground">
            {isAllWarehouses
              ? t('inventory.manageProductsAcrossAll')
              : t('inventory.manageProductsAt', { name: warehouseInfo?.name })}
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="gap-2">
                <Download className="w-4 h-4" />
                {t('common.export')}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => generateInventoryPDF(products)}>
                <FileText className="w-4 h-4 mr-2" />
                {t('documents.exportAsPDF')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateInventoryExcel(products)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('documents.exportAsExcel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateInventoryCSV(products)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('documents.exportAsCSV')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                try {
                  const token = localStorage.getItem('auth_token');
                  if (!token) {
                    toast({ title: 'Error', description: 'Authentication required', variant: 'destructive' });
                    return;
                  }

                  const res = await fetch('/api/reports/export', {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });

                  if (!res.ok) throw new Error('Export failed');

                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);

                  toast({ title: 'Success', description: 'Report downloaded successfully', variant: 'success' });
                } catch (e) {
                  console.error(e);
                  toast({ title: 'Error', description: 'Failed to download report', variant: 'destructive' });
                }
              }}>
                <FileSpreadsheet className="w-4 h-4 mr-2 text-primary" />
                Styled Export (Beta)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="gap-2 btn-primary-gradient" onClick={handleCreateProduct}>
            <Plus className="w-4 h-4" />
            {t('inventory.addProduct')}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-foreground leading-none">{products.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total articles</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-foreground leading-none truncate">{formatMAD(totalInventoryValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Valeur du stock</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">{inStockCount}</p>
                <p className="text-xs text-muted-foreground mt-1">En stock</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 leading-none">{alertCount}</p>
                <p className="text-xs text-muted-foreground mt-1">En alerte</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart — stock by category */}
          <div className="lg:col-span-2 card-elevated p-5">
            <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Stock par catégorie
            </p>
            {categoryBarData.length > 0 ? (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBarData} layout="vertical" margin={{ top: 0, right: 24, left: 4, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={95} />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                      contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                      formatter={(v) => [`${v} unités`, 'Stock']}
                    />
                    <Bar dataKey="stock" radius={[0, 4, 4, 0]}>
                      {categoryBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée disponible</div>
            )}
          </div>

          {/* Donut chart — status distribution */}
          <div className="card-elevated p-5">
            <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Répartition du statut
            </p>
            {statusPieData.length > 0 ? (
              <div className="flex items-center justify-center gap-3" style={{ height: 220 }}>
                <PieChart width={130} height={130}>
                  <Pie
                    data={statusPieData}
                    cx={65}
                    cy={65}
                    innerRadius={36}
                    outerRadius={58}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                    formatter={(v, name) => [`${v} articles`, name]}
                  />
                </PieChart>
                <div className="flex flex-col gap-3">
                  {statusPieData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                      <span className="text-xs text-muted-foreground">{entry.name}</span>
                      <span className="text-xs font-bold text-foreground ml-auto pl-2">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Aucune donnée disponible</div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-elevated p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('inventory.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={activeWarehouse} onValueChange={(value) => setActiveWarehouse(value as Warehouse)}>
              <SelectTrigger className="w-[200px] bg-primary text-primary-foreground border-primary hover:bg-primary/90 [&>svg]:text-primary-foreground">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MapPin className="w-4 h-4 text-primary-foreground flex-shrink-0" />
                  <SelectValue placeholder="Select warehouse" className="font-medium text-primary-foreground">
                    {isAllWarehouses ? 'All Warehouses' : warehouseInfo?.city}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="w-[280px] p-1">
                <div className="px-3 py-2 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  Select Warehouse
                </div>

                {/* All Warehouses Option */}
                <SelectItem
                  value="all"
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-2.5 my-0.5",
                    isAllWarehouses && "bg-primary/5",
                    "[&>span:first-child]:hidden"
                  )}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isAllWarehouses ? "bg-primary/10" : "bg-muted/50"
                    )}>
                      <Building2 className={cn(
                        "w-4 h-4 transition-colors",
                        isAllWarehouses ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex items-center justify-between flex-1 min-w-0 gap-2">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={cn(
                          "font-semibold text-sm leading-tight truncate",
                          isAllWarehouses ? "text-primary" : "text-foreground"
                        )} title={t('common.allWarehouses')}>
                          {t('common.allWarehouses')}
                        </span>
                        <span className="text-xs text-muted-foreground truncate leading-tight mt-0.5" title={t('common.viewAllLocations')}>
                          {t('common.viewAllLocations')}
                        </span>
                      </div>
                      {isAllWarehouses && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </SelectItem>

                {/* Individual Warehouses */}
                {warehouses.map((warehouse) => {
                  const isActive = warehouse.id === activeWarehouse;
                  return (
                    <SelectItem
                      key={warehouse.id}
                      value={warehouse.id}
                      className={cn(
                        "cursor-pointer rounded-md px-3 py-2.5 my-0.5",
                        isActive && "bg-primary/5",
                        "[&>span:first-child]:hidden"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                          isActive ? "bg-primary/10" : "bg-muted/50"
                        )}>
                          <Building2 className={cn(
                            "w-4 h-4 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="flex items-center justify-between flex-1 min-w-0 gap-2">
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className={cn(
                              "font-semibold text-sm leading-tight truncate",
                              isActive ? "text-primary" : "text-foreground"
                            )} title={warehouse.city}>
                              {warehouse.city}
                            </span>
                            <span className="text-xs text-muted-foreground truncate leading-tight mt-0.5" title={warehouse.name}>
                              {warehouse.name}
                            </span>
                          </div>
                          {isActive && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-primary text-primary-foreground border-primary hover:bg-primary/90 [&>svg]:text-primary-foreground">
                <SelectValue placeholder={t('inventory.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.allCategories')}</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ageFilter} onValueChange={(value) => setAgeFilter(value as 'all' | 'new' | 'old')}>
              <SelectTrigger className="w-[180px] bg-primary text-primary-foreground border-primary hover:bg-primary/90 [&>svg]:text-primary-foreground">
                <SelectValue placeholder={t('inventory.productAge')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.allProducts')}</SelectItem>
                <SelectItem value="new">{t('inventory.newProducts')}</SelectItem>
                <SelectItem value="old">{t('inventory.oldProducts')}</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <FolderPlus className="w-4 h-4" />
                  {t('inventory.addCategory')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('inventory.createCategoryTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('inventory.createCategoryDescription')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">{t('inventory.categoryName')}</Label>
                    <Input
                      id="category-name"
                      placeholder={t('inventory.categoryPlaceholder')}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateCategory();
                        }
                      }}
                      autoFocus
                    />
                    {newCategoryName.trim() && allCategories.includes(newCategoryName.trim()) && (
                      <p className="text-sm text-destructive mt-1">{t('inventory.categoryExists')}</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsCategoryDialogOpen(false);
                    setNewCategoryName('');
                  }}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || allCategories.includes(newCategoryName.trim())}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('common.create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-primary text-primary-foreground border-primary hover:bg-primary/90 [&>svg]:text-primary-foreground">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inventory.allStatuses')}</SelectItem>
              <SelectItem value="in_stock">{t('inventory.inStock')}</SelectItem>
              <SelectItem value="low_stock">{t('inventory.lowStock')}</SelectItem>
              <SelectItem value="out_of_stock">{t('inventory.outOfStock')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="space-y-3">
        <Accordion type="multiple" defaultValue={categoryFilter === 'all' ? allCategories : [categoryFilter]} className="w-full space-y-3">
          {(categoryFilter === 'all' ? allCategories : [categoryFilter]).map((category) => {
            const categoryProducts = filteredProducts.filter(p => p.category === category);
            const catInStock   = categoryProducts.filter(p => { const s = getProductStock(p.id); return s > 0 && s >= (p.minStock || 0); }).length;
            const catAlert     = categoryProducts.filter(p => { const s = getProductStock(p.id); return s === 0 || s < (p.minStock || 0); }).length;
            const catAllOut    = catInStock === 0 && catAlert === categoryProducts.length && categoryProducts.length > 0;
            const accentColor  = catAlert === 0 ? '#10b981' : catAllOut ? '#ef4444' : '#f59e0b';

            // If searching or filtering by status/age, and no products match in this category,
            // we typically hide the category. However, user requested "show as dropdown even if it empty".
            // If categoryFilter is specific, we ALWAYS show it.
            // If categoryFilter is 'all', we show it if it has products OR if search/filters are empty?
            // User said: "if uuser create a category it shouuld show as dropdown even if it empty"
            // Let's go with: Always show if categoryFilter is specific.
            // If 'all', and search is active, hide empty ones?
            // Decision: To satisfy "show ... even if it empty", we show it.
            // But showing 20 empty categories when searching for "Apple" is bad UX.
            // Compromise: If searchQuery is present, hide empty categories. If no search query, show all.
            if (searchQuery && categoryProducts.length === 0) return null;

            return (
              <AccordionItem key={category} value={category} className="border border-border rounded-xl overflow-hidden shadow-sm" style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}>
                <AccordionTrigger className="hover:no-underline px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors data-[state=open]:bg-primary/5 data-[state=open]:border-b data-[state=open]:border-border mb-0">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-background shadow-sm border border-border">
                      {category === 'Uncategorized' ? <Package className="w-4 h-4 text-muted-foreground" /> : <FolderPlus className="w-4 h-4 text-primary" />}
                    </div>
                    <span className="font-semibold text-base tracking-tight">{category}</span>
                    <Badge variant="secondary" className="ml-1 font-mono text-xs">
                      {categoryProducts.length}
                    </Badge>
                    {categoryProducts.length > 0 && (
                      <div className="flex items-center gap-2 ml-2">
                        {catInStock > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {catInStock}
                          </span>
                        )}
                        {catAlert > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {catAlert}
                          </span>
                        )}
                      </div>
                    )}
                    {category !== 'Uncategorized' && (
                      <div className="ml-auto flex items-center gap-1 mr-2" onClick={e => e.stopPropagation()}>
                        <button
                          className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
                          title="Renommer"
                          onClick={() => { setRenamingCategory(category); setRenameValue(category); }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          title="Supprimer"
                          onClick={() => setDeletingCategory(category)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="border-t border-border max-h-[420px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-muted/30 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent border-b border-border">
                          <TableHead className="w-[40px] py-2">
                            <Checkbox
                              checked={categoryProducts.length > 0 && categoryProducts.every(p => selectedProducts.has(p.id))}
                              onCheckedChange={() => handleSelectCategory(categoryProducts.map(p => p.id))}
                              aria-label="Select all in category"
                            />
                          </TableHead>
                          <TableHead className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[100px]">{t('inventory.sku')}</TableHead>
                          <TableHead className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[200px]">{t('inventory.productName')}</TableHead>
                          <TableHead className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[100px]">{t('inventory.category')}</TableHead>
                          <TableHead className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">{t('common.quantity')}</TableHead>
                          <TableHead className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">{t('inventory.minStock')}</TableHead>
                          <TableHead className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">{t('inventory.unitPrice')}</TableHead>
                          <TableHead className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">{t('common.status')}</TableHead>
                          <TableHead className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center">
                              <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <Package className="w-8 h-8 mb-2 opacity-50" />
                                <p>{t('common.noData')}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          categoryProducts.map((product) => {
                            const qtyStock = getProductStock(product.id);
                            const qtyColor = qtyStock === 0
                              ? 'text-red-600 dark:text-red-400 font-bold'
                              : qtyStock < (product.minStock || 0)
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-emerald-600 dark:text-emerald-400 font-semibold';
                            const sDot = product.status === 'in_stock'
                              ? { dot: 'bg-emerald-500', cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800' }
                              : product.status === 'low_stock'
                              ? { dot: 'bg-amber-500', cls: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800' }
                              : { dot: 'bg-red-500', cls: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800' };
                            const sLabel = product.status === 'in_stock' ? t('inventory.inStock') : product.status === 'low_stock' ? t('inventory.lowStock') : t('inventory.outOfStock');
                            return (
                              <TableRow key={product.id} data-state={selectedProducts.has(product.id) && "selected"} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="py-2.5">
                                  <Checkbox
                                    checked={selectedProducts.has(product.id)}
                                    onCheckedChange={() => handleSelectProduct(product.id)}
                                    aria-label={`Select ${product.name}`}
                                  />
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <span className="inline-block bg-muted/60 border border-border/50 rounded px-2 py-0.5 font-mono text-xs text-foreground/80" title={product.sku}>{product.sku}</span>
                                </TableCell>
                                <TableCell className="py-2.5 font-semibold text-sm" title={product.name}>{product.name}</TableCell>
                                <TableCell className="py-2.5">
                                  <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full" title={product.category}>{product.category}</span>
                                </TableCell>
                                <TableCell className={`py-2.5 text-center tabular-nums text-sm ${qtyColor}`}>
                                  {qtyStock} <span className="text-xs font-normal opacity-70">{t(`unit.${(product.unit || 'Piece').toLowerCase()}`)}</span>
                                </TableCell>
                                <TableCell className="py-2.5 text-center text-muted-foreground text-sm tabular-nums">
                                  {product.minStock} <span className="text-xs opacity-70">{t(`unit.${(product.unit || 'Piece').toLowerCase()}`)}</span>
                                </TableCell>
                                <TableCell className="py-2.5 text-right font-semibold text-sm tabular-nums">
                                  <CurrencyDisplay amount={product.price} />
                                </TableCell>
                                <TableCell className="py-2.5 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${sDot.cls}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sDot.dot}`} />
                                    {sLabel}
                                  </span>
                                </TableCell>
                                <TableCell className="py-2.5 w-[108px]">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button
                                      className="p-1.5 rounded-md text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition-colors"
                                      onClick={() => handleViewProduct(product)}
                                      title={t('inventory.viewProduct')}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      className="p-1.5 rounded-md text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 transition-colors"
                                      onClick={() => handleEditProduct(product)}
                                      title={t('inventory.editProduct')}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors"
                                      onClick={() => handleDeleteProduct(product)}
                                      title={t('inventory.deleteProduct')}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Filtered summary footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
          <div className="w-1 self-stretch rounded-full bg-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {filteredProducts.filter(p => { const s = getProductStock(p.id); return s > 0 && s >= (p.minStock || 0); }).length}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">
              {t('inventory.inStock')} {!isAllWarehouses ? `· ${warehouseInfo?.city}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <div className="w-1 self-stretch rounded-full bg-amber-500 flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
              {filteredProducts.filter(p => { const s = getProductStock(p.id); return s > 0 && s < (p.minStock || 0); }).length}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              {t('inventory.lowStock')} {!isAllWarehouses ? `· ${warehouseInfo?.city}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3">
          <div className="w-1 self-stretch rounded-full bg-red-500 flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-red-700 dark:text-red-400">
              {filteredProducts.filter(p => getProductStock(p.id) === 0).length}
            </p>
            <p className="text-xs text-red-600 dark:text-red-500">
              {t('inventory.outOfStock')} {!isAllWarehouses ? `· ${warehouseInfo?.city}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* View Product Dialog */}
      <Dialog open={!!viewingProduct} onOpenChange={(open) => !open && setViewingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{t('inventory.productDetails')}</DialogTitle>
                <DialogDescription>
                  {t('inventory.completeInformationFor', { name: viewingProduct.name })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Product Image */}
                {viewingProduct.image && (
                  <div className="flex justify-center">
                    <img
                      src={viewingProduct.image}
                      alt={viewingProduct.name}
                      className="max-h-64 max-w-full rounded-lg object-contain border border-border"
                    />
                  </div>
                )}
                {/* Product Header */}
                <div className="flex items-start gap-4 pb-4 border-b border-border">
                  <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-heading font-bold text-foreground mb-1">
                      {viewingProduct.name}
                    </h3>
                    <p className="text-sm font-mono text-muted-foreground">
                      SKU: {viewingProduct.sku}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(viewingProduct.status)}
                  </div>
                </div>

                {/* Product Information Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('inventory.productId')}</Label>
                    <p className="font-medium font-mono text-sm mt-1">{viewingProduct.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('inventory.sku')}</Label>
                    <p className="font-medium font-mono text-sm mt-1">{viewingProduct.sku}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('inventory.category')}</Label>
                    <p className="font-medium mt-1">{viewingProduct.category}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('inventory.unit')}</Label>
                    <p className="font-medium mt-1">{viewingProduct.unit || 'Piece'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('common.status')}</Label>
                    <div className="mt-1">{getStatusBadge(viewingProduct.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('inventory.unitPrice')}</Label>
                    <p className="font-medium mt-1">
                      <CurrencyDisplay amount={viewingProduct.price} />
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">{t('inventory.lastMovement')}</Label>
                    <p className="font-medium mt-1">{formatDate(viewingProduct.lastMovement)}</p>
                  </div>
                </div>

                {/* Product Description */}
                {viewingProduct.description && (
                  <div className="border-t border-border pt-4">
                    <Label className="text-muted-foreground text-sm">{t('common.description')}</Label>
                    <p className="font-medium mt-2 text-foreground whitespace-pre-wrap">
                      {viewingProduct.description}
                    </p>
                  </div>
                )}

                {/* Stock Information */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-foreground mb-3">{t('inventory.stockQuantity')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="card-elevated p-4">
                      <Label className="text-muted-foreground text-sm">
                        {t('inventory.inStock')} {isAllWarehouses ? `(${t('common.total')})` : `(${warehouseInfo?.city})`}
                      </Label>
                      <p className="text-2xl font-heading font-bold text-foreground mt-1">
                        {getProductStock(viewingProduct.id)} {viewingProduct.unit || 'Piece'}
                      </p>
                    </div>
                    <div className="card-elevated p-4">
                      <Label className="text-muted-foreground text-sm">{t('inventory.minStock')}</Label>
                      <p className="text-2xl font-heading font-bold text-warning mt-1">
                        {viewingProduct.minStock} {viewingProduct.unit || 'Piece'}
                      </p>
                    </div>
                    <div className="col-span-2 space-y-2 mt-2">
                      <Label className="text-muted-foreground text-sm">{t('common.warehouse')}</Label>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {warehouses.map((wh) => {
                          const stockItem = stockItems.find(si => si.id === viewingProduct.id);
                          const whStock = stockItem?.stock[wh.id as keyof typeof stockItem.stock] || 0;
                          return (
                            <div key={wh.id} className="p-2 border border-border rounded">
                              <p className="text-xs text-muted-foreground">{wh.city}</p>
                              <p className="font-medium">{whStock} {viewingProduct.unit || 'Piece'}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {getProductStock(viewingProduct.id) < viewingProduct.minStock && (
                    <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-sm text-warning font-medium">
                        ⚠️ Stock is below minimum threshold
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current stock: {getProductStock(viewingProduct.id)} / Minimum required: {viewingProduct.minStock}
                      </p>
                    </div>
                  )}
                  {getProductStock(viewingProduct.id) === 0 && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ {t('inventory.outOfStockAlert')} {!isAllWarehouses ? `${t('common.atWarehouse')} ${warehouseInfo?.city}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                {/* Total Value */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <Label className="text-muted-foreground">
                      {t('common.totalValue')} {!isAllWarehouses ? `(${warehouseInfo?.city})` : ''}
                    </Label>
                    <p className="text-xl font-heading font-bold text-primary">
                      <CurrencyDisplay amount={viewingProduct.price * getProductStock(viewingProduct.id)} />
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingProduct(null)}>
                  {t('common.close')}
                </Button>
                <Button className="btn-primary-gradient" onClick={() => {
                  handleEditProduct(viewingProduct);
                  setViewingProduct(null);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  {t('inventory.editProduct')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{t('inventory.editProduct')}</DialogTitle>
                <DialogDescription>
                  {t('inventory.productUpdatedDescription', { name: editingProduct.name })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">{t('inventory.productName')}</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder={t('inventory.productName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-sku">{t('inventory.sku')}</Label>
                    <Input
                      id="edit-sku"
                      value={editFormData.sku || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                      placeholder={t('inventory.sku')}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">{t('inventory.category')} *</Label>
                    <Select
                      value={editFormData.category || ''}
                      onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}
                    >
                      <SelectTrigger id="edit-category">
                        <SelectValue placeholder={t('common.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-unit">{t('inventory.unit')}</Label>
                    <div className="flex gap-2">
                      <Select
                        value={(editFormData.unit && productUnits.includes(editFormData.unit as typeof productUnits[number])) ? editFormData.unit : 'Custom'}
                        onValueChange={(value) => {
                          if (value === 'Custom') {
                            setEditFormData({ ...editFormData, unit: '' });
                          } else {
                            setEditFormData({ ...editFormData, unit: value });
                          }
                        }}
                      >
                        <SelectTrigger id="edit-unit" className={!(editFormData.unit && productUnits.includes(editFormData.unit as typeof productUnits[number])) ? "w-[120px]" : "w-full"}>
                          <SelectValue placeholder={t('inventory.unit')} />
                        </SelectTrigger>
                        <SelectContent>
                          {productUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                          <SelectItem value="Custom">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      {!(editFormData.unit && productUnits.includes(editFormData.unit as typeof productUnits[number])) && (
                        <Input
                          placeholder={t('common.custom') || 'Unité custom'}
                          value={editFormData.unit || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                          className="flex-1"
                          autoFocus
                        />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-description">{t('common.description')}</Label>
                    <Textarea
                      id="edit-description"
                      value={editFormData.description || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      placeholder={t('common.description')}
                      rows={3}
                    />
                  </div>
                  {/* Product Image Upload */}
                  <div className="space-y-2 col-span-2">
                    <Label>Product Image</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      {editFormData.image ? (
                        <div className="space-y-4">
                          <div className="relative inline-block">
                            <img
                              src={editFormData.image}
                              alt="Product preview"
                              className="max-h-48 max-w-full rounded-lg mx-auto object-contain"
                            />
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editImageInputRef.current?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {t('common.changeImage')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveImage(true)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              {t('common.remove')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-16 h-16 rounded-lg bg-primary/10 mx-auto flex items-center justify-center">
                            <Upload className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{t('inventory.image')}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('common.imageSizeLimit', { size: `5 ${t('common.mb')}` })}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editImageInputRef.current?.click()}
                          >
                            {t('common.select')}
                          </Button>
                        </div>
                      )}
                      <input
                        ref={editImageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, true)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">{t('common.status')}</Label>
                    <Select
                      value={editFormData.status || 'in_stock'}
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value as Product['status'] })}
                    >
                      <SelectTrigger id="edit-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_stock">{t('inventory.inStock')}</SelectItem>
                        <SelectItem value="low_stock">{t('inventory.lowStock')}</SelectItem>
                        <SelectItem value="out_of_stock">{t('inventory.outOfStock')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4 col-span-2 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">{t('common.warehouse')}</Label>
                      <span className="text-sm text-muted-foreground">
                        {t('common.total')}: {Object.values(editWarehouseStock).reduce((sum, val) => sum + (val || 0), 0)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {warehouses.map((warehouse) => (
                        <div key={warehouse.id} className="space-y-2 p-3 border border-border rounded-lg bg-card/50">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <Label htmlFor={`edit-stock-${warehouse.id}`} className="font-medium text-sm">{warehouse.city}</Label>
                          </div>
                          <Input
                            id={`edit-stock-${warehouse.id}`}
                            type="number"
                            min="0"
                            value={editWarehouseStock[warehouse.id] || 0}
                            onChange={(e) => setEditWarehouseStock({
                              ...editWarehouseStock,
                              [warehouse.id]: parseInt(e.target.value) || 0
                            })}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-min-stock">{t('inventory.minStock')}</Label>
                    <Input
                      id="edit-min-stock"
                      type="number"
                      min="0"
                      value={editFormData.minStock || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, minStock: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">{t('inventory.unitPrice')} (DH)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFormData.price || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-last-movement">{t('inventory.lastMovement')}</Label>
                    <Input
                      id="edit-last-movement"
                      type="date"
                      value={editFormData.lastMovement || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, lastMovement: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditingProduct(null);
                  setEditFormData({});
                }}>
                  {t('common.cancel')}
                </Button>
                <Button
                  className="btn-primary-gradient"
                  onClick={handleSaveProduct}
                  disabled={!editFormData.name || !editFormData.sku || !editFormData.category}
                >
                  {t('common.saveChanges')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Product Dialog */}
      <Dialog open={isCreatingProduct} onOpenChange={setIsCreatingProduct}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('inventory.addProduct')}</DialogTitle>
            <DialogDescription>
              {t('inventory.manageProductsAcrossAll')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">{t('inventory.productName')} *</Label>
                <Input
                  id="new-name"
                  value={newProductData.name || ''}
                  onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                  placeholder={t('inventory.productName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-sku">{t('inventory.sku')} *</Label>
                <Input
                  id="new-sku"
                  value={newProductData.sku || ''}
                  onChange={(e) => setNewProductData({ ...newProductData, sku: e.target.value })}
                  placeholder={t('inventory.sku')}
                  className="font-mono"
                />
                {newProductData.sku && products.some(p => p.sku === newProductData.sku) && (
                  <p className="text-sm text-destructive mt-1">{t('inventory.skuExists')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-category">{t('inventory.category')} *</Label>
                <Select
                  value={newProductData.category || ''}
                  onValueChange={(value) => setNewProductData({ ...newProductData, category: value })}
                >
                  <SelectTrigger id="new-category">
                    <SelectValue placeholder={t('common.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-unit">{t('inventory.unit')}</Label>
                <div className="flex gap-2">
                  <Select
                    value={(newProductData.unit && productUnits.includes(newProductData.unit as typeof productUnits[number])) ? newProductData.unit : 'Custom'}
                    onValueChange={(value) => {
                      if (value === 'Custom') {
                        setNewProductData({ ...newProductData, unit: '' });
                      } else {
                        setNewProductData({ ...newProductData, unit: value });
                      }
                    }}
                  >
                    <SelectTrigger id="new-unit" className={!(newProductData.unit && productUnits.includes(newProductData.unit as typeof productUnits[number])) ? "w-[120px]" : "w-full"}>
                      <SelectValue placeholder={t('inventory.unit')} />
                    </SelectTrigger>
                    <SelectContent>
                      {productUnits.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                      <SelectItem value="Custom">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  {!(newProductData.unit && productUnits.includes(newProductData.unit as typeof productUnits[number])) && (
                    <Input
                      placeholder={t('common.custom') || 'Unité custom'}
                      value={newProductData.unit || ''}
                      onChange={(e) => setNewProductData({ ...newProductData, unit: e.target.value })}
                      className="flex-1"
                      autoFocus
                    />
                  )}
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="new-description">{t('common.description')}</Label>
                <Textarea
                  id="new-description"
                  value={newProductData.description || ''}
                  onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
                  placeholder={t('common.description')}
                  rows={3}
                />
              </div>
              {/* Product Image Upload */}
              <div className="space-y-2 col-span-2">
                <Label>{t('inventory.image')}</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  {newProductData.image ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img
                          src={newProductData.image}
                          alt="Product preview"
                          className="max-h-48 max-w-full rounded-lg mx-auto object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => productImageInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {t('common.changeImage')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveImage(false)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          {t('common.remove')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-lg bg-primary/10 mx-auto flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t('inventory.image')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('common.imageSizeLimit', { size: `5 ${t('common.mb')}` })}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => productImageInputRef.current?.click()}
                      >
                        {t('common.select')}
                      </Button>
                    </div>
                  )}
                  <input
                    ref={productImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, false)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-status">{t('common.status')}</Label>
                <Select
                  value={newProductData.status || 'in_stock'}
                  onValueChange={(value) => setNewProductData({ ...newProductData, status: value as Product['status'] })}
                >
                  <SelectTrigger id="new-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">{t('inventory.inStock')}</SelectItem>
                    <SelectItem value="low_stock">{t('inventory.lowStock')}</SelectItem>
                    <SelectItem value="out_of_stock">{t('inventory.outOfStock')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-min-stock">{t('inventory.minStock')}</Label>
                <Input
                  id="new-min-stock"
                  type="number"
                  min="0"
                  value={newProductData.minStock || 0}
                  onChange={(e) => setNewProductData({ ...newProductData, minStock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-price">{t('inventory.unitPrice')} (DH) *</Label>
                <Input
                  id="new-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProductData.price || 0}
                  onChange={(e) => setNewProductData({ ...newProductData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-last-movement">{t('inventory.lastMovement')}</Label>
                <Input
                  id="new-last-movement"
                  type="date"
                  value={newProductData.lastMovement || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewProductData({ ...newProductData, lastMovement: e.target.value })}
                />
              </div>
            </div>

            {/* Warehouse Stock Allocation Section */}
            <div className="col-span-2 space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t('common.warehouse')}</Label>
                <span className="text-sm text-muted-foreground">
                  {t('common.total')}: {Object.values(warehouseStock).reduce((sum, val) => sum + (val || 0), 0)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {warehouses.map((warehouse) => (
                  <div key={warehouse.id} className="space-y-2 p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <Label htmlFor={`stock-${warehouse.id}`} className="font-medium">{warehouse.city}</Label>
                    </div>
                    <Input
                      id={`stock-${warehouse.id}`}
                      type="number"
                      min="0"
                      value={warehouseStock[warehouse.id] || ''}
                      onChange={(e) => setWarehouseStock({
                        ...warehouseStock,
                        [warehouse.id]: parseInt(e.target.value) || 0
                      })}
                      placeholder="0"
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('inventory.warehouseAllocationHelp')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreatingProduct(false);
              setNewProductData({
                sku: '',
                name: '',
                description: '',
                category: '',
                unit: 'Piece',
                stock: 0,
                minStock: 3,
                price: 0,
                status: 'in_stock',
                lastMovement: new Date().toISOString().split('T')[0],
                image: undefined,
              });
              setWarehouseStock({});
            }}>
              {t('common.cancel')}
            </Button>
            <Button
              className="btn-primary-gradient"
              onClick={handleSaveNewProduct}
              disabled={!newProductData.name || !newProductData.sku || !newProductData.category || !newProductData.price || products.some(p => p.sku === newProductData.sku)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory.confirmDeleteDescription', { name: deletingProduct?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Category Dialog */}
      <Dialog open={!!renamingCategory} onOpenChange={open => { if (!open) setRenamingCategory(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renommer la catégorie</DialogTitle>
            <DialogDescription>Nouveau nom pour "{renamingCategory}"</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameCategory(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingCategory(null)}>Annuler</Button>
            <Button onClick={handleRenameCategory} disabled={!renameValue.trim() || renameValue.trim() === renamingCategory}>
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={open => { if (!open) setDeletingCategory(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              La catégorie "{deletingCategory}" sera supprimée. Les produits qu'elle contient seront déplacés vers "Uncategorized".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCategory && handleDeleteCategory(deletingCategory)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
