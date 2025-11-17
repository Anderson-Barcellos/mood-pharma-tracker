/**
 * ShapeSVG - Programmatic SVG shape renderer
 *
 * Renders geometric shapes based on ShapeDefinition properties
 * Mobile-optimized with proper viewBox scaling
 */

import React, { useMemo } from 'react';
import type { ShapeDefinition } from '../types';

interface ShapeSVGProps {
  definition: ShapeDefinition;
  className?: string;
}

export function ShapeSVG({ definition, className = '' }: ShapeSVGProps) {
  const { shape, color, fill, size, rotation } = definition;

  const svgContent = useMemo(() => {
    const isOutlined = fill === 'outline';
    const isStriped = fill === 'striped';

    // For light colors, use dark stroke; otherwise use color itself
    const strokeColor = color === '#f3f4f6' ? '#374151' : color;

    // Pattern ID for striped fill
    const colorId = color.replace('#', '');
    const patternId = `stripe-${colorId}`;

    // Shape size in SVG units (relative to 100x100 viewBox)
    const shapeSize = size * 100;
    const center = 50;

    // Stroke width
    const strokeWidth = isOutlined ? 8 : 0;

    // Generate shape path
    let shapeElement: React.ReactElement | null = null;

    switch (shape) {
      case 'circle':
        shapeElement = (
          <circle
            cx={center}
            cy={center}
            r={shapeSize / 2}
            fill={isOutlined ? 'none' : isStriped ? `url(#${patternId})` : color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
        break;

      case 'square':
        shapeElement = (
          <rect
            x={center - shapeSize / 2}
            y={center - shapeSize / 2}
            width={shapeSize}
            height={shapeSize}
            fill={isOutlined ? 'none' : isStriped ? `url(#${patternId})` : color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
        break;

      case 'triangle': {
        const height = (Math.sqrt(3) / 2) * shapeSize;
        const points = `${center},${center - height / 2} ${center - shapeSize / 2},${center + height / 2} ${center + shapeSize / 2},${center + height / 2}`;
        shapeElement = (
          <polygon
            points={points}
            fill={isOutlined ? 'none' : isStriped ? `url(#${patternId})` : color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
        break;
      }

      case 'cross': {
        const arm = shapeSize * 0.2;
        const pathData = `
          M${center - arm},${center - shapeSize / 2}
          H${center + arm}
          V${center - arm}
          H${center + shapeSize / 2}
          V${center + arm}
          H${center + arm}
          V${center + shapeSize / 2}
          H${center - arm}
          V${center + arm}
          H${center - shapeSize / 2}
          V${center - arm}
          Z
        `;
        shapeElement = (
          <path
            d={pathData}
            fill={isOutlined ? 'none' : isStriped ? `url(#${patternId})` : color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
        break;
      }

      case 'diamond': {
        const points = `${center},${center - shapeSize / 2} ${center + shapeSize / 2},${center} ${center},${center + shapeSize / 2} ${center - shapeSize / 2},${center}`;
        shapeElement = (
          <polygon
            points={points}
            fill={isOutlined ? 'none' : isStriped ? `url(#${patternId})` : color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
        break;
      }
    }

    return (
      <>
        {isStriped && (
          <defs>
            <pattern
              id={patternId}
              patternUnits="userSpaceOnUse"
              width="10"
              height="10"
            >
              <path
                d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2"
                stroke={strokeColor}
                strokeWidth="2"
              />
            </pattern>
          </defs>
        )}
        <g transform={`rotate(${rotation} ${center} ${center})`}>
          {shapeElement}
        </g>
      </>
    );
  }, [shape, color, fill, size, rotation]);

  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {svgContent}
    </svg>
  );
}

/**
 * Empty cell placeholder (for cell 9 in matrix)
 */
export function EmptyCellSVG({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`w-full h-full text-muted-foreground ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="50"
        cy="50"
        r="4"
        fill="currentColor"
        opacity="0.3"
      />
      <circle
        cx="50"
        cy="50"
        r="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 4"
        opacity="0.3"
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="24"
        fill="currentColor"
        opacity="0.4"
      >
        ?
      </text>
    </svg>
  );
}
