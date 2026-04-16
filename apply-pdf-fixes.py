import re

file_path = 'c:/Users/pc/Desktop/EvotechSolutionX/EvotechSolutionFinal-main/frontend/src/components/documents/DocumentPDFTemplate.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Header: Add REMISE between PRIX and TAXE
hdr_target = """              <View style={[styles.tableHeaderCell, { flex: 1.5, width: '15%', textAlign: 'center' }]}>
                <Text>{String(t('pdf.price'))}</Text>
              </View>
              {showVAT && (
                <View style={[styles.tableHeaderCell, { flex: 1.2, width: '12%', textAlign: 'center' }]}>
                  <Text>{String(t('pdf.tax'))}</Text>
                </View>
              )}
              <View style={[styles.tableHeaderCell, { flex: 1.6, width: showVAT ? '16%' : '28%', textAlign: 'right' }]}>
                <Text>{String(t('pdf.total'))}</Text>
              </View>"""

hdr_replacement = """              <View style={[styles.tableHeaderCell, { flex: 1.5, width: '15%', textAlign: 'center' }]}>
                <Text>{String(t('pdf.price'))}</Text>
              </View>
              {((totals.discountAmount || 0) > 0) && (
                <View style={[styles.tableHeaderCell, { flex: 1.2, width: '12%', textAlign: 'center' }]}>
                  <Text>REMISE</Text>
                </View>
              )}
              {showVAT && (
                <View style={[styles.tableHeaderCell, { flex: 1.2, width: '12%', textAlign: 'center' }]}>
                  <Text>{String(t('pdf.tax'))}</Text>
                </View>
              )}
              <View style={[styles.tableHeaderCell, { flex: 1.6, width: (showVAT && (totals.discountAmount || 0) > 0) ? '12%' : showVAT ? '16%' : '28%', textAlign: 'right' }]}>
                <Text>{String(t('pdf.total'))}</Text>
              </View>"""
content = content.replace(hdr_target, hdr_replacement)

# Rows: Add REMISE and fix calculations
row_target = """            {items.map((item, index) => {
              // ⚠️ node-postgres returns numeric columns as strings — always coerce to Number
              const unitPrice  = Number(item.unitPrice)  || 0;
              const quantity   = Number(item.quantity)   || 0;
              const storedTotal = Number(item.total)     || 0;

              const itemTax = showVAT ? unitPrice * VAT_RATE : 0;
              // For VAT docs: compute total including tax; otherwise use stored total (HT)
              // Fallback: if stored total is 0, recompute from quantity × unitPrice
              const itemTotalAfterTax = showVAT
                ? (unitPrice + itemTax) * quantity
                : (storedTotal || quantity * unitPrice);"""

row_replacement = """            {items.map((item, index) => {
              // ⚠️ node-postgres returns numeric columns as strings — always coerce to Number
              const unitPrice  = Number(item.unitPrice)  || 0;
              const quantity   = Number(item.quantity)   || 0;
              
              const itemInitialHT = unitPrice * quantity;
              
              let discountForThisItem = 0;
              if ((totals.discountAmount || 0) > 0 && discountValue) {
                if (discountType === 'percentage') {
                  discountForThisItem = itemInitialHT * (discountValue / 100);
                } else if (totals.initialSubtotal) {
                  discountForThisItem = (itemInitialHT / totals.initialSubtotal) * (totals.discountAmount || 0);
                }
              }
              
              const itemNetHT = itemInitialHT - discountForThisItem;
              const itemTaxAmount = showVAT ? itemNetHT * VAT_RATE : 0;
              const itemTotalAfterTax = itemNetHT + itemTaxAmount;"""
content = content.replace(row_target, row_replacement)

# Cells: Add REMISE cell
cell_target = """                  <View style={[styles.tableCell, { flex: 1.5, width: '15%', textAlign: 'center' }]}>
                    <Text>{formatMADFull(unitPrice)}</Text>
                  </View>
                  {showVAT && (
                    <View style={[styles.tableCell, { flex: 1.2, width: '12%', textAlign: 'center' }]}>
                      <Text>{formatMADFull(itemTax * quantity)}</Text>
                    </View>
                  )}
                  <View style={[styles.tableCell, { flex: 1.6, width: showVAT ? '16%' : '28%', textAlign: 'right' }]}>
                    <Text>{formatMADFull(itemTotalAfterTax)}</Text>
                  </View>"""

cell_replacement = """                  <View style={[styles.tableCell, { flex: 1.5, width: '15%', textAlign: 'center' }]}>
                    <Text>{formatMADFull(unitPrice)}</Text>
                  </View>
                  {((totals.discountAmount || 0) > 0) && (
                    <View style={[styles.tableCell, { flex: 1.2, width: '12%', textAlign: 'center', color: '#ef4444' }]}>
                      <Text>-{formatMADFull(discountForThisItem)}</Text>
                    </View>
                  )}
                  {showVAT && (
                    <View style={[styles.tableCell, { flex: 1.2, width: '12%', textAlign: 'center' }]}>
                      <Text>{formatMADFull(itemTaxAmount)}</Text>
                    </View>
                  )}
                  <View style={[styles.tableCell, { flex: 1.6, width: (showVAT && (totals.discountAmount || 0) > 0) ? '12%' : showVAT ? '16%' : '28%', textAlign: 'right' }]}>
                    <Text>{formatMADFull(itemTotalAfterTax)}</Text>
                  </View>"""
content = content.replace(cell_target, cell_replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done DocumentPDFTemplate.tsx')
