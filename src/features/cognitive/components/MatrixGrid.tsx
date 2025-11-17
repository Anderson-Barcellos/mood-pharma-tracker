/**
 * MatrixGrid - Responsive 3x3 matrix display
 *
 * Mobile-first design with touch-friendly interactions
 * Displays 8 shapes + 1 empty cell (question mark)
 */

import { ShapeSVG, EmptyCellSVG } from './ShapeSVG';
import type { ShapeDefinition } from '../types';
import { cn } from '@/shared/utils';

interface MatrixGridProps {
  shapes: ShapeDefinition[]; // 8 shapes (cell 9 is auto-generated as empty)
  className?: string;
  showAnswer?: boolean;
  answerShape?: ShapeDefinition;
}

export function MatrixGrid({
  shapes,
  className = '',
  showAnswer = false,
  answerShape
}: MatrixGridProps) {
  if (shapes.length !== 8) {
    console.warn('MatrixGrid expects exactly 8 shapes, got:', shapes.length);
  }

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-2 md:gap-3 p-3 md:p-4',
        'bg-muted/30 rounded-xl border border-border/50',
        'max-w-2xl mx-auto',
        className
      )}
    >
      {shapes.map((shapeDef, index) => (
        <div
          key={index}
          className={cn(
            'aspect-square',
            'bg-card border-2 border-border/60 rounded-lg',
            'flex items-center justify-center',
            'p-2 md:p-3',
            'transition-all duration-200'
          )}
        >
          <ShapeSVG definition={shapeDef} />
        </div>
      ))}

      {/* Cell 9 - Empty or revealed answer */}
      <div
        className={cn(
          'aspect-square',
          'bg-card border-2 rounded-lg',
          'flex items-center justify-center',
          'p-2 md:p-3',
          'transition-all duration-200',
          showAnswer && answerShape
            ? 'border-primary/60 ring-2 ring-primary/30'
            : 'border-border/60 border-dashed'
        )}
      >
        {showAnswer && answerShape ? (
          <ShapeSVG definition={answerShape} />
        ) : (
          <EmptyCellSVG />
        )}
      </div>
    </div>
  );
}
