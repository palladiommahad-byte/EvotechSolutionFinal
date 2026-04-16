import re

file_path = 'c:/Users/pc/Desktop/EvotechSolutionX/EvotechSolutionFinal-main/frontend/src/lib/pdf-template-generator.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update DocumentData
doc_target = """  taxEnabled?: boolean;  // For BL/Divers: whether to display and compute VAT
  clientPoNumber?: string; // Bon de commande client
  linkedBLs?: { document_id: string; date: string }[]; // Linked BLs for invoices"""
doc_replacement = """  taxEnabled?: boolean;  // For BL/Divers: whether to display and compute VAT
  clientPoNumber?: string; // Bon de commande client
  linkedBLs?: { document_id: string; date: string }[]; // Linked BLs for invoices
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;"""
content = content.replace(doc_target, doc_replacement)

# Update DocumentPDFTemplate props
pdf_target = """      clientPoNumber: data.clientPoNumber,
      linkedBLs: data.linkedBLs,
      companyInfo: companyInfo as any,"""
pdf_replacement = """      clientPoNumber: data.clientPoNumber,
      linkedBLs: data.linkedBLs,
      companyInfo: companyInfo as any,
      discountType: data.discountType,
      discountValue: data.discountValue,"""
content = content.replace(pdf_target, pdf_replacement)

# Update DocumentTemplate props
html_target = """              clientPoNumber: data.clientPoNumber,
              linkedBLs: data.linkedBLs,
            })"""
html_replacement = """              clientPoNumber: data.clientPoNumber,
              linkedBLs: data.linkedBLs,
              discountType: data.discountType,
              discountValue: data.discountValue,
            })"""
content = content.replace(html_target, html_replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done frontend pdf-template-generator.ts')
