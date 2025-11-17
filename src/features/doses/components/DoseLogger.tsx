import { useState } from 'react';
import { useMedications } from '@/hooks/use-medications';
import { useDoses } from '@/hooks/use-doses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { Plus } from '@phosphor-icons/react';
import type { Medication, MedicationDose } from '@/shared/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { safeFormat } from '@/shared/utils';
import { parseLocalDateTime } from '@/shared/utils/date-helpers';
import { useProtectedAction } from '@/shared/components/ProtectedAction';

export default function DoseLogger() {
  const { medications } = useMedications();
  const { doses, createDose } = useDoses();
  const protectedAction = useProtectedAction();
  const [selectedMedicationId, setSelectedMedicationId] = useState('');
  const [doseAmount, setDoseAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(format(now, 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState(format(now, 'HH:mm'));

  const handleLogDose = () => {
    if (!selectedMedicationId || !doseAmount) {
      toast.error('Please select a medication and enter dose amount');
      return;
    }

    const medication = medications.find(m => m.id === selectedMedicationId);
    if (!medication) return;

    protectedAction(async () => {
      try {
        const timestamp = parseLocalDateTime(selectedDate, selectedTime);

        await createDose({
          medicationId: selectedMedicationId,
          timestamp,
          doseAmount: parseFloat(doseAmount)
        });

        toast.success(`Logged ${doseAmount}mg of ${medication.name}`, {
          description: safeFormat(timestamp, 'MMM d, h:mm a')
        });

        setSelectedMedicationId('');
        setDoseAmount('');
        setDialogOpen(false);

        const newNow = new Date();
        setSelectedDate(format(newNow, 'yyyy-MM-dd'));
        setSelectedTime(format(newNow, 'HH:mm'));
      } catch (error) {
        toast.error('Invalid date/time', {
          description: error instanceof Error ? error.message : 'Please check the date and time fields'
        });
      }
    });
  };

  const recentDoses = [...doses].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  const getMedicationName = (medicationId: string) => {
    const med = medications.find(m => m.id === medicationId);
    return med?.name || 'Unknown';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Dose Log</CardTitle>
        <CardDescription>Record medication intake</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full"
              disabled={medications.length === 0}
              onClick={() => {
                const newNow = new Date();
                setSelectedDate(format(newNow, 'yyyy-MM-dd'));
                setSelectedTime(format(newNow, 'HH:mm'));
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Log Dose
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Medication Dose</DialogTitle>
              <DialogDescription>Record when you took your medication</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Medication</Label>
                <Select value={selectedMedicationId} onValueChange={setSelectedMedicationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select medication..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medications.map(med => (
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleLogDose}
                disabled={!selectedMedicationId || !doseAmount}
              >
                Log Dose
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {recentDoses.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Recent doses</p>
            {recentDoses.map(dose => (
              <div key={dose.id} className="flex justify-between text-xs text-muted-foreground">
                <span>{getMedicationName(dose.medicationId)}</span>
                <span>{dose.doseAmount}mg - {safeFormat(dose.timestamp, 'h:mm a')}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
