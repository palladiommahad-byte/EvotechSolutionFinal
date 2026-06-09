import { useState, useEffect, useMemo } from 'react';
import {
  Package, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown,
  MapPin, Building2, Check, LayoutGrid, List, History, ArrowUp, ArrowDown,
  Search, Filter, FileDown, Activity, ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWarehouse, type Warehouse } from '@/contexts/WarehouseContext';
import { useProducts, StockItem } from '@/contexts/ProductsContext';
import { productsService, StockMovement } from '@/services/products.service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

// ─── Stock level helpers ──────────────────────────────────────────────────────

const getStockLevel = (stock: number, minStock: number) => {
  if (stock === 0) return 'out';
  if (stock < minStock) return 'low';
  if (stock < minStock * 1.5) return 'medium';
  return 'good';
};

const StockIndicator = ({ level }: { level: 'out' | 'low' | 'medium' | 'good' }) => {
  const styles = { out: 'bg-destructive', low: 'bg-warning', medium: 'bg-info', good: 'bg-success' };
  return <div className={cn('w-3 h-3 rounded-full', styles[level])} />;
};

// ─── Movement type helpers ────────────────────────────────────────────────────

const MOVEMENT_TYPES: Record<string, { label: string; color: string; bg: string; dot: string; isIn: boolean }> = {
  in:               { label: 'Entrée',               color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500', isIn: true  },
  purchase_received:{ label: 'Réception achat',      color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500', isIn: true  },
  initial:          { label: 'Stock initial',         color: 'text-blue-700',    bg: 'bg-blue-100',    dot: 'bg-blue-500',    isIn: true  },
  adjustment_in:    { label: 'Ajustement +',          color: 'text-teal-700',    bg: 'bg-teal-100',    dot: 'bg-teal-500',    isIn: true  },
  transfer_in:      { label: 'Transfert entrant',     color: 'text-indigo-700',  bg: 'bg-indigo-100',  dot: 'bg-indigo-500',  isIn: true  },
  out:              { label: 'Sortie',                color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500',     isIn: false },
  sale:             { label: 'Vente',                 color: 'text-orange-700',  bg: 'bg-orange-100',  dot: 'bg-orange-500',  isIn: false },
  adjustment_out:   { label: 'Ajustement −',          color: 'text-rose-700',    bg: 'bg-rose-100',    dot: 'bg-rose-500',    isIn: false },
  transfer_out:     { label: 'Transfert sortant',     color: 'text-purple-700',  bg: 'bg-purple-100',  dot: 'bg-purple-500',  isIn: false },
};

const getTypeCfg = (type: string, quantity: number) => {
  const cfg = MOVEMENT_TYPES[type];
  if (cfg) return cfg;
  const isIn = quantity > 0;
  return isIn
    ? { label: type.replace(/_/g, ' '), color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500', isIn: true }
    : { label: type.replace(/_/g, ' '), color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500',     isIn: false };
};

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return {
    date: dt.toLocaleDateString('fr-MA'),
    time: dt.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }),
  };
};

const exportCsv = (movements: StockMovement[]) => {
  const header = ['Date','Heure','Produit','SKU','Catégorie','Type','Quantité','Référence','Description'];
  const rows = movements.map(m => {
    const { date, time } = fmtDate(m.created_at);
    const cfg = getTypeCfg(m.type, m.quantity);
    return [
      date, time, m.product_name || '', m.product_sku || '', m.product_category || '',
      cfg.label, m.quantity, m.reference_id || '', m.description || '',
    ];
  });
  const csv = [header, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `mouvements-stock-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
};

// ─── Main component ───────────────────────────────────────────────────────────

export const StockTracking = () => {
  const { t } = useTranslation();
  const { activeWarehouse, setActiveWarehouse, warehouseInfo, isAllWarehouses, warehouses } = useWarehouse();
  const { stockItems, products } = useProducts();

  const [viewMode, setViewMode]     = useState<'grid' | 'all'>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Movement state
  const [movements, setMovements]           = useState<StockMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate]   = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); return d.toISOString().slice(0, 10);
  });

  const loadMovements = async () => {
    setIsLoadingMovements(true);
    try {
      const data = await productsService.getMovements(200, {
        type: filterType !== 'all' ? filterType : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search.trim() || undefined,
      });
      setMovements(data);
    } catch (error) {
      console.error('Failed to load movements', error);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMovements(); }, []);

  const filteredMovements = useMemo(() => {
    let list = movements;
    if (filterType !== 'all') list = list.filter(m => m.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        (m.product_name || '').toLowerCase().includes(q) ||
        (m.product_sku  || '').toLowerCase().includes(q) ||
        (m.description  || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [movements, filterType, search]);

  const totalIn  = filteredMovements.filter(m => getTypeCfg(m.type, m.quantity).isIn).reduce((s, m) => s + Math.abs(m.quantity), 0);
  const totalOut = filteredMovements.filter(m => !getTypeCfg(m.type, m.quantity).isIn).reduce((s, m) => s + Math.abs(m.quantity), 0);

  // Stock levels helpers
  const getTotalStock = (item: StockItem) => {
    const product = products.find(p => p.id === item.id);
    return product ? product.stock : Object.values(item.stock).reduce((s, q) => s + q, 0);
  };
  const getWarehouseStock = (item: StockItem, warehouse: string) => item.stock[warehouse] || 0;

  // Unique types for filter dropdown
  const uniqueTypes = useMemo(() => [...new Set(movements.map(m => m.type))], [movements]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{t('stockTracking.title')}</h1>
          <p className="text-muted-foreground">
            {t('stockTracking.monitorStockLevels')}{' '}
            {isAllWarehouses ? t('stockTracking.acrossAllWarehouses') : `${t('stockTracking.at')} ${warehouseInfo?.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-section">
            <Button variant={layoutMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setLayoutMode('grid')} className="h-8 px-3">
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={layoutMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setLayoutMode('list')} className="h-8 px-3">
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Select value={activeWarehouse} onValueChange={(value) => {
            setActiveWarehouse(value as Warehouse);
            setViewMode(value === 'all' ? 'all' : 'grid');
          }}>
            <SelectTrigger className="w-[200px] border-border bg-section hover:bg-section/80">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <SelectValue placeholder="Select warehouse">
                  {isAllWarehouses ? 'All Warehouses' : warehouseInfo?.city}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="w-[280px] p-1">
              <div className="px-3 py-2 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                Select Warehouse
              </div>
              <SelectItem value="all" className={cn('cursor-pointer rounded-md px-3 py-2.5 my-0.5', isAllWarehouses && 'bg-primary/5', '[&>span:first-child]:hidden')}>
                <div className="flex items-center gap-3 w-full">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', isAllWarehouses ? 'bg-primary/10' : 'bg-muted/50')}>
                    <Building2 className={cn('w-4 h-4', isAllWarehouses ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="flex items-center justify-between flex-1 gap-2">
                    <div className="flex flex-col">
                      <span className={cn('font-semibold text-sm', isAllWarehouses ? 'text-primary' : 'text-foreground')}>All Warehouses</span>
                      <span className="text-xs text-muted-foreground">View all locations</span>
                    </div>
                    {isAllWarehouses && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </div>
                </div>
              </SelectItem>
              {warehouses.map((warehouse) => {
                const isActive = warehouse.id === activeWarehouse;
                return (
                  <SelectItem key={warehouse.id} value={warehouse.id} className={cn('cursor-pointer rounded-md px-3 py-2.5 my-0.5', isActive && 'bg-primary/5', '[&>span:first-child]:hidden')}>
                    <div className="flex items-center gap-3 w-full">
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', isActive ? 'bg-primary/10' : 'bg-muted/50')}>
                        <Building2 className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex items-center justify-between flex-1 gap-2">
                        <div className="flex flex-col">
                          <span className={cn('font-semibold text-sm', isActive ? 'text-primary' : 'text-foreground')}>{warehouse.city}</span>
                          <span className="text-xs text-muted-foreground">{warehouse.name}</span>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
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
            <Package className="w-4 h-4" />{t('stockTracking.tabs.levels')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />{t('stockTracking.tabs.history')}
          </TabsTrigger>
        </TabsList>

        {/* ── STOCK LEVELS TAB ── */}
        <TabsContent value="levels" className="space-y-6">
          <div className="card-elevated p-4">
            <div className="flex flex-wrap items-center gap-6">
              <span className="text-sm font-medium text-foreground">{t('stockTracking.legend.label')}</span>
              {(['good','medium','low','out'] as const).map(level => (
                <div key={level} className="flex items-center gap-2">
                  <StockIndicator level={level} />
                  <span className="text-sm text-muted-foreground">{t(`stockTracking.legend.${level === 'out' ? 'outOfStock' : level}`)}</span>
                </div>
              ))}
            </div>
          </div>

          {layoutMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {stockItems.map((item) => {
                const currentStock = (isAllWarehouses || viewMode === 'all') ? getTotalStock(item) : getWarehouseStock(item, activeWarehouse);
                const level = getStockLevel(currentStock, item.minStock);
                return (
                  <div key={item.id} className={cn('card-elevated p-4 transition-all duration-200 hover:shadow-elevated animate-fade-in', level === 'out' && 'border-destructive/50', level === 'low' && 'border-warning/50')}>
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
                          const wStock = getWarehouseStock(item, warehouse.id);
                          const wLevel = getStockLevel(wStock, item.minStock);
                          return (
                            <div key={warehouse.id} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{warehouse.city}</span>
                              <span className={cn('font-medium', wLevel === 'out' && 'text-destructive', wLevel === 'low' && 'text-warning', wLevel === 'medium' && 'text-info', wLevel === 'good' && 'text-success')}>
                                {wStock}
                              </span>
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
                        <span className={cn('text-2xl font-heading font-bold', level === 'out' && 'text-destructive', level === 'low' && 'text-warning', level === 'medium' && 'text-info', level === 'good' && 'text-success')}>
                          {currentStock}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t('stockTracking.card.minStock')} {item.minStock}</span>
                        {level === 'out' && <span className="flex items-center gap-1 text-destructive"><XCircle className="w-3 h-3" />{t('stockTracking.card.reorder')}</span>}
                        {level === 'low' && <span className="flex items-center gap-1 text-warning"><AlertTriangle className="w-3 h-3" />{t('stockTracking.card.low')}</span>}
                        {(level === 'good' || level === 'medium') && <span className="flex items-center gap-1 text-success"><CheckCircle className="w-3 h-3" />{t('stockTracking.card.ok')}</span>}
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
                        {warehouses.map(w => <TableHead key={w.id} className="text-center">{w.city}</TableHead>)}
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
                    const currentStock = (isAllWarehouses || viewMode === 'all') ? getTotalStock(item) : getWarehouseStock(item, activeWarehouse);
                    const level = getStockLevel(currentStock, item.minStock);
                    return (
                      <TableRow key={item.id} className={cn('hover:bg-section/50 transition-colors', level === 'out' && 'bg-destructive/5', level === 'low' && 'bg-warning/5')}>
                        <TableCell><StockIndicator level={level} /></TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{item.sku}</TableCell>
                        <TableCell className="text-muted-foreground">{item.category}</TableCell>
                        {(isAllWarehouses || viewMode === 'all') ? (
                          <>
                            {warehouses.map(w => {
                              const wStock = getWarehouseStock(item, w.id);
                              const wLevel = getStockLevel(wStock, item.minStock);
                              return (
                                <TableCell key={w.id} className="text-center">
                                  <span className={cn('font-medium', wLevel === 'out' && 'text-destructive', wLevel === 'low' && 'text-warning', wLevel === 'medium' && 'text-info', wLevel === 'good' && 'text-success')}>
                                    {wStock}
                                  </span>
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center"><span className="font-bold text-foreground">{getTotalStock(item)}</span></TableCell>
                          </>
                        ) : (
                          <TableCell className="text-center">
                            <span className={cn('font-bold text-lg', level === 'out' && 'text-destructive', level === 'low' && 'text-warning', level === 'medium' && 'text-info', level === 'good' && 'text-success')}>
                              {currentStock}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-center text-muted-foreground">{item.minStock}</TableCell>
                        <TableCell className="text-center">
                          {item.movement === 'up'     && <TrendingUp className="w-4 h-4 text-success mx-auto" />}
                          {item.movement === 'down'   && <TrendingDown className="w-4 h-4 text-destructive mx-auto" />}
                          {item.movement === 'stable' && <div className="w-4 h-4 mx-auto flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /></div>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── MOVEMENTS HISTORY TAB ── */}
        <TabsContent value="history" className="space-y-5">

          {/* Stats strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl p-4 bg-muted/50 border flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                <Activity className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredMovements.length}</p>
                <p className="text-xs text-muted-foreground">Total mouvements</p>
              </div>
            </div>
            <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-100 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 flex-shrink-0">
                <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">+{totalIn.toLocaleString('fr-MA')}</p>
                <p className="text-xs text-muted-foreground">Total entrées</p>
              </div>
            </div>
            <div className="rounded-xl p-4 bg-red-50 border border-red-100 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 flex-shrink-0">
                <ArrowDownCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">-{totalOut.toLocaleString('fr-MA')}</p>
                <p className="text-xs text-muted-foreground">Total sorties</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtres</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-44">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher produit, SKU, description..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-38" />
                <Input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)}   className="w-38" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Tous types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {uniqueTypes.map(type => {
                      const cfg = getTypeCfg(type, 1);
                      return <SelectItem key={type} value={type}>{cfg.label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Button onClick={loadMovements} variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" /> Appliquer
                </Button>
                <Button onClick={() => exportCsv(filteredMovements)} variant="outline" className="gap-2 ml-auto">
                  <FileDown className="w-4 h-4" /> CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="pl-4">Date</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead>Client / Fournisseur</TableHead>
                      <TableHead>Document</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingMovements && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Chargement...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoadingMovements && filteredMovements.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-1">
                              <History className="w-6 h-6 opacity-30" />
                            </div>
                            <p className="text-sm font-medium">Aucun mouvement trouvé</p>
                            <p className="text-xs">Essayez d'ajuster les filtres</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoadingMovements && filteredMovements.map((m) => {
                      const cfg = getTypeCfg(m.type, m.quantity);
                      const { date, time } = fmtDate(m.created_at);
                      const isIn = cfg.isIn;
                      return (
                        <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="pl-4">
                            <p className="text-sm font-medium tabular-nums">{date}</p>
                            <p className="text-xs text-muted-foreground">{time}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium leading-tight">{m.product_name || '—'}</p>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {m.product_sku || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {m.product_category || '—'}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center gap-1 font-bold text-sm tabular-nums ${isIn ? 'text-emerald-700' : 'text-red-700'}`}>
                              {isIn ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                              {isIn ? '+' : '−'}{Math.abs(m.quantity)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {(m.client_name || m.supplier_name) ? (
                              <div className="flex flex-col">
                                <span className="font-medium leading-tight">
                                  {m.client_name || m.supplier_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {m.client_name ? 'Client' : 'Fournisseur'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">
                            {m.document_number || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {filteredMovements.length > 0 && (
                <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {filteredMovements.length} mouvement{filteredMovements.length > 1 ? 's' : ''} affichés
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-emerald-700 font-medium">+{totalIn.toLocaleString('fr-MA')} entrées</span>
                    <span className="text-red-700 font-medium">−{totalOut.toLocaleString('fr-MA')} sorties</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
