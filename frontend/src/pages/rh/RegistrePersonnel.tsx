/**
 * Registre du Personnel Page — /rh/registre
 * Legal read-only page. All employees including terminated. Paginated 50/page.
 */

import React, { useState } from 'react';
import { Download, Search, Users, UserCheck, UserX, UserMinus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRH } from '@/contexts/RHContext';

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-MA') : '—';
const fmt = (n: number) => Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];
const initials   = (name: string) => (name || '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const statusCfg: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  actif:    { label: 'Actif',    color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  suspendu: { label: 'Suspendu', color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500'   },
  terminé:  { label: 'Terminé',  color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500'     },
};

const contractBadge: Record<string, string> = {
  CDI:     'bg-blue-100 text-blue-700',
  CDD:     'bg-purple-100 text-purple-700',
  Intérim: 'bg-orange-100 text-orange-700',
};

const PAGE_SIZE = 50;

export const RegistrePersonnel: React.FC = () => {
  const { employees, employeesLoading } = useRH();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');

  const sorted = [...employees].sort((a, b) => a.full_name.localeCompare(b.full_name));

  const filtered = search.trim()
    ? sorted.filter(e =>
        e.full_name.toLowerCase().includes(search.toLowerCase()) ||
        e.cin.toLowerCase().includes(search.toLowerCase()) ||
        (e.job_title || '').toLowerCase().includes(search.toLowerCase())
      )
    : sorted;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleExport = () => {
    const header = ['N°','Nom complet','CIN',"Date d'embauche",'Date fin contrat','Poste','Contrat','Salaire de base','Statut'];
    const rows = sorted.map((e, i) => [
      i + 1, e.full_name, e.cin, fmtDate(e.hire_date), '—',
      e.job_title, e.contract_type, fmt(Number(e.base_salary)), e.status,
    ]);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'registre-du-personnel.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: 'Total',     value: employees.length,                                     icon: Users,     color: 'text-foreground', bg: 'bg-muted/60' },
    { label: 'Actifs',    value: employees.filter(e => e.status === 'actif').length,    icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Suspendus', value: employees.filter(e => e.status === 'suspendu').length, icon: UserMinus, color: 'text-amber-700',   bg: 'bg-amber-50'   },
    { label: 'Terminés',  value: employees.filter(e => e.status === 'terminé').length,  icon: UserX,     color: 'text-red-700',     bg: 'bg-red-50'     },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold">Registre du Personnel</h1>
            <span className="flex items-center gap-1 text-xs bg-muted border px-2 py-0.5 rounded-full text-muted-foreground">
              <ShieldCheck className="w-3 h-3" /> Document légal
            </span>
          </div>
          <p className="text-muted-foreground text-sm">Lecture seule — tous les employés, y compris les anciens</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" /> Exporter CSV
        </Button>
      </div>

      {/* Stats strip */}
      {!employeesLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl p-3 ${bg} flex items-center gap-3`}>
              <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
              <div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-4 space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un employé..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">N°</TableHead>
                <TableHead>Employé</TableHead>
                <TableHead>CIN</TableHead>
                <TableHead>Embauché le</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead className="text-right">Salaire de base</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!employeesLoading && paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="w-10 h-10 opacity-20" />
                      <p className="text-sm">{search ? 'Aucun résultat trouvé' : 'Aucun employé'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {paged.map((e, idx) => {
                const cfg = statusCfg[e.status] || statusCfg.terminé;
                return (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {(safePage - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(e.full_name)}`}>
                          {initials(e.full_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{e.full_name}</p>
                          {e.department && <p className="text-xs text-muted-foreground">{e.department}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{e.cin}</TableCell>
                    <TableCell className="text-sm">{fmtDate(e.hire_date)}</TableCell>
                    <TableCell className="text-sm">{e.job_title}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${contractBadge[e.contract_type] || 'bg-muted text-muted-foreground'}`}>
                        {e.contract_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(Number(e.base_salary))} MAD</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {(totalPages > 1 || filtered.length > 0) && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {filtered.length > 0
                  ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} sur ${filtered.length} employé${filtered.length > 1 ? 's' : ''}`
                  : 'Aucun résultat'
                }
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>
                    Précédent
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                            safePage === p
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>
                    Suivant
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
