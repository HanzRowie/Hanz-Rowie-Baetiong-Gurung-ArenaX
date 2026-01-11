/**
 * Dashboard Toolbar
 * Controls for dashboard editing, customization, and settings
 */

import React, { useState } from 'react';
import { 
  Edit3, 
  Save, 
  RotateCcw, 
  Plus, 
  Settings, 
  Layout, 
  Grid,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Modal } from '@/design-system/components/Modal';
import { cn } from '@/design-system/utils/cn';
import { useDashboard } from './DashboardProvider';
import { WidgetLibrary } from './WidgetLibrary';
import { DashboardSettings } from './DashboardSettings';

interface DashboardToolbarProps {
  className?: string;
}

export function DashboardToolbar({ className }: DashboardToolbarProps) {
  const { 
    layout, 
    isEditing, 
    toggleEditMode, 
    saveLayout, 
    resetLayout 
  } = useDashboard();
  
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Handle save layout
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveLayout();
      toggleEditMode(); // Exit edit mode after saving
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset layout
  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset your dashboard to default? This cannot be undone.')) {
      try {
        await resetLayout();
      } catch (error) {
        console.error('Failed to reset dashboard:', error);
      }
    }
  };

  if (!layout) return null;

  return (
    <>
      <div className={cn(
        'flex items-center justify-between p-4 bg-white border-b border-gray-200',
        className
      )}>
        {/* Left Section - Dashboard Info */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {layout.name}
            </h1>
            <p className="text-sm text-gray-600">
              {layout.widgets.filter(w => w.visible).length} widgets • 
              Last updated {new Date(layout.lastModified).toLocaleDateString()}
            </p>
          </div>
          
          {isEditing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              <Edit3 className="h-4 w-4" />
              <span className="text-sm font-medium">Edit Mode</span>
            </div>
          )}
        </div>

        {/* Right Section - Controls */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            // View Mode Controls
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleEditMode}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Customize
              </Button>
            </>
          ) : (
            // Edit Mode Controls
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWidgetLibrary(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Widget
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="gap-2"
              >
                <Layout className="h-4 w-4" />
                Layout
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="gap-2 text-red-600 hover:text-red-700"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleEditMode}
                className="gap-2"
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dashboard Stats Bar */}
      {isEditing && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Grid className="h-4 w-4 text-blue-600" />
                <span className="text-blue-900">
                  {layout.columns} columns
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="text-blue-900">
                  {layout.widgets.filter(w => w.visible).length} visible
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-blue-600" />
                <span className="text-blue-900">
                  {layout.widgets.filter(w => !w.visible).length} hidden
                </span>
              </div>
            </div>
            
            <div className="text-blue-700">
              Drag widgets to rearrange • Click widget settings to configure
            </div>
          </div>
        </div>
      )}

      {/* Widget Library Modal */}
      <Modal
        isOpen={showWidgetLibrary}
        onClose={() => setShowWidgetLibrary(false)}
        title="Add Widget"
        size="lg"
      >
        <WidgetLibrary onClose={() => setShowWidgetLibrary(false)} />
      </Modal>

      {/* Dashboard Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Dashboard Settings"
        size="md"
      >
        <DashboardSettings onClose={() => setShowSettings(false)} />
      </Modal>
    </>
  );
}