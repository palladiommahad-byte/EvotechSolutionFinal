/**
 * Attestations Page — /rh/attestations
 * Employee search panel + three attestation type cards with descriptions and download.
 */

import React, { useState } from 'react';
import { FileText, Search, Download, Briefcase, Banknote, CalendarDays, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRH } from '@/contexts/RHContext';
import { rhService } from '@/services/rh.service';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-MA') : '—';

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];
const initials   = (name: string) => (name || '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

export const AttestationsPage: React.FC = () => {
  const { employees } = useRH();
  const { toast } = useToast();
  const [search, setSearch]           = useState('');
  const [selectedId, setSelectedId]   = useState('');
  const [selectedLeaveId, setSelectedLeaveId] = useState('');

  const filteredEmp = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.cin.toLowerCase().includes(search.toLowerCase())
  );
  const selected = employees.find(e => e.id === selectedId);

  const { data: leaves = [] } = useQuery({
    queryKey: ['rh-leaves-emp', selectedId],
    queryFn:  () => rhService.getEmployeeLeaves(selectedId),
    enabled:  !!selectedId,
  });

  const approvedLeaves = leaves.filter(l => l.status === 'approuvé');

  const download = async (url: string, filename: string) => {
    try { await rhService.downloadPdf(url, filename); }
    catch (e) { toast({ title: 'Erreur téléchargement', description: e instanceof Error ? e.message : 'Erreur inconnue', variant: 'destructive' }); }
  };

  const attestationTypes = [
    {
      key: 'travail',
      title: 'Attestation de Travail',
      desc: "Certifie que l'employé exerce dans l'entreprise",
      icon: Briefcase,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      border: 'border-blue-200 hover:border-blue-300',
      disabled: !selected,
      onClick: () => selected && download(
        rhService.getAttestationTravailUrl(selectedId),
        `attestation-travail-${selected.cin}.pdf`
      ),
    },
    {
      key: 'salaire',
      title: 'Attestation de Salaire',
      desc: "Certifie le salaire net mensuel de l'employé",
      icon: Banknote,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      border: 'border-emerald-200 hover:border-emerald-300',
      disabled: !selected,
      onClick: () => selected && download(
        rhService.getAttestationSalaireUrl(selectedId),
        `attestation-salaire-${selected.cin}.pdf`
      ),
    },
    {
      key: 'conge',
      title: 'Attestation de Congé',
      desc: "Certifie les dates et durée d'un congé approuvé",
      icon: CalendarDays,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      border: 'border-violet-200 hover:border-violet-300',
      disabled: !selected || !selectedLeaveId,
      onClick: () => selected && selectedLeaveId && download(
        rhService.getAttestationCongeUrl(selectedId, selectedLeaveId),
        `attestation-conge-${selected.cin}.pdf`
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attestations</h1>
        <p className="text-muted-foreground text-sm">Générer des attestations officielles pour les employés</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Employee selector — 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sélectionner un employé</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nom ou CIN..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedId(''); }}
                className="pl-9"
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
              {filteredEmp.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Aucun employé trouvé</p>
              ) : filteredEmp.map(e => (
                <button key={e.id} onClick={() => { setSelectedId(e.id); setSelectedLeaveId(''); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${selectedId === e.id ? 'bg-primary/8' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(e.full_name)}`}>
                    {initials(e.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedId === e.id ? 'text-primary' : ''}`}>{e.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.cin} · {e.job_title}</p>
                  </div>
                  {selectedId === e.id && <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attestation cards — 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          {/* Selected employee header */}
          {selected ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(selected.full_name)}`}>
                {initials(selected.full_name)}
              </div>
              <div>
                <p className="font-semibold">{selected.full_name}</p>
                <p className="text-xs text-muted-foreground">{selected.job_title} · {selected.contract_type}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-muted/30 border border-dashed text-center text-muted-foreground text-sm">
              Sélectionnez un employé pour générer des attestations
            </div>
          )}

          {/* Attestation type cards */}
          <div className="space-y-3">
            {attestationTypes.map(({ key, title, desc, icon: Icon, iconBg, iconColor, border, disabled, onClick }) => (
              <div key={key}
                className={`rounded-xl border p-4 transition-all ${border} ${disabled ? 'opacity-50' : 'cursor-pointer hover:shadow-sm bg-card'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${iconBg} flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    {/* Leave selector for congé */}
                    {key === 'conge' && selected && (
                      <div className="mt-2" onClick={e => e.stopPropagation()}>
                        {approvedLeaves.length > 0 ? (
                          <Select value={selectedLeaveId} onValueChange={setSelectedLeaveId}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Choisir un congé approuvé" />
                            </SelectTrigger>
                            <SelectContent>
                              {approvedLeaves.map(l => (
                                <SelectItem key={l.id} value={l.id}>
                                  {l.type} · {fmtDate(l.start_date)} — {fmtDate(l.end_date)} ({l.days_count}j)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xs text-muted-foreground">Aucun congé approuvé disponible</p>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={onClick}
                    className="gap-2 flex-shrink-0">
                    <Download className="w-4 h-4" /> Générer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leave history */}
      {selected && leaves.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Historique des congés — {selected.full_name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
                {leaves.map(l => (
                  <TableRow key={l.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">{l.type}</TableCell>
                    <TableCell className="text-sm">{fmtDate(l.start_date)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(l.end_date)}</TableCell>
                    <TableCell className="text-right font-semibold">{l.days_count}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        l.status === 'approuvé' ? 'bg-emerald-100 text-emerald-700' :
                        l.status === 'refusé'   ? 'bg-red-100 text-red-700' :
                                                  'bg-amber-100 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          l.status === 'approuvé' ? 'bg-emerald-500' :
                          l.status === 'refusé'   ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        {l.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
