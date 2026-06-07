import { useState, useRef, useEffect, useMemo, ChangeEvent } from 'react';
import { Building2, Upload, Users, Shield, Save, Palette, Trash2, Warehouse, Plus, Edit, MapPin, Phone, Mail, User, Bell, CheckCheck, CheckCircle2, AlertTriangle, X, Info, Filter, XCircle, Circle, Eye, EyeOff, FileText, RotateCcw } from 'lucide-react';
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
import { PDFLivePreview, PDFDesignSettings } from '@/components/settings/PDFLivePreview';
import { useCompany, PDF_DESIGN_DEFAULTS } from '@/contexts/CompanyContext';
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
        patente: safeString(companyInfo?.patente),
        cnss: safeString(companyInfo?.cnss),
        logo: companyInfo?.logo ? safeString(companyInfo.logo) : null,
        footerText: safeString(companyInfo?.footerText),
        pdfPrimaryColor: safeString(companyInfo?.pdfPrimaryColor) || '#3b82f6',
        pdfTitleColor: safeString(companyInfo?.pdfTitleColor) || '#3b82f6',
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
        patente: '',
        cnss: '',
        logo: null,
        footerText: '',
        pdfPrimaryColor: '#3b82f6',
        pdfTitleColor: '#3b82f6',
      };
    }
  });
  const [showLogo, setShowLogo] = useState(companyInfo?.showLogo ?? true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF Design Studio state
  const [pdfDesign, setPdfDesign] = useState<PDFDesignSettings>({
    pdfPrimaryColor: companyInfo?.pdfPrimaryColor || PDF_DESIGN_DEFAULTS.pdfPrimaryColor,
    pdfTitleColor: companyInfo?.pdfTitleColor || PDF_DESIGN_DEFAULTS.pdfTitleColor,
    pdfFontSize: companyInfo?.pdfFontSize ?? PDF_DESIGN_DEFAULTS.pdfFontSize,
    pdfFontFamily: companyInfo?.pdfFontFamily ?? PDF_DESIGN_DEFAULTS.pdfFontFamily,
    pdfBodyTextColor: companyInfo?.pdfBodyTextColor || PDF_DESIGN_DEFAULTS.pdfBodyTextColor,
    pdfBorderColor: companyInfo?.pdfBorderColor || PDF_DESIGN_DEFAULTS.pdfBorderColor,
    pdfLogoSize: companyInfo?.pdfLogoSize ?? PDF_DESIGN_DEFAULTS.pdfLogoSize,
    pdfLogoPosition: companyInfo?.pdfLogoPosition ?? PDF_DESIGN_DEFAULTS.pdfLogoPosition,
    pdfTableSpacing: companyInfo?.pdfTableSpacing ?? PDF_DESIGN_DEFAULTS.pdfTableSpacing,
    pdfShowBorders: companyInfo?.pdfShowBorders ?? PDF_DESIGN_DEFAULTS.pdfShowBorders,
    showLogo: companyInfo?.showLogo ?? true,
    logo: companyInfo?.logo,
    companyName: companyInfo?.name,
    footerText: companyInfo?.footerText,
  });

  // Sync pdfDesign when companyInfo loads from DB
  useEffect(() => {
    if (!companyInfo) return;
    setPdfDesign(prev => ({
      ...prev,
      pdfPrimaryColor: companyInfo.pdfPrimaryColor || PDF_DESIGN_DEFAULTS.pdfPrimaryColor,
      pdfTitleColor: companyInfo.pdfTitleColor || PDF_DESIGN_DEFAULTS.pdfTitleColor,
      pdfFontSize: companyInfo.pdfFontSize ?? PDF_DESIGN_DEFAULTS.pdfFontSize,
      pdfFontFamily: companyInfo.pdfFontFamily ?? PDF_DESIGN_DEFAULTS.pdfFontFamily,
      pdfBodyTextColor: companyInfo.pdfBodyTextColor || PDF_DESIGN_DEFAULTS.pdfBodyTextColor,
      pdfBorderColor: companyInfo.pdfBorderColor || PDF_DESIGN_DEFAULTS.pdfBorderColor,
      pdfLogoSize: companyInfo.pdfLogoSize ?? PDF_DESIGN_DEFAULTS.pdfLogoSize,
      pdfLogoPosition: companyInfo.pdfLogoPosition ?? PDF_DESIGN_DEFAULTS.pdfLogoPosition,
      pdfTableSpacing: companyInfo.pdfTableSpacing ?? PDF_DESIGN_DEFAULTS.pdfTableSpacing,
      pdfShowBorders: companyInfo.pdfShowBorders ?? PDF_DESIGN_DEFAULTS.pdfShowBorders,
      showLogo: companyInfo.showLogo ?? true,
      logo: companyInfo.logo,
      companyName: companyInfo.name,
      footerText: companyInfo.footerText,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyInfo?.pdfPrimaryColor, companyInfo?.pdfFontFamily, companyInfo?.name]);

  // Keep preview logo in sync when logo is uploaded/removed
  useEffect(() => {
    setPdfDesign(prev => ({ ...prev, logo: formData.logo, companyName: formData.name }));
  }, [formData.logo, formData.name]);

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
      pdfPrimaryColor: companyInfo.pdfPrimaryColor,
      pdfTitleColor: companyInfo.pdfTitleColor,
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
    companyInfo?.patente,
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
        patente: safeString(companyInfo.patente),
        cnss: safeString(companyInfo.cnss),
        logo: companyInfo.logo ? safeString(companyInfo.logo) : null,
        footerText: safeString(companyInfo.footerText),
        pdfPrimaryColor: safeString(companyInfo.pdfPrimaryColor) || '#3b82f6',
        pdfTitleColor: safeString(companyInfo.pdfTitleColor) || '#3b82f6',
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

      // Sync showLogo from companyInfo
      if (companyInfo.showLogo !== undefined) {
        setShowLogo(companyInfo.showLogo);
      }
    } catch (error) {
      console.error('Error syncing formData:', error);
    }
  }, [companyInfoString, companyInfo?.showLogo]);

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
      reader.onloadend = async () => {
        const logoUrl = reader.result as string;
        setFormData(prev => ({ ...prev, logo: logoUrl }));
        try {
          await updateCompanyInfo({ logo: logoUrl });
          toast({
            title: "Success",
            description: "Logo updated successfully.",
            variant: "success",
          });
        } catch (error) {
          console.error('Error saving logo:', error);
          // Revert on failure
          setFormData(prev => ({ ...prev, logo: companyInfo?.logo ? safeString(companyInfo.logo) : null }));
          toast({
            title: "Error",
            description: "Failed to save logo. Please try again.",
            variant: "destructive",
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = async () => {
    const oldLogo = formData.logo;
    setFormData(prev => ({ ...prev, logo: null }));
    try {
      await updateCompanyInfo({ logo: null });
      toast({
        title: "Success",
        description: "Logo removed successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      setFormData(prev => ({ ...prev, logo: oldLogo }));
      toast({
        title: "Error",
        description: "Failed to remove logo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveBranding = async () => {
    try {
      await updateCompanyInfo({
        logo: formData.logo,
        footerText: formData.footerText,
        showLogo,
        pdfPrimaryColor: formData.pdfPrimaryColor,
        pdfTitleColor: formData.pdfTitleColor,
      });
      toast({
        title: "Success",
        description: "Branding settings saved successfully.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save branding settings.",
        variant: "destructive",
      });
    }
  };

  const handleSavePDFDesign = async () => {
    try {
      await updateCompanyInfo({
        logo: formData.logo,
        footerText: formData.footerText,
        showLogo,
        pdfPrimaryColor: pdfDesign.pdfPrimaryColor,
        pdfTitleColor: pdfDesign.pdfTitleColor,
        pdfFontSize: pdfDesign.pdfFontSize,
        pdfFontFamily: pdfDesign.pdfFontFamily,
        pdfBodyTextColor: pdfDesign.pdfBodyTextColor,
        pdfBorderColor: pdfDesign.pdfBorderColor,
        pdfLogoSize: pdfDesign.pdfLogoSize,
        pdfLogoPosition: pdfDesign.pdfLogoPosition,
        pdfTableSpacing: pdfDesign.pdfTableSpacing,
        pdfShowBorders: pdfDesign.pdfShowBorders,
      });
      toast({ title: t('settings.pdfDesign.saveSuccess'), variant: 'success' });
    } catch {
      toast({ title: t('settings.pdfDesign.saveError'), variant: 'destructive' });
    }
  };

  const handleResetPDFDesign = () => {
    setShowLogo(true);
    setPdfDesign(prev => ({
      ...prev,
      ...PDF_DESIGN_DEFAULTS,
      showLogo: true,
    }));
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
          <TabsTrigger value="pdf-design" className="gap-2 rounded-md">
            <FileText className="w-4 h-4" />
            {t('settings.pdfDesign.tab')}
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
                  <Label htmlFor="patente">{t('settings.patente')}</Label>
                  <Input
                    id="patente"
                    value={formData.patente}
                    onChange={(e) => handleInputChange('patente', e.target.value)}
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

        {/* PDF Design Studio */}
        <TabsContent value="pdf-design" className="animate-fade-in">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── Controls panel ── */}
            <div className="flex-1 space-y-5">
              <div className="card-elevated p-6 space-y-5">

                {/* Header + actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-heading font-semibold text-foreground">{t('settings.pdfDesign.title')}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('settings.pdfDesign.subtitle')}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleResetPDFDesign}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('settings.pdfDesign.resetDefault')}
                  </Button>
                </div>

                {/* ── Logo & Identité ── */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">{t('settings.pdfDesign.logoIdentity')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Logo upload */}
                    <div>
                      <Label className="text-xs mb-2 block">{t('settings.pdfDesign.companyLogo')}</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                        {formData.logo ? (
                          <div className="space-y-2">
                            <img src={formData.logo} alt="logo" className="max-h-16 mx-auto object-contain" />
                            <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleRemoveLogo}>
                              <Trash2 className="w-3 h-3 mr-1" /> {t('settings.pdfDesign.logoRemove')}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 mx-auto flex items-center justify-center">
                              <Upload className="w-5 h-5 text-primary" />
                            </div>
                            <p className="text-xs text-muted-foreground">{t('settings.pdfDesign.logoHint')}</p>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => fileInputRef.current?.click()}>
                              {t('settings.pdfDesign.logoChoose')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* City + show logo */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">{t('settings.pdfDesign.city')}</Label>
                        <Input
                          placeholder={t('settings.pdfDesign.cityPlaceholder')}
                          value={formData.footerText || ''}
                          onChange={e => {
                            handleInputChange('footerText', e.target.value);
                            setPdfDesign(prev => ({ ...prev, footerText: e.target.value }));
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-section rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-foreground">{t('settings.pdfDesign.showLogo')}</p>
                          <p className="text-[10px] text-muted-foreground">{t('settings.pdfDesign.showLogoHint')}</p>
                        </div>
                        <Switch
                          checked={showLogo}
                          onCheckedChange={v => {
                            setShowLogo(v);
                            setPdfDesign(prev => ({ ...prev, showLogo: v }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Couleurs ── */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">{t('settings.pdfDesign.colors')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {([
                      { labelKey: 'settings.pdfDesign.primaryColor', key: 'pdfPrimaryColor' },
                      { labelKey: 'settings.pdfDesign.titleColor', key: 'pdfTitleColor' },
                      { labelKey: 'settings.pdfDesign.borderColor', key: 'pdfBorderColor' },
                      { labelKey: 'settings.pdfDesign.textColor', key: 'pdfBodyTextColor' },
                    ] as { labelKey: string; key: keyof PDFDesignSettings }[]).map(({ labelKey, key }) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-xs">{t(labelKey)}</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={String(pdfDesign[key])}
                            onChange={e => setPdfDesign(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-8 h-8 rounded cursor-pointer border border-border"
                          />
                          <Input
                            value={String(pdfDesign[key])}
                            onChange={e => setPdfDesign(prev => ({ ...prev, [key]: e.target.value }))}
                            className="h-8 text-xs font-mono"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Typographie ── */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">{t('settings.pdfDesign.typography')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('settings.pdfDesign.fontFamily')}</Label>
                      <div className="flex gap-2">
                        {(['Helvetica', 'Times-Roman', 'Courier'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setPdfDesign(prev => ({ ...prev, pdfFontFamily: f }))}
                            className={cn(
                              'flex-1 py-1.5 text-xs rounded border transition-colors',
                              pdfDesign.pdfFontFamily === f
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {f === 'Times-Roman' ? 'Times' : f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('settings.pdfDesign.fontSize')} — {pdfDesign.pdfFontSize}pt</Label>
                      <input
                        type="range"
                        min={8}
                        max={13}
                        step={1}
                        value={pdfDesign.pdfFontSize}
                        onChange={e => setPdfDesign(prev => ({ ...prev, pdfFontSize: Number(e.target.value) }))}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>8pt</span><span>13pt</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Logo ── */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">{t('settings.pdfDesign.logo')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('settings.pdfDesign.logoSize')}</Label>
                      <div className="flex gap-2">
                        {(['small', 'medium', 'large'] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => setPdfDesign(prev => ({ ...prev, pdfLogoSize: s }))}
                            className={cn(
                              'flex-1 py-1.5 text-xs rounded border capitalize transition-colors',
                              pdfDesign.pdfLogoSize === s
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {s === 'small' ? t('settings.pdfDesign.logoSizeSmall') : s === 'medium' ? t('settings.pdfDesign.logoSizeMedium') : t('settings.pdfDesign.logoSizeLarge')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('settings.pdfDesign.logoPosition')}</Label>
                      <div className="flex gap-2">
                        {(['left', 'right'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setPdfDesign(prev => ({ ...prev, pdfLogoPosition: p }))}
                            className={cn(
                              'flex-1 py-1.5 text-xs rounded border capitalize transition-colors',
                              pdfDesign.pdfLogoPosition === p
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {p === 'left' ? t('settings.pdfDesign.logoPositionLeft') : t('settings.pdfDesign.logoPositionRight')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Mise en page ── */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">{t('settings.pdfDesign.layout')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('settings.pdfDesign.tableSpacing')}</Label>
                      <div className="flex gap-2">
                        {(['compact', 'normal', 'spacious'] as const).map(sp => (
                          <button
                            key={sp}
                            onClick={() => setPdfDesign(prev => ({ ...prev, pdfTableSpacing: sp }))}
                            className={cn(
                              'flex-1 py-1.5 text-xs rounded border capitalize transition-colors',
                              pdfDesign.pdfTableSpacing === sp
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            {sp === 'compact' ? t('settings.pdfDesign.tableSpacingCompact') : sp === 'normal' ? t('settings.pdfDesign.tableSpacingNormal') : t('settings.pdfDesign.tableSpacingSpacious')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('settings.pdfDesign.showBorders')}</Label>
                      <div className="flex items-center gap-3 pt-1">
                        <Switch
                          checked={pdfDesign.pdfShowBorders}
                          onCheckedChange={v => setPdfDesign(prev => ({ ...prev, pdfShowBorders: v }))}
                        />
                        <span className="text-xs text-muted-foreground">
                          {pdfDesign.pdfShowBorders ? t('settings.pdfDesign.bordersOn') : t('settings.pdfDesign.bordersOff')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save */}
                <div className="flex justify-end pt-2">
                  <Button className="gap-2 btn-primary-gradient" onClick={handleSavePDFDesign}>
                    <Save className="w-4 h-4" />
                    {t('settings.pdfDesign.saveDesign')}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Live Preview panel ── */}
            <div className="lg:w-[420px] shrink-0">
              <div className="card-elevated p-4 sticky top-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">{t('settings.pdfDesign.preview')}</h4>
                  <span className="text-xs text-muted-foreground ml-auto">{t('settings.pdfDesign.previewLabel')}</span>
                </div>
                <div className="overflow-auto max-h-[680px]">
                  <PDFLivePreview settings={pdfDesign} />
                </div>
              </div>
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
                        <p className="font-medium text-foreground truncate" title={safeString(user.name)}>{safeString(user.name)}</p>
                        <p className={cn(
                          "text-sm truncate",
                          user.email ? "text-muted-foreground" : "text-muted-foreground/60 italic"
                        )} title={safeString(user.email) || "No email"}>
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
