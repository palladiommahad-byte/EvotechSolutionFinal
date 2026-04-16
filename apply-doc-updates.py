import re

file_path = 'c:/Users/pc/Desktop/EvotechSolutionX/EvotechSolutionFinal-main/frontend/src/components/documents/DocumentTemplate.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

hdr_target = """            <th className="py-2 px-4 text-center w-32">{t('pdf.price')}</th>
            {showVAT && <th className="py-2 px-4 text-center w-32">{t('pdf.tax')}</th>}
            <th className="py-2 px-4 text-right w-40">{t('pdf.total')}</th>"""

hdr_replacement = """            <th className="py-2 px-4 text-center w-32">{t('pdf.price')}</th>
            {((totals.discountAmount || 0) > 0) && <th className="py-2 px-4 text-center w-32">REMISE</th>}
            {showVAT && <th className="py-2 px-4 text-center w-32">{t('pdf.tax')}</th>}
            <th className="py-2 px-4 text-right w-40">{t('pdf.total')}</th>"""
content = content.replace(hdr_target, hdr_replacement)


row_target = """          {items.map((item, index) => {
            const unitPrice = Number(item.unitPrice) || 0;
            const quantity = Number(item.quantity) || 0;
            const storedTotal = Number(item.total) || 0;
            
            const itemTax = showVAT ? unitPrice * VAT_RATE : 0;
            const itemTotalAfterTax = showVAT 
              ? (unitPrice + itemTax) * quantity
              : (storedTotal || quantity * unitPrice);

            return (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="py-2 px-4 border-b border-gray-100">{index + 1}</td>
                <td className="py-2 px-4 border-b border-gray-100 font-medium">{item.description}</td>
                <td className="py-2 px-4 border-b border-gray-100 text-center">{quantity}</td>
                <td className="py-2 px-4 border-b border-gray-100 text-center">Box</td>
                <td className="py-2 px-4 border-b border-gray-100 text-center">{formatMADFull(unitPrice)}</td>
                {showVAT && <td className="py-2 px-4 border-b border-gray-100 text-center">{formatMADFull(itemTax * quantity)}</td>}
                <td className="py-2 px-4 border-b border-gray-100 text-right font-bold">{formatMADFull(itemTotalAfterTax)}</td>
              </tr>
            );
          })}"""

row_replacement = """          {items.map((item, index) => {
            const unitPrice = Number(item.unitPrice) || 0;
            const quantity = Number(item.quantity) || 0;
            
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
            const itemTotalAfterTax = itemNetHT + itemTaxAmount;

            return (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="py-2 px-4 border-b border-gray-100">{index + 1}</td>
                <td className="py-2 px-4 border-b border-gray-100 font-medium">{item.description}</td>
                <td className="py-2 px-4 border-b border-gray-100 text-center">{quantity}</td>
                <td className="py-2 px-4 border-b border-gray-100 text-center">Box</td>
                <td className="py-2 px-4 border-b border-gray-100 text-center">{formatMADFull(unitPrice)}</td>
                {((totals.discountAmount || 0) > 0) && (
                  <td className="py-2 px-4 border-b border-gray-100 text-center text-red-500">
                    -{formatMADFull(discountForThisItem)}
                  </td>
                )}
                {showVAT && <td className="py-2 px-4 border-b border-gray-100 text-center">{formatMADFull(itemTaxAmount)}</td>}
                <td className="py-2 px-4 border-b border-gray-100 text-right font-bold">{formatMADFull(itemTotalAfterTax)}</td>
              </tr>
            );
          })}"""
content = content.replace(row_target, row_replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done DocumentTemplate.tsx')
