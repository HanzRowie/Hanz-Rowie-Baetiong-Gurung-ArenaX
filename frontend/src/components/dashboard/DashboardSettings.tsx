/**
 * Dashboard Settings
 * Configure dashboard layout, theme, and preferences
 */

import React, { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { cn } from '@/design-system/utils/cn';
import { useDashboard } from './DashboardProvider';
import type { DashboardTheme } from '@/types/dashboard.types';

interface DashboardSettingsProps {
  onClose: () => void;
}

export function DashboardSettings({ onClose }: DashboardSettingsProps) {
  const { layout, preferences, updatePreferences } = useDashboard();
  const [activeTab, setActiveTab] = useState<'layout' | 'theme' | 'preferences'>('layout');

  if (!layout || !preferences) return null;

  const handleThemeChange = (updates: Partial<DashboardTheme>) => {
    if (!layout) return;
    
    // Update theme in layout (this would typically be saved via updatePreferences)
    const updatedTheme = { ...layout.theme, ...updates };
    console.log('Theme updated:', updatedTheme);
  };

  const handlePreferenceChange = (key: string, value: any) => {
    updatePreferences({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('layout')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'layout'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          )}
        >
          Layout
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'theme'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          )}
        >
          Theme
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'preferences'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          )}
        >
          Preferences
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grid Columns
              </label>
              <select
                value={layout.columns}
                onChange={(e) => console.log('Update columns:', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={6}>6 columns</option>
                <option value={8}>8 columns</option>
                <option value={12}>12 columns</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                More columns allow finer control over widget placement
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Widget Spacing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['compact', 'comfortable', 'spacious'] as const).map(spacing => (
                  <button
                    key={spacing}
                    onClick={() => console.log('Update spacing:', spacing)}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      layout.spacing === spacing
                        ? 'bg-primary-100 text-primary-800 border-2 border-primary-500'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                    )}
                  >
                    {spacing.charAt(0).toUpperCase() + spacing.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'auto'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => handleThemeChange({ mode })}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      layout.theme.mode === mode
                        ? 'bg-primary-100 text-primary-800 border-2 border-primary-500'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                    )}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Scheme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['default', 'role-specific', 'custom'] as const).map(scheme => (
                  <button
                    key={scheme}
                    onClick={() => handleThemeChange({ colorScheme: scheme })}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      layout.theme.colorScheme === scheme
                        ? 'bg-primary-100 text-primary-800 border-2 border-primary-500'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                    )}
                  >
                    {scheme.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Animations
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['full', 'reduced', 'none'] as const).map(animations => (
                  <button
                    key={animations}
                    onClick={() => handleThemeChange({ animations })}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      layout.theme.animations === animations
                        ? 'bg-primary-100 text-primary-800 border-2 border-primary-500'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                    )}
                  >
                    {animations.charAt(0).toUpperCase() + animations.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Auto-save changes
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Automatically save dashboard changes
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.autoSave}
                onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Refresh Interval
              </label>
              <select
                value={preferences.refreshInterval}
                onChange={(e) => handlePreferenceChange('refreshInterval', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
                <option value={0}>Manual only</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900">
                Notifications
              </label>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Data updates</span>
                <input
                  type="checkbox"
                  checked={preferences.notifications.dataUpdates}
                  onChange={(e) => handlePreferenceChange('notifications', {
                    ...preferences.notifications,
                    dataUpdates: e.target.checked
                  })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">System alerts</span>
                <input
                  type="checkbox"
                  checked={preferences.notifications.systemAlerts}
                  onChange={(e) => handlePreferenceChange('notifications', {
                    ...preferences.notifications,
                    systemAlerts: e.target.checked
                  })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Achievements</span>
                <input
                  type="checkbox"
                  checked={preferences.notifications.achievements}
                  onChange={(e) => handlePreferenceChange('notifications', {
                    ...preferences.notifications,
                    achievements: e.target.checked
                  })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={onClose}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}