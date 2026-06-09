/**
 * Livre de Paie Page — /rh/livre-de-paie
 * Legal page showing validated payrolls for a selected month/year.
 */

import React, { useState } from 'react';
import { Download, ShieldCheck, Users, TrendingUp, TrendingDown, Wallet, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useRH } from '@/contexts/RHContext';

const fmt = (n: number) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const monthsShort = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];
const initials   = (name: string) => (name || '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

export const LivreDePayePage: React.FC = () => {
  const { payrollList, payrollLoading } = useRH();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const filtered = payrollList.filter(
    p => p.month === month && p.year === year && ['validé', 'payé'].includes(p.status)
  ).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  const totals = filtered.reduce(
    (acc, p) => ({
      brut:       acc.brut       + Number(p.brut        || 0),
      retenues:   acc.retenues   + Number(p.cnss_employee || 0) + Number(p.amo_employee || 0) + Number(p.igr || 0),
      cnss:       acc.cnss       + Number(p.cnss_employee || 0),
      amo:        acc.amo        + Number(p.amo_employee  || 0),
      igr:        acc.igr        + Number(p.igr           || 0),
      net:        acc.net        + Number(p.net_a_payer   || 0),
    }),
    { brut: 0, retenues: 0, cnss: 0, amo: 0, igr: 0, net: 0 }
  );

  const handleExport = () => {
    const header = ['N°','Employé','Brut','CNSS','AMO','IGR','Net à payer'];
    const rows = filtered.map((p, i) => [
      i + 1, p.full_name,
      fmt(Number(p.brut)), fmt(Number(p.cnss_employee)),
      fmt(Number(p.amo_employee)), fmt(Number(p.igr)), fmt(Number(p.net_a_payer)),
    ]);
    rows.push(['', 'TOTAL', fmt(totals.brut), fmt(totals.cnss), fmt(totals.amo), fmt(totals.igr), fmt(totals.net)]);
    const csv  = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `livre-de-paie-${monthsShort[month - 1]}-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    {
      label:  'Employés payés',
      value:  String(filtered.length),
      icon:   Users,
      color:  'text-foreground',
      bg:     'bg-muted/60',
    },
    {
      label:  'Masse salariale brute',
      value:  `${fmt(totals.brut)} MAD`,
      icon:   TrendingUp,
      color:  'text-blue-700',
      bg:     'bg-blue-50',
    },
    {
      label:  'Total retenues',
      value:  `${fmt(totals.retenues)} MAD`,
      icon:   TrendingDown,
      color:  'text-red-700',
      bg:     'bg-red-50',
    },
    {
      label:  'Masse nette à payer',
      value:  `${fmt(totals.net)} MAD`,
      icon:   Wallet,
      color:  'text-emerald-700',
      bg:     'bg-emerald-50',
    },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold">Livre de Paie</h1>
            <span className="flex items-center gap-1 text-xs bg-muted border px-2 py-0.5 rounded-full text-muted-foreground">
              <ShieldCheck className="w-3 h-3" /> Document légal
            </span>
          </div>
          <p className="text-muted-foreground text-sm">Fiches validées et payées — lecture seule</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" /> Exporter CSV
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border">
        <CalendarDays className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium text-muted-foreground">Période :</span>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-40 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        {filtered.length > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">
            {filtered.length} fiche{filtered.length > 1 ? 's' : ''} pour {months[month - 1]} {year}
          </span>
        )}
      </div>

      {/* Summary tiles */}
      {!payrollLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl p-3 ${bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <p className={`text-sm font-bold ${color} truncate`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">N°</TableHead>
                <TableHead>Employé</TableHead>
                <TableHead className="text-right">Brut</TableHead>
                <TableHead className="text-right">CNSS</TableHead>
                <TableHead className="text-right">AMO</TableHead>
                <TableHead className="text-right">IGR</TableHead>
                <TableHead className="text-right">Net à payer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!payrollLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-1">
                        <CalendarDays className="w-6 h-6 opacity-30" />
                      </div>
                      <p className="text-sm font-medium">Aucune fiche validée</p>
                      <p className="text-xs">pour {months[month - 1]} {year}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p, i) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="text-muted-foreground text-xs font-mono">{i + 1}</TableCell>
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
                  <TableCell className="text-right font-mono text-sm">{fmt(Number(p.brut))}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-700">{fmt(Number(p.cnss_employee))}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-700">{fmt(Number(p.amo_employee))}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-700">{fmt(Number(p.igr))}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-emerald-700">{fmt(Number(p.net_a_payer))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {filtered.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>
                    <span className="font-bold text-sm">TOTAL — {months[month - 1]} {year}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{filtered.length} employé{filtered.length > 1 ? 's' : ''}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">{fmt(totals.brut)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-red-700">{fmt(totals.cnss)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-red-700">{fmt(totals.amo)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-red-700">{fmt(totals.igr)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-emerald-700">{fmt(totals.net)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
