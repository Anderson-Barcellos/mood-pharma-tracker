import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash } from '@phosphor-icons/react';
import type { Medication, MedicationDose } from '../lib/types';
import { toast } from 'sonner';
import { safeFormat } from '@/lib/utils';
import { useDoses } from '@/hooks/useDoses';

interface MedicationDosesViewProps {
  medication: Medication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MedicationDosesView({ medication, open, onOpenChange }: MedicationDosesViewProps) {
  const { doses, upsertDose, deleteDose } = useDoses();
  const [editingDose, setEditingDose] = useState<MedicationDose | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const medicationDoses = doses
    .filter(d => d.medicationId === medication.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleEdit = (dose: MedicationDose) => {
    setEditingDose(dose);
    setEditAmount(dose.doseAmount.toString());
    setEditDate(safeFormat(dose.timestamp, 'yyyy-MM-dd', ''));
    setEditTime(safeFormat(dose.timestamp, 'HH:mm', ''));
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDose || !editAmount) return;

    const dateTime = new Date(`${editDate}T${editTime}`);
    const timestamp = dateTime.getTime();

    const updatedDose: MedicationDose = {
      ...editingDose,
      doseAmount: parseFloat(editAmount),
      timestamp
    };

    await upsertDose(updatedDose);

    toast.success('Dose updated successfully');
    setEditDialogOpen(false);
    setEditingDose(null);
  };

  const handleDelete = async (doseId: string) => {
    if (confirm('Are you sure you want to delete this dose entry?')) {
      await deleteDose(doseId);
      toast.success('Dose deleted');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{medication.name} - Dose History</DialogTitle>
            <DialogDescription>
              All recorded doses for this medication
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {medicationDoses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No doses recorded yet
              </div>
            ) : (
              <div className="space-y-3">
                {medicationDoses.map(dose => (
                  <Card key={dose.id} className="shadow-sm">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-primary">
                              {dose.doseAmount}mg
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {safeFormat(dose.timestamp, 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {safeFormat(dose.timestamp, 'h:mm a')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(dose)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(dose.id)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dose</DialogTitle>
            <DialogDescription>Update dose information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Dose (mg)</Label>
              <Input
                type="number"
                step="0.1"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editAmount}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
