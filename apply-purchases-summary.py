import re

file_path = 'c:/Users/pc/Desktop/EvotechSolutionX/EvotechSolutionFinal-main/frontend/src/pages/Purchases.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

b1 = """                    <div className="space-y-3 overflow-visible">
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">{t('documents.subtotalHT')}</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.subtotal} />
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">{t('documents.vat')} ({VAT_RATE * 100}%)</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.vat} />
                        </span>
                      </div>
                      <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                        <span className="font-semibold text-foreground flex-shrink-0">{t('documents.totalTTC')}</span>
                        <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.total} />
                        </span>
                      </div>
                    </div>"""
                    
content = content.replace(b1, "{renderSummaryTotals(t('documents.subtotalHT'), true)}")


b2 = """                    <div className="space-y-3 overflow-visible">
                      <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                        <span className="text-muted-foreground flex-shrink-0">{t('documents.subtotalHT')}</span>
                        <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                          <CurrencyDisplay amount={totals.subtotal} />
                        </span>
                      </div>
                      {formTaxEnabled && (
                        <>
                          <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                            <span className="text-muted-foreground flex-shrink-0">{t('documents.vat')} ({VAT_RATE * 100}%)</span>
                            <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                              <CurrencyDisplay amount={totals.vat} />
                            </span>
                          </div>
                          <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                            <span className="font-semibold text-foreground flex-shrink-0">{t('documents.totalTTC')}</span>
                            <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                              <CurrencyDisplay amount={totals.total} />
                            </span>
                          </div>
                        </>
                      )}
                      {!formTaxEnabled && (
                        <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                          <span className="font-semibold text-foreground flex-shrink-0">{t('documents.total')}</span>
                          <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                            <CurrencyDisplay amount={totals.subtotal} />
                          </span>
                        </div>
                      )}
                    </div>"""
                    
content = content.replace(b2, "{renderSummaryTotals(t('documents.subtotalHT'), formTaxEnabled)}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done Purchases.tsx')
