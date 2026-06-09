/**
 * Employee Detail Page — /rh/employes/:id
 * Profile banner with avatar + key metrics, three tabs: Informations | Paie | Congés
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Download, Plus, Briefcase, Mail, Phone, MapPin, CreditCard, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { rhService, LeaveType } from '@/services/rh.service';
import { useToast } from '@/hooks/use-toast';

const fmt     = (n: number) => Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-MA') : '—';
const months  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];
const initials   = (name: string) => (name || '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const payStatusCfg: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: 'Brouillon', color: 'text-amber-700',   bg: 'bg-amber-100'   },
  validé:    { label: 'Validé',    color: 'text-blue-700',    bg: 'bg-blue-100'    },
  payé:      { label: 'Payé',      color: 'text-emerald-700', bg: 'bg-emerald-100' },
};

const leaveStatusCfg: Record<string, { color: string; bg: string; dot: string }> = {
  'en attente': { color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500'   },
  approuvé:     { color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  refusé:       { color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500'     },
};

export const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'info' | 'paie' | 'conges'>('info');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'congé annuel' as LeaveType, start_date: '', end_date: '', reason: '' });

  const { data: employee } = useQuery({ queryKey: ['rh-employee', id], queryFn: () => rhService.getEmployee(id!) });
  const { data: payroll = [] } = useQuery({ queryKey: ['rh-payroll-emp', id], queryFn: () => rhService.getEmployeePayroll(id!), enabled: !!id });
  const { data: leaves  = [] } = useQuery({ queryKey: ['rh-leaves-emp',  id], queryFn: () => rhService.getEmployeeLeaves(id!),  enabled: !!id });

  const createLeaveMutation = useMutation({
    mutationFn: rhService.createLeave,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh-leaves-emp', id] }); setShowLeaveDialog(false); toast({ title: 'Demande créée' }); },
    onError:   (e: Error) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  if (!employee) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm">Chargement...</p>
      </div>
    </div>
  );

  const calcDays = () => {
    if (!leaveForm.start_date || !leaveForm.end_date) return 0;
    return Math.max(0, Math.floor((new Date(leaveForm.end_date).getTime() - new Date(leaveForm.start_date).getTime()) / (1000*60*60*24)) + 1);
  };

  const handleDownloadBulletin = (payId: string, month: number, year: number) => {
    rhService.downloadPdf(
      rhService.getBulletinUrl(payId),
      `bulletin-${employee.full_name.replace(/\s+/g,'-')}-${months[month-1]}-${year}.pdf`
    ).catch(e => toast({ title: 'Erreur téléchargement', description: e.message, variant: 'destructive' }));
  };

  const statusStyle = employee.status === 'actif' ? 'bg-emerald-100 text-emerald-700'
    : employee.status === 'suspendu' ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700';

  const contractStyle = employee.contract_type === 'CDI' ? 'bg-blue-100 text-blue-700'
    : employee.contract_type === 'CDD' ? 'bg-purple-100 text-purple-700'
    : 'bg-orange-100 text-orange-700';

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <Button variant="outline" onClick={() => navigate(`/rh/employes/${id}/edit`)} className="gap-2">
          <Pencil className="w-4 h-4" /> Modifier
        </Button>
      </div>

      {/* Profile banner */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="pt-0 pb-5 px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 border-background shadow-md ${avatarColor(employee.full_name)}`}>
              {initials(employee.full_name)}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{employee.full_name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle}`}>
                  {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${contractStyle}`}>
                  {employee.contract_type}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-0.5">{employee.job_title}{employee.department ? ` · ${employee.department}` : ''}</p>
            </div>
            <div className="flex gap-6 pb-1">
              {[
                { value: payroll.length, label: 'Bulletins' },
                { value: leaves.length,  label: 'Congés'    },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
              <div className="text-center">
                <p className="text-lg font-bold font-mono">{fmt(Number(employee.base_salary))}</p>
                <p className="text-xs text-muted-foreground">MAD/mois</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-0 border-b">
        {([['info','Informations'],['paie','Historique de Paie'],['conges','Congés']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`relative px-5 py-2.5 text-sm font-medium transition-colors ${
              tab === v
                ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab: Informations */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" />Informations personnelles</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: CreditCard, label: 'CIN',      value: employee.cin           },
                { icon: Mail,       label: 'Email',    value: employee.email || '—'  },
                { icon: Phone,      label: 'Téléphone',value: employee.phone || '—'  },
                { icon: MapPin,     label: 'Adresse',  value: employee.address || '—'},
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="w-4 h-4 text-muted-foreground" />Contrat & Social</CardTitle></CardHeader>
            <CardContent className="space-y-0">
              {[
                { label: "Date d'embauche",    value: fmtDate(employee.hire_date)              },
                { label: 'N° CNSS',            value: employee.cnss_number                    },
                { label: 'Personnes à charge', value: String(employee.nb_dependents)           },
                { label: 'Salaire de base',    value: `${fmt(Number(employee.base_salary))} MAD` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-muted/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Historique de Paie */}
      {tab === 'paie' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Fiches de paie</CardTitle>
              <Button size="sm" variant="outline" className="text-xs gap-1 h-7"
                onClick={() => navigate(`/rh/paie/generer?employee=${id}`)}>
                <Plus className="w-3 h-3" /> Générer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {payroll.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">Aucune fiche de paie</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Brut</TableHead>
                    <TableHead className="text-right">Net à payer</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payroll.map(p => {
                    const cfg = payStatusCfg[p.status] || payStatusCfg.brouillon;
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{months[p.month - 1]} {p.year}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(Number(p.brut))} MAD</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">{fmt(Number(p.net_a_payer))} MAD</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span></TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadBulletin(p.id, p.month, p.year)}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Congés */}
      {tab === 'conges' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Congés</CardTitle>
              <Button size="sm" className="text-xs gap-1 h-7" onClick={() => setShowLeaveDialog(true)}>
                <Plus className="w-3 h-3" /> Nouvelle demande
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {leaves.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">Aucun congé enregistré</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Type</TableHead>
                    <TableHead>Du</TableHead>
                    <TableHead>Au</TableHead>
                    <TableHead className="text-right">Jours</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map(l => {
                    const cfg = leaveStatusCfg[l.status] || leaveStatusCfg['en attente'];
                    return (
                      <TableRow key={l.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm">{l.type}</TableCell>
                        <TableCell className="text-sm">{fmtDate(l.start_date)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(l.end_date)}</TableCell>
                        <TableCell className="text-right font-semibold">{l.days_count}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{l.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leave Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle demande de congé</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type de congé</Label>
              <Select value={leaveForm.type} onValueChange={v => setLeaveForm(f => ({ ...f, type: v as LeaveType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['congé annuel','maladie','sans solde','autre'] as LeaveType[]).map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date de début</Label>
                <Input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date de fin</Label>
                <Input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            {calcDays() > 0 && (
              <div className="bg-muted/60 rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">Durée : </span>
                <span className="font-semibold">{calcDays()} jour{calcDays() > 1 ? 's' : ''}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Motif (optionnel)</Label>
              <Textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Précisez le motif..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Annuler</Button>
            <Button disabled={!leaveForm.start_date || !leaveForm.end_date || createLeaveMutation.isPending}
              onClick={() => createLeaveMutation.mutate({
                employee_id: id!, type: leaveForm.type,
                start_date: leaveForm.start_date, end_date: leaveForm.end_date,
                days_count: calcDays(), reason: leaveForm.reason,
              })}>
              {createLeaveMutation.isPending ? 'Envoi...' : 'Soumettre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
