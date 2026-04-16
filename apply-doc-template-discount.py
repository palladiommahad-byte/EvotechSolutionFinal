import re

file_path = 'c:/Users/pc/Desktop/EvotechSolutionX/EvotechSolutionFinal-main/frontend/src/components/documents/DocumentTemplate.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update props
doc_target = """  clientPoNumber?: string;
  linkedBLs?: { document_id: string; date: string }[];
}"""
doc_replacement = """  clientPoNumber?: string;
  linkedBLs?: { document_id: string; date: string }[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}"""
content = content.replace(doc_target, doc_replacement)

# Update destructuring
param_target = """  clientPoNumber,
  linkedBLs,
}) => {"""
param_replacement = """  clientPoNumber,
  linkedBLs,
  discountType,
  discountValue,
}) => {"""
content = content.replace(param_target, param_replacement)

calc_target = """  const totals = calculateInvoiceTotals(items);"""
calc_replacement = """  const totals = calculateInvoiceTotals(items, discountType, discountValue);"""
content = content.replace(calc_target, calc_replacement)

p_target1 = """      <div className="flex justify-end p-8 pt-0">
        <div className="w-72 bg-gray-50 rounded-lg p-4">
          {showVAT && (
            <>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">{t('pdf.subtotalHT')}</span>
                <span>{formatMADFull(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">{t('pdf.tva')} {VAT_RATE * 100}%</span>
                <span>{formatMADFull(totals.vat)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 mt-2">
                <span>{t('pdf.grandTotal')}</span>
                <span>{formatMADFull(totals.total)}</span>
              </div>
            </>
          )}
          {!showVAT && (
            <div className="flex justify-between font-bold text-lg pt-1">
              <span>{t('pdf.grandTotal')}</span>
              <span>{formatMADFull(totals.subtotal)}</span>
            </div>
          )}
        </div>
      </div>"""

p_repl1 = """      <div className="flex justify-end p-8 pt-0">
        <div className="w-72 bg-gray-50 rounded-lg p-4">
          
          {(totals.discountAmount || 0) > 0 && (
            <>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">{t('pdf.subtotalHT')} (Initial)</span>
                <span>{formatMADFull(totals.initialSubtotal ?? totals.subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Remise {discountType === 'percentage' ? `(${discountValue}%)` : ''}</span>
                <span className="text-red-500">-{formatMADFull(totals.discountAmount || 0)}</span>
              </div>
            </>
          )}

          {showVAT && (
            <>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">{t('pdf.subtotalHT')} {((totals.discountAmount || 0) > 0) ? '(Net)' : ''}</span>
                <span>{formatMADFull(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">{t('pdf.tva')} {VAT_RATE * 100}%</span>
                <span>{formatMADFull(totals.vat)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 mt-2">
                <span>{t('pdf.grandTotal')}</span>
                <span>{formatMADFull(totals.total)}</span>
              </div>
            </>
          )}
          {!showVAT && (
            <>
              {((totals.discountAmount || 0) > 0) && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">{t('pdf.subtotalHT')} (Net)</span>
                  <span>{formatMADFull(totals.subtotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-1">
                <span>{t('pdf.grandTotal')}</span>
                <span>{formatMADFull(totals.subtotal)}</span>
              </div>
            </>
          )}
        </div>
      </div>"""
content = content.replace(p_target1, p_repl1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done DocumentTemplate.tsx')
