import { useState } from 'react';
import {
  Bell,
  BellOff,
  Clock,
  Trophy,
  Users,
  Award,
  MessageCircle,
  Settings,
  Smartphone,
  Mail,
  Monitor,
  Volume2,
  VolumeX,
  Shield,
  Eye,
  CheckCircle,
  X,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';

export interface NotificationPreference {
  id: string;
  category: 'tournaments' | 'social' | 'achievements' | 'system' | 'reminders';
  type: string;
  label: string;
  description: string;
  enabled: boolean;
  channels: {
    push: boolean;
    email: boolean;
    inApp: boolean;
    sms?: boolean;
  };
  timing: {
    immediate: boolean;
    digest: boolean;
    quietHours: boolean;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface NotificationPreferencesProps {
  preferences: NotificationPreference[];
  globalSettings: {
    enabled: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    digest: {
      enabled: boolean;
      frequency: 'daily' | 'weekly';
      time: string;
    };
    channels: {
      push: boolean;
      email: boolean;
      inApp: boolean;
      sms: boolean;
    };
  };
  onUpdatePreference?: (preferenceId: string, updates: Partial<NotificationPreference>) => void;
  onUpdateGlobalSettings?: (settings: any) => void;
  onTestNotification?: (channel: string) => void;
  onSave?: () => void;
  onReset?: () => void;
}

export default function NotificationPreferences({
  preferences,
  globalSettings,
  onUpdatePreference,
  onUpdateGlobalSettings,
  onTestNotification,
  onSave,
  onReset
}: NotificationPreferencesProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'channels' | 'timing' | 'advanced'>('categories');
  const [hasChanges, setHasChanges] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'tournaments': return Trophy;
      case 'social': return Users;
      case 'achievements': return Award;
      case 'system': return Settings;
      case 'reminders': return Clock;
      default: return Bell;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tournaments': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'social': return 'text-emerald-600 bg-emerald-100 border-emerald-200';
      case 'achievements': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'system': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'reminders': return 'text-amber-600 bg-amber-100 border-amber-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const groupedPreferences = preferences.reduce((groups, pref) => {
    if (!groups[pref.category]) {
      groups[pref.category] = [];
    }
    groups[pref.category].push(pref);
    return groups;
  }, {} as Record<string, NotificationPreference[]>);

  const handlePreferenceUpdate = (preferenceId: string, updates: Partial<NotificationPreference>) => {
    onUpdatePreference?.(preferenceId, updates);
    setHasChanges(true);
  };

  const handleGlobalSettingsUpdate = (updates: any) => {
    onUpdateGlobalSettings?.({ ...globalSettings, ...updates });
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave?.();
    setHasChanges(false);
  };

  const handleReset = () => {
    onReset?.();
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
            <p className="text-gray-600">Customize how and when you receive notifications</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${globalSettings.enabled ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {globalSettings.enabled ? 'Notifications On' : 'Notifications Off'}
              </span>
            </div>
            
            <Button
              variant={globalSettings.enabled ? 'danger' : 'primary'}
              onClick={() => handleGlobalSettingsUpdate({ enabled: !globalSettings.enabled })}
            >
              {globalSettings.enabled ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Disable All
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable All
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Global Status */}
        {!globalSettings.enabled && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <BellOff className="h-5 w-5" />
              <span className="font-medium">All notifications are currently disabled</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              Enable notifications to receive updates about tournaments, achievements, and social activities.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mt-6">
          {[
            { id: 'categories', label: 'Categories', icon: Bell },
            { id: 'channels', label: 'Channels', icon: Smartphone },
            { id: 'timing', label: 'Timing', icon: Clock },
            { id: 'advanced', label: 'Advanced', icon: Settings },
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tab Content */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {Object.entries(groupedPreferences).map(([category, categoryPrefs]) => {
            const CategoryIcon = getCategoryIcon(category);
            const categoryColor = getCategoryColor(category);
            
            return (
              <Card key={category} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${categoryColor}`}>
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">{category}</h3>
                    <p className="text-sm text-gray-600">
                      {categoryPrefs.length} notification type{categoryPrefs.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {categoryPrefs.map((pref) => (
                    <div key={pref.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">{pref.label}</h4>
                          <span className={`
                            px-2 py-1 text-xs font-medium rounded-full
                            ${pref.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              pref.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              pref.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          `}>
                            {pref.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{pref.description}</p>
                        
                        {/* Channel toggles */}
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={pref.channels.push}
                              onChange={(e) => handlePreferenceUpdate(pref.id, {
                                channels: { ...pref.channels, push: e.target.checked }
                              })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Smartphone className="h-4 w-4 text-gray-500" />
                            Push
                          </label>
                          
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={pref.channels.email}
                              onChange={(e) => handlePreferenceUpdate(pref.id, {
                                channels: { ...pref.channels, email: e.target.checked }
                              })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Mail className="h-4 w-4 text-gray-500" />
                            Email
                          </label>
                          
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={pref.channels.inApp}
                              onChange={(e) => handlePreferenceUpdate(pref.id, {
                                channels: { ...pref.channels, inApp: e.target.checked }
                              })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Monitor className="h-4 w-4 text-gray-500" />
                            In-App
                          </label>
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button
                          size="sm"
                          variant={pref.enabled ? 'primary' : 'secondary'}
                          onClick={() => handlePreferenceUpdate(pref.id, { enabled: !pref.enabled })}
                        >
                          {pref.enabled ? (
                            <>
                              <Bell className="h-4 w-4 mr-1" />
                              On
                            </>
                          ) : (
                            <>
                              <BellOff className="h-4 w-4 mr-1" />
                              Off
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === 'channels' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h3>
          
          <div className="space-y-6">
            {/* Push Notifications */}
            <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Smartphone className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Push Notifications</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Instant notifications on your device
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onTestNotification?.('push')}
                  >
                    Test Push Notification
                  </Button>
                </div>
              </div>
              <Button
                variant={globalSettings.channels.push ? 'primary' : 'secondary'}
                onClick={() => handleGlobalSettingsUpdate({
                  channels: { ...globalSettings.channels, push: !globalSettings.channels.push }
                })}
              >
                {globalSettings.channels.push ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            {/* Email Notifications */}
            <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="h-6 w-6 text-emerald-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Detailed notifications via email
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onTestNotification?.('email')}
                  >
                    Send Test Email
                  </Button>
                </div>
              </div>
              <Button
                variant={globalSettings.channels.email ? 'primary' : 'secondary'}
                onClick={() => handleGlobalSettingsUpdate({
                  channels: { ...globalSettings.channels, email: !globalSettings.channels.email }
                })}
              >
                {globalSettings.channels.email ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            {/* In-App Notifications */}
            <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Monitor className="h-6 w-6 text-purple-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">In-App Notifications</h4>
                  <p className="text-sm text-gray-600">
                    Notifications within the application
                  </p>
                </div>
              </div>
              <Button
                variant={globalSettings.channels.inApp ? 'primary' : 'secondary'}
                onClick={() => handleGlobalSettingsUpdate({
                  channels: { ...globalSettings.channels, inApp: !globalSettings.channels.inApp }
                })}
              >
                {globalSettings.channels.inApp ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <MessageCircle className="h-6 w-6 text-amber-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Critical notifications via text message
                  </p>
                  <p className="text-xs text-gray-500">
                    Only for urgent tournament updates
                  </p>
                </div>
              </div>
              <Button
                variant={globalSettings.channels.sms ? 'primary' : 'secondary'}
                onClick={() => handleGlobalSettingsUpdate({
                  channels: { ...globalSettings.channels, sms: !globalSettings.channels.sms }
                })}
              >
                {globalSettings.channels.sms ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'timing' && (
        <div className="space-y-6">
          {/* Quiet Hours */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiet Hours</h3>
            
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-600 mb-2">
                  Pause non-urgent notifications during specified hours
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={globalSettings.quietHours.start}
                      onChange={(e) => handleGlobalSettingsUpdate({
                        quietHours: { ...globalSettings.quietHours, start: e.target.value }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={globalSettings.quietHours.end}
                      onChange={(e) => handleGlobalSettingsUpdate({
                        quietHours: { ...globalSettings.quietHours, end: e.target.value }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
              
              <Button
                variant={globalSettings.quietHours.enabled ? 'primary' : 'secondary'}
                onClick={() => handleGlobalSettingsUpdate({
                  quietHours: { ...globalSettings.quietHours, enabled: !globalSettings.quietHours.enabled }
                })}
              >
                {globalSettings.quietHours.enabled ? (
                  <>
                    <VolumeX className="h-4 w-4 mr-1" />
                    Enabled
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 mr-1" />
                    Disabled
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Digest Settings */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Digest</h3>
            
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-600 mb-4">
                  Receive a summary of notifications instead of individual alerts
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select
                      value={globalSettings.digest.frequency}
                      onChange={(e) => handleGlobalSettingsUpdate({
                        digest: { ...globalSettings.digest, frequency: e.target.value }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={globalSettings.digest.time}
                      onChange={(e) => handleGlobalSettingsUpdate({
                        digest: { ...globalSettings.digest, time: e.target.value }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
              
              <Button
                variant={globalSettings.digest.enabled ? 'primary' : 'secondary'}
                onClick={() => handleGlobalSettingsUpdate({
                  digest: { ...globalSettings.digest, enabled: !globalSettings.digest.enabled }
                })}
              >
                {globalSettings.digest.enabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'advanced' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>
          
          <div className="space-y-6">
            {/* Privacy Settings */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Privacy & Security</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <div>
                      <span className="font-medium text-gray-900">Secure Notifications</span>
                      <p className="text-sm text-gray-600">Hide sensitive content in notifications</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-emerald-600" />
                    <div>
                      <span className="font-medium text-gray-900">Read Receipts</span>
                      <p className="text-sm text-gray-600">Let others know when you've read notifications</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            {/* Data & Storage */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Data & Storage</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">Notification History</span>
                    <p className="text-sm text-gray-600">Keep notifications for 30 days</p>
                  </div>
                  <Button size="sm" variant="secondary">
                    Clear History
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">Export Preferences</span>
                    <p className="text-sm text-gray-600">Download your notification settings</p>
                  </div>
                  <Button size="sm" variant="secondary">
                    Export
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Save/Reset Actions */}
      {hasChanges && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">You have unsaved changes</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleReset}
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSave}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}