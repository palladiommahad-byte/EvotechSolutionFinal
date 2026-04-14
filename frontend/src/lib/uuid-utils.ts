/**
 * UUID utility functions
 * Helps validate and handle UUIDs properly
 */

/**
 * Check if a string is a valid UUID format
 */
export function isValidUUID(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Extract UUID from a value, returning null if invalid
 */
export function extractUUID(value: string | { id?: string } | null | undefined): string | null {
  if (!value) {
    return null;
  }
  
  // If it's an object with an id property
  if (typeof value === 'object' && 'id' in value) {
    const id = value.id;
    return isValidUUID(id) ? id : null;
  }
  
  // If it's a string
  if (typeof value === 'string') {
    return isValidUUID(value) ? value : null;
  }
  
  return null;
}

/**
 * Get UUID from client/supplier data, with validation
 */
export function getContactUUID(
  contactData?: { id?: string } | null,
  fallback?: string | null
): string | null {
  // First try to get from contactData
  if (contactData?.id && isValidUUID(contactData.id)) {
    return contactData.id;
  }
  
  // Then try fallback
  if (fallback && isValidUUID(fallback)) {
    return fallback;
  }
  
  return null;
}
