import * as React from "react";
import { Check, ChevronsUpDown, Package, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Product } from "@/lib/products";
import { formatMAD } from "@/lib/moroccan-utils";

interface ProductSearchProps {
  products: Product[];
  value?: string;
  onSelect: (product: Product | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductSearch({
  products,
  value,
  onSelect,
  placeholder = "Search products...",
  disabled = false,
}: ProductSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedProduct = React.useMemo(
    () => products.find((p) => p.id === value),
    [products, value]
  );

  const filteredProducts = React.useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleSelect = (productId: string) => {
    if (productId === "__clear__") {
      onSelect(null);
      setOpen(false);
      setSearchQuery("");
      return;
    }
    const product = products.find((p) => p.id === productId);
    onSelect(product || null);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(null);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between relative"
          disabled={disabled}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 flex-1 min-w-0 pr-6">
              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{selectedProduct.name}</span>
              <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                {selectedProduct.sku}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selectedProduct && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 absolute right-8 hover:bg-destructive/10 hover:text-destructive z-10"
              onClick={handleClear}
              type="button"
              title="Clear selection"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search by name, SKU, or category..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {selectedProduct && (
                <CommandItem
                  value="__clear__"
                  onSelect={handleSelect}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear selection
                </CommandItem>
              )}
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id}
                  onSelect={() => handleSelect(product.id)}
                  className="flex items-start gap-3 py-3"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 mt-0.5 flex-shrink-0",
                      selectedProduct?.id === product.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {product.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                        {product.sku}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{product.category}</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">
                        {formatMAD(product.price)}
                      </span>
                      <span>•</span>
                      <span>
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
