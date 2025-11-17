/**
 * Cognitive Testing - Shape-based Matrix Generation
 *
 * Shape definitions for programmatic SVG rendering
 * Based on Raven's Progressive Matrices patterns
 */

export type ShapeType = 'circle' | 'square' | 'triangle' | 'cross' | 'diamond';
export type FillType = 'solid' | 'outline' | 'striped';

/**
 * Shape definition for matrix cells
 * All properties are constrained to specific values for Gemini schema
 */
export interface ShapeDefinition {
  shape: ShapeType;
  color: string; // Must be one of SHAPE_COLORS
  fill: FillType;
  size: number; // Must be one of SHAPE_SIZES (0.4, 0.6, 0.8)
  rotation: number; // Must be one of SHAPE_ROTATIONS (0, 45, 90, etc)
}

/**
 * Matrix problem structure (shape-based)
 */
export interface ShapeMatrixProblem {
  matrix: ShapeDefinition[]; // 8 shapes (cells 0-7, cell 8 is missing)
  options: ShapeDefinition[]; // 6 answer options
  correctAnswerIndex: number; // Index (0-5) of correct option
  explanation: string; // Pattern explanation
  patterns?: string[]; // List of patterns applied
}

/**
 * Available shapes for matrix generation
 */
export const SHAPE_TYPES: readonly ShapeType[] = [
  'circle',
  'square',
  'triangle',
  'cross',
  'diamond'
] as const;

/**
 * Color palette for shapes
 * Using neutral grays for maximum pattern visibility
 */
export const SHAPE_COLORS = [
  '#374151', // gray-700 (dark)
  '#9ca3af', // gray-400 (medium)
  '#f3f4f6'  // gray-100 (light)
] as const;

/**
 * Fill patterns
 */
export const FILL_TYPES: readonly FillType[] = [
  'solid',
  'outline',
  'striped'
] as const;

/**
 * Size variations (relative to cell size)
 * 0.4 = small, 0.6 = medium, 0.8 = large
 */
export const SHAPE_SIZES = [0.4, 0.6, 0.8] as const;

/**
 * Rotation angles (degrees)
 * Covers all 45° increments
 */
export const SHAPE_ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

/**
 * Difficulty levels for matrix generation
 */
export type DifficultyLevel = 'normal' | 'difficult';

/**
 * Extended matrix type for database storage
 */
export interface ShapeMatrix {
  matrixId: string;
  matrix: ShapeDefinition[];
  options: ShapeDefinition[];
  correctAnswer: number;
  userAnswer: number;
  responseTime: number;
  wasCorrect: boolean;
  explanation: string;
  patterns?: string[];
  source?: 'gemini' | 'fallback';
  difficulty?: DifficultyLevel;
}
