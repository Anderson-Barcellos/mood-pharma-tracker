import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMedications } from '@/hooks/use-medications';
import { useDoses } from '@/hooks/use-doses';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Clock } from '@phosphor-icons/react';
import { safeFormat } from '@/shared/utils';
import { parseLocalDateTime } from '@/shared/utils/date-helpers';
import type { Medication } from '@/shared/types';

interface QuickDoseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickDoseModal({ isOpen, onClose }: QuickDoseModalProps) {
  const { medications, isLoading: medicationsLoading } = useMedications();
  const { doses, createDose } = useDoses();

  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [doseInput, setDoseInput] = useState<string>('');
  const [isLogging, setIsLogging] = useState(false);

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(format(now, 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState(format(now, 'HH:mm'));

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMedication(null);
      setUseCustomTime(false);
      setDoseInput('');
      const newNow = new Date();
      setSelectedDate(format(newNow, 'yyyy-MM-dd'));
      setSelectedTime(format(newNow, 'HH:mm'));
    }
  }, [isOpen]);

  // Get last dose time for a medication
  const getLastDoseTime = (medicationId: string): number | null => {
    const medDoses = doses
      .filter(d => d.medicationId === medicationId)
      .sort((a, b) => b.timestamp - a.timestamp);

    return medDoses[0]?.timestamp || null;
  };

  // Handle quick dose log (current time)
  const handleQuickLog = async (medication: Medication) => {
    setIsLogging(true);

    try {
      const timestamp = Date.now();
      const amount = Number.parseFloat(doseInput || `${medication.defaultDose ?? 0}`);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error('Enter a valid dose amount');
        setIsLogging(false);
        return;
      }

      await createDose({
        medicationId: medication.id,
        timestamp,
        doseAmount: +amount.toFixed(2),
      });

      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      const doseStr = `${amount}${medication.unit || 'mg'}`;

      toast.success(`Logged ${doseStr} of ${medication.name}`, {
        description: safeFormat(timestamp, 'MMM d, h:mm a'),
        duration: 3000,
      });

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      toast.error('Failed to log dose', {
        description: 'Please try again',
      });
    } finally {
      setIsLogging(false);
    }
  };

  // Handle custom time dose log
  const handleCustomTimeLog = async () => {
    if (!selectedMedication) return;

    setIsLogging(true);

    try {
      const timestamp = parseLocalDateTime(selectedDate, selectedTime);
      const amount = Number.parseFloat(doseInput || `${selectedMedication.defaultDose ?? 0}`);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error('Enter a valid dose amount');
        setIsLogging(false);
        return;
      }

      await createDose({
        medicationId: selectedMedication.id,
        timestamp,
        doseAmount: +amount.toFixed(2),
      });

      const doseStr = `${amount}${selectedMedication.unit || 'mg'}`;

      toast.success(`Logged ${doseStr} of ${selectedMedication.name}`, {
        description: safeFormat(timestamp, 'MMM d, h:mm a'),
        duration: 3000,
      });

      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      toast.error('Failed to log dose', {
        description: 'Please try again',
      });
    } finally {
      setIsLogging(false);
    }
  };

  // Card chooser removed — using direct form only.

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Dose Logger</DialogTitle>
          <DialogDescription>
            Select a medication to log your dose
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Simple form (direct entry) */}
          <div className="space-y-3 p-3 rounded-lg border">
            <div className="space-y-2">
              <Label className="text-xs">Medication</Label>
              <Select
                value={selectedMedication?.id || ''}
                onValueChange={(id) => {
                  const med = medications.find(m => m.id === id);
                  setSelectedMedication(med || null);
                  const def = med?.defaultDose ?? 0;
                  setDoseInput(def ? String(def) : '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={medicationsLoading ? 'Loading...' : 'Select medication...'} />
                </SelectTrigger>
                <SelectContent>
                  {medications.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}{m.brandName ? ` (${m.brandName})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Dose ({selectedMedication?.unit || 'mg'})</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={doseInput}
                onChange={(e) => setDoseInput(e.target.value)}
                placeholder={(selectedMedication?.defaultDose ?? 0).toString()}
                className="text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setUseCustomTime((v) => !v)}>
                {useCustomTime ? 'Use current time' : 'Custom time'}
              </Button>
              {selectedMedication && (
                <span className="text-xs text-muted-foreground">
                  {selectedMedication.name} • default {selectedMedication.defaultDose ?? 0}{selectedMedication.unit || 'mg'}
                </span>
              )}
            </div>

            {useCustomTime && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Time</Label>
                  <Input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="text-sm" />
                </div>
              </div>
            )}

            <Button
              onClick={async () => {
                if (!selectedMedication) {
                  toast.error('Select a medication');
                  return;
                }
                setIsLogging(true);
                try {
                  const amount = Number.parseFloat(doseInput || `${selectedMedication.defaultDose ?? 0}`);
                  if (!Number.isFinite(amount) || amount <= 0) {
                    toast.error('Enter a valid dose amount');
                    setIsLogging(false);
                    return;
                  }
                  const ts = useCustomTime ? parseLocalDateTime(selectedDate, selectedTime) : Date.now();
                  await createDose({ medicationId: selectedMedication.id, timestamp: ts, doseAmount: +amount.toFixed(2) });
                  if ('vibrate' in navigator) navigator.vibrate(50);
                  toast.success(`Logged ${amount}${selectedMedication.unit || 'mg'} of ${selectedMedication.name}`);
                  setTimeout(() => onClose(), 300);
                } catch (err) {
                  toast.error('Failed to log dose');
                } finally {
                  setIsLogging(false);
                }
              }}
              disabled={
                isLogging || !selectedMedication || !(Number.parseFloat(doseInput || `${selectedMedication?.defaultDose ?? 0}`) > 0)
              }
              className="w-full"
            >
              {useCustomTime ? `Log at ${selectedTime}` : 'Log Now'}
            </Button>
          </div>

          {/* Loading state */}
          {medicationsLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading medications...
            </div>
          )}

          {/* No medications */}
          {!medicationsLoading && medications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No medications found. Add some in the Medications page.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
