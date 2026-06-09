/**
 * Employee List Page — /rh/employes
 * Stats bar, initials avatars, status tabs, search, table with actions.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRH } from '@/contexts/RHContext';
import { EmployeeStatus } from '@/services/rh.service';

const fmt = (n: number) =>
  Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge: Record<EmployeeStatus, { bg: string; text: string; dot: string }> = {
  actif:    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  suspendu: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  terminé:  { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
};

const contractBadge: Record<string, string> = {
  CDI:     'bg-blue-100 text-blue-700',
  CDD:     'bg-purple-100 text-purple-700',
  Intérim: 'bg-orange-100 text-orange-700',
};

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name: string) => (name || '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

type TabStatus = 'tous' | EmployeeStatus;

export const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const { employees, employeesLoading } = useRH();
  const [search, setSearch] = useState('');
  const [tab, setTab]       = useState<TabStatus>('tous');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => {
      const matchesTab    = tab === 'tous' || e.status === tab;
      const matchesSearch = !q
        || e.full_name.toLowerCase().includes(q)
        || e.cin.toLowerCase().includes(q)
        || (e.department || '').toLowerCase().includes(q)
        || e.job_title.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [employees, search, tab]);

  const counts = {
    tous:     employees.length,
    actif:    employees.filter(e => e.status === 'actif').length,
    suspendu: employees.filter(e => e.status === 'suspendu').length,
    terminé:  employees.filter(e => e.status === 'terminé').length,
  };

  const tabs: { label: string; value: TabStatus }[] = [
    { label: 'Tous',     value: 'tous'     },
    { label: 'Actifs',   value: 'actif'    },
    { label: 'Suspendus',value: 'suspendu' },
    { label: 'Terminés', value: 'terminé'  },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employés</h1>
          <p className="text-muted-foreground text-sm">Gestion du personnel — {employees.length} employé{employees.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate('/rh/employes/nouveau')} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Nouvel Employé
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: counts.tous,     color: 'text-foreground',    bg: 'bg-muted/60'       },
          { label: 'Actifs',    value: counts.actif,    color: 'text-emerald-700',   bg: 'bg-emerald-50'     },
          { label: 'Suspendus', value: counts.suspendu, color: 'text-amber-700',     bg: 'bg-amber-50'       },
          { label: 'Terminés',  value: counts.terminé,  color: 'text-red-700',       bg: 'bg-red-50'         },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl p-3 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, CIN, poste, département..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 border-b pb-0">
            {tabs.map(t => (
              <button key={t.value} onClick={() => setTab(t.value)}
                className={`relative px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                  tab === t.value
                    ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                {t.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${tab === t.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {counts[t.value]}
                </span>
              </button>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Employé</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead className="text-right">Salaire de base</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!employeesLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Users className="w-5 h-5 opacity-40" />
                      </div>
                      <p className="text-sm font-medium">Aucun employé trouvé</p>
                      {search && <p className="text-xs">Essayez un autre terme de recherche</p>}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(emp => {
                const badge = statusBadge[emp.status];
                return (
                  <TableRow key={emp.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/rh/employes/${emp.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(emp.full_name)}`}>
                          {initials(emp.full_name)}
                        </div>
                        <div>
                          <p className="font-medium text-sm leading-tight">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.cin}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{emp.job_title}</p>
                      {emp.department && <p className="text-xs text-muted-foreground">{emp.department}</p>}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${contractBadge[emp.contract_type] || 'bg-muted text-muted-foreground'}`}>
                        {emp.contract_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{fmt(Number(emp.base_salary))} <span className="text-xs text-muted-foreground font-normal">MAD</span></TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/rh/employes/${emp.id}`)} title="Voir">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/rh/employes/${emp.id}/edit`)} title="Modifier">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/rh/paie/generer?employee=${emp.id}`)} title="Générer fiche de paie">
                          <FileText className="w-3.5 h-3.5" />
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
