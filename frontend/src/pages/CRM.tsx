import { useState } from 'react';
import { Plus, Search, Building2, User, Phone, Mail, MapPin, FileText, Eye, Edit, Trash2 } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { useContacts, UIContact } from '@/contexts/ContactsContext';

// Use UIContact from context
type Contact = UIContact;

interface ContactFormProps {
  type: 'client' | 'supplier';
  contact?: Contact;
  onSubmit: (contact: Partial<Contact>) => void;
  onCancel: () => void;
}

const ContactForm = ({ type, contact, onSubmit, onCancel }: ContactFormProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Contact>>({
    name: contact?.name || '',
    company: contact?.company || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    city: contact?.city || '',
    ice: contact?.ice || '',
    ifNumber: contact?.ifNumber || '',
    rc: contact?.rc || '',
    status: contact?.status || 'active',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('crm.contactName')}</Label>
          <Input
            id="name"
            placeholder={t('crm.fullName')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">{t('crm.companyName')}</Label>
          <Input
            id="company"
            placeholder={t('crm.companyNamePlaceholder')}
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('common.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@company.ma"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t('common.phone')}</Label>
          <Input
            id="phone"
            placeholder="+212 5 XX XX XX XX"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">{t('common.city')}</Label>
          <Input
            id="city"
            placeholder={t('common.city')}
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">{t('common.status')}</Label>
          <select
            id="status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
          >
            <option value="active">{t('status.active')}</option>
            <option value="inactive">{t('status.inactive')}</option>
          </select>
        </div>
        <div className="col-span-full">
          <div className="border-t border-border pt-4 mt-2">
            <h4 className="font-medium text-foreground mb-3">{t('crm.moroccanBusinessIdentifiers')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ice">{t('crm.ice')}</Label>
                <Input
                  id="ice"
                  placeholder={t('crm.icePlaceholder')}
                  maxLength={15}
                  value={formData.ice}
                  onChange={(e) => setFormData({ ...formData, ice: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="if">{t('crm.if')}</Label>
                <Input
                  id="if"
                  placeholder={t('crm.ifPlaceholder')}
                  maxLength={8}
                  value={formData.ifNumber}
                  onChange={(e) => setFormData({ ...formData, ifNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rc">{t('crm.rc')}</Label>
                <Input
                  id="rc"
                  placeholder={t('crm.rcPlaceholder')}
                  value={formData.rc}
                  onChange={(e) => setFormData({ ...formData, rc: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-full flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="submit" className="btn-primary-gradient">
            {contact ? t('common.update') : t('common.save')} {type === 'client' ? t('crm.client') : t('crm.supplier')}
          </Button>
        </div>
      </div>
    </form>
  );
};

interface ContactTableProps {
  contacts: Contact[];
  type: 'client' | 'supplier';
  onView: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

const ContactTable = ({ contacts, type, onView, onEdit, onDelete }: ContactTableProps) => {
  const { t } = useTranslation();
  return (
    <div className="card-elevated overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="data-table-header hover:bg-section">
            <TableHead>{t('crm.company')}</TableHead>
            <TableHead>{t('crm.contact')}</TableHead>
            <TableHead>{t('common.city')}</TableHead>
            <TableHead>{t('crm.ice')}</TableHead>
            <TableHead className="text-center">{t('crm.transactions')}</TableHead>
            <TableHead className="text-center">{t('common.status')}</TableHead>
            <TableHead className="text-center">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id} className="hover:bg-section/50">
              <TableCell className="max-w-[250px]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{contact.company}</p>
                    <p className="text-sm text-muted-foreground truncate">{contact.name}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1 text-sm min-w-0">
                    <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate">{contact.email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm min-w-0">
                    <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate">{contact.phone}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-w-[150px]">
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{contact.city}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm max-w-[120px] truncate">{contact.ice}</TableCell>
              <TableCell className="text-center font-medium number-cell">{contact.totalTransactions}</TableCell>
              <TableCell className="text-center">
                <StatusBadge status={contact.status === 'active' ? 'success' : 'default'}>
                  {t(`status.${contact.status}`)}
                </StatusBadge>
              </TableCell>
              <TableCell className="w-[140px]">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onView(contact)}
                    title={t('common.view')}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(contact)}
                    title={t('common.edit')}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(contact)}
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const CRM = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    clients,
    suppliers,
    isLoading,
    addClient,
    updateClient,
    deleteClient,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useContacts();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'clients' | 'suppliers'>('clients');
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

  const getCurrentContacts = () => activeTab === 'clients' ? clients : suppliers;

  const filteredContacts = getCurrentContacts().filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleView = (contact: Contact) => {
    setViewingContact(contact);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
  };

  const handleDelete = (contact: Contact) => {
    setDeletingContact(contact);
  };

  const confirmDeleteContact = async () => {
    if (deletingContact) {
      // Prevent deletion if contact has transactions
      if (deletingContact.totalTransactions > 0) {
        toast({
          title: t('common.error', { defaultValue: 'Error' }),
          description: t('crm.cannotDeleteWithTransactions', { defaultValue: "Cannot delete contact with existing transactions." }),
          variant: "destructive",
        });
        setDeletingContact(null);
        return;
      }

      const contactName = deletingContact.company || deletingContact.name;
      const contactType = activeTab === 'clients' ? t('crm.client') : t('crm.supplier');

      try {
        if (activeTab === 'clients') {
          await deleteClient(deletingContact.id);
        } else {
          await deleteSupplier(deletingContact.id);
        }
        setDeletingContact(null);
        toast({
          title: t('crm.contactDeleted'),
          description: t('crm.contactDeletedDescription', { contactType, contactName }),
          variant: "destructive",
        });
      } catch (error: any) {
        console.error('Delete operation failed:', error);

        // If hard delete fails (likely due to foreign key constraints), try soft delete (archive)
        if (error?.code === '23503' || error?.status === 409 || error?.message?.includes('violates foreign key constraint')) {
          try {
            if (activeTab === 'clients') {
              await updateClient(deletingContact.id, { status: 'inactive' });
            } else {
              await updateSupplier(deletingContact.id, { status: 'inactive' });
            }

            setDeletingContact(null);
            toast({
              title: t('crm.contactArchived', { defaultValue: 'Contact Archived' }),
              description: t('crm.contactArchivedDescription', {
                defaultValue: "Contact could not be deleted permanently due to existing records, so it was marked as inactive instead.",
                contactName
              }),
              variant: "success",
            });
            return;
          } catch (archiveError) {
            console.error('Archive operation failed:', archiveError);
          }
        }

        toast({
          title: t('common.error', { defaultValue: 'Error' }),
          description: error instanceof Error ? error.message : t('crm.failedToDelete', { contactType: contactType.toLowerCase() }),
          variant: "destructive",
        });
      }
    }
  };

  const handleCreate = async (contactData: Partial<Contact>) => {
    const contactType = activeTab === 'clients' ? t('crm.client') : t('crm.supplier');
    const contactName = contactData.company || contactData.name || '';

    try {
      if (activeTab === 'clients') {
        await addClient(contactData as Omit<Contact, 'id' | 'totalTransactions'>);
      } else {
        await addSupplier(contactData as Omit<Contact, 'id' | 'totalTransactions'>);
      }
      setIsCreateDialogOpen(false);
      toast({
        title: t('crm.contactCreated'),
        description: t('crm.contactCreatedDescription', { contactType, contactName }),
        variant: "success",
      });
    } catch (error) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('crm.failedToCreate', { contactType: contactType.toLowerCase() }),
        variant: "destructive",
      });
    }
  };

  const handleUpdate = async (contactData: Partial<Contact>) => {
    if (editingContact) {
      const contactType = activeTab === 'clients' ? t('crm.client') : t('crm.supplier');
      const contactName = contactData.company || contactData.name || editingContact.company || editingContact.name || '';

      try {
        if (activeTab === 'clients') {
          await updateClient(editingContact.id, contactData);
        } else {
          await updateSupplier(editingContact.id, contactData);
        }
        setEditingContact(null);
        toast({
          title: t('crm.contactUpdated'),
          description: t('crm.contactUpdatedDescription', { contactType, contactName }),
          variant: "success",
        });
      } catch (error) {
        toast({
          title: t('common.error', { defaultValue: 'Error' }),
          description: t('crm.failedToUpdate', { contactType: contactType.toLowerCase() }),
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{t('crm.title')}</h1>
          <p className="text-muted-foreground">{t('crm.description')}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'clients' | 'suppliers')} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-section">
            <TabsTrigger value="clients" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <User className="w-4 h-4" />
              {t('crm.clients')}
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
              <Building2 className="w-4 h-4" />
              {t('crm.suppliers')}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('crm.searchContacts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-[250px]"
              />
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 btn-primary-gradient">
                  <Plus className="w-4 h-4" />
                  {t('crm.addContact')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('crm.addNew', { type: activeTab === 'clients' ? t('crm.client') : t('crm.supplier') })}</DialogTitle>
                  <DialogDescription>
                    {t('crm.enterContactDetails')}
                  </DialogDescription>
                </DialogHeader>
                <ContactForm
                  type={activeTab === 'clients' ? 'client' : 'supplier'}
                  onSubmit={handleCreate}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="clients" className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-elevated p-4">
              <p className="text-sm text-muted-foreground">{t('crm.totalClients')}</p>
              <p className="text-2xl font-heading font-bold text-foreground">{clients.length}</p>
            </div>
            <div className="card-elevated p-4">
              <p className="text-sm text-muted-foreground">{t('status.active')}</p>
              <p className="text-2xl font-heading font-bold text-success">
                {clients.filter(c => c.status === 'active').length}
              </p>
            </div>
            <div className="card-elevated p-4">
              <p className="text-sm text-muted-foreground">{t('crm.totalTransactions')}</p>
              <p className="text-2xl font-heading font-bold text-foreground">
                {clients.reduce((sum, c) => sum + c.totalTransactions, 0)}
              </p>
            </div>
          </div>
          <ContactTable
            contacts={filteredContacts}
            type="client"
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-elevated p-4">
              <p className="text-sm text-muted-foreground">{t('crm.totalSuppliers')}</p>
              <p className="text-2xl font-heading font-bold text-foreground">{suppliers.length}</p>
            </div>
            <div className="card-elevated p-4">
              <p className="text-sm text-muted-foreground">{t('status.active')}</p>
              <p className="text-2xl font-heading font-bold text-success">
                {suppliers.filter(s => s.status === 'active').length}
              </p>
            </div>
            <div className="card-elevated p-4">
              <p className="text-sm text-muted-foreground">{t('crm.totalOrders')}</p>
              <p className="text-2xl font-heading font-bold text-foreground">
                {suppliers.reduce((sum, s) => sum + s.totalTransactions, 0)}
              </p>
            </div>
          </div>
          <ContactTable
            contacts={filteredContacts}
            type="supplier"
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      {/* View Dialog */}
      <Dialog open={!!viewingContact} onOpenChange={(open) => !open && setViewingContact(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('crm.contactDetails')}</DialogTitle>
            <DialogDescription>
              {t('crm.viewCompleteInformation', { company: viewingContact?.company })}
            </DialogDescription>
          </DialogHeader>
          {viewingContact && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('crm.company')}</Label>
                  <p className="font-medium">{viewingContact.company}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('crm.contactName')}</Label>
                  <p className="font-medium">{viewingContact.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('common.email')}</Label>
                  <p className="font-medium">{viewingContact.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('common.phone')}</Label>
                  <p className="font-medium">{viewingContact.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('common.city')}</Label>
                  <p className="font-medium">{viewingContact.city}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('common.status')}</Label>
                  <StatusBadge status={viewingContact.status === 'active' ? 'success' : 'default'}>
                    {t(`status.${viewingContact.status}`)}
                  </StatusBadge>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('crm.ice')}</Label>
                  <p className="font-mono">{viewingContact.ice}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('crm.ifNumber')}</Label>
                  <p className="font-mono">{viewingContact.ifNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('crm.rc')}</Label>
                  <p className="font-mono">{viewingContact.rc}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('crm.totalTransactions')}</Label>
                  <p className="font-medium">{viewingContact.totalTransactions}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('crm.editContact')}</DialogTitle>
            <DialogDescription>
              {t('crm.updateContactDetails', { company: editingContact?.company })}
            </DialogDescription>
          </DialogHeader>
          {editingContact && (
            <ContactForm
              type={activeTab === 'clients' ? 'client' : 'supplier'}
              contact={editingContact}
              onSubmit={handleUpdate}
              onCancel={() => setEditingContact(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingContact} onOpenChange={(open) => !open && setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('crm.deleteContact', { type: activeTab === 'clients' ? t('crm.client') : t('crm.supplier') })}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans i18nKey="crm.deleteConfirmation" values={{ name: deletingContact?.company || deletingContact?.name }} components={{ strong: <strong /> }} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteContact}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
