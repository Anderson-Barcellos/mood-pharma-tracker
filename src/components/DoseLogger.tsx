import { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from '@phosphor-icons/react';
import type { Medication, MedicationDose } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DoseLogger() {
  const [medications] = useKV<Medication[]>('medications', []);
  const [doses, setDoses] = useKV<MedicationDose[]>('doses', []);
  const [selectedMedicationId, setSelectedMedicationId] = useState('');
  const [doseAmount, setDoseAmount] = useState('');

  const handleLogDose = () => {
    if (!selectedMedicationId || !doseAmount) {
      toast.error('Please select a medication and enter dose amount');
      return;
    }

    const medication = (medications || []).find(m => m.id === selectedMedicationId);
    if (!medication) return;

    const dose: MedicationDose = {
      id: uuidv4(),
      medicationId: selectedMedicationId,
      timestamp: Date.now(),
      doseAmount: parseFloat(doseAmount),
      createdAt: Date.now()
    };

    setDoses((current) => [...(current || []), dose]);
    
    toast.success(`Logged ${doseAmount}mg of ${medication.name}`, {
      description: format(Date.now(), 'MMM d, h:mm a')
    });

    setSelectedMedicationId('');
    setDoseAmount('');
  };

  const recentDoses = [...(doses || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  const getMedicationName = (medicationId: string) => {
    const med = (medications || []).find(m => m.id === medicationId);
    return med?.name || 'Unknown';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Dose Log</CardTitle>
        <CardDescription>Record medication intake</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Medication</Label>
            <Select value={selectedMedicationId} onValueChange={setSelectedMedicationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(medications || []).map(med => (
                  <SelectItem key={med.id} value={med.id}>
                    {med.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dose (mg)</Label>
            <Input
              type="number"
              step="0.1"
              value={doseAmount}
              onChange={(e) => setDoseAmount(e.target.value)}
              placeholder="20"
            />
          </div>
        </div>

        <Button onClick={handleLogDose} className="w-full" disabled={(medications || []).length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          Log Dose Now
        </Button>

        {recentDoses.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Recent doses</p>
            {recentDoses.map(dose => (
              <div key={dose.id} className="flex justify-between text-xs text-muted-foreground">
                <span>{getMedicationName(dose.medicationId)}</span>
                <span>{dose.doseAmount}mg - {format(dose.timestamp, 'h:mm a')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
