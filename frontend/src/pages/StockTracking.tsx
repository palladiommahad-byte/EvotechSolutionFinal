import { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, MapPin, Building2, Check, LayoutGrid, List, History, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWarehouse, type Warehouse } from '@/contexts/WarehouseContext';
import { useProducts, StockItem } from '@/contexts/ProductsContext';
import { productsService, StockMovement } from '@/services/products.service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const getStockLevel = (stock: number, minStock: number) => {
  if (stock === 0) return 'out';
  if (stock < minStock) return 'low';
  if (stock < minStock * 1.5) return 'medium';
  return 'good';
};

const StockIndicator = ({ level }: { level: 'out' | 'low' | 'medium' | 'good' }) => {
  const styles = {
    out: 'bg-destructive',
    low: 'bg-warning',
    medium: 'bg-info',
    good: 'bg-success',
  };

  return (
    <div className={cn('w-3 h-3 rounded-full', styles[level])} />
  );
};

export const StockTracking = () => {
  const { t } = useTranslation();
  const { activeWarehouse, setActiveWarehouse, warehouseInfo, isAllWarehouses, warehouses } = useWarehouse();
  const { stockItems, products } = useProducts();
  const [viewMode, setViewMode] = useState<'grid' | 'all'>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  useEffect(() => {
    const loadMovements = async () => {
      setIsLoadingMovements(true);
      try {
        const data = await productsService.getMovements(50);
        setMovements(data);
      } catch (error) {
        console.error('Failed to load movements', error);
      } finally {
        setIsLoadingMovements(false);
      }
    };
    loadMovements();
  }, []);

  const getTotalStock = (item: StockItem) => {
    // If viewing all warehouses, use the main product stock which is updated by the database trigger
    // verifying specifically against the products list to get the most up-to-date global stock
    const product = products.find(p => p.id === item.id);
    if (product) {
      return product.stock;
    }
    // Fallback if product not found (shouldn't happen) or for warehouse-specific sums if needed manually
    return item.stock.marrakech + item.stock.agadir + item.stock.ouarzazate;
  };

  const getWarehouseStock = (item: StockItem, warehouse: string) => {
    return item.stock[warehouse as keyof typeof item.stock] || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Stock Tracking</h1>
          <p className="text-muted-foreground">
            Monitor stock levels {isAllWarehouses ? 'across all warehouses' : `at ${warehouseInfo?.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-section">
            <Button
              variant={layoutMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayoutMode('grid')}
              className="h-8 px-3"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={layoutMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayoutMode('list')}
              className="h-8 px-3"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Select value={activeWarehouse} onValueChange={(value) => {
            setActiveWarehouse(value as Warehouse);
            if (value === 'all') {
              setViewMode('all');
            } else {
              setViewMode('grid');
            }
          }}>
            <SelectTrigger className="w-[200px] border-border bg-section hover:bg-section/80">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <SelectValue placeholder="Select warehouse" className="font-medium text-foreground">
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
                      )} title="All Warehouses">
                        All Warehouses
                      </span>
                      <span className="text-xs text-muted-foreground truncate leading-tight mt-0.5" title="View all locations">
                        View all locations
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
        </div>
      </div>

      <Tabs defaultValue="levels" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="levels" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            {t('stockTracking.tabs.levels')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            {t('stockTracking.tabs.history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="levels" className="space-y-6">

          {/* Legend */}
          <div className="card-elevated p-4">
            <div className="flex flex-wrap items-center gap-6">
              <span className="text-sm font-medium text-foreground">{t('stockTracking.legend.label')}</span>
              <div className="flex items-center gap-2">
                <StockIndicator level="good" />
                <span className="text-sm text-muted-foreground">{t('stockTracking.legend.good')}</span>
              </div>
              <div className="flex items-center gap-2">
                <StockIndicator level="medium" />
                <span className="text-sm text-muted-foreground">{t('stockTracking.legend.medium')}</span>
              </div>
              <div className="flex items-center gap-2">
                <StockIndicator level="low" />
                <span className="text-sm text-muted-foreground">{t('stockTracking.legend.low')}</span>
              </div>
              <div className="flex items-center gap-2">
                <StockIndicator level="out" />
                <span className="text-sm text-muted-foreground">{t('stockTracking.legend.outOfStock')}</span>
              </div>
            </div>
          </div>

          {/* Stock Display - Grid or List Layout */}
          {layoutMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {stockItems.map((item) => {
                const currentStock = (isAllWarehouses || viewMode === 'all')
                  ? getTotalStock(item)
                  : getWarehouseStock(item, activeWarehouse);
                const level = getStockLevel(currentStock, item.minStock);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "card-elevated p-4 transition-all duration-200 hover:shadow-elevated animate-fade-in",
                      level === 'out' && 'border-destructive/50',
                      level === 'low' && 'border-warning/50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <StockIndicator level={level} />
                      </div>
                      {item.movement === 'up' && <TrendingUp className="w-4 h-4 text-success" />}
                      {item.movement === 'down' && <TrendingDown className="w-4 h-4 text-destructive" />}
                    </div>

                    <h4 className="font-medium text-foreground mb-1 line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-muted-foreground mb-3">{item.sku} • {item.category}</p>

                    {(isAllWarehouses || viewMode === 'all') ? (
                      <div className="space-y-2">
                        {warehouses.map((warehouse) => {
                          const warehouseStock = getWarehouseStock(item, warehouse.id);
                          const warehouseLevel = getStockLevel(warehouseStock, item.minStock);
                          return (
                            <div key={warehouse.id} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{warehouse.city}</span>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-medium",
                                  warehouseLevel === 'out' && 'text-destructive',
                                  warehouseLevel === 'low' && 'text-warning',
                                  warehouseLevel === 'medium' && 'text-info',
                                  warehouseLevel === 'good' && 'text-success',
                                )}>
                                  {warehouseStock}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                          <span className="font-medium text-foreground">{t('stockTracking.card.total')}</span>
                          <span className="font-bold text-foreground">{getTotalStock(item)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('stockTracking.table.stock')}</span>
                        <span className={cn(
                          "text-2xl font-heading font-bold",
                          level === 'out' && 'text-destructive',
                          level === 'low' && 'text-warning',
                          level === 'medium' && 'text-info',
                          level === 'good' && 'text-success',
                        )}>
                          {currentStock}
                        </span>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t('stockTracking.card.minStock')} {item.minStock}</span>
                        {level === 'out' && (
                          <span className="flex items-center gap-1 text-destructive">
                            <XCircle className="w-3 h-3" />
                            {t('stockTracking.card.reorder')}
                          </span>
                        )}
                        {level === 'low' && (
                          <span className="flex items-center gap-1 text-warning">
                            <AlertTriangle className="w-3 h-3" />
                            {t('stockTracking.card.low')}
                          </span>
                        )}
                        {(level === 'good' || level === 'medium') && (
                          <span className="flex items-center gap-1 text-success">
                            <CheckCircle className="w-3 h-3" />
                            {t('stockTracking.card.ok')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-elevated overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="data-table-header hover:bg-section">
                    <TableHead className="w-[50px]">{t('stockTracking.table.status')}</TableHead>
                    <TableHead>{t('stockTracking.table.product')}</TableHead>
                    <TableHead>{t('inventory.sku')}</TableHead>
                    <TableHead>{t('stockTracking.table.category')}</TableHead>
                    {(isAllWarehouses || viewMode === 'all') ? (
                      <>
                        <TableHead className="text-center">Marrakech</TableHead>
                        <TableHead className="text-center">Agadir</TableHead>
                        <TableHead className="text-center">Ouarzazate</TableHead>
                        <TableHead className="text-center font-bold">{t('stockTracking.card.total')}</TableHead>
                      </>
                    ) : (
                      <TableHead className="text-center">{t('stockTracking.table.stock')}</TableHead>
                    )}
                    <TableHead className="text-center">{t('stockTracking.table.minStock')}</TableHead>
                    <TableHead className="text-center">{t('stockTracking.table.movement')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.map((item) => {
                    const currentStock = (isAllWarehouses || viewMode === 'all')
                      ? getTotalStock(item)
                      : getWarehouseStock(item, activeWarehouse);
                    const level = getStockLevel(currentStock, item.minStock);

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          "hover:bg-section/50 transition-colors",
                          level === 'out' && 'bg-destructive/5',
                          level === 'low' && 'bg-warning/5'
                        )}
                      >
                        <TableCell>
                          <StockIndicator level={level} />
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{item.sku}</TableCell>
                        <TableCell className="text-muted-foreground">{item.category}</TableCell>
                        {(isAllWarehouses || viewMode === 'all') ? (
                          <>
                            {warehouses.map((warehouse) => {
                              const warehouseStock = getWarehouseStock(item, warehouse.id);
                              const warehouseLevel = getStockLevel(warehouseStock, item.minStock);
                              return (
                                <TableCell key={warehouse.id} className="text-center">
                                  <span className={cn(
                                    "font-medium",
                                    warehouseLevel === 'out' && 'text-destructive',
                                    warehouseLevel === 'low' && 'text-warning',
                                    warehouseLevel === 'medium' && 'text-info',
                                    warehouseLevel === 'good' && 'text-success',
                                  )}>
                                    {warehouseStock}
                                  </span>
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">
                              <span className="font-bold text-foreground">{getTotalStock(item)}</span>
                            </TableCell>
                          </>
                        ) : (
                          <TableCell className="text-center">
                            <span className={cn(
                              "font-bold text-lg",
                              level === 'out' && 'text-destructive',
                              level === 'low' && 'text-warning',
                              level === 'medium' && 'text-info',
                              level === 'good' && 'text-success',
                            )}>
                              {currentStock}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-center text-muted-foreground">{item.minStock}</TableCell>
                        <TableCell className="text-center">
                          {item.movement === 'up' && (
                            <TrendingUp className="w-4 h-4 text-success mx-auto" />
                          )}
                          {item.movement === 'down' && (
                            <TrendingDown className="w-4 h-4 text-destructive mx-auto" />
                          )}
                          {item.movement === 'stable' && (
                            <div className="w-4 h-4 mx-auto flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="data-table-header hover:bg-section">
                  <TableHead>{t('stockTracking.table.date')}</TableHead>
                  <TableHead>{t('stockTracking.table.product')}</TableHead>
                  <TableHead>{t('stockTracking.table.type')}</TableHead>
                  <TableHead>{t('stockTracking.table.reference')}</TableHead>
                  <TableHead>{t('stockTracking.table.description')}</TableHead>
                  <TableHead className="text-right">{t('stockTracking.table.quantity')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMovements ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('stockTracking.table.loading')}
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('stockTracking.table.noMovements')}
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id} className="hover:bg-section/50">
                      <TableCell className="text-sm">
                        {new Date(movement.created_at).toLocaleDateString()}
                        <span className="text-xs text-muted-foreground block">
                          {new Date(movement.created_at).toLocaleTimeString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {movement.product_name || t('stockTracking.table.unknownProduct')}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          {movement.product_sku}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          movement.type.includes('delivery') ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                            movement.type.includes('initial') ? "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300" :
                              "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                        )}>
                          {movement.type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {movement.reference_id || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.description}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn(
                          "flex items-center justify-end gap-1 font-bold",
                          movement.quantity > 0 ? "text-success" : "text-destructive"
                        )}>
                          {movement.quantity > 0 ? (
                            <ArrowRight className="w-3 h-3" />
                          ) : (
                            <ArrowLeft className="w-3 h-3" />
                          )}
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
