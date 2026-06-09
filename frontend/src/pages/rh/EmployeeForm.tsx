/**
 * Employee Form Page — /rh/employes/nouveau and /rh/employes/:id/edit
 * Create or edit an employee. Validates CIN format and SMIG constraint.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRH } from '@/contexts/RHContext';
import { rhService, Employee } from '@/services/rh.service';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, AlertTriangle, User, Briefcase, Shield,
  Phone, Mail, MapPin, CreditCard, Calendar, Building2,
  DollarSign, Hash,
} from 'lucide-react';

const CIN_REGEX = /^[A-Za-z]{1,2}\d{5,6}$/;
const SMIG = 3111.39;

type FormData = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;

const defaultForm: FormData = {
  full_name: '', cin: '', phone: '', address: '', email: '',
  hire_date: '', job_title: '', department: '',
  contract_type: 'CDI', status: 'actif',
  base_salary: 0, cnss_number: '', nb_dependents: 0,
};

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];
const initials   = (name: string) => (name || '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

const contractBadge: Record<string, string> = {
  CDI:     'bg-blue-100 text-blue-700',
  CDD:     'bg-purple-100 text-purple-700',
  Intérim: 'bg-orange-100 text-orange-700',
};

export const EmployeeForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { createEmployee, updateEmployee } = useRH();
  const { toast } = useToast();

  const [form, setForm] = useState<FormData>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [smigWarning, setSmigWarning] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ['rh-employee', id],
    queryFn: () => rhService.getEmployee(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        full_name: existing.full_name,
        cin: existing.cin,
        phone: existing.phone || '',
        address: existing.address || '',
        email: existing.email || '',
        hire_date: existing.hire_date ? existing.hire_date.split('T')[0] : '',
        job_title: existing.job_title,
        department: existing.department || '',
        contract_type: existing.contract_type,
        status: existing.status,
        base_salary: Number(existing.base_salary),
        cnss_number: existing.cnss_number,
        nb_dependents: existing.nb_dependents,
      });
    }
  }, [existing]);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    if (field === 'base_salary') setSmigWarning(Number(val) < SMIG && Number(val) > 0);
  };

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.full_name.trim())     errs.full_name = 'Nom requis';
    if (!form.cin.trim())           errs.cin = 'CIN requis';
    else if (!CIN_REGEX.test(form.cin)) errs.cin = 'Format CIN invalide (ex: AB12345)';
    if (!form.hire_date)            errs.hire_date = "Date d'embauche requise";
    if (!form.job_title.trim())     errs.job_title = 'Poste requis';
    if (!form.cnss_number.trim())   errs.cnss_number = 'N° CNSS requis';
    if (!form.base_salary || form.base_salary <= 0) errs.base_salary = 'Salaire requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit && id) await updateEmployee(id, form);
      else              await createEmployee(form);
      navigate('/rh/employes');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label, name, type = 'text', icon: Icon, placeholder, extra,
  }: {
    label: string;
    name: keyof FormData;
    type?: string;
    icon?: React.ElementType;
    placeholder?: string;
    extra?: React.InputHTMLAttributes<HTMLInputElement>;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />}
        <Input
          type={type}
          value={String(form[name] ?? '')}
          onChange={set(name)}
          placeholder={placeholder}
          {...extra}
          className={`${Icon ? 'pl-9' : ''} ${errors[name] ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
        />
      </div>
      {errors[name] && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors[name]}</p>}
    </div>
  );

  const SectionHeader = ({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) => (
    <div className={`flex items-center gap-2 mb-4 pb-3 border-b`}>
      <div className={`p-1.5 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="font-semibold text-sm">{title}</span>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Live avatar preview */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0 ${avatarColor(form.full_name)}`}>
          {initials(form.full_name)}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{isEdit ? 'Modifier Employé' : 'Nouvel Employé'}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {form.full_name ? (
              <p className="text-muted-foreground text-sm truncate">{form.full_name}</p>
            ) : (
              <p className="text-muted-foreground text-sm">Renseignez les informations de l'employé</p>
            )}
            {form.contract_type && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${contractBadge[form.contract_type] || 'bg-muted text-muted-foreground'}`}>
                {form.contract_type}
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal Information */}
        <Card className="overflow-hidden">
          <CardContent className="pt-5">
            <SectionHeader icon={User} title="Informations personnelles" color="bg-blue-100 text-blue-600" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom complet *" name="full_name" icon={User} placeholder="Prénom Nom" />
              <Field label="CIN *" name="cin" icon={CreditCard} placeholder="AB12345" />
              <Field label="Téléphone" name="phone" type="tel" icon={Phone} placeholder="06 XX XX XX XX" />
              <Field label="Email" name="email" type="email" icon={Mail} placeholder="nom@exemple.com" />
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adresse</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} placeholder="Adresse complète..." className="pl-9" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Information */}
        <Card className="overflow-hidden">
          <CardContent className="pt-5">
            <SectionHeader icon={Briefcase} title="Informations contrat" color="bg-emerald-100 text-emerald-600" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Poste *" name="job_title" icon={Briefcase} placeholder="Développeur, Comptable..." />
              <Field label="Département" name="department" icon={Building2} placeholder="IT, Finance, RH..." />

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type de contrat *</Label>
                <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v as FormData['contract_type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CDI">CDI — Contrat à Durée Indéterminée</SelectItem>
                    <SelectItem value="CDD">CDD — Contrat à Durée Déterminée</SelectItem>
                    <SelectItem value="Intérim">Intérim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date d'embauche *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={form.hire_date}
                    onChange={set('hire_date')}
                    className={`pl-9 ${errors.hire_date ? 'border-red-400' : ''}`}
                  />
                </div>
                {errors.hire_date && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.hire_date}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Salaire de base (MAD) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="number" step="0.01" min="0"
                    value={form.base_salary || ''}
                    onChange={set('base_salary')}
                    className={`pl-9 ${errors.base_salary ? 'border-red-400' : ''}`}
                    placeholder="0.00"
                  />
                </div>
                {errors.base_salary && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.base_salary}</p>}
                {smigWarning && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    Inférieur au SMIG ({SMIG.toFixed(2)} MAD)
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as FormData['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                    <SelectItem value="terminé">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Information */}
        <Card className="overflow-hidden">
          <CardContent className="pt-5">
            <SectionHeader icon={Shield} title="Informations sociales" color="bg-violet-100 text-violet-600" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="N° CNSS *" name="cnss_number" icon={Hash} placeholder="123456789" />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Personnes à charge</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="number" min="0" max="6"
                    value={form.nb_dependents}
                    onChange={set('nb_dependents')}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Impacte le calcul de l'IGR (0 à 6)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground">
            Annuler
          </Button>
          <Button type="submit" disabled={saving} className="gap-2 min-w-32">
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : isEdit ? 'Enregistrer les modifications' : 'Créer l\'employé'}
          </Button>
        </div>
      </form>
    </div>
  );
};
