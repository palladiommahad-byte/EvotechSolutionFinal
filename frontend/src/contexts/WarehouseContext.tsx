import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useMemo } from 'react';
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from '@/hooks/useSettings';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useSettings';
import { useAuth } from './AuthContext';

export type Warehouse = string | 'all';

export interface WarehouseInfo {
  id: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
}

const initialWarehouses: WarehouseInfo[] = [
  { id: 'marrakech', name: 'Marrakech Warehouse', city: 'Marrakech' },
  { id: 'agadir', name: 'Agadir Warehouse', city: 'Agadir' },
  { id: 'ouarzazate', name: 'Ouarzazate Warehouse', city: 'Ouarzazate' },
];

interface WarehouseContextType {
  activeWarehouse: Warehouse;
  setActiveWarehouse: (warehouse: Warehouse) => Promise<void>;
  warehouseInfo: WarehouseInfo | null;
  isAllWarehouses: boolean;
  warehouses: WarehouseInfo[];
  addWarehouse: (warehouse: Omit<WarehouseInfo, 'id'>) => Promise<WarehouseInfo>;
  updateWarehouse: (id: string, warehouse: Partial<WarehouseInfo>) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  isLoading: boolean;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

// Helper function to validate UUID format
const isValidUUID = (str: string | undefined | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const WarehouseProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  // Fetch warehouses from database
  const { data: dbWarehouses = [], isLoading: isLoadingWarehouses } = useWarehouses();
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();
  const deleteMutation = useDeleteWarehouse();

  // Only use userId if it's a valid UUID
  const userId = user?.id && isValidUUID(user.id) ? user.id : '';

  // Fetch user preferences for active warehouse
  const { data: userPreferences } = useUserPreferences(userId);
  const updatePreferencesMutation = useUpdateUserPreferences();

  // Convert database warehouses to WarehouseInfo format
  const warehouses: WarehouseInfo[] = useMemo(() => {
    if (dbWarehouses.length > 0) {
      return dbWarehouses.map(w => ({
        id: w.id,
        name: w.name,
        city: w.city,
        address: w.address,
        phone: w.phone,
        email: w.email,
      }));
    }
    return initialWarehouses;
  }, [dbWarehouses]);

  // Initialize active warehouse as 'all' by default
  const [activeWarehouse, setActiveWarehouseState] = useState<Warehouse>('all');

  // Update active warehouse when user preferences change
  useEffect(() => {
    if (userPreferences) {
      const prefWarehouse = userPreferences.active_warehouse_id;

      if (prefWarehouse) {
        // Verify the warehouse still exists
        if (warehouses.find(w => w.id === prefWarehouse)) {
          setActiveWarehouseState(prefWarehouse);
        } else {
          // If preference invalid, revert to all
          setActiveWarehouseState('all');
        }
      } else {
        // Null or undefined preference means 'all'
        setActiveWarehouseState('all');
      }
    }
  }, [userPreferences, warehouses]);

  // Use ref to track active warehouse to avoid dependency issues
  const activeWarehouseRef = useRef(activeWarehouse);
  activeWarehouseRef.current = activeWarehouse;

  // Update active warehouse if current one doesn't exist (only when warehouses change)
  useEffect(() => {
    const currentActive = activeWarehouseRef.current;

    if (!Array.isArray(warehouses) || warehouses.length === 0) {
      if (currentActive !== 'all') {
        setActiveWarehouseState('all');
      }
      return;
    }

    if (currentActive !== 'all' && typeof currentActive === 'string') {
      const exists = warehouses.find(w => w.id === currentActive);
      if (!exists && warehouses.length > 0) {
        // Current active warehouse doesn't exist, switch to first available
        setActiveWarehouseState(warehouses[0].id);
      }
    }
  }, [warehouses]);

  // Save active warehouse to user preferences
  const setActiveWarehouse = async (warehouse: Warehouse) => {
    setActiveWarehouseState(warehouse);

    // Save to user preferences if user is logged in with valid UUID
    if (user?.id && isValidUUID(user.id)) {
      try {
        await updatePreferencesMutation.mutateAsync({
          userId: user.id,
          preferences: { active_warehouse_id: warehouse === 'all' ? null : warehouse },
        });
      } catch (error) {
        console.error('Error updating user preferences:', error);
      }
    }
  };

  const isAllWarehouses = activeWarehouse === 'all';
  const warehouseInfo = activeWarehouse === 'all'
    ? null
    : warehouses.find(w => w.id === activeWarehouse) || (warehouses.length > 0 ? warehouses[0] : null);

  const addWarehouse = async (warehouse: Omit<WarehouseInfo, 'id'>): Promise<WarehouseInfo> => {
    try {
      const result = await createMutation.mutateAsync(warehouse);
      if (!result) {
        throw new Error('Failed to create warehouse');
      }

      return {
        id: result.id,
        name: result.name,
        city: result.city,
        address: result.address,
        phone: result.phone,
        email: result.email,
      };
    } catch (error) {
      console.error('Error adding warehouse:', error);
      throw error;
    }
  };

  const updateWarehouse = async (id: string, updates: Partial<WarehouseInfo>) => {
    try {
      await updateMutation.mutateAsync({ id, warehouse: updates });
    } catch (error) {
      console.error('Error updating warehouse:', error);
      throw error;
    }
  };

  const deleteWarehouse = async (id: string) => {
    // Prevent deleting if it's the only warehouse
    if (warehouses.length <= 1) {
      throw new Error('Cannot delete the only warehouse');
    }

    try {
      await deleteMutation.mutateAsync(id);

      // If deleted warehouse was active, switch to first available
      if (activeWarehouse === id && warehouses.length > 1) {
        const remaining = warehouses.filter(w => w.id !== id);
        if (remaining.length > 0) {
          await setActiveWarehouse(remaining[0].id);
        }
      }
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      throw error;
    }
  };

  // Ensure warehouses is always an array with at least initial warehouses
  const safeWarehouses = Array.isArray(warehouses) && warehouses.length > 0 ? warehouses : initialWarehouses;
  const isLoading = isLoadingWarehouses;

  return (
    <WarehouseContext.Provider value={{
      activeWarehouse,
      setActiveWarehouse,
      warehouseInfo,
      isAllWarehouses,
      warehouses: safeWarehouses,
      addWarehouse,
      updateWarehouse,
      deleteWarehouse,
      isLoading,
    }}>
      {children}
    </WarehouseContext.Provider>
  );
};

export const useWarehouse = () => {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error('useWarehouse must be used within a WarehouseProvider');
  }
  return context;
};
