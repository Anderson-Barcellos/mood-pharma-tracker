import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Pill, Pencil, Trash, ClockCounterClockwise } from '@phosphor-icons/react';
import type { Medication, MedicationCategory } from '../lib/types';
import MedicationDosesView from './MedicationDosesView';
import { useMedications } from '@/hooks/use-medications';
import { useDoses } from '@/hooks/use-doses';

const MEDICATION_CATEGORIES: MedicationCategory[] = [
  'SSRI',
  'SNRI',
  'Stimulant',
  'Benzodiazepine',
  'Antipsychotic',
  'Mood Stabilizer',
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
      notes: ''
    });
    setEditingMed(null);
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
      notes: med.notes || ''
    });
    setDialogOpen(true);
  };

  const parseNumber = (value: string, fallback: number) => {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const handleSave = async () => {
    const basePayload = {
      name: formData.name,
      brandName: formData.brandName || undefined,
      category: formData.category,
      halfLife: parseNumber(formData.halfLife, editingMed?.halfLife ?? 0),
      volumeOfDistribution: parseNumber(formData.volumeOfDistribution, editingMed?.volumeOfDistribution ?? 0),
      bioavailability: parseNumber(formData.bioavailability, editingMed?.bioavailability ?? 0),
      absorptionRate: parseNumber(formData.absorptionRate, editingMed?.absorptionRate ?? 1),
      notes: formData.notes || undefined
    } satisfies Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>;

    if (editingMed) {
      await updateMedication(editingMed.id, basePayload);
    } else {
      await createMedication(basePayload);
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

      {(medications || []).length === 0 ? (
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
          {(medications || []).map(med => (
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
                  <Badge variant="outline">{med.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Half-life:</span>
                    <span className="font-medium">{med.halfLife}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vd:</span>
                    <span className="font-medium">{med.volumeOfDistribution} L/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bioavailability:</span>
                    <span className="font-medium">{(med.bioavailability * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Absorption:</span>
                    <span className="font-medium">{med.absorptionRate}/h</span>
                  </div>
                </div>
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
          ))}
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
