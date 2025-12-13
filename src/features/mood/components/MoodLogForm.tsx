import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Smiley,
  SmileyMeh,
  SmileySad,
  SmileyWink,
  SmileyXEyes,
  Brain,
  ArrowsLeftRight,
  Lightning,
  Drop,
  Target,
  CaretDown,
  CaretUp
} from '@phosphor-icons/react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Slider } from '@/shared/ui/slider';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/shared/utils';
import { parseLocalDateTime } from '@/shared/utils/date-helpers';

export interface MoodLogData {
  timestamp: number;
  moodScore: number;
  anxietyLevel?: number;
  energyLevel?: number;
  focusLevel?: number;
  cognitiveScore?: number;
  attentionShift?: number;
  notes?: string;
}

interface MoodLogFormProps {
  onSubmit: (data: MoodLogData) => void;
  onClose: () => void;
  compact?: boolean;
}

const getMoodEmoji = (score: number) => {
  if (score >= 9) return { icon: Smiley, color: 'text-green-500', label: 'Excelente' };
  if (score >= 7) return { icon: SmileyWink, color: 'text-emerald-500', label: 'Muito Bom' };
  if (score >= 5) return { icon: SmileyMeh, color: 'text-amber-500', label: 'Neutro' };
  if (score >= 3) return { icon: SmileySad, color: 'text-orange-500', label: 'Ruim' };
  return { icon: SmileyXEyes, color: 'text-red-500', label: 'Terrível' };
};

interface MetricSliderProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
  icon: React.ReactNode;
  color: string;
  minLabel: string;
  maxLabel: string;
}

const MetricSlider = ({ value, onChange, label, icon, color, minLabel, maxLabel }: MetricSliderProps) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="flex items-center gap-2 text-sm">
        {icon}
        {label}
      </Label>
      <span className={cn('text-lg font-bold', color)}>{value}/10</span>
    </div>
    <Slider
      value={[value]}
      onValueChange={(vals) => onChange(vals[0])}
      min={1}
      max={10}
      step={1}
      className="w-full"
    />
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{minLabel}</span>
      <span>{maxLabel}</span>
    </div>
  </div>
);

export default function MoodLogForm({ onSubmit, onClose, compact = false }: MoodLogFormProps) {
  const [moodScore, setMoodScore] = useState(5);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState('');

  const [showCognitive, setShowCognitive] = useState(false);
  const [showEmotional, setShowEmotional] = useState(false);

  const [cognitiveScore, setCognitiveScore] = useState(5);
  const [attentionShift, setAttentionShift] = useState(5);

  const [anxietyLevel, setAnxietyLevel] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [focusLevel, setFocusLevel] = useState(5);

  const { icon: MoodIcon, color: moodColor, label: moodLabel } = getMoodEmoji(moodScore);

  const handleSubmit = () => {
    try {
      const timestamp = parseLocalDateTime(date, time);
      onSubmit({
        timestamp,
        moodScore,
        ...(showCognitive && { cognitiveScore, attentionShift }),
        ...(showEmotional && { anxietyLevel, energyLevel, focusLevel }),
        notes: notes.trim() || undefined
      });
    } catch (error) {
      toast.error('Data/hora inválida', {
        description: error instanceof Error ? error.message : 'Verifique os campos'
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-4"
    >
      <div className="space-y-3 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Smiley className="w-4 h-4" />
            Humor Geral
          </Label>
          <div className="flex items-center gap-2">
            <MoodIcon className={cn('w-6 h-6 transition-all', moodColor)} weight="fill" />
            <span className={cn('text-xl font-bold', moodColor)}>{moodScore}/10</span>
          </div>
        </div>
        <Slider
          value={[moodScore]}
          onValueChange={(vals) => setMoodScore(vals[0])}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Péssimo</span>
          <span className={cn('font-medium', moodColor)}>{moodLabel}</span>
          <span>Excelente</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Data</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Hora</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowCognitive(!showCognitive)}
          className="w-full justify-between text-xs h-9"
        >
          <span className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            Métricas Cognitivas
          </span>
          {showCognitive ? <CaretUp className="w-4 h-4" /> : <CaretDown className="w-4 h-4" />}
        </Button>

        <AnimatePresence>
          {showCognitive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden p-3 rounded-lg bg-purple-500/5 border border-purple-500/20"
            >
              <MetricSlider
                value={cognitiveScore}
                onChange={setCognitiveScore}
                label="Clareza Mental"
                icon={<Brain className="w-4 h-4 text-purple-500" />}
                color="text-purple-500"
                minLabel="Confuso"
                maxLabel="Cristalino"
              />
              <MetricSlider
                value={attentionShift}
                onChange={setAttentionShift}
                label="Flexibilidade Atencional"
                icon={<ArrowsLeftRight className="w-4 h-4 text-cyan-500" />}
                color="text-cyan-500"
                minLabel="Rígido"
                maxLabel="Flexível"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowEmotional(!showEmotional)}
          className="w-full justify-between text-xs h-9"
        >
          <span className="flex items-center gap-2">
            <Lightning className="w-4 h-4 text-amber-500" />
            Métricas Emocionais
          </span>
          {showEmotional ? <CaretUp className="w-4 h-4" /> : <CaretDown className="w-4 h-4" />}
        </Button>

        <AnimatePresence>
          {showEmotional && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4 overflow-hidden p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
            >
              <MetricSlider
                value={anxietyLevel}
                onChange={setAnxietyLevel}
                label="Ansiedade"
                icon={<Drop className="w-4 h-4 text-rose-500" />}
                color="text-rose-500"
                minLabel="Calmo"
                maxLabel="Ansioso"
              />
              <MetricSlider
                value={energyLevel}
                onChange={setEnergyLevel}
                label="Energia"
                icon={<Lightning className="w-4 h-4 text-amber-500" />}
                color="text-amber-500"
                minLabel="Exausto"
                maxLabel="Energizado"
              />
              <MetricSlider
                value={focusLevel}
                onChange={setFocusLevel}
                label="Foco"
                icon={<Target className="w-4 h-4 text-blue-500" />}
                color="text-blue-500"
                minLabel="Disperso"
                maxLabel="Focado"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!compact && (
        <div className="space-y-2">
          <Label className="text-sm">Notas (opcional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="O que está acontecendo? Como você se sente?"
            rows={2}
            className="resize-none"
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 min-h-[44px]">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} className="flex-1 min-h-[44px]">
          <Check className="w-4 h-4 mr-2" />
          Salvar
        </Button>
      </div>
    </motion.div>
  );
}
