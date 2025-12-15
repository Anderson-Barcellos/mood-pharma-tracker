import { useState } from 'react';
import { useMedications } from '@/hooks/use-medications';
import { useDoses } from '@/hooks/use-doses';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { Badge } from '@/shared/ui/badge';
import { Plus, Pill, Pencil, Trash, ClockCounterClockwise, Lightning, Clock } from '@phosphor-icons/react';
import type { Medication, MedicationCategory, MedicationDose } from '@/shared/types';
import MedicationDosesView from '@/features/doses/components/MedicationDosesView';
import { getMedicationPresets } from '@/shared/constants/medication-presets';

const MEDICATION_CATEGORIES: MedicationCategory[] = [
  'SSRI',
  'SNRI',
  'Stimulant',
  'Benzodiazepine',
  'Antipsychotic',
  'Mood Stabilizer',
  'Nootropic',
  'Amino Acid',
  'Fatty Acid',
  'Other'
];

export default function MedicationsView() {
  const { medications, createMedication, updateMedication, deleteMedication } = useMedications();
  const { doses } = useDoses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [viewDosesMed, setViewDosesMed] = useState<Medication | null>(null);
  const [dosesDialogOpen, setDosesDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
    category: 'SSRI' as MedicationCategory,
    halfLife: '',
    volumeOfDistribution: '',
    bioavailability: '',
    absorptionRate: '',
    scheduledTime: '',
    therapeuticMin: '',
    therapeuticMax: '',
    therapeuticUnit: 'ng/mL',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      brandName: '',
      category: 'SSRI',
      halfLife: '',
      volumeOfDistribution: '',
      bioavailability: '',
      absorptionRate: '',
      scheduledTime: '',
      therapeuticMin: '',
      therapeuticMax: '',
      therapeuticUnit: 'ng/mL',
      notes: ''
    });
    setEditingMed(null);
  };

  const handlePresetSelect = (presetName: string) => {
    const presets = getMedicationPresets();
    const preset = presets.find(p => p.name === presetName);
    if (preset) {
      setFormData({
        name: preset.name,
        brandName: preset.brandName || '',
        category: (preset.category as MedicationCategory) || 'Other',
        halfLife: preset.halfLife.toString(),
        volumeOfDistribution: preset.volumeOfDistribution.toString(),
        bioavailability: preset.bioavailability.toString(),
        absorptionRate: preset.absorptionRate.toString(),
        scheduledTime: '',
        therapeuticMin: preset.therapeuticRange?.min?.toString() || '',
        therapeuticMax: preset.therapeuticRange?.max?.toString() || '',
        therapeuticUnit: preset.therapeuticRange?.unit || 'ng/mL',
        notes: preset.notes || ''
      });
    }
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (med: Medication) => {
    setEditingMed(med);
    setFormData({
      name: med.name,
      brandName: med.brandName || '',
      category: med.category as MedicationCategory,
      halfLife: med.halfLife.toString(),
      volumeOfDistribution: med.volumeOfDistribution.toString(),
      bioavailability: med.bioavailability.toString(),
      absorptionRate: med.absorptionRate.toString(),
      scheduledTime: med.scheduledTime || '',
      therapeuticMin: med.therapeuticRange?.min?.toString() || '',
      therapeuticMax: med.therapeuticRange?.max?.toString() || '',
      therapeuticUnit: med.therapeuticRange?.unit || 'ng/mL',
      notes: med.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const therapeuticRange = formData.therapeuticMin && formData.therapeuticMax
      ? {
          min: parseFloat(formData.therapeuticMin),
          max: parseFloat(formData.therapeuticMax),
          unit: formData.therapeuticUnit
        }
      : undefined;

    const medicationData = {
      name: formData.name,
      brandName: formData.brandName || undefined,
      category: formData.category,
      halfLife: parseFloat(formData.halfLife),
      volumeOfDistribution: parseFloat(formData.volumeOfDistribution),
      bioavailability: parseFloat(formData.bioavailability),
      absorptionRate: parseFloat(formData.absorptionRate),
      scheduledTime: formData.scheduledTime || undefined,
      therapeuticRange,
      notes: formData.notes || undefined
    };

    if (editingMed) {
      await updateMedication(editingMed.id, medicationData);
    } else {
      await createMedication(medicationData);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this medication?')) {
      await deleteMedication(id);
    }
  };

  const handleViewDoses = (med: Medication) => {
    setViewDosesMed(med);
    setDosesDialogOpen(true);
  };

  const getDoseCount = (medicationId: string) => {
    return doses.filter(d => d.medicationId === medicationId).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Medications</h2>
          <p className="text-muted-foreground">Manage your psychiatric medications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMed ? 'Edit Medication' : 'Add New Medication'}</DialogTitle>
              <DialogDescription>
                Enter the pharmacokinetic parameters for your medication
              </DialogDescription>
            </DialogHeader>

            {!editingMed && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Lightning className="w-4 h-4 text-primary" weight="fill" />
                  Quick Fill from Preset
                </Label>
                <Select onValueChange={handlePresetSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a medication preset..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getMedicationPresets().map(preset => (
                      <SelectItem key={preset.name} value={preset.name}>
                        {preset.name} {preset.brandName ? `(${preset.brandName})` : ''} - {preset.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Auto-preenche todos os parâmetros PK
                </p>
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Generic Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Escitalopram"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name</Label>
                  <Input
                    id="brandName"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="e.g., Lexapro"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as MedicationCategory })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICATION_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="halfLife">Half-Life (hours) *</Label>
                  <Input
                    id="halfLife"
                    type="number"
                    step="0.1"
                    value={formData.halfLife}
                    onChange={(e) => setFormData({ ...formData, halfLife: e.target.value })}
                    placeholder="e.g., 30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volumeOfDistribution">Volume of Distribution (L/kg) *</Label>
                  <Input
                    id="volumeOfDistribution"
                    type="number"
                    step="0.1"
                    value={formData.volumeOfDistribution}
                    onChange={(e) => setFormData({ ...formData, volumeOfDistribution: e.target.value })}
                    placeholder="e.g., 12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bioavailability">Bioavailability (0-1) *</Label>
                  <Input
                    id="bioavailability"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.bioavailability}
                    onChange={(e) => setFormData({ ...formData, bioavailability: e.target.value })}
                    placeholder="e.g., 0.80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="absorptionRate">Absorption Rate (1/h) *</Label>
                  <Input
                    id="absorptionRate"
                    type="number"
                    step="0.1"
                    value={formData.absorptionRate}
                    onChange={(e) => setFormData({ ...formData, absorptionRate: e.target.value })}
                    placeholder="e.g., 0.75"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledTime" className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Horário Padrão
                  </Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Horário habitual de tomada (ex: 09:00)
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <Label className="text-sm font-medium mb-3 block">Faixa Terapêutica (opcional)</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="therapeuticMin" className="text-xs">Mínimo</Label>
                    <Input
                      id="therapeuticMin"
                      type="number"
                      step="0.1"
                      value={formData.therapeuticMin}
                      onChange={(e) => setFormData({ ...formData, therapeuticMin: e.target.value })}
                      placeholder="ex: 50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="therapeuticMax" className="text-xs">Máximo</Label>
                    <Input
                      id="therapeuticMax"
                      type="number"
                      step="0.1"
                      value={formData.therapeuticMax}
                      onChange={(e) => setFormData({ ...formData, therapeuticMax: e.target.value })}
                      placeholder="ex: 125"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="therapeuticUnit" className="text-xs">Unidade</Label>
                    <Select value={formData.therapeuticUnit} onValueChange={(value) => setFormData({ ...formData, therapeuticUnit: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ng/mL">ng/mL</SelectItem>
                        <SelectItem value="mcg/mL">mcg/mL</SelectItem>
                        <SelectItem value="mg/L">mg/L</SelectItem>
                        <SelectItem value="mmol/L">mmol/L</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Concentração sérica ideal para eficácia. Aparece como faixa verde no gráfico PK.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formData.name || !formData.halfLife || !formData.volumeOfDistribution || !formData.bioavailability || !formData.absorptionRate}>
                {editingMed ? 'Update' : 'Add'} Medication
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {medications.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No medications yet</CardTitle>
            <CardDescription>Add your first medication to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track your psychiatric medications with their pharmacokinetic parameters to analyze correlations with mood and cognition.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {medications.map(med => {
            // Check if medication has complete PK parameters
            const hasPkParams =
              Number.isFinite(med.halfLife) && med.halfLife > 0 &&
              Number.isFinite(med.volumeOfDistribution) && med.volumeOfDistribution > 0 &&
              Number.isFinite(med.bioavailability) && med.bioavailability > 0 &&
              Number.isFinite(med.absorptionRate) && med.absorptionRate > 0;

            return (
              <Card key={med.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Pill className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{med.name}</CardTitle>
                        {med.brandName && (
                          <CardDescription className="text-xs">{med.brandName}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!hasPkParams && (
                        <Badge variant="destructive" className="text-xs">Incompleto</Badge>
                      )}
                      <Badge variant="outline">{med.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Half-life:</span>
                      <span className="font-medium">{med.halfLife ? `${med.halfLife}h` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vd:</span>
                      <span className="font-medium">{med.volumeOfDistribution ? `${med.volumeOfDistribution} L/kg` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bioavailability:</span>
                      <span className="font-medium">{med.bioavailability ? `${(med.bioavailability * 100).toFixed(0)}%` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Absorption:</span>
                      <span className="font-medium">{med.absorptionRate ? `${med.absorptionRate}/h` : '—'}</span>
                    </div>
                    {med.scheduledTime && (
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Horário:
                        </span>
                        <span className="font-medium text-primary">{med.scheduledTime}</span>
                      </div>
                    )}
                  </div>
                  {!hasPkParams && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-destructive">
                        ⚠️ Parâmetros farmacocinéticos incompletos. Gráficos não serão exibidos até você completar os dados.
                      </p>
                    </div>
                  )}
                  {med.notes && (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">{med.notes}</p>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewDoses(med)}
                  >
                    <ClockCounterClockwise className="w-4 h-4 mr-2" />
                    View Doses ({getDoseCount(med.id)})
                  </Button>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(med)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(med.id)}>
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {viewDosesMed && (
        <MedicationDosesView
          medication={viewDosesMed}
          open={dosesDialogOpen}
          onOpenChange={setDosesDialogOpen}
        />
      )}
    </div>
  );
}
