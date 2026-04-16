import re

file_path = 'c:/Users/pc/Desktop/EvotechSolutionX/EvotechSolutionFinal-main/frontend/src/pages/Sales.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

prev_target = """    const previewDocument: SalesDocument & { items?: any } = {
      id: 'PREVIEW',
      documentId: 'PREVIEW',
      client: clientData?.company || clientData?.name || formClient,
      clientData: clientData,
      date: formDate,
      items: items,"""
prev_replacement = """    const previewDocument: SalesDocument & { items?: any } = {
      id: 'PREVIEW',
      documentId: 'PREVIEW',
      client: clientData?.company || clientData?.name || formClient,
      clientData: clientData,
      date: formDate,
      discountType: formDiscountType,
      discountValue: formDiscountValue,
      items: items,"""
content = content.replace(prev_target, prev_replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done Sales.tsx')
