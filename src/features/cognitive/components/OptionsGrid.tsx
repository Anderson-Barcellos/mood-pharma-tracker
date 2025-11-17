/**
 * OptionsGrid - Touch-friendly answer options
 *
 * Displays 6 answer options in a responsive grid
 * Mobile-optimized with 48px minimum touch targets
 *
 * @param onSelectOption - Optional callback when option is selected (omit for display-only mode)
 */

import { ShapeSVG } from './ShapeSVG';
import type { ShapeDefinition } from '../types';
import { cn } from '@/shared/utils';

interface OptionsGridProps {
  options: ShapeDefinition[]; // 6 answer options
  correctAnswerIndex: number;
  userAnswer: number; // -1 if not answered yet
  onSelectOption?: (index: number) => void; // Optional for display-only mode
  disabled?: boolean;
  className?: string;
}

export function OptionsGrid({
  options,
  correctAnswerIndex,
  userAnswer,
  onSelectOption,
  disabled = false,
  className = ''
}: OptionsGridProps) {
  const showFeedback = userAnswer !== -1;

  if (options.length !== 6) {
    console.warn('OptionsGrid expects exactly 6 options, got:', options.length);
  }

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-2 md:gap-4',
        'max-w-lg mx-auto',
        className
      )}
    >
      {options.map((optionShape, index) => {
        const isSelected = userAnswer === index;
        const isCorrectOption = index === correctAnswerIndex;
        const isIncorrectSelection = isSelected && !isCorrectOption;

        return (
          <button
            key={index}
            onClick={() => !disabled && onSelectOption?.(index)}
            disabled={disabled}
            className={cn(
              // Base styles
              'aspect-square rounded-lg border-2 p-2 md:p-3',
              'transition-all duration-200',
              'disabled:cursor-not-allowed',
              // Minimum touch target (48px)
              'min-h-12 min-w-12',
              // Mobile tap feedback
              'tap-feedback no-select',
              'active:scale-95',
              // Border and ring states
              showFeedback
                ? isCorrectOption
                  ? 'border-emerald-500 ring-2 ring-emerald-500/60 bg-emerald-500/5'
                  : isIncorrectSelection
                    ? 'border-destructive ring-2 ring-destructive/60 bg-destructive/5'
                    : 'border-border/60 opacity-60'
                : 'border-border hover:border-primary hover:ring-2 hover:ring-primary/50 bg-card'
            )}
            aria-label={`Option ${index + 1}`}
            aria-pressed={isSelected}
            aria-describedby={showFeedback && isCorrectOption ? 'correct-answer' : undefined}
          >
            <ShapeSVG definition={optionShape} />
          </button>
        );
      })}
    </div>
  );
}
