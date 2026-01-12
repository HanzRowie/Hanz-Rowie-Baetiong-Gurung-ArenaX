import { useState, useEffect } from 'react';
import { 
  Settings, X, Bell, Mail, Smartphone, Save, 
  RotateCcw, AlertCircle 
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import toastService from '@/services/toastService';

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationTypeSettings {
  type: string;
  display_name: string;
  description: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
}

export default function NotificationPreferences({ isOpen, onClose }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationTypeSettings[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotificationPreferences();
      
      // Transform the preferences into a more manageable format
      const notificationTypes = [
        {
          type: 'TOURNAMENT_REGISTRATION',
          display_name: 'Tournament Registration',
          description: 'Notifications about tournament registrations and updates'
        },
        {
          type: 'MATCH_RESULT',
          display_name: 'Match Results',
          description: 'Notifications about match results and tournament progress'
        },
        {
          type: 'BOOKING_REQUEST',
          display_name: 'Booking Requests',
          description: 'Notifications about venue booking requests'
        },
        {
          type: 'JOIN_REQUEST',
          display_name: 'Join Requests',
          description: 'Notifications about player connection requests'
        },
        {
          type: 'MESSAGE',
          display_name: 'Messages',
          description: 'Notifications about new private messages'
        },
        {
          type: 'SYSTEM',
          display_name: 'System Notifications',
          description: 'Important system updates and announcements'
        }
      ];

      const preferencesMap = new Map(
        response.preferences.map(pref => [pref.notification_type, pref])
      );

      const settings = notificationTypes.map(type => {
        const pref = preferencesMap.get(type.type);
        return {
          ...type,
          email_enabled: pref?.email_enabled ?? true,
          push_enabled: pref?.push_enabled ?? true,
          in_app_enabled: pref?.in_app_enabled ?? true
        };
      });

      setPreferences(settings);
    } catch (error) {
      toastService.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (type: string, setting: 'email_enabled' | 'push_enabled' | 'in_app_enabled', value: boolean) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.type === type 
          ? { ...pref, [setting]: value }
          : pref
      )
    );
    setHasChanges(true);
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      
      const preferencesData = preferences.reduce((acc, pref) => {
        acc[pref.type] = {
          email_enabled: pref.email_enabled,
          push_enabled: pref.push_enabled,
          in_app_enabled: pref.in_app_enabled
        };
        return acc;
      }, {} as Record<string, { email_enabled: boolean; push_enabled: boolean; in_app_enabled: boolean }>);

      await notificationService.updateAllPreferences(preferencesData);
      setHasChanges(false);
      toastService.success('Notification preferences saved');
    } catch (error) {
      toastService.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Reset all notification preferences to default settings?')) {
      return;
    }

    try {
      setSaving(true);
      await notificationService.resetPreferencesToDefault();
      await loadPreferences();
      setHasChanges(false);
      toastService.success('Preferences reset to defaults');
    } catch (error) {
      toastService.error('Failed to reset preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleAllForType = (type: string, enabled: boolean) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.type === type 
          ? { 
              ...pref, 
              email_enabled: enabled,
              push_enabled: enabled,
              in_app_enabled: enabled
            }
          : pref
      )
    );
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <Settings className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
              <p className="text-sm text-gray-600">Manage how you receive notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Legend */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Notification Methods</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-purple-600" />
                    <span className="text-gray-700">In-App</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-gray-700">Email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-600" />
                    <span className="text-gray-700">Push</span>
                  </div>
                </div>
              </div>

              {/* Preferences List */}
              <div className="space-y-4">
                {preferences.map((pref) => (
                  <div key={pref.type} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{pref.display_name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{pref.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAllForType(pref.type, true)}
                          className="px-2 py-1 text-xs text-green-600 border border-green-300 rounded hover:bg-green-50"
                        >
                          All On
                        </button>
                        <button
                          onClick={() => toggleAllForType(pref.type, false)}
                          className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
                        >
                          All Off
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* In-App Notifications */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-purple-600" />
                          <span className="text-sm text-gray-700">In-App</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pref.in_app_enabled}
                            onChange={(e) => updatePreference(pref.type, 'in_app_enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      {/* Email Notifications */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-700">Email</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pref.email_enabled}
                            onChange={(e) => updatePreference(pref.type, 'email_enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Push Notifications */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-gray-700">Push</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pref.push_enabled}
                            onChange={(e) => updatePreference(pref.type, 'push_enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-700">Quiet Hours</span>
                      <p className="text-xs text-gray-500">Disable notifications during specific hours</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-700">Group Similar Notifications</span>
                      <p className="text-xs text-gray-500">Combine similar notifications to reduce clutter</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={resetToDefaults}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </button>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>You have unsaved changes</span>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button
                onClick={savePreferences}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}