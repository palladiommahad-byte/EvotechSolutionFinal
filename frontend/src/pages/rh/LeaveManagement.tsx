/**
 * Leave Management Page — /rh/conges
 * Pending requests with employee avatars + approve/reject.
 * History table with status badges.
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, Plus, Clock, CalendarDays, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRH } from '@/contexts/RHContext';
import { LeaveType } from '@/services/rh.service';
import { useToast } from '@/hooks/use-toast';

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-MA') : '—';

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];
const initials   = (name: string) => (name || '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const leaveStatusCfg: Record<string, { color: string; bg: string; dot: string }> = {
  'en attente': { color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500'   },
  approuvé:     { color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  refusé:       { color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500'     },
};

export const LeaveManagement: React.FC = () => {
  const { employees, leaves, leavesLoading, approveLeave, rejectLeave, createLeave } = useRH();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '', type: 'congé annuel' as LeaveType,
    start_date: '', end_date: '', reason: '',
  });

  const pending = leaves.filter(l => l.status === 'en attente');
  const history = leaves.filter(l => l.status !== 'en attente');

  const calcDays = () => {
    if (!leaveForm.start_date || !leaveForm.end_date) return 0;
    return Math.max(0, Math.floor((new Date(leaveForm.end_date).getTime() - new Date(leaveForm.start_date).getTime()) / (1000*60*60*24)) + 1);
  };

  const handleSubmitLeave = async () => {
    try {
      await createLeave({
        employee_id: leaveForm.employee_id, type: leaveForm.type,
        start_date: leaveForm.start_date, end_date: leaveForm.end_date,
        days_count: calcDays(), reason: leaveForm.reason,
      });
      setShowDialog(false);
      setLeaveForm({ employee_id: '', type: 'congé annuel', start_date: '', end_date: '', reason: '' });
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur inconnue', variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string) => {
    try { await approveLeave(id); }
    catch (e) { toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur inconnue', variant: 'destructive' }); }
  };

  const handleReject = async (id: string) => {
    try { await rejectLeave(id); }
    catch (e) { toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur inconnue', variant: 'destructive' }); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Congés</h1>
          <p className="text-muted-foreground text-sm">Demandes de congés et historique</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Nouvelle demande
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'En attente', value: pending.length, color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
          { label: 'Approuvés',  value: leaves.filter(l => l.status === 'approuvé').length, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle },
          { label: 'Refusés',   value: leaves.filter(l => l.status === 'refusé').length,   color: 'text-red-700',     bg: 'bg-red-50',     icon: XCircle },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={`rounded-xl p-3 ${bg} flex items-center gap-3`}>
            <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending requests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Demandes en attente
            {pending.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-semibold">{pending.length}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {pending.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(l => (
                <div key={l.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(l.full_name || '')}`}>
                      {initials(l.full_name || '')}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{l.full_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/80">{l.type}</span>
                        {' · '}{fmtDate(l.start_date)} → {fmtDate(l.end_date)}
                        {' · '}<span className="font-medium">{l.days_count} j</span>
                      </p>
                      {l.reason && <p className="text-xs text-muted-foreground mt-0.5 italic">"{l.reason}"</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline"
                      className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                      onClick={() => handleApprove(l.id)}>
                      <CheckCircle className="w-3.5 h-3.5" /> Approuver
                    </Button>
                    <Button size="sm" variant="outline"
                      className="gap-1.5 text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300"
                      onClick={() => handleReject(l.id)}>
                      <XCircle className="w-3.5 h-3.5" /> Refuser
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" /> Historique
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {leavesLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Chargement...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Aucun historique</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Employé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Du</TableHead>
                  <TableHead>Au</TableHead>
                  <TableHead className="text-right">Jours</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(l => {
                  const cfg = leaveStatusCfg[l.status] || leaveStatusCfg['en attente'];
                  return (
                    <TableRow key={l.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(l.full_name || '')}`}>
                            {initials(l.full_name || '')}
                          </div>
                          <span className="text-sm font-medium">{l.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{l.type}</TableCell>
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

      {/* Create Leave Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle demande de congé</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employé</Label>
              <Select value={leaveForm.employee_id} onValueChange={v => setLeaveForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'actif').map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Textarea rows={2} value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} placeholder="Précisez le motif..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
            <Button disabled={!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date}
              onClick={handleSubmitLeave}>
              Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
