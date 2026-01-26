import { apiClient } from '@/lib/api-client';

export interface TaxReport {
    id: string;
    year: number;
    quarter: string;
    data: any;
    status: 'draft' | 'filed' | 'archived';
    created_at: string;
    updated_at: string;
}

export const taxReportsService = {
    /**
     * Get all tax reports, optionally filtered by year
     */
    async getAll(year?: number): Promise<TaxReport[]> {
        try {
            const endpoint = year ? `/tax-reports?year=${year}` : '/tax-reports';
            return await apiClient.get<TaxReport[]>(endpoint);
        } catch (error) {
            console.error('Error fetching tax reports:', error);
            return [];
        }
    },

    /**
     * Get a specific tax report by ID
     */
    async getById(id: string): Promise<TaxReport | null> {
        try {
            return await apiClient.get<TaxReport>(`/tax-reports/${id}`);
        } catch (error) {
            console.error('Error fetching tax report:', error);
            return null;
        }
    },

    /**
     * Create or update a tax report
     */
    async save(report: {
        year: number;
        quarter: string;
        data: any;
        status: 'draft' | 'filed' | 'archived';
    }): Promise<TaxReport> {
        return await apiClient.post<TaxReport>('/tax-reports', report);
    }
};
