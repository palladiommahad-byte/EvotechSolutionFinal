import { format } from 'date-fns';

interface ExportItem {
    date: string | Date;
    number: string;
    entity: string; // Client or Supplier
    total: number;
    paid: number;
    balance: number;
    status: string;
}

interface ExportData {
    title: string;
    items: ExportItem[];
    type: 'sales' | 'purchases';
}

export const exportStyledExcel = async (data: ExportData) => {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        // Format data for the backend
        const exportRows = data.items.map(item => ({
            date: item.date instanceof Date ? format(item.date, 'dd/MM/yyyy') : new Date(item.date).toLocaleDateString('fr-FR'),
            entity: item.entity,
            number: item.number,
            total: item.total, // Format currency if needed, but backend often handles numbers better for Excel
            paid: item.paid,
            balance: item.balance,
            status: item.status
        }));

        const columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: data.type === 'sales' ? 'Client' : 'Fournisseur', key: 'entity', width: 30 },
            { header: 'Numéro', key: 'number', width: 20 },
            { header: 'Total (DH)', key: 'total', width: 15 },
            { header: 'Versé (DH)', key: 'paid', width: 15 },
            { header: 'Reste (DH)', key: 'balance', width: 15 },
            { header: 'Statut', key: 'status', width: 15 }
        ];

        const response = await fetch('http://localhost:3000/api/reports/export-custom', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: data.title,
                columns: columns,
                data: exportRows
            })
        });

        if (!response.ok) {
            throw new Error('Export request failed');
        }

        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Relevé_${data.type === 'sales' ? 'Ventes' : 'Achats'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Export error:', error);
        // Ideally trigger a toast here, but this is a lib function
        // We can rely on the caller or just log for now
        alert('Failed to export. Please try again.');
    }
};
