/**
 * Payroll Form Page — /rh/paie/generer
 * 2-step wizard with visual step indicator.
 * Step 1: Select employee + period. Step 2: Enter data + live preview.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, User, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRH } from '@/contexts/RHContext';
import { rhService, PayrollRecord, PayrollInputs, OvertimeType } from '@/services/rh.service';
import { useToast } from '@/hooks/use-toast';

const fmt = (n: number | undefined) =>
  Number(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const overtimeOptions: { label: string; value: OvertimeType }[] = [
  { label: 'Semaine · +25%',   value: 'weekday_25'  },
  { label: 'Semaine · +50%',   value: 'weekday_50'  },
  { label: 'Repos · +100%',    value: 'restday_100' },
  { label: 'Repos nuit · +150%', value: 'restday_150'},
];

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name: string) => AVATAR_COLORS[(name || ' ').charCodeAt(0) % AVATAR_COLORS.length];
const initials   = (name: string) => (name || '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

export const PayrollForm: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { employees, generatePayroll } = useRH();
  const { toast } = useToast();

  const now = new Date();
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [employeeId, setEmployeeId] = useState(params.get('employee') || '');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  // Step 2 inputs
  const [daysWorked,        setDaysWorked]        = useState(26);
  const [overtimeHours,     setOvertimeHours]     = useState(0);
  const [overtimeType,      setOvertimeType]      = useState<OvertimeType>('weekday_25');
  const [primeTransport,    setPrimeTransport]    = useState(0);
  const [primeRendement,    setPrimeRendement]    = useState(0);
  const [primeAnciennete,   setPrimeAnciennete]   = useState(0);
  const [otherBonus,        setOtherBonus]        = useState(0);
  const [advanceDeduction,  setAdvanceDeduction]  = useState(0);
  const [absenceDays,       setAbsenceDays]       = useState(0);

  const [preview,        setPreview]        = useState<Partial<PayrollRecord>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const fetchPreview = useCallback(async () => {
    if (!employeeId || !selectedEmployee) return;
    setPreviewLoading(true);
    try {
      const result = await rhService.calculatePayroll({
        employee_id: employeeId, year,
        base_salary: Number(selectedEmployee.base_salary),
        days_worked: daysWorked, total_working_days: 26,
        overtime_hours: overtimeHours, overtime_type: overtimeType,
        prime_transport: primeTransport, prime_rendement: primeRendement,
        prime_anciennete: primeAnciennete, other_bonus: otherBonus,
        advance_deduction: advanceDeduction, unjustified_absence_days: absenceDays,
        nb_dependents: selectedEmployee.nb_dependents,
      } as Partial<PayrollInputs> & { total_working_days: number; nb_dependents: number });
      setPreview(result);
    } catch { /* ignore preview errors */ }
    finally { setPreviewLoading(false); }
  }, [employeeId, year, selectedEmployee, daysWorked, overtimeHours, overtimeType,
      primeTransport, primeRendement, primeAnciennete, otherBonus, advanceDeduction, absenceDays]);

  useEffect(() => { if (step === 2) fetchPreview(); },
    [fetchPreview, step, daysWorked, overtimeHours, overtimeType,
     primeTransport, primeRendement, primeAnciennete, otherBonus, advanceDeduction, absenceDays]);

  const handleGenerate = async () => {
    if (!employeeId) return;
    setSaving(true);
    try {
      await generatePayroll({
        employee_id: employeeId, month, year,
        base_salary: Number(selectedEmployee?.base_salary),
        days_worked: daysWorked, overtime_hours: overtimeHours, overtime_type: overtimeType,
        prime_transport: primeTransport, prime_rendement: primeRendement,
        prime_anciennete: primeAnciennete, other_bonus: otherBonus,
        advance_deduction: advanceDeduction, unjustified_absence_days: absenceDays,
      });
      navigate('/rh/paie');
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur inconnue', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const numInput = (label: string, val: number, onChange: (v: number) => void, stepVal = 1) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <Input type="number" min="0" step={stepVal} value={val}
        onChange={e => onChange(Number(e.target.value))}
        className="h-9" />
    </div>
  );

  const previewRow = (label: string, value: number | undefined, variant: 'normal' | 'bold' | 'deduction' | 'muted' = 'normal') => {
    const cls = variant === 'bold'      ? 'font-semibold text-foreground'
              : variant === 'deduction' ? 'text-red-600'
              : variant === 'muted'     ? 'text-muted-foreground'
              : 'text-foreground';
    return (
      <div className={`flex justify-between items-center py-1.5 border-b border-muted/40 last:border-0 ${cls}`}>
        <span className="text-xs">{label}</span>
        <span className={`font-mono text-xs ${variant === 'bold' ? 'text-sm font-bold' : ''}`}>
          {variant === 'deduction' && value && value > 0 ? '−' : ''}{fmt(Math.abs(value || 0))} MAD
        </span>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Générer une fiche de paie</h1>
          <p className="text-muted-foreground text-sm">Calcul et enregistrement du bulletin mensuel</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 max-w-xs">
        {[
          { n: 1, label: 'Employé & Période', icon: User      },
          { n: 2, label: 'Données & Calcul',  icon: FileText  },
        ].map(({ n, label, icon: Icon }, i) => (
          <React.Fragment key={n}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > n  ? 'bg-primary text-primary-foreground' :
                step === n ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' :
                             'bg-muted text-muted-foreground'
              }`}>
                {step > n ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${step === n ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
            </div>
            {i < 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 rounded ${step > 1 ? 'bg-primary' : 'bg-muted'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <Card className="max-w-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sélection employé & période</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Employé *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'actif').map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      <div className="flex items-center gap-2">
                        <span>{e.full_name}</span>
                        <span className="text-xs text-muted-foreground">— {e.job_title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mois</Label>
                <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Année</Label>
                <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedEmployee && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(selectedEmployee.full_name)}`}>
                  {initials(selectedEmployee.full_name)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{selectedEmployee.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Salaire de base : <span className="font-medium text-foreground">{fmt(Number(selectedEmployee.base_salary))} MAD</span>
                  </p>
                </div>
              </div>
            )}

            <Button className="w-full" disabled={!employeeId} onClick={() => setStep(2)}>
              Continuer →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                {selectedEmployee && (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(selectedEmployee.full_name)}`}>
                    {initials(selectedEmployee.full_name)}
                  </div>
                )}
                <div>
                  <CardTitle className="text-sm">{selectedEmployee?.full_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{months[month - 1]} {year}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Attendance */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Présence</p>
                <div className="grid grid-cols-2 gap-3">
                  {numInput('Jours travaillés', daysWorked, setDaysWorked)}
                  {numInput("Jours d'absence", absenceDays, setAbsenceDays)}
                </div>
              </div>
              {/* Overtime */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Heures supplémentaires</p>
                <div className="grid grid-cols-2 gap-3">
                  {numInput('Heures', overtimeHours, setOvertimeHours, 0.5)}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</Label>
                    <Select value={overtimeType} onValueChange={v => setOvertimeType(v as OvertimeType)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {overtimeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {/* Bonuses */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Primes (MAD)</p>
                <div className="grid grid-cols-2 gap-3">
                  {numInput('Transport',   primeTransport,  setPrimeTransport,  0.01)}
                  {numInput('Rendement',   primeRendement,  setPrimeRendement,  0.01)}
                  {numInput('Ancienneté',  primeAnciennete, setPrimeAnciennete, 0.01)}
                  {numInput('Autres',      otherBonus,      setOtherBonus,      0.01)}
                </div>
              </div>
              {/* Deductions */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Déductions (MAD)</p>
                {numInput('Avance sur salaire', advanceDeduction, setAdvanceDeduction, 0.01)}
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Aperçu du bulletin</CardTitle>
                {previewLoading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gains section */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Gains</p>
                </div>
                <div className="bg-muted/30 rounded-lg px-3 py-1">
                  {previewRow('Salaire de base', Number(selectedEmployee?.base_salary))}
                  {previewRow('Déduction absence', preview.absence_deduction, 'deduction')}
                  {(preview.overtime_pay || 0) > 0 && previewRow('Heures supplémentaires', preview.overtime_pay)}
                  {(primeTransport + primeRendement + primeAnciennete + otherBonus) > 0 &&
                    previewRow('Total primes', primeTransport + primeRendement + primeAnciennete + otherBonus)}
                  {previewRow('SALAIRE BRUT', preview.brut, 'bold')}
                </div>
              </div>

              {/* Retenues section */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Retenues</p>
                </div>
                <div className="bg-muted/30 rounded-lg px-3 py-1">
                  {previewRow('CNSS salarié (4.48%)',  preview.cnss_employee,       'deduction')}
                  {previewRow('AMO salarié (2.26%)',   preview.amo_employee,        'deduction')}
                  {previewRow('Frais professionnels',  preview.frais_professionnels,'muted'    )}
                  {previewRow('Net imposable',         preview.net_imposable,       'bold'     )}
                  {previewRow('IGR',                   preview.igr,                 'deduction')}
                  {advanceDeduction > 0 && previewRow('Avance sur salaire', advanceDeduction, 'deduction')}
                </div>
              </div>

              {/* Net à payer */}
              <div className="bg-primary rounded-xl p-4 flex justify-between items-center">
                <span className="text-primary-foreground font-bold text-sm">NET À PAYER</span>
                <span className="text-primary-foreground font-bold text-xl font-mono">
                  {fmt(preview.net_a_payer)} MAD
                </span>
              </div>

              {/* Employer cost summary */}
              {preview.total_employer_cost && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 flex justify-between">
                  <span>Coût total employeur</span>
                  <span className="font-semibold font-mono">{fmt(preview.total_employer_cost)} MAD</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation buttons */}
      {step === 2 && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
          <Button onClick={handleGenerate} disabled={saving} className="gap-2">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Génération...</>
            ) : (
              <><Check className="w-4 h-4" /> Générer & Sauvegarder</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
