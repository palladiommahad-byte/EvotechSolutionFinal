/**
 * Status Mapper
 * Maps UI status values to database status values
 * Different document types have different status enums in the database
 */

/**
 * Map invoice status from UI to database
 * Database: 'draft', 'sent', 'paid', 'overdue', 'cancelled'
 * UI: 'draft', 'pending', 'paid', 'overdue', 'cancelled'
 */
export function mapInvoiceStatus(uiStatus: string): 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' {
  const statusMap: Record<string, 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'> = {
    'draft': 'draft',
    'pending': 'sent', // Map 'pending' to 'sent' in database
    'sent': 'sent',
    'paid': 'paid',
    'overdue': 'overdue',
    'cancelled': 'cancelled',
  };

  return statusMap[uiStatus.toLowerCase()] || 'draft';
}

/**
 * Map invoice status from database to UI
 */
export function mapInvoiceStatusToUI(dbStatus: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'draft',
    'sent': 'pending', // Map 'sent' to 'pending' in UI
    'paid': 'paid',
    'overdue': 'overdue',
    'cancelled': 'cancelled',
  };

  return statusMap[dbStatus.toLowerCase()] || dbStatus;
}

/**
 * Map estimate status from UI to database
 * Database: 'draft', 'sent', 'accepted', 'rejected', 'expired'
 * UI: 'draft', 'sent', 'accepted', 'expired', 'cancelled'
 */
export function mapEstimateStatus(uiStatus: string): 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' {
  const statusMap: Record<string, 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'> = {
    'draft': 'draft',
    'sent': 'sent',
    'accepted': 'accepted',
    'rejected': 'rejected',
    'expired': 'expired',
    'cancelled': 'rejected', // Map 'cancelled' to 'rejected' in database
  };

  return statusMap[uiStatus.toLowerCase()] || 'draft';
}

/**
 * Map estimate status from database to UI
 */
export function mapEstimateStatusToUI(dbStatus: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'draft',
    'sent': 'sent',
    'accepted': 'accepted',
    'rejected': 'cancelled', // Map 'rejected' to 'cancelled' in UI
    'expired': 'expired',
  };

  return statusMap[dbStatus.toLowerCase()] || dbStatus;
}

/**
 * Map delivery note status from UI to database
 * Database: 'draft', 'delivered', 'cancelled'
 * UI: 'pending', 'in_transit', 'delivered', 'cancelled'
 */
export function mapDeliveryNoteStatus(uiStatus: string): 'draft' | 'delivered' | 'cancelled' {
  const statusMap: Record<string, 'draft' | 'delivered' | 'cancelled'> = {
    'draft': 'draft',
    'pending': 'draft', // Map 'pending' to 'draft' in database
    'in_transit': 'draft', // Map 'in_transit' to 'draft' in database
    'delivered': 'delivered',
    'cancelled': 'cancelled',
  };

  return statusMap[uiStatus.toLowerCase()] || 'draft';
}

/**
 * Map delivery note status from database to UI
 */
export function mapDeliveryNoteStatusToUI(dbStatus: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'pending', // Map 'draft' to 'pending' in UI
    'delivered': 'delivered',
    'cancelled': 'cancelled',
  };

  return statusMap[dbStatus.toLowerCase()] || dbStatus;
}

/**
 * Map credit note status from UI to database
 * Database: 'draft', 'sent', 'applied', 'cancelled'
 * UI: 'draft', 'pending', 'approved', 'cancelled'
 */
export function mapCreditNoteStatus(uiStatus: string): 'draft' | 'sent' | 'applied' | 'cancelled' {
  const statusMap: Record<string, 'draft' | 'sent' | 'applied' | 'cancelled'> = {
    'draft': 'draft',
    'pending': 'sent', // Map 'pending' to 'sent' in database
    'sent': 'sent',
    'approved': 'applied', // Map 'approved' to 'applied' in database
    'applied': 'applied',
    'cancelled': 'cancelled',
  };

  return statusMap[uiStatus.toLowerCase()] || 'draft';
}

/**
 * Map credit note status from database to UI
 */
export function mapCreditNoteStatusToUI(dbStatus: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'draft',
    'sent': 'pending', // Map 'sent' to 'pending' in UI
    'applied': 'approved', // Map 'applied' to 'approved' in UI
    'cancelled': 'cancelled',
  };

  return statusMap[dbStatus.toLowerCase()] || dbStatus;
}

/**
 * Map purchase order status from UI to database
 * Database: 'draft', 'sent', 'confirmed', 'received', 'cancelled'
 * UI: 'pending', 'shipped', 'received', 'cancelled'
 */
export function mapPurchaseOrderStatus(uiStatus: string): 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled' {
  const statusMap: Record<string, 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'> = {
    'draft': 'draft',
    'pending': 'sent', // Map 'pending' to 'sent' in database
    'sent': 'sent',
    'shipped': 'confirmed', // Map 'shipped' to 'confirmed' in database
    'confirmed': 'confirmed',
    'received': 'received',
    'cancelled': 'cancelled',
  };

  return statusMap[uiStatus.toLowerCase()] || 'draft';
}

/**
 * Map purchase order status from database to UI
 */
export function mapPurchaseOrderStatusToUI(dbStatus: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'pending', // Map 'draft' to 'pending' in UI
    'sent': 'pending',
    'confirmed': 'shipped', // Map 'confirmed' to 'shipped' in UI
    'received': 'received',
    'cancelled': 'cancelled',
  };

  return statusMap[dbStatus.toLowerCase()] || dbStatus;
}

/**
 * Map purchase invoice status from UI to database
 * Database: 'draft', 'received', 'paid', 'overdue', 'cancelled'
 * UI: 'pending', 'paid', 'overdue', 'cancelled'
 */
export function mapPurchaseInvoiceStatus(uiStatus: string): 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled' {
  const statusMap: Record<string, 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled'> = {
    'draft': 'draft',
    'pending': 'received', // Map 'pending' to 'received' in database
    'received': 'received',
    'paid': 'paid',
    'overdue': 'overdue',
    'cancelled': 'cancelled',
  };

  return statusMap[uiStatus.toLowerCase()] || 'draft';
}

/**
 * Map purchase invoice status from database to UI
 */
export function mapPurchaseInvoiceStatusToUI(dbStatus: string): string {
  const statusMap: Record<string, string> = {
    'draft': 'pending', // Map 'draft' to 'pending' in UI
    'received': 'pending', // Map 'received' to 'pending' in UI
    'paid': 'paid',
    'overdue': 'overdue',
    'cancelled': 'cancelled',
  };

  return statusMap[dbStatus.toLowerCase()] || dbStatus;
}
