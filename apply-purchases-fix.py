import re

file_path = 'c:/Users/pc/Desktop/EvotechSolutionX/EvotechSolutionFinal-main/frontend/src/pages/Purchases.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add state
state_target = """  const [formSupplier, setFormSupplier] = useState('');"""
state_replacement = """  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(0);
  const [formSupplier, setFormSupplier] = useState('');"""
content = content.replace(state_target, state_replacement)

# Update reset form
reset_target = """      setFormNote('');"""
reset_replacement = """      setFormNote('');
      setFormDiscountType('percentage');
      setFormDiscountValue(0);"""
content = content.replace(reset_target, reset_replacement)

# Update preview
prev_target = """    const previewDocument: PurchaseDocument & { items?: any } = {
      id: 'PREVIEW',
      documentId: 'PREVIEW',
      supplier: supplierData?.company || supplierData?.name || formSupplier,
      supplierData: supplierData,
      date: formDate,
      items: items.map(item => ({"""
prev_replacement = """    const previewDocument: PurchaseDocument & { items?: any } = {
      id: 'PREVIEW',
      documentId: 'PREVIEW',
      supplier: supplierData?.company || supplierData?.name || formSupplier,
      supplierData: supplierData,
      date: formDate,
      discountType: formDiscountType,
      discountValue: formDiscountValue,
      items: items.map(item => ({"""
content = content.replace(prev_target, prev_replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done Purchases.tsx')
