import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { CompanyInfo } from '@/contexts/CompanyContext';
import { formatMADFull } from '@/lib/moroccan-utils';
import i18n from '@/i18n/config';

interface FormattedDocument {
    date: string;
    number: string;
    tier: string;
    itemsCount: number;
    total: number;
    status: string;
}

interface DocumentsListPDFTemplateProps {
    title: string;
    documents: FormattedDocument[];
    filters?: { status?: string };
    companyInfo: CompanyInfo;
    language?: string;
}

// Register Inter font if available (with error handling)
try {
    Font.register({
        family: 'Inter',
        src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
    });
} catch (error) {
    console.warn('Failed to register Inter font:', error);
}

const styles = StyleSheet.create({
    page: {
        padding: '10px 40px 40px 40px',
        fontSize: 10,
        fontFamily: 'Helvetica',
        color: '#1F2937',
        lineHeight: 1.5,
        flexDirection: 'column',
    },
    header: {
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #E5E7EB',
        paddingBottom: 15,
    },
    companyInfo: {
        flex: 1,
        paddingRight: 20,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    logo: {
        height: 50,
        maxWidth: 100,
        objectFit: 'contain',
    },
    companyName: {
        fontSize: 14,
        fontWeight: 700,
        color: '#111827',
        fontFamily: 'Helvetica-Bold',
        marginBottom: 4,
    },
    reportTitle: {
        fontSize: 20,
        fontWeight: 700,
        color: '#3b82f6',
        textAlign: 'right',
        fontFamily: 'Helvetica-Bold',
    },
    metaInfo: {
        marginTop: 5,
        alignItems: 'flex-end',
    },
    metaText: {
        fontSize: 9,
        color: '#6B7280',
    },
    table: {
        marginTop: 10,
        marginBottom: 20,
        width: '100%',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#3b82f6',
        padding: '8px 6px',
        alignItems: 'center',
        borderRadius: 2,
    },
    tableHeaderCell: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: 700,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #E5E7EB',
        padding: '6px 6px',
        alignItems: 'center',
    },
    rowEven: {
        backgroundColor: '#FFFFFF',
    },
    rowOdd: {
        backgroundColor: '#F9FAFB',
    },
    tableCell: {
        fontSize: 9,
        color: '#374151',
    },
    // Column Widths
    colDate: { width: '15%' },
    colNum: { width: '20%' },
    colTier: { width: '25%' },
    colItems: { width: '10%', textAlign: 'center' },
    colTotal: { width: '15%', textAlign: 'right' },
    colStatus: { width: '15%', textAlign: 'center' },

    // Status badges
    statusBadge: {
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 700,
        textAlign: 'center',
    },
    statusGeneric: { backgroundColor: '#E5E7EB', color: '#374151' },
    statusSuccess: { backgroundColor: '#DEF7EC', color: '#03543F' }, // Green
    statusWarning: { backgroundColor: '#FEF3C7', color: '#92400E' }, // Yellow
    statusDanger: { backgroundColor: '#FDE8E8', color: '#9B1C1C' }, // Red
    statusInfo: { backgroundColor: '#E1EFFE', color: '#1E429F' }, // Blue

    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        borderTop: '1px solid #E5E7EB',
        paddingTop: 10,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 8,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    summarySection: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    summaryBox: {
        width: 200,
        backgroundColor: '#F3F4F6',
        padding: 10,
        borderRadius: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    summaryLabel: {
        fontWeight: 700,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
    },
    summaryValue: {
        fontSize: 9,
    }
});

export const DocumentsListPDFTemplate: React.FC<DocumentsListPDFTemplateProps> = ({
    title,
    documents,
    filters,
    companyInfo,
    language
}) => {
    const currentLang = language || i18n.language || 'en';
    const t = (key: string) => i18n.t(key, { lng: currentLang });

    const formatDate = (dateString: string) => {
        try {
            const d = new Date(dateString);
            return d.toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US');
        } catch (e) {
            return dateString;
        }
    };

    const getStatusStyle = (status: string) => {
        const s = status.toLowerCase();
        if (['paid', 'delivered', 'received', 'approved', 'valid'].includes(s)) return styles.statusSuccess;
        if (['pending', 'draft', 'in_transit'].includes(s)) return styles.statusWarning;
        if (['overdue', 'cancelled', 'rejected', 'expired'].includes(s)) return styles.statusDanger;
        if (['sent', 'shipped'].includes(s)) return styles.statusInfo;
        return styles.statusGeneric;
    };

    const totalSum = documents.reduce((sum, d) => sum + d.total, 0);
    const totalItems = documents.reduce((sum, d) => sum + d.itemsCount, 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.companyInfo}>
                        {companyInfo.logo && (
                            <Image src={companyInfo.logo} style={styles.logo} />
                        )}
                        <View>
                            <Text style={styles.companyName}>{(companyInfo.name || 'COMPANY NAME').toUpperCase()}</Text>
                            <Text style={{ fontSize: 9, color: '#6B7280' }}>{companyInfo.email}</Text>
                            <Text style={{ fontSize: 9, color: '#6B7280' }}>{companyInfo.phone}</Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.reportTitle}>{title}</Text>
                        <View style={styles.metaInfo}>
                            <Text style={styles.metaText}>
                                {String(t('common.date'))}: {new Date().toLocaleDateString()}
                            </Text>
                            {filters?.status && (
                                <Text style={styles.metaText}>
                                    Status: {filters.status.toUpperCase()}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.colDate]}>{String(t('common.date'))}</Text>
                    <Text style={[styles.tableHeaderCell, styles.colNum]}>{String(t('pdf.documentNumber'))}</Text>
                    <Text style={[styles.tableHeaderCell, styles.colTier]}>{String(t('common.tier'))}</Text>
                    <Text style={[styles.tableHeaderCell, styles.colItems]}>{String(t('pdf.items'))}</Text>
                    <Text style={[styles.tableHeaderCell, styles.colTotal]}>{String(t('pdf.total'))}</Text>
                    <Text style={[styles.tableHeaderCell, styles.colStatus]}>{String(t('common.status'))}</Text>
                </View>

                {/* Table Rows */}
                {documents.map((doc, index) => (
                    <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                        <Text style={[styles.tableCell, styles.colDate]}>{formatDate(doc.date)}</Text>
                        <Text style={[styles.tableCell, styles.colNum]}>{doc.number}</Text>
                        <Text style={[styles.tableCell, styles.colTier]}>{doc.tier}</Text>
                        <Text style={[styles.tableCell, styles.colItems]}>{doc.itemsCount}</Text>
                        <Text style={[styles.tableCell, styles.colTotal]}>{formatMADFull(doc.total)}</Text>
                        <View style={[styles.colStatus, { alignItems: 'center' }]}>
                            <View style={[styles.statusBadge, getStatusStyle(doc.status)]}>
                                <Text>{doc.status.toUpperCase()}</Text>
                            </View>
                        </View>
                    </View>
                ))}

                {/* Summary */}
                <View style={styles.summarySection}>
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total Documents:</Text>
                            <Text style={styles.summaryValue}>{documents.length}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total Items:</Text>
                            <Text style={styles.summaryValue}>{totalItems}</Text>
                        </View>
                        <View style={[styles.summaryRow, { borderTop: '1px solid #D1D5DB', paddingTop: 4, marginTop: 4 }]}>
                            <Text style={[styles.summaryLabel, { color: '#3b82f6' }]}>TOTAL (TTC):</Text>
                            <Text style={[styles.summaryLabel, { color: '#3b82f6' }]}>{formatMADFull(totalSum)}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        {[
                            companyInfo.address,
                            companyInfo.phone && `Tel: ${companyInfo.phone}`,
                            companyInfo.email && `Email: ${companyInfo.email}`,
                            companyInfo.ice && `ICE: ${companyInfo.ice}`
                        ].filter(Boolean).join(' | ')}
                    </Text>
                    <Text style={[styles.footerText, { marginTop: 4 }]}>
                        Generated by EvoTech Solution • Page 1
                    </Text>
                </View>

            </Page>
        </Document>
    );
};
