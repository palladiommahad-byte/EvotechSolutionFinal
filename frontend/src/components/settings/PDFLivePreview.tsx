import React from 'react';

export interface PDFDesignSettings {
  pdfPrimaryColor: string;
  pdfTitleColor: string;
  pdfFontSize: number;
  pdfFontFamily: 'Helvetica' | 'Times-Roman' | 'Courier';
  pdfBodyTextColor: string;
  pdfBorderColor: string;
  pdfLogoSize: 'small' | 'medium' | 'large';
  pdfLogoPosition: 'left' | 'right';
  pdfTableSpacing: 'compact' | 'normal' | 'spacious';
  pdfShowBorders: boolean;
  showLogo?: boolean;
  logo?: string | null;
  companyName?: string;
  footerText?: string;
}

const FONT_MAP: Record<string, string> = {
  'Helvetica': 'Arial, Helvetica, sans-serif',
  'Times-Roman': "'Times New Roman', Times, serif",
  'Courier': "'Courier New', Courier, monospace",
};

const SAMPLE_ITEMS = [
  { num: 1, desc: 'Prestation de service - Développement', qty: 2, unit: 'h', price: '1 500,00 DH', total: '3 000,00 DH' },
  { num: 2, desc: 'Licence logicielle annuelle', qty: 1, unit: 'u', price: '2 400,00 DH', total: '2 400,00 DH' },
  { num: 3, desc: 'Support et maintenance mensuel', qty: 3, unit: 'mois', price: '800,00 DH', total: '2 400,00 DH' },
];

