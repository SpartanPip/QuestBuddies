/**
 * Reusable UI Components
 * 
 * This module provides a set of reusable UI components and managers
 * to eliminate code duplication across scenes and ensure consistent
 * user interface behavior throughout the game.
 * 
 * Components:
 * - DialogManager: Confirmation dialogs, error dialogs
 * - ProgressManager: Loading indicators, progress bars
 * - ButtonFactory: Standardized button creation
 * - LayoutManager: Responsive positioning utilities
 */

export { DialogManager } from './managers/DialogManager';
export { ProgressManager } from './managers/ProgressManager';
export { ButtonFactory } from './managers/ButtonFactory';
export { LayoutManager } from './managers/LayoutManager';

// Re-export types for convenience
export type { DialogConfig, ErrorDialogConfig } from './managers/DialogManager';
export type { ProgressConfig, LoadingConfig } from './managers/ProgressManager';
export type { ButtonConfig, ButtonGroupConfig } from './managers/ButtonFactory';
export type { LayoutArea, ResponsiveLayoutConfig } from './managers/LayoutManager';
