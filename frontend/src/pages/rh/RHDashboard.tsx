/**
 * RH Dashboard Page
 * KPI cards with accent borders, employee avatars, quick-access panel.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Wallet, Clock, AlertTriangle, Plus, FileText, ArrowRight, TrendingUp, BookOpen, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { rhService } from '@/services/rh.service';

const fmt = (n: number) => n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: 'Brouillon', color: 'text-amber-700',   bg: 'bg-amber-100'  },
  validé:    { label: 'Validé',    color: 'text-blue-700',    bg: 'bg-blue-100'   },
  payé:      { label: 'Payé',      color: 'text-emerald-700', bg: 'bg-emerald-100'},
};

const initials = (name: string) =>
  (name || '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];

export const RHDashboard: React.FC = () => {
  const navigate = useNavigate();
  const now = new Date();
  const thisYear = now.getFullYear();

  const { data: employees = [] }   = useQuery({ queryKey: ['rh-employees'], queryFn: rhService.getEmployees });
  const { data: payrollList = [] } = useQuery({ queryKey: ['rh-payroll'],   queryFn: () => rhService.getPayrollList() });
  const { data: leaves = [] }      = useQuery({ queryKey: ['rh-leaves'],    queryFn: () => rhService.getLeaves() });

  const activeEmployees  = employees.filter(e => e.status === 'actif').length;
  const currentMonthPay  = payrollList.filter(p => p.month === now.getMonth() + 1 && p.year === thisYear && ['validé','payé'].includes(p.status));
  const masseSalariale   = currentMonthPay.reduce((s, p) => s + Number(p.net_a_payer || 0), 0);
  const pendingLeaves    = leaves.filter(l => l.status === 'en attente').length;
  const expiringCDD      = employees.filter(e => {
    if (e.contract_type !== 'CDD') return false;
    const mo = (now.getTime() - new Date(e.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return mo >= 11 && mo <= 12;
  }).length;

  const recentPayroll = [...payrollList]
    .sort((a, b) => new Date(b.generated_at || 0).getTime() - new Date(a.generated_at || 0).getTime())
    .slice(0, 6);

  const kpis = [
    {
      title: 'Employés actifs',
      value: activeEmployees,
      icon: Users,
      iconBg: 'bg-blue-100', iconColor: 'text-blue-600', border: 'border-l-blue-500',
      sub: `${employees.filter(e => e.contract_type === 'CDI').length} CDI · ${employees.filter(e => e.contract_type === 'CDD').length} CDD`,
      href: '/rh/employes',
    },
    {
      title: 'Masse salariale',
      value: fmt(masseSalariale), unit: 'MAD',
      icon: Wallet,
      iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', border: 'border-l-emerald-500',
      sub: `${months[now.getMonth()]} ${thisYear}`,
      href: '/rh/paie',
    },
    {
      title: 'Congés en attente',
      value: pendingLeaves,
      icon: Clock,
      iconBg: 'bg-amber-100', iconColor: 'text-amber-600', border: 'border-l-amber-500',
      sub: `${leaves.filter(l => l.status === 'approuvé').length} approuvé(s)`,
      href: '/rh/conges',
    },
    {
      title: 'CDD expirant',
      value: expiringCDD,
      icon: AlertTriangle,
      iconBg: 'bg-red-100', iconColor: 'text-red-600', border: 'border-l-red-500',
      sub: 'Dans les 30 jours',
      href: '/rh/employes',
    },
  ];

  const quickLinks = [
    { label: 'Registre du personnel', desc: 'Document légal — tous employés', href: '/rh/registre',      icon: Users,     bg: 'bg-blue-50',   color: 'text-blue-600'   },
    { label: 'Livre de paie',         desc: 'Fiches validées par mois',        href: '/rh/livre-de-paie', icon: TrendingUp, bg: 'bg-emerald-50', color: 'text-emerald-600'},
    { label: 'Attestations',          desc: 'Travail, salaire, congé',          href: '/rh/attestations',  icon: Award,      bg: 'bg-violet-50',  color: 'text-violet-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord RH</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Vue d'ensemble des ressources humaines</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/rh/employes/nouveau')} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Nouvel Employé
          </Button>
          <Button variant="outline" onClick={() => navigate('/rh/paie/generer')} className="gap-2">
            <FileText className="w-4 h-4" /> Générer Paie
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ title, value, unit, icon: Icon, iconBg, iconColor, border, sub, href }) => (
          <Card key={title}
            onClick={() => navigate(href)}
            className={`cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 ${border} group`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${iconBg} transition-transform group-hover:scale-110`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/30 mt-1 group-hover:text-muted-foreground transition-colors" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">
                {value}
                {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content: recent payroll + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent payroll table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Dernières fiches de paie</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/rh/paie')} className="text-xs gap-1 h-7 text-muted-foreground hover:text-foreground">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentPayroll.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-sm font-medium">Aucune fiche de paie</p>
                <p className="text-xs mt-0.5">Générez la première fiche de paie</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs gap-1" onClick={() => navigate('/rh/paie/generer')}>
                  <Plus className="w-3 h-3" /> Générer
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentPayroll.map(p => {
                  const cfg = statusConfig[p.status] || statusConfig.brouillon;
                  return (
                    <div key={p.id}
                      onClick={() => navigate('/rh/paie')}
                      className="flex items-center justify-between py-2.5 px-1 hover:bg-muted/40 cursor-pointer rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(p.full_name || '')}`}>
                          {initials(p.full_name || '')}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground">{months[p.month - 1]} {p.year}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold">{fmt(Number(p.net_a_payer))} <span className="text-xs text-muted-foreground font-normal">MAD</span></span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Accès rapide</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1.5">
              {quickLinks.map(({ label, desc, href, icon: Icon, bg, color }) => (
                <button key={href} onClick={() => navigate(href)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left group">
                  <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{label}</p>
                    <p className="text-xs text-muted-foreground truncate">{desc}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground flex-shrink-0 transition-colors" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Summary stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2.5">
              {[
                { label: 'Total fiches générées', value: payrollList.length },
                { label: 'Congés ce mois', value: leaves.filter(l => new Date(l.start_date).getMonth() === now.getMonth()).length },
                { label: 'Employés suspendus', value: employees.filter(e => e.status === 'suspendu').length },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold tabular-nums">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
