/**
 * Payroll List Page — /rh/paie
 * Filter by month/year/status. Validate, mark paid, download PDF, CNSS export.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, Banknote, Download, FileDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRH } from '@/contexts/RHContext';
import { rhService, PayrollStatus } from '@/services/rh.service';
import { useToast } from '@/hooks/use-toast';

const fmt = (n: number) => Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const monthsShort = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];
const initials   = (name: string) => (name || '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const statusCfg: Record<PayrollStatus, { label: string; color: string; bg: string; dot: string }> = {
  brouillon: { label: 'Brouillon', color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500'   },
  validé:    { label: 'Validé',    color: 'text-blue-700',    bg: 'bg-blue-100',    dot: 'bg-blue-500'    },
  payé:      { label: 'Payé',      color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
};

export const PayrollList: React.FC = () => {
  const navigate = useNavigate();
  const { payrollList, payrollLoading, validatePayroll, markPayrollPaid } = useRH();
  const { toast } = useToast();

  const now = new Date();
  const [filterMonth,  setFilterMonth]  = useState<string>('all');
  const [filterYear,   setFilterYear]   = useState<string>(String(now.getFullYear()));
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = payrollList.filter(p => {
    if (filterMonth  !== 'all' && p.month  !== Number(filterMonth))  return false;
    if (filterYear              && p.year   !== Number(filterYear))   return false;
    if (filterStatus !== 'all' && p.status !== filterStatus)         return false;
    return true;
  });

  const totalNet = filtered.reduce((s, p) => s + Number(p.net_a_payer || 0), 0);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const handleDownload = (p: typeof payrollList[0]) => {
    rhService.downloadPdf(
      rhService.getBulletinUrl(p.id),
      `bulletin-${(p.full_name || '').replace(/\s+/g,'-')}-${monthsShort[p.month-1]}-${p.year}.pdf`
    ).catch(e => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }));
  };

  const handleCnssExport = async () => {
    const m = filterMonth !== 'all' ? Number(filterMonth) : now.getMonth() + 1;
    const y = filterYear ? Number(filterYear) : now.getFullYear();
    try {
      const token = localStorage.getItem('auth_token');
      const base  = import.meta.env.VITE_API_URL || '/api';
      const res   = await fetch(`${base}/rh/payroll/export/cnss?month=${m}&year=${y}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const header = ['N°','Employé','CIN','N° CNSS','Brut','CNSS salarié','CNSS patronal'];
      type CnssRecord = { full_name: string; cin: string; cnss_number: string; brut: string|number; cnss_employee: string|number; cnss_employer: string|number };
      const rows = ((data.records || []) as CnssRecord[]).map((r, i) => [
        i + 1, r.full_name, r.cin, r.cnss_number,
        fmt(Number(r.brut)), fmt(Number(r.cnss_employee)), fmt(Number(r.cnss_employer)),
      ]);
      const csv  = [header, ...rows].map(r => r.join(';')).join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `declaration-cnss-${monthsShort[m-1]}-${y}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: 'Erreur export CNSS', description: e instanceof Error ? e.message : 'Erreur inconnue', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fiches de Paie</h1>
          <p className="text-muted-foreground text-sm">Gestion de la paie et bulletins</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCnssExport} className="gap-2">
            <FileDown className="w-4 h-4" /> CNSS
          </Button>
          <Button onClick={() => navigate('/rh/paie/generer')} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Générer une fiche
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      {!payrollLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Total fiches', value: filtered.length,                                                  color: 'text-foreground', bg: 'bg-muted/60' },
            { label: 'Brouillons',   value: filtered.filter(p => p.status === 'brouillon').length,            color: 'text-amber-700',   bg: 'bg-amber-50' },
            { label: 'Validées',     value: filtered.filter(p => p.status === 'validé').length,               color: 'text-blue-700',    bg: 'bg-blue-50'  },
            { label: 'Masse nette',  value: `${fmt(totalNet)} MAD`,                                           color: 'text-emerald-700', bg: 'bg-emerald-50' },
          ] as const).map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl p-3 ${bg}`}>
              <p className={`text-lg font-bold ${color} truncate`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tous les mois" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {months.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="validé">Validé</SelectItem>
                <SelectItem value="payé">Payé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Employé</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="text-right">Brut</TableHead>
                <TableHead className="text-right">Net à payer</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!payrollLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="w-5 h-5 opacity-40" />
                      </div>
                      <p className="text-sm font-medium">Aucune fiche de paie</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(p => {
                const cfg = statusCfg[p.status];
                return (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(p.full_name || '')}`}>
                          {initials(p.full_name || '')}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{p.full_name}</p>
                          {p.job_title && <p className="text-xs text-muted-foreground">{p.job_title}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{monthsShort[p.month - 1]} {p.year}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(Number(p.brut))} MAD</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{fmt(Number(p.net_a_payer))} MAD</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        {p.status === 'brouillon' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Valider"
                            onClick={() => validatePayroll(p.id).catch(e => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }))}>
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        {p.status === 'validé' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Marquer payé"
                            onClick={() => markPayrollPaid(p.id).catch(e => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }))}>
                            <Banknote className="w-4 h-4 text-emerald-600" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Télécharger PDF" onClick={() => handleDownload(p)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
