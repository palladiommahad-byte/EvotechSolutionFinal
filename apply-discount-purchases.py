import re

file_path = 'c:/Users/pc/Desktop/EvotechSolutionX/EvotechSolutionFinal-main/frontend/src/pages/Purchases.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
state_target = """  const [formSupplier, setFormSupplier] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);"""
state_replacement = """  const [formSupplier, setFormSupplier] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(0);"""
content = content.replace(state_target, state_replacement)

newdoc_target = """        note: formNote || undefined,
        taxEnabled: formTaxEnabled,"""
newdoc_replacement = """        note: formNote || undefined,
        taxEnabled: formTaxEnabled,
        discountType: formDiscountType,
        discountValue: formDiscountValue || 0,"""
content = content.replace(newdoc_target, newdoc_replacement)

# Update calculateInvoiceTotals
calc_target = """  const totals = calculateInvoiceTotals(items);"""
calc_replacement = """  const totals = calculateInvoiceTotals(items, formDiscountType, formDiscountValue);"""
content = content.replace(calc_target, calc_replacement)

summary_helper = """  const renderSummaryTotals = (titleHT: string, showTax: boolean) => (
    <div className="space-y-3 overflow-visible">
      <div className="space-y-2 py-2 border-b border-border">
        {(totals.discountAmount || 0) > 0 && (
        <div className="flex justify-between gap-4 overflow-visible">
          <span className="text-muted-foreground flex-shrink-0">{titleHT} (Initial)</span>
          <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
            <CurrencyDisplay amount={totals.initialSubtotal ?? totals.subtotal} />
          </span>
        </div>
        )}
        
        <div className="flex justify-between items-center gap-2 overflow-visible">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-muted-foreground text-sm font-medium">Remise:</span>
            <Select value={formDiscountType} onValueChange={(val: any) => setFormDiscountType(val)}>
              <SelectTrigger className="h-8 w-[80px] text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">DH</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              type="number" 
              min="0" 
              value={formDiscountValue || ''} 
              onChange={(e) => setFormDiscountValue(parseFloat(e.target.value) || 0)}
              className="h-8 w-[80px] text-xs text-right font-medium"
              placeholder="0"
            />
          </div>
          {(totals.discountAmount || 0) > 0 && (
            <span className="font-medium text-destructive break-words overflow-visible whitespace-normal text-right min-w-0">
              -<CurrencyDisplay amount={totals.discountAmount || 0} />
            </span>
          )}
        </div>

        <div className="flex justify-between gap-4 pt-2 border-t border-border/10 overflow-visible">
          <span className="text-muted-foreground font-medium flex-shrink-0">{titleHT} {((totals.discountAmount || 0) > 0) ? '(Net)' : ''}</span>
          <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
            <CurrencyDisplay amount={totals.subtotal} />
          </span>
        </div>
      </div>
      
      {showTax && (
        <>
          <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
            <span className="text-muted-foreground flex-shrink-0">{t('purchases.vat')} ({VAT_RATE * 100}%)</span>
            <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
              <CurrencyDisplay amount={totals.vat} />
            </span>
          </div>
          <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
            <span className="font-semibold text-foreground flex-shrink-0">{t('purchases.totalTTC')}</span>
            <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
              <CurrencyDisplay amount={totals.total} />
            </span>
          </div>
        </>
      )}
      {!showTax && (
        <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
          <span className="font-semibold text-foreground flex-shrink-0">{t('purchases.total')}</span>
          <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
            <CurrencyDisplay amount={totals.subtotal} />
          </span>
        </div>
      )}
    </div>
  );"""

content = content.replace(calc_replacement, calc_replacement + "\n\n" + summary_helper)

bl_target = """                    <div className="space-y-3 overflow-visible">
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">{t('purchases.subtotalHT')}</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.subtotal} />
                        </span>
                      </div>
                      {formTaxEnabled && (
                        <>
                          <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                            <span className="text-muted-foreground flex-shrink-0">{t('purchases.vat')} ({VAT_RATE * 100}%)</span>
                            <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                              <CurrencyDisplay amount={totals.vat} />
                            </span>
                          </div>
                          <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                            <span className="font-semibold text-foreground flex-shrink-0">{t('purchases.totalTTC')}</span>
                            <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                              <CurrencyDisplay amount={totals.total} />
                            </span>
                          </div>
                        </>
                      )}
                      {!formTaxEnabled && (
                        <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                          <span className="font-semibold text-foreground flex-shrink-0">{t('purchases.total')}</span>
                          <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                            <CurrencyDisplay amount={totals.subtotal} />
                          </span>
                        </div>
                      )}
                    </div>"""
                    
content = content.replace(bl_target, "{renderSummaryTotals(t('purchases.subtotalHT'), formTaxEnabled)}")


# Write to apply to Purchases.tsx
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Prepared Purchases.tsx')