export const PDFLivePreview: React.FC<{ settings: PDFDesignSettings }> = ({ settings }) => {
  const {
    pdfPrimaryColor,
    pdfTitleColor,
    pdfFontSize,
    pdfFontFamily,
    pdfBodyTextColor,
    pdfBorderColor,
    pdfLogoSize,
    pdfLogoPosition,
    pdfTableSpacing,
    pdfShowBorders,
    showLogo,
    logo,
    companyName,
    footerText,
  } = settings;

  const displayLogo = showLogo !== false && logo;

  const fontFamily = FONT_MAP[pdfFontFamily] || FONT_MAP['Helvetica'];
  const logoH = pdfLogoSize === 'small' ? 32 : pdfLogoSize === 'large' ? 58 : 44;
  const cellPy = pdfTableSpacing === 'compact' ? '2px' : pdfTableSpacing === 'spacious' ? '8px' : '5px';
  const tableBorder = pdfShowBorders ? `1px solid ${pdfBorderColor}` : 'none';
  const rowBorder = pdfShowBorders ? '1px solid #E5E7EB' : 'none';

  const base: React.CSSProperties = {
    fontFamily,
    fontSize: pdfFontSize,
    color: pdfBodyTextColor,
    lineHeight: 1.5,
  };

  const headerRow: React.CSSProperties = {
    display: 'flex',
    flexDirection: pdfLogoPosition === 'right' ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  };

  return (
    <div style={{ ...base, background: '#fff', padding: '16px 20px', borderRadius: 8, border: '1px solid #e5e7eb', minWidth: 360, userSelect: 'none' }}>

      {/* Header */}
      <div style={headerRow}>
        {/* Left: logo or company name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {displayLogo ? (
            <img src={displayLogo} alt="logo" style={{ height: logoH, maxWidth: logoH * 2.5, objectFit: 'contain' }} />
          ) : (
            <div style={{ fontWeight: 700, fontSize: pdfFontSize + 5, color: pdfTitleColor, letterSpacing: -0.3 }}>
              {(companyName || 'NOM ENTREPRISE').toUpperCase()}
            </div>
          )}
        </div>

        {/* Right: doc title + details box */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: pdfFontSize + 14, color: pdfTitleColor, lineHeight: 1, marginBottom: 6 }}>
            FACTURE
          </div>
          <div style={{ background: pdfPrimaryColor, borderRadius: 5, padding: '4px 10px', display: 'inline-block', textAlign: 'left', minWidth: 130 }}>
            <div style={{ color: '#fff', fontSize: pdfFontSize - 1, marginBottom: 1 }}>
              <span style={{ fontWeight: 600 }}>N°: </span>FC0626/0001
            </div>
            {footerText && (
              <div style={{ color: '#fff', fontSize: pdfFontSize - 1, marginBottom: 1 }}>
                <span style={{ fontWeight: 600 }}>Lieu: </span>{footerText}
              </div>
            )}
            <div style={{ color: '#fff', fontSize: pdfFontSize - 1 }}>
              <span style={{ fontWeight: 600 }}>Date: </span>07/06/2026
            </div>
          </div>
        </div>
      </div>

      {/* From / To */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, background: '#F9FAFB', border: tableBorder, borderRadius: 4, padding: '5px 8px' }}>
          <div style={{ fontSize: pdfFontSize - 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: pdfBodyTextColor, marginBottom: 2, opacity: 0.6 }}>DE</div>
          <div style={{ fontWeight: 600, fontSize: pdfFontSize + 1 }}>{companyName || 'Evotech Solutions SARL'}</div>
          <div style={{ fontSize: pdfFontSize - 1, opacity: 0.7 }}>Casablanca, Morocco</div>
          <div style={{ fontSize: pdfFontSize - 1, opacity: 0.7 }}>+212 5XX-XXXXXX</div>
        </div>
        <div style={{ flex: 1, background: '#F9FAFB', border: tableBorder, borderRadius: 4, padding: '5px 8px' }}>
          <div style={{ fontSize: pdfFontSize - 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: pdfBodyTextColor, marginBottom: 2, opacity: 0.6 }}>FACTURÉ À</div>
          <div style={{ fontWeight: 600, fontSize: pdfFontSize + 1 }}>Atlas Industries SARL</div>
          <div style={{ fontSize: pdfFontSize - 1, opacity: 0.7 }}>ICE: 001234567000012</div>
          <div style={{ fontSize: pdfFontSize - 1, opacity: 0.7 }}>Marrakech, Morocco</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ border: tableBorder, borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'flex', background: pdfBorderColor, padding: `${cellPy} 6px` }}>
          {['#', 'DÉSIGNATION', 'QTÉ', 'UNITÉ', 'P.U HT', 'TOTAL HT'].map((h, i) => (
            <div key={h} style={{
              color: '#fff', fontWeight: 700, fontSize: pdfFontSize - 2, textTransform: 'uppercase', letterSpacing: 0.5,
              flex: i === 1 ? 3 : 1, textAlign: i > 1 ? 'right' : 'left',
            }}>{h}</div>
          ))}
        </div>
        {/* Data rows */}
        {SAMPLE_ITEMS.map((row, i) => (
          <div key={i} style={{ display: 'flex', padding: `${cellPy} 6px`, background: i % 2 === 0 ? '#fff' : '#f1f5f9', borderTop: rowBorder }}>
            <div style={{ flex: 1, fontSize: pdfFontSize - 1 }}>{row.num}</div>
            <div style={{ flex: 3, fontSize: pdfFontSize - 1 }}>{row.desc}</div>
            <div style={{ flex: 1, fontSize: pdfFontSize - 1, textAlign: 'right' }}>{row.qty}</div>
            <div style={{ flex: 1, fontSize: pdfFontSize - 1, textAlign: 'right' }}>{row.unit}</div>
            <div style={{ flex: 1, fontSize: pdfFontSize - 1, textAlign: 'right' }}>{row.price}</div>
            <div style={{ flex: 1, fontSize: pdfFontSize - 1, textAlign: 'right', fontWeight: 600 }}>{row.total}</div>
          </div>
        ))}
      </div>

      {/* Totals + summary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div style={{ background: pdfBorderColor, borderRadius: 6, padding: '8px 14px', minWidth: 180 }}>
          {[
            { label: 'Sous-total HT', value: '7 800,00 DH' },
            { label: 'TVA (20%)', value: '1 560,00 DH' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.3)', padding: '2px 0', gap: 16 }}>
              <span style={{ color: '#fff', fontSize: pdfFontSize - 1 }}>{r.label}</span>
              <span style={{ color: '#fff', fontSize: pdfFontSize - 1 }}>{r.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, gap: 16 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: pdfFontSize + 1 }}>TOTAL TTC</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: pdfFontSize + 1 }}>9 360,00 DH</span>
          </div>
        </div>
      </div>

      {/* Footer — mirrors actual PDF: company identifiers, not footerText */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 5, textAlign: 'center', fontSize: pdfFontSize - 2, color: '#6B7280' }}>
        ICE: 001234567000012 | IF: 12345678 | RC: 12345 | Tél: +212 5XX-XXXXXX
      </div>
    </div>
  );
};
