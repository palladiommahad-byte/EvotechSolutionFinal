import { useState, useRef, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Download, ArrowUpDown, Package, Eye, Edit, Trash2, FolderPlus, FileText, FileSpreadsheet, ChevronDown, Upload, X } from 'lucide-react';
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
  const [customCategories, setCustomCategories] = useState<string[]>([]);
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

  const productCategories = [...new Set(products.map(p => p.category))];
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
      setCustomCategories([...customCategories, trimmedName]);
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
      // Set the new category as the active filter
      setCategoryFilter(trimmedName);
      toast({
        title: t('inventory.categoryCreated'),
        description: t('inventory.categoryCreatedDescription', { name: trimmedName }),
        variant: "success",
      });
    }
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
    if (!newProductData.name || !newProductData.sku || !newProductData.category) {
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

                  const res = await fetch('http://localhost:3000/api/reports/export', {
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

      {/* Filters */}
      <div className="card-elevated p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
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
                <Button variant="default" size="icon" className="w-[42px]" title={t('inventory.addCategory')}>
                  <FolderPlus className="w-4 h-4" />
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
      <div className="bg-white dark:bg-card rounded-lg shadow-sm border border-border">
        <Accordion type="multiple" defaultValue={categoryFilter === 'all' ? allCategories : [categoryFilter]} className="w-full">
          {(categoryFilter === 'all' ? allCategories : [categoryFilter]).map((category) => {
            const categoryProducts = filteredProducts.filter(p => p.category === category);

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
              <AccordionItem key={category} value={category} className="border rounded-lg mb-4 overflow-hidden">
                <AccordionTrigger className="hover:no-underline px-4 py-3 bg-muted/50 hover:bg-muted/70 transition-colors data-[state=open]:bg-primary/5 data-[state=open]:text-primary mb-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-white dark:bg-card shadow-sm">
                      {category === 'Uncategorized' ? <Package className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                    </div>
                    <span className="font-semibold text-lg tracking-tight">{category}</span>
                    <Badge variant="secondary" className="ml-2 font-mono">
                      {categoryProducts.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  {/* Vertical Scroll for > 6 items (approx 50px per row * 6 = 300px + header) */}
                  <div className="border-t max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-muted/5 sticky top-0 z-10 backdrop-blur-sm">
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox
                              checked={categoryProducts.length > 0 && categoryProducts.every(p => selectedProducts.has(p.id))}
                              onCheckedChange={() => handleSelectCategory(categoryProducts.map(p => p.id))}
                              aria-label="Select all in category"
                            />
                          </TableHead>
                          <TableHead className="min-w-[100px]">{t('inventory.sku')}</TableHead>
                          <TableHead className="min-w-[200px]">{t('inventory.productName')}</TableHead>
                          <TableHead className="min-w-[120px]">{t('inventory.category')}</TableHead>
                          <TableHead className="text-center">{t('common.quantity')}</TableHead>
                          <TableHead className="text-center">{t('inventory.minStock')}</TableHead>
                          <TableHead className="text-right">{t('inventory.unitPrice')}</TableHead>
                          <TableHead className="text-center">{t('common.status')}</TableHead>
                          <TableHead className="text-center">{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center"> {/* Updated colSpan to 9 */}
                              <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <Package className="w-8 h-8 mb-2 opacity-50" />
                                <p>{t('common.noData')}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          categoryProducts.map((product) => (
                            <TableRow key={product.id} data-state={selectedProducts.has(product.id) && "selected"}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedProducts.has(product.id)}
                                  onCheckedChange={() => handleSelectProduct(product.id)}
                                  aria-label={`Select ${product.name}`}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm" title={product.sku}>{product.sku}</TableCell>
                              <TableCell className="font-medium" title={product.name}>{product.name}</TableCell>
                              <TableCell className="text-muted-foreground" title={product.category}>{product.category}</TableCell>
                              <TableCell className="text-center font-medium number-cell">
                                {getProductStock(product.id)} {t(`unit.${(product.unit || 'Piece').toLowerCase()}`)}
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground number-cell">
                                {product.minStock} {t(`unit.${(product.unit || 'Piece').toLowerCase()}`)}
                              </TableCell>
                              <TableCell className="text-right font-medium number-cell">
                                <CurrencyDisplay amount={product.price} />
                              </TableCell>
                              <TableCell className="text-center">{getStatusBadge(product.status)}</TableCell>
                              <TableCell className="w-[120px]">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewProduct(product)}
                                    title={t('inventory.viewProduct')}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditProduct(product)}
                                    title={t('inventory.editProduct')}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteProduct(product)}
                                    title={t('inventory.deleteProduct')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
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

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <Package className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">
              {products.filter(p => {
                const stock = getProductStock(p.id);
                return stock > 0 && stock >= p.minStock;
              }).length}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('inventory.inStock')} {!isAllWarehouses ? `(${warehouseInfo?.city})` : `(${t('common.all')})`}
            </p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <Package className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">
              {products.filter(p => {
                const stock = getProductStock(p.id);
                return stock > 0 && stock < p.minStock;
              }).length}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('inventory.lowStock')} {!isAllWarehouses ? `(${warehouseInfo?.city})` : `(${t('common.all')})`}
            </p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Package className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">
              {products.filter(p => getProductStock(p.id) === 0).length}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('inventory.outOfStock')} {!isAllWarehouses ? `(${warehouseInfo?.city})` : `(${t('common.all')})`}
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
                    <Select
                      value={editFormData.unit || 'Piece'}
                      onValueChange={(value) => setEditFormData({ ...editFormData, unit: value })}
                    >
                      <SelectTrigger id="edit-unit">
                        <SelectValue placeholder={t('inventory.unit')} />
                      </SelectTrigger>
                      <SelectContent>
                        {productUnits.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <Select
                  value={newProductData.unit || 'Piece'}
                  onValueChange={(value) => setNewProductData({ ...newProductData, unit: value })}
                >
                  <SelectTrigger id="new-unit">
                    <SelectValue placeholder={t('inventory.unit')} />
                  </SelectTrigger>
                  <SelectContent>
                    {productUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="new-price">{t('inventory.unitPrice')} (DH)</Label>
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
              disabled={!newProductData.name || !newProductData.sku || !newProductData.category || products.some(p => p.sku === newProductData.sku)}
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
    </div>
  );
};
