import { useState, useRef, useEffect, useMemo, ChangeEvent } from 'react';
import { Building2, Upload, Users, Shield, Save, Palette, Trash2, Warehouse, Plus, Edit, MapPin, Phone, Mail, User, Bell, CheckCheck, CheckCircle2, AlertTriangle, X, Info, Filter, XCircle, Circle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ThemeCustomizer } from '@/components/settings/ThemeCustomizer';
import { useCompany } from '@/contexts/CompanyContext';
import { useWarehouse, WarehouseInfo } from '@/contexts/WarehouseContext';
import { useNotifications, NotificationType } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUserPreferences, useUpdateProfile } from '@/hooks/useSettings';
import { useTheme } from '@/contexts/ThemeContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// TeamUser type definition
type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'accountant' | 'staff';
  status: 'active' | 'inactive';
  password?: string;
};

// Helper function to safely convert any value to string
// This prevents "Cannot convert object to primitive value" errors
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    // If it's an object, try to stringify it or return empty string
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
};

// Helper function to validate UUID format
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Simple hash function for password (in production, use bcrypt)
const hashPassword = (password: string): string => {
  // Simple hash for demo - in production use bcrypt
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash)}`;
};

export const Settings = () => {
  const { t } = useTranslation();
  const { companyInfo, updateCompanyInfo } = useCompany();
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse, activeWarehouse, setActiveWarehouse } = useWarehouse();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications();
  const { user: currentUser } = useAuth();
  const { currentTheme, setTheme } = useTheme();
  // Ensure userId is always a string, never an object
  // Only use userId if it's a valid UUID (database requires UUID format)
  const userId = currentUser?.id ? String(currentUser.id) : '';
  const isValidUserId = userId && isValidUUID(userId);
  const { data: userPreferences } = useUserPreferences(isValidUserId ? userId : '');

  // Fetch users from database
  const { data: dbUsers = [], isLoading: isLoadingUsers } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const isAdmin = currentUser?.role ? String(currentUser.role) === 'admin' : false;
  const isManager = currentUser?.role ? String(currentUser.role) === 'manager' : false;

  // Initialize formData with safe defaults to prevent object-to-primitive errors
  const [formData, setFormData] = useState(() => {
    try {
      return {
        name: safeString(companyInfo?.name),
        legalForm: safeString(companyInfo?.legalForm),
        email: safeString(companyInfo?.email),
        phone: safeString(companyInfo?.phone),
        address: safeString(companyInfo?.address),
        ice: safeString(companyInfo?.ice),
        ifNumber: safeString(companyInfo?.ifNumber),
        rc: safeString(companyInfo?.rc),
        tp: safeString(companyInfo?.tp),
        cnss: safeString(companyInfo?.cnss),
        logo: companyInfo?.logo ? safeString(companyInfo.logo) : null,
        footerText: safeString(companyInfo?.footerText),
      };
    } catch (error) {
      console.error('Error initializing formData:', error);
      return {
        name: '',
        legalForm: '',
        email: '',
        phone: '',
        address: '',
        ice: '',
        ifNumber: '',
        rc: '',
        tp: '',
        cnss: '',
        logo: null,
        footerText: '',
      };
    }
  });
  const [showLogo, setShowLogo] = useState(true);
  const [autoNumber, setAutoNumber] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert database users to TeamUser format for compatibility
  // Ensure all values are primitives to prevent object-to-primitive errors
  // Use useMemo to prevent unnecessary recalculations
  const users = useMemo(() => {
    if (!dbUsers || dbUsers.length === 0) {
      return [];
    }
    return dbUsers.map(u => {
      try {
        return {
          id: safeString(u.id),
          name: safeString(u.name),
          email: safeString(u.email || ''),
          role: (safeString(u.role_id) || 'staff') as 'admin' | 'manager' | 'accountant' | 'staff',
          status: (safeString(u.status) || 'active') as 'active' | 'inactive',
        };
      } catch (error) {
        console.error('Error converting user:', error, u);
        return {
          id: '',
          name: '',
          email: '',
          role: 'staff' as const,
          status: 'active' as const,
        };
      }
    });
  }, [dbUsers]);

  const [userToDelete, setUserToDelete] = useState<typeof users[0] | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<typeof users[0] | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState<Omit<TeamUser, 'id' | 'password'> & { password: string }>({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    status: 'active',
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: safeString(currentUser?.name),
    email: safeString(currentUser?.email),
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const updateProfileMutation = useUpdateProfile();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Notification filters
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [notificationTypeFilter, setNotificationTypeFilter] = useState<NotificationType | 'all'>('all');

  // Sync theme from database when user preferences load
  useEffect(() => {
    if (userPreferences?.theme_color && setTheme && userPreferences.theme_color !== currentTheme) {
      try {
        setTheme(userPreferences.theme_color as typeof currentTheme);
      } catch (error) {
        console.warn('Error syncing theme:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPreferences?.theme_color]);

  // Sync formData when companyInfo changes (e.g., from localStorage)
  // Use a serialized version of companyInfo to prevent infinite loops
  const companyInfoString = useMemo(() => {
    if (!companyInfo) return '';
    return JSON.stringify({
      name: companyInfo.name,
      legalForm: companyInfo.legalForm,
      email: companyInfo.email,
      phone: companyInfo.phone,
      address: companyInfo.address,
      ice: companyInfo.ice,
      ifNumber: companyInfo.ifNumber,
      rc: companyInfo.rc,
      tp: companyInfo.tp,
      cnss: companyInfo.cnss,
      logo: companyInfo.logo,
      footerText: companyInfo.footerText,
    });
  }, [
    companyInfo?.name,
    companyInfo?.legalForm,
    companyInfo?.email,
    companyInfo?.phone,
    companyInfo?.address,
    companyInfo?.ice,
    companyInfo?.ifNumber,
    companyInfo?.rc,
    companyInfo?.tp,
    companyInfo?.cnss,
    companyInfo?.logo,
    companyInfo?.footerText,
  ]);

  useEffect(() => {
    if (!companyInfo) return;

    try {
      const newFormData = {
        name: safeString(companyInfo.name),
        legalForm: safeString(companyInfo.legalForm),
        email: safeString(companyInfo.email),
        phone: safeString(companyInfo.phone),
        address: safeString(companyInfo.address),
        ice: safeString(companyInfo.ice),
        ifNumber: safeString(companyInfo.ifNumber),
        rc: safeString(companyInfo.rc),
        tp: safeString(companyInfo.tp),
        cnss: safeString(companyInfo.cnss),
        logo: companyInfo.logo ? safeString(companyInfo.logo) : null,
        footerText: safeString(companyInfo.footerText),
      };

      // Only update if values actually changed to prevent unnecessary re-renders
      setFormData(prev => {
        const prevString = JSON.stringify(prev);
        const newString = JSON.stringify(newFormData);
        if (prevString !== newString) {
          return newFormData;
        }
        return prev;
      });
    } catch (error) {
      console.error('Error syncing formData:', error);
    }
  }, [companyInfoString]);

  // Warehouse management states
  const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseInfo | null>(null);
  const [isWarehouseDialogOpen, setIsWarehouseDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseInfo | null>(null);
  const [warehouseForm, setWarehouseForm] = useState<Omit<WarehouseInfo, 'id'>>({
    name: '',
    city: '',
    address: '',
    phone: '',
    email: '',
  });

  const handleInputChange = (field: keyof typeof companyInfo, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSaveCompany = () => {
    updateCompanyInfo(formData);
    toast({
      title: "Success",
      description: "Company information saved successfully.",
      variant: "success",
    });
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Logo file size must be less than 2MB.",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const logoUrl = reader.result as string;
        setFormData({ ...formData, logo: logoUrl });
        updateCompanyInfo({ logo: logoUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo: null });
    updateCompanyInfo({ logo: null });
  };

  const handleSaveBranding = () => {
    updateCompanyInfo({
      logo: formData.logo,
      footerText: formData.footerText,
    });
    toast({
      title: "Success",
      description: "Branding settings saved successfully.",
      variant: "success",
    });
  };

  const handleUpdateProfile = async () => {
    if (profileForm.newPassword) {
      if (profileForm.newPassword.length < 6) {
        toast({
          title: "Invalid Password",
          description: "Password must be at least 6 characters long.",
          variant: "destructive",
        });
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "New passwords do not match.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsUpdatingProfile(true);
      await updateProfileMutation.mutateAsync({
        name: profileForm.name,
        email: profileForm.email,
        password: profileForm.newPassword || undefined,
      });

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
        variant: "success",
      });

      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can change user status.",
        variant: "destructive",
      });
      return;
    }

    const user = users.find(u => u.id === userId);
    // Prevent changing admin status
    if (user?.role === 'admin') {
      toast({
        title: "Cannot Change Status",
        description: "Admin users must always remain active.",
        variant: "destructive",
      });
      return;
    }

    const newStatus = user?.status === 'active' ? 'inactive' : 'active';

    try {
      await updateUserMutation.mutateAsync({
        id: userId,
        user: { status: newStatus },
      });

      // Trigger user status change event to log out user if status changed to inactive
      if (newStatus === 'inactive' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userStatusChanged', { detail: { userId, status: newStatus } }));
      }

      toast({
        title: "Status Updated",
        description: `${user?.name}'s status changed to ${newStatus}. ${newStatus === 'inactive' ? 'User will be logged out if currently active.' : ''}`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can delete team members.",
        variant: "destructive",
      });
      setUserToDelete(null);
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      setUserToDelete(null);
      return;
    }

    // Check if trying to delete admin
    if (user.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      // Prevent deleting if it's the only admin
      if (adminCount <= 1) {
        toast({
          title: "Cannot Delete Admin",
          description: "Cannot delete the only admin. At least one admin user is required.",
          variant: "destructive",
        });
        setUserToDelete(null);
        return;
      }
    }

    try {
      await deleteUserMutation.mutateAsync(userId);
      setUserToDelete(null);
      toast({
        title: "User Deleted",
        description: `${safeString(user.name)} has been removed from the team.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenUserDialog = (user?: TeamUser) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        name: user.name,
        email: user.email,
        password: '', // Don't show existing password for security
        role: user.role,
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setUserForm({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        status: 'active',
      });
    }
    setShowPassword(false);
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only admins can add or edit team members.",
        variant: "destructive",
      });
      return;
    }

    if (!userForm.name) {
      toast({
        title: "Validation Error",
        description: "Name is a required field.",
        variant: "destructive",
      });
      return;
    }

    // Email is required for login credentials
    if (!userForm.email) {
      toast({
        title: "Validation Error",
        description: "Email is required for team members to login.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userForm.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Password is required for new users or if updating password
    if (!editingUser && !userForm.password) {
      toast({
        title: "Validation Error",
        description: "Password is required for new team members.",
        variant: "destructive",
      });
      return;
    }

    if (userForm.password && userForm.password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    // Check if email is already used by another user
    const emailExists = users.some(u => u.email === userForm.email && (!editingUser || u.id !== editingUser.id));
    if (emailExists) {
      toast({
        title: "Validation Error",
        description: "This email is already in use by another user.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingUser) {
        // If editing admin, only allow updating name and email, not role or status
        if (editingUser.role === 'admin') {
          await updateUserMutation.mutateAsync({
            id: editingUser.id,
            user: {
              name: userForm.name,
              email: userForm.email,
              password_hash: userForm.password ? hashPassword(userForm.password) : undefined,
            },
          });

          // Trigger user update event for email/password changes
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: { userId: editingUser.id } }));
          }

          toast({
            title: "Admin Updated",
            description: "Admin information has been updated successfully. New credentials are active immediately.",
            variant: "success",
          });
        } else {
          await updateUserMutation.mutateAsync({
            id: editingUser.id,
            user: {
              name: userForm.name,
              email: userForm.email,
              role_id: userForm.role,
              status: userForm.status,
              password_hash: userForm.password ? hashPassword(userForm.password) : undefined,
            },
          });

          // Trigger user update event for email/password changes
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: { userId: editingUser.id } }));
          }

          toast({
            title: "User Updated",
            description: `${userForm.name} has been updated successfully. New credentials are active immediately.`,
            variant: "success",
          });
        }
      } else {
        // Add new user
        await createUserMutation.mutateAsync({
          name: userForm.name,
          email: userForm.email,
          password: userForm.password,
          role_id: userForm.role,
          status: userForm.status,
        });

        toast({
          title: "User Added",
          description: `${userForm.name} has been added to the team successfully. Login credentials have been set.`,
          variant: "success",
        });
      }

      setIsUserDialogOpen(false);
      setEditingUser(null);
      setShowPassword(false);
      setUserForm({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        status: 'active',
      });
    } catch (error) {
      toast({
        title: "Error",
        description: editingUser ? "Failed to update user. Please try again." : "Failed to create user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Warehouse management functions
  const handleOpenWarehouseDialog = (warehouse?: WarehouseInfo) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setWarehouseForm({
        name: warehouse.name,
        city: warehouse.city,
        address: warehouse.address || '',
        phone: warehouse.phone || '',
        email: warehouse.email || '',
      });
    } else {
      setEditingWarehouse(null);
      setWarehouseForm({
        name: '',
        city: '',
        address: '',
        phone: '',
        email: '',
      });
    }
    setIsWarehouseDialogOpen(true);
  };

  const handleSaveWarehouse = async () => {
    if (!warehouseForm.name || !warehouseForm.city) {
      toast({
        title: "Validation Error",
        description: "Name and City are required fields.",
        variant: "destructive",
      });
      return;
    }

    if (editingWarehouse) {
      updateWarehouse(editingWarehouse.id, warehouseForm);
      toast({
        title: "Warehouse Updated",
        description: `${safeString(warehouseForm.name)} has been updated successfully.`,
        variant: "success",
      });
    } else {
      const newWarehouse = await addWarehouse(warehouseForm);
      toast({
        title: "Warehouse Created",
        description: `${safeString(warehouseForm.name)} has been added successfully.`,
        variant: "success",
      });
      // Set as active warehouse if it's the first one
      if (!warehouses || warehouses.length === 0) {
        setActiveWarehouse(newWarehouse.id);
      }
    }

    setIsWarehouseDialogOpen(false);
    setEditingWarehouse(null);
    setWarehouseForm({
      name: '',
      city: '',
      address: '',
      phone: '',
      email: '',
    });
  };

  const handleDeleteWarehouse = (id: string) => {
    if (!warehouses || warehouses.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one warehouse.",
        variant: "destructive",
      });
      setWarehouseToDelete(null);
      return;
    }

    const warehouse = warehouses.find(w => w.id === id);
    if (warehouse) {
      deleteWarehouse(id);
      setWarehouseToDelete(null);
      toast({
        title: "Warehouse Deleted",
        description: `${safeString(warehouseForm.name)} has been removed.`,
        variant: "success",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="company" className="gap-2 rounded-md">
            <Building2 className="w-4 h-4" />
            {t('settings.company')}
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 rounded-md">
            <Upload className="w-4 h-4" />
            {t('settings.branding')}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 rounded-md">
            <Palette className="w-4 h-4" />
            {t('settings.appearance')}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 rounded-md">
            <Users className="w-4 h-4" />
            {t('settings.usersAndRoles')}
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="gap-2 rounded-md">
            <Warehouse className="w-4 h-4" />
            {t('settings.warehouses')}
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 rounded-md">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 rounded-md relative">
            <Bell className="w-4 h-4" />
            {t('settings.notifications')}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company" className="animate-fade-in">
          <div className="card-elevated p-6">
            <h3 className="text-lg font-heading font-semibold text-foreground mb-6">{t('settings.companyInformation')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">{t('settings.companyName')}</Label>
                <Input
                  id="companyName"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalForm">{t('settings.legalForm')}</Label>
                <Select value={formData.legalForm} onValueChange={(value) => handleInputChange('legalForm', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SARL">SARL</SelectItem>
                    <SelectItem value="SA">SA</SelectItem>
                    <SelectItem value="SAS">SAS</SelectItem>
                    <SelectItem value="Auto-entrepreneur">Auto-entrepreneur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('common.phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div className="col-span-full space-y-2">
                <Label htmlFor="address">{t('common.address')}</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>
            </div>

            <div className="border-t border-border mt-6 pt-6">
              <h4 className="font-medium text-foreground mb-4">{t('settings.moroccanBusinessIdentifiers')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ice">ICE</Label>
                  <Input
                    id="ice"
                    value={formData.ice}
                    onChange={(e) => handleInputChange('ice', e.target.value)}
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="if">{t('settings.ifNumber')}</Label>
                  <Input
                    id="if"
                    value={formData.ifNumber}
                    onChange={(e) => handleInputChange('ifNumber', e.target.value)}
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rc">{t('settings.rc')}</Label>
                  <Input
                    id="rc"
                    value={formData.rc}
                    onChange={(e) => handleInputChange('rc', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tp">{t('settings.tp')}</Label>
                  <Input
                    id="tp"
                    value={formData.tp}
                    onChange={(e) => handleInputChange('tp', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnss">{t('settings.cnss')}</Label>
                  <Input
                    id="cnss"
                    value={formData.cnss}
                    onChange={(e) => handleInputChange('cnss', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button className="gap-2 btn-primary-gradient" onClick={handleSaveCompany}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding" className="animate-fade-in">
          <div className="card-elevated p-6">
            <h3 className="text-lg font-heading font-semibold text-foreground mb-6">Branding & Logo</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Logo Upload */}
              <div>
                <Label className="mb-3 block">Company Logo</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  {formData.logo ? (
                    <div className="space-y-4">
                      <img src={formData.logo} alt="Company logo" className="max-h-32 mx-auto" />
                      <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                        Remove Logo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-lg bg-primary/10 mx-auto flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Upload your logo</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Settings */}
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">Invoice Footer Text</Label>
                  <Textarea
                    placeholder="Terms and conditions, payment information..."
                    value={formData.footerText || ''}
                    onChange={(e) => handleInputChange('footerText', e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-section rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Show Logo on Invoices</p>
                    <p className="text-sm text-muted-foreground">Display company logo on all documents</p>
                  </div>
                  <Switch checked={showLogo} onCheckedChange={setShowLogo} />
                </div>
                <div className="flex items-center justify-between p-4 bg-section rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Auto-number Documents</p>
                    <p className="text-sm text-muted-foreground">Automatically generate document numbers</p>
                  </div>
                  <Switch checked={autoNumber} onCheckedChange={setAutoNumber} />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button className="gap-2 btn-primary-gradient" onClick={handleSaveBranding}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="animate-fade-in">
          <ThemeCustomizer />
        </TabsContent>

        {/* Users & Roles */}
        <TabsContent value="users" className="animate-fade-in space-y-6">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground">Team Members</h3>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? "Manage user access and permissions" : "View user access and permissions (read-only)"}
                </p>
              </div>
              {isAdmin && (
                <Button
                  className="gap-2 btn-primary-gradient"
                  onClick={() => handleOpenUserDialog()}
                >
                  <Plus className="w-4 h-4" />
                  Add Team Member
                </Button>
              )}
            </div>

            {!isAdmin && (
              <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg flex items-start gap-3">
                <Shield className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">View Only Mode</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You have view-only access to this section. Only administrators can add, edit, or delete team members.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {users.map((user) => {
                const adminCount = users.filter(u => u.role === 'admin').length;
                const canDeleteAdmin = user.role === 'admin' && adminCount > 1;
                const showDeleteButton = user.role !== 'admin' || canDeleteAdmin;

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-section rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={undefined} alt={safeString(user.name)} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {safeString(user.name).split(' ').map(n => n[0]).join('').toUpperCase() || <User className="w-5 h-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{safeString(user.name)}</p>
                        <p className={cn(
                          "text-sm truncate",
                          user.email ? "text-muted-foreground" : "text-muted-foreground/60 italic"
                        )}>
                          {safeString(user.email) || "No email"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenUserDialog(user)}
                          title={user.role === 'admin' ? "Edit admin information" : "Edit user"}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      <Select
                        value={user.role}
                        disabled={!isAdmin || user.role === 'admin'}
                        onValueChange={(value: TeamUser['role']) => {
                          if (!isAdmin) {
                            toast({
                              title: "Permission Denied",
                              description: "Only admins can change user roles.",
                              variant: "destructive",
                            });
                            return;
                          }
                          if (user.role !== 'admin') {
                            // Update user role in database
                            updateUserMutation.mutate({
                              id: user.id,
                              user: { role_id: value },
                            }, {
                              onSuccess: () => {
                                toast({
                                  title: "Role Updated",
                                  description: `${safeString(user.name)}'s role has been changed to ${value}.`,
                                });
                              },
                              onError: () => {
                                toast({
                                  title: "Error",
                                  description: "Failed to update user role. Please try again.",
                                  variant: "destructive",
                                });
                              },
                            });
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-[130px]",
                            (!isAdmin || user.role === 'admin') && "opacity-60 cursor-not-allowed"
                          )}
                          title={
                            !isAdmin
                              ? "Only admins can change roles"
                              : user.role === 'admin'
                                ? "Admin role cannot be changed"
                                : undefined
                          }
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => isAdmin && handleToggleStatus(user.id)}
                        className={cn(
                          !isAdmin || user.role === 'admin' ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        )}
                        disabled={!isAdmin || user.role === 'admin'}
                        title={
                          !isAdmin
                            ? "Only admins can change user status"
                            : user.role === 'admin'
                              ? "Admin users must always remain active"
                              : `Click to change status to ${user.status === 'active' ? 'inactive' : 'active'}`
                        }
                      >
                        <StatusBadge status={user.status === 'active' ? 'success' : 'default'}>
                          {safeString(user.status)}
                        </StatusBadge>
                      </button>
                      {isAdmin && showDeleteButton && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10",
                            !canDeleteAdmin && user.role === 'admin' && "opacity-60 cursor-not-allowed"
                          )}
                          onClick={() => {
                            if (canDeleteAdmin || user.role !== 'admin') {
                              setUserToDelete(user);
                            }
                          }}
                          disabled={user.role === 'admin' && !canDeleteAdmin}
                          title={
                            user.role === 'admin' && !canDeleteAdmin
                              ? "Cannot delete the only admin. At least one admin is required."
                              : "Delete user"
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add/Edit User Dialog */}
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingUser ? (editingUser.role === 'admin' ? 'Edit Admin Information' : 'Edit Team Member') : 'Add New Team Member'}</DialogTitle>
                  <DialogDescription>
                    {editingUser
                      ? editingUser.role === 'admin'
                        ? 'Update admin name, email, and password. Role and status cannot be changed for admin users.'
                        : 'Update team member information below. Leave password empty to keep current password.'
                      : 'Fill in the details to add a new team member. Email and password are required for login.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Full Name *</Label>
                    <Input
                      id="user-name"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="e.g., John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">Email *</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="e.g., john.doe@company.ma"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-password">
                      Password {!editingUser && '*'}
                      {editingUser && <span className="text-xs text-muted-foreground font-normal">(leave empty to keep current)</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        id="user-password"
                        type={showPassword ? 'text' : 'password'}
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder={editingUser ? "Enter new password (optional)" : "Enter password (min 6 characters)"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {(!editingUser || editingUser.role !== 'admin') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="user-role">Role</Label>
                        <Select
                          value={userForm.role}
                          onValueChange={(value: TeamUser['role']) => setUserForm({ ...userForm, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-status">Status</Label>
                        <Select
                          value={userForm.status}
                          onValueChange={(value: TeamUser['status']) => setUserForm({ ...userForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {editingUser && editingUser.role === 'admin' && (
                    <div className="p-3 bg-muted rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> Admin users cannot change their role or status. You can only update the name and email.
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveUser} className="gap-2 btn-primary-gradient">
                    <Save className="w-4 h-4" />
                    {editingUser ? 'Update' : 'Add'} Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove <strong>{userToDelete?.name}</strong> from the team? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => userToDelete && handleDeleteUser(userToDelete.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Roles Explanation */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-heading font-semibold text-foreground">Role Permissions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-section rounded-lg border border-border/50">
                <p className="font-medium text-foreground">Admin</p>
                <p className="text-sm text-muted-foreground">Full access to all features and settings</p>
              </div>
              <div className="p-4 bg-section rounded-lg border border-border/50">
                <p className="font-medium text-foreground">Manager</p>
                <p className="text-sm text-muted-foreground">Manage inventory, CRM, and reports</p>
              </div>
              <div className="p-4 bg-section rounded-lg border border-border/50">
                <p className="font-medium text-foreground">Accountant</p>
                <p className="text-sm text-muted-foreground">Access to invoicing and tax reports</p>
              </div>
              <div className="p-4 bg-section rounded-lg border border-border/50">
                <p className="font-medium text-foreground">Staff</p>
                <p className="text-sm text-muted-foreground">View and basic operations only</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Warehouses Management */}
        <TabsContent value="warehouses" className="animate-fade-in space-y-6">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground">Warehouses</h3>
                <p className="text-sm text-muted-foreground">Manage your warehouse locations and information</p>
              </div>
              <Button
                className="gap-2 btn-primary-gradient"
                onClick={() => handleOpenWarehouseDialog()}
              >
                <Plus className="w-4 h-4" />
                Add Warehouse
              </Button>
            </div>

            {!warehouses || warehouses.length === 0 ? (
              <div className="text-center py-12">
                <Warehouse className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No warehouses found. Add your first warehouse to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {warehouses.map((warehouse) => (
                  <div
                    key={warehouse.id}
                    className="flex items-center justify-between p-4 bg-section rounded-lg hover:bg-muted/50 transition-colors border border-border"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Warehouse className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">{safeString(warehouse.name)}</p>
                          {activeWarehouse === warehouse.id && (
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md font-medium">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{safeString(warehouse.city)}</span>
                            {warehouse.address && <span>• {safeString(warehouse.address)}</span>}
                          </div>
                          {warehouse.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{safeString(warehouse.phone)}</span>
                            </div>
                          )}
                          {warehouse.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <span>{safeString(warehouse.email)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenWarehouseDialog(warehouse)}
                        title="Edit warehouse"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setWarehouseToDelete(warehouse)}
                        title="Delete warehouse"
                        disabled={!warehouses || warehouses.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warehouse Dialog - Create/Edit */}
          <Dialog open={isWarehouseDialogOpen} onOpenChange={setIsWarehouseDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</DialogTitle>
                <DialogDescription>
                  {editingWarehouse
                    ? 'Update warehouse information below.'
                    : 'Fill in the details to add a new warehouse location.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="warehouse-name">Warehouse Name *</Label>
                    <Input
                      id="warehouse-name"
                      value={warehouseForm.name}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                      placeholder="e.g., Marrakech Warehouse"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warehouse-city">City *</Label>
                    <Input
                      id="warehouse-city"
                      value={warehouseForm.city}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, city: e.target.value })}
                      placeholder="e.g., Marrakech"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse-address">Address</Label>
                  <Input
                    id="warehouse-address"
                    value={warehouseForm.address}
                    onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                    placeholder="Street address, zone, etc."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="warehouse-phone">Phone</Label>
                    <Input
                      id="warehouse-phone"
                      type="tel"
                      value={warehouseForm.phone}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
                      placeholder="+212 XXX XXX XXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warehouse-email">Email</Label>
                    <Input
                      id="warehouse-email"
                      type="email"
                      value={warehouseForm.email}
                      onChange={(e) => setWarehouseForm({ ...warehouseForm, email: e.target.value })}
                      placeholder="warehouse@example.com"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsWarehouseDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveWarehouse} className="gap-2 btn-primary-gradient">
                  <Save className="w-4 h-4" />
                  {editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Warehouse Confirmation Dialog */}
          <AlertDialog open={!!warehouseToDelete} onOpenChange={(open) => !open && setWarehouseToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{warehouseToDelete?.name}</strong>? This action cannot be undone.
                  {warehouses && warehouses.length === 1 && (
                    <span className="block mt-2 text-destructive font-medium">
                      This is the only warehouse. You must have at least one warehouse.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => warehouseToDelete && handleDeleteWarehouse(warehouseToDelete.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={!warehouses || warehouses.length === 1}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="profile" className="animate-fade-in">
          <div className="card-elevated p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground">Account Profile</h3>
                <p className="text-sm text-muted-foreground">Manage your personal information and security credentials</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input
                    id="profile-name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email Address</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h4 className="font-medium text-foreground mb-4">Change Password</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                        placeholder="Leave empty to keep current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  className="gap-2 btn-primary-gradient"
                  onClick={handleUpdateProfile}
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Profile Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Management */}
        <TabsContent value="notifications" className="animate-fade-in space-y-6">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-heading font-semibold text-foreground">Notification Center</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your notifications and preferences
                  {unreadCount > 0 && (
                    <span className="ml-2 text-primary font-medium">{unreadCount} unread</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    {unreadCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          markAllAsRead();
                          toast({
                            title: "All marked as read",
                            description: "All notifications have been marked as read.",
                            variant: "success",
                          });
                        }}
                      >
                        <CheckCheck className="w-4 h-4" />
                        Mark all read
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => {
                        clearAllNotifications();
                        toast({
                          title: "Notifications cleared",
                          description: "All notifications have been removed.",
                          variant: "success",
                        });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear all
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Filters */}
            {notifications.length > 0 && (
              <div className="flex items-center gap-4 mb-6 p-4 bg-section rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Filters:</span>
                </div>
                <Select value={notificationFilter} onValueChange={(value: 'all' | 'unread' | 'read') => setNotificationFilter(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={notificationTypeFilter} onValueChange={(value: NotificationType | 'all') => setNotificationTypeFilter(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                {(notificationFilter !== 'all' || notificationTypeFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setNotificationFilter('all');
                      setNotificationTypeFilter('all');
                    }}
                  >
                    <X className="w-4 h-4" />
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {/* Notifications List */}
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium mb-1">No notifications</p>
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (() => {
              const filteredNotifications = notifications.filter(n => {
                const statusMatch = notificationFilter === 'all' ||
                  (notificationFilter === 'read' && n.read) ||
                  (notificationFilter === 'unread' && !n.read);
                const typeMatch = notificationTypeFilter === 'all' || n.type === notificationTypeFilter;
                return statusMatch && typeMatch;
              });

              if (filteredNotifications.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground font-medium mb-1">No notifications match your filters</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setNotificationFilter('all');
                        setNotificationTypeFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => {
                    const getNotificationIcon = (type: NotificationType) => {
                      switch (type) {
                        case 'success':
                          return <CheckCircle2 className="w-5 h-5 text-success" />;
                        case 'warning':
                          return <AlertTriangle className="w-5 h-5 text-warning" />;
                        case 'error':
                          return <XCircle className="w-5 h-5 text-destructive" />;
                        case 'info':
                        default:
                          return <Info className="w-5 h-5 text-primary" />;
                      }
                    };

                    const getNotificationColor = (type: NotificationType) => {
                      switch (type) {
                        case 'success':
                          return 'border-success/20 bg-success/5';
                        case 'warning':
                          return 'border-warning/20 bg-warning/5';
                        case 'error':
                          return 'border-destructive/20 bg-destructive/5';
                        case 'info':
                        default:
                          return 'border-primary/20 bg-primary/5';
                      }
                    };

                    const formatTime = (timestamp: any) => {
                      try {
                        // Ensure timestamp is converted to a Date object
                        const date = timestamp instanceof Date
                          ? timestamp
                          : new Date(timestamp);

                        // Validate the date
                        if (isNaN(date.getTime())) {
                          return 'Just now';
                        }

                        const now = new Date();
                        const diff = now.getTime() - date.getTime();
                        const seconds = Math.floor(diff / 1000);
                        const minutes = Math.floor(seconds / 60);
                        const hours = Math.floor(minutes / 60);
                        const days = Math.floor(hours / 24);

                        if (seconds < 60) return 'Just now';
                        if (minutes < 60) return `${minutes}m ago`;
                        if (hours < 24) return `${hours}h ago`;
                        if (days < 7) return `${days}d ago`;
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                        });
                      } catch {
                        return 'Just now';
                      }
                    };

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-lg border transition-colors",
                          !notification.read && "bg-primary/5 border-primary/20",
                          notification.read && "bg-section border-border"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg border flex-shrink-0",
                          getNotificationColor(notification.type)
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-1">
                              <p className={cn(
                                "text-sm font-medium text-foreground",
                                !notification.read && "font-semibold"
                              )}>
                                {safeString(notification.title)}
                              </p>
                              {!notification.read && (
                                <Badge variant="default" className="h-4 px-1.5 text-xs">
                                  New
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={cn(
                                  "h-4 px-1.5 text-xs capitalize",
                                  notification.type === 'success' && "border-success text-success",
                                  notification.type === 'warning' && "border-warning text-warning",
                                  notification.type === 'error' && "border-destructive text-destructive",
                                  notification.type === 'info' && "border-primary text-primary"
                                )}
                              >
                                {safeString(notification.type)}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {safeString(notification.message)}
                          </p>
                          <div className="flex items-center gap-2">
                            {!notification.read ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  markAsRead(notification.id);
                                  toast({
                                    title: "Marked as read",
                                    description: "Notification has been marked as read.",
                                    variant: "success",
                                  });
                                }}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Mark as read
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  // For now, we'll just show a message - you could extend the context to support marking as unread
                                  toast({
                                    title: "Info",
                                    description: "Marking as unread is not yet supported.",
                                  });
                                }}
                              >
                                Mark as unread
                              </Button>
                            )}
                            {notification.actionUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  window.location.href = notification.actionUrl!;
                                }}
                              >
                                View
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                deleteNotification(notification.id);
                                toast({
                                  title: "Notification deleted",
                                  description: "The notification has been removed.",
                                });
                              }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Notification Preferences */}
          <div className="card-elevated p-6">
            <h3 className="text-lg font-heading font-semibold text-foreground mb-4">Notification Preferences</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Configure how and when you receive notifications
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-section rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">Browser Notifications</p>
                  <p className="text-sm text-muted-foreground">Enable desktop browser notifications</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-4 bg-section rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified when product stock is low</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-section rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">Order Updates</p>
                  <p className="text-sm text-muted-foreground">Notifications for new orders and status changes</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
            <div className="mt-6">
              <Button className="gap-2 btn-primary-gradient">
                <Save className="w-4 h-4" />
                Save Preferences
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Default export for lazy loading
export default Settings;
