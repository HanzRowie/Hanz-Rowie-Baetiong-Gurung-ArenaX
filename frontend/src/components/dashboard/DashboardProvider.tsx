/**
 * Dashboard Provider
 * Context provider for dashboard state management
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService } from '@/services/dashboardService';
import type { 
  DashboardContextType, 
  DashboardLayout, 
  DashboardPreferences, 
  BaseWidget, 
  WidgetPosition, 
  WidgetSize 
} from '@/types/dashboard.types';

// Dashboard State
interface DashboardState {
  layout: DashboardLayout | null;
  preferences: DashboardPreferences | null;
  isEditing: boolean;
  isLoading: boolean;
  error: string | null;
}

// Dashboard Actions
type DashboardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAYOUT'; payload: DashboardLayout }
  | { type: 'SET_PREFERENCES'; payload: DashboardPreferences }
  | { type: 'UPDATE_WIDGET'; payload: { widgetId: string; updates: Partial<BaseWidget> } }
  | { type: 'ADD_WIDGET'; payload: BaseWidget }
  | { type: 'REMOVE_WIDGET'; payload: string }
  | { type: 'MOVE_WIDGET'; payload: { widgetId: string; position: WidgetPosition } }
  | { type: 'RESIZE_WIDGET'; payload: { widgetId: string; size: WidgetSize } }
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'RESET_LAYOUT' };

// Initial State
const initialState: DashboardState = {
  layout: null,
  preferences: null,
  isEditing: false,
  isLoading: true,
  error: null,
};

// Dashboard Reducer
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_LAYOUT':
      return { ...state, layout: action.payload, isLoading: false, error: null };
    
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };
    
    case 'UPDATE_WIDGET':
      if (!state.layout) return state;
      return {
        ...state,
        layout: {
          ...state.layout,
          widgets: state.layout.widgets.map(widget =>
            widget.id === action.payload.widgetId
              ? { ...widget, ...action.payload.updates }
              : widget
          ),
          lastModified: new Date().toISOString(),
        },
      };
    
    case 'ADD_WIDGET':
      if (!state.layout) return state;
      return {
        ...state,
        layout: {
          ...state.layout,
          widgets: [...state.layout.widgets, action.payload],
          lastModified: new Date().toISOString(),
        },
      };
    
    case 'REMOVE_WIDGET':
      if (!state.layout) return state;
      return {
        ...state,
        layout: {
          ...state.layout,
          widgets: state.layout.widgets.filter(widget => widget.id !== action.payload),
          lastModified: new Date().toISOString(),
        },
      };
    
    case 'MOVE_WIDGET':
      if (!state.layout) return state;
      return {
        ...state,
        layout: {
          ...state.layout,
          widgets: state.layout.widgets.map(widget =>
            widget.id === action.payload.widgetId
              ? { ...widget, position: action.payload.position }
              : widget
          ),
          lastModified: new Date().toISOString(),
        },
      };
    
    case 'RESIZE_WIDGET':
      if (!state.layout) return state;
      return {
        ...state,
        layout: {
          ...state.layout,
          widgets: state.layout.widgets.map(widget =>
            widget.id === action.payload.widgetId
              ? { ...widget, size: action.payload.size }
              : widget
          ),
          lastModified: new Date().toISOString(),
        },
      };
    
    case 'TOGGLE_EDIT_MODE':
      return { ...state, isEditing: !state.isEditing };
    
    case 'RESET_LAYOUT':
      return { ...state, layout: null, isLoading: true };
    
    default:
      return state;
  }
}

// Dashboard Context
const DashboardContext = createContext<DashboardContextType | null>(null);

// Dashboard Provider Props
interface DashboardProviderProps {
  children: React.ReactNode;
}

// Dashboard Provider Component
export function DashboardProvider({ children }: DashboardProviderProps) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await dashboardService.getDashboardLayout(user.id);
      dispatch({ type: 'SET_LAYOUT', payload: data.layout });
      dispatch({ type: 'SET_PREFERENCES', payload: data.preferences });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load dashboard' });
    }
  }, [user]);

  // Load dashboard data on mount
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Context value
  const contextValue: DashboardContextType = {
    layout: state.layout,
    preferences: state.preferences,
    isEditing: state.isEditing,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    setLayout: (layout: DashboardLayout) => {
      dispatch({ type: 'SET_LAYOUT', payload: layout });
    },

    updateWidget: (widgetId: string, updates: Partial<BaseWidget>) => {
      dispatch({ type: 'UPDATE_WIDGET', payload: { widgetId, updates } });
    },

    addWidget: (widget: BaseWidget) => {
      dispatch({ type: 'ADD_WIDGET', payload: widget });
    },

    removeWidget: (widgetId: string) => {
      dispatch({ type: 'REMOVE_WIDGET', payload: widgetId });
    },

    moveWidget: (widgetId: string, position: WidgetPosition) => {
      dispatch({ type: 'MOVE_WIDGET', payload: { widgetId, position } });
    },

    resizeWidget: (widgetId: string, size: WidgetSize) => {
      dispatch({ type: 'RESIZE_WIDGET', payload: { widgetId, size } });
    },

    toggleEditMode: () => {
      dispatch({ type: 'TOGGLE_EDIT_MODE' });
    },

    saveLayout: async () => {
      if (!state.layout || !user) return;

      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        await dashboardService.saveDashboardLayout(state.layout);
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Failed to save dashboard layout:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to save dashboard' });
      }
    },

    resetLayout: async () => {
      if (!user) return;

      try {
        dispatch({ type: 'RESET_LAYOUT' });
        await dashboardService.resetDashboardLayout(user.id);
        await loadDashboardData();
      } catch (error) {
        console.error('Failed to reset dashboard layout:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to reset dashboard' });
      }
    },

    loadLayout: async (layoutId: string) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const layout = await dashboardService.getDashboardLayoutById(layoutId);
        dispatch({ type: 'SET_LAYOUT', payload: layout });
      } catch (error) {
        console.error('Failed to load dashboard layout:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load dashboard layout' });
      }
    },

    updatePreferences: async (preferences: Partial<DashboardPreferences>) => {
      if (!state.preferences || !user) return;

      try {
        const updatedPreferences = { ...state.preferences, ...preferences };
        await dashboardService.updateDashboardPreferences(updatedPreferences);
        dispatch({ type: 'SET_PREFERENCES', payload: updatedPreferences });
      } catch (error) {
        console.error('Failed to update dashboard preferences:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to update preferences' });
      }
    },
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

// Hook to use dashboard context
export function useDashboard(): DashboardContextType {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}