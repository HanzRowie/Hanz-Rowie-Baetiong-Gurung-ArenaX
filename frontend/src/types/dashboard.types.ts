/**
 * Dashboard Types
 * Types for the customizable dashboard system
 */

import { UserRole } from './auth.types';

// Widget Types
export type WidgetType = 
  | 'stats-card'
  | 'chart'
  | 'timeline'
  | 'quick-actions'
  | 'recent-activity'
  | 'performance-metrics'
  | 'upcoming-events'
  | 'notifications'
  | 'player-network'
  | 'tournament-bracket'
  | 'venue-occupancy'
  | 'revenue-chart'
  | 'booking-requests'
  | 'availability-calendar'
  | 'intelligence';

// Widget Size
export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl';

// Widget Position
export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Base Widget Configuration
export interface BaseWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: WidgetPosition;
  visible: boolean;
  configurable: boolean;
  removable: boolean;
  data?: any;
  config?: Record<string, any>;
}

// Role-specific Widget Extensions
export interface PlayerWidget extends BaseWidget {
  type: 'stats-card' | 'chart' | 'timeline' | 'upcoming-events' | 'player-network' | 'performance-metrics';
}

export interface OrganizerWidget extends BaseWidget {
  type: 'stats-card' | 'chart' | 'quick-actions' | 'recent-activity' | 'tournament-bracket' | 'revenue-chart';
}

export interface RefereeWidget extends BaseWidget {
  type: 'stats-card' | 'availability-calendar' | 'booking-requests' | 'upcoming-events' | 'performance-metrics';
}

export interface VenueOwnerWidget extends BaseWidget {
  type: 'stats-card' | 'venue-occupancy' | 'revenue-chart' | 'booking-requests' | 'recent-activity';
}

// Dashboard Layout
export interface DashboardLayout {
  id: string;
  userId: string;
  role: UserRole;
  name: string;
  isDefault: boolean;
  widgets: BaseWidget[];
  columns: number;
  spacing: 'compact' | 'comfortable' | 'spacious';
  theme: DashboardTheme;
  lastModified: string;
}

// Dashboard Theme
export interface DashboardTheme {
  mode: 'light' | 'dark' | 'auto';
  colorScheme: 'default' | 'role-specific' | 'custom';
  animations: 'full' | 'reduced' | 'none';
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// Dashboard Preferences
export interface DashboardPreferences {
  userId: string;
  defaultLayout: string;
  autoSave: boolean;
  refreshInterval: number; // in seconds
  notifications: {
    dataUpdates: boolean;
    systemAlerts: boolean;
    achievements: boolean;
  };
  shortcuts: KeyboardShortcut[];
}

// Keyboard Shortcut
export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: string;
  description: string;
}

// Widget Data Types
export interface StatsCardData {
  value: number | string;
  label: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon?: string;
  color?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

export interface TimelineData {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: 'event' | 'achievement' | 'milestone' | 'activity';
  icon?: string;
  color?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: string;
  action: () => void;
  color?: string;
  disabled?: boolean;
}

// Dashboard Context
export interface DashboardContextType {
  layout: DashboardLayout | null;
  preferences: DashboardPreferences | null;
  isEditing: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setLayout: (layout: DashboardLayout) => void;
  updateWidget: (widgetId: string, updates: Partial<BaseWidget>) => void;
  addWidget: (widget: BaseWidget) => void;
  removeWidget: (widgetId: string) => void;
  moveWidget: (widgetId: string, position: WidgetPosition) => void;
  resizeWidget: (widgetId: string, size: WidgetSize) => void;
  toggleEditMode: () => void;
  saveLayout: () => Promise<void>;
  resetLayout: () => Promise<void>;
  loadLayout: (layoutId: string) => Promise<void>;
  updatePreferences: (preferences: Partial<DashboardPreferences>) => Promise<void>;
}

// API Response Types
export interface GetDashboardLayoutResponse {
  layout: DashboardLayout;
  preferences: DashboardPreferences;
}

export interface SaveDashboardLayoutRequest {
  layout: DashboardLayout;
}

export interface SaveDashboardLayoutResponse {
  success: boolean;
  layout: DashboardLayout;
}

export interface GetWidgetDataRequest {
  widgetId: string;
  type: WidgetType;
  config?: Record<string, any>;
}

export interface GetWidgetDataResponse {
  data: any;
  lastUpdated: string;
}

// Widget Template
export interface WidgetTemplate {
  id: string;
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  defaultSize: WidgetSize;
  defaultPosition: Partial<WidgetPosition>;
  supportedRoles: UserRole[];
  configurable: boolean;
  removable: boolean;
  preview?: string;
}

// Dashboard Analytics
export interface DashboardAnalytics {
  userId: string;
  layoutId: string;
  interactions: {
    widgetClicks: Record<string, number>;
    timeSpent: Record<string, number>; // in seconds
    customizations: number;
    lastActive: string;
  };
  performance: {
    loadTime: number;
    renderTime: number;
    dataFetchTime: Record<string, number>;
  };
}