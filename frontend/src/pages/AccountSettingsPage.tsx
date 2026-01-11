import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Settings, Shield, Bell, Trash2, Download, 
  Eye, EyeOff, Lock, AlertTriangle, Check, X, Save, Key, Database,
  Smartphone, Monitor, LogOut, UserX, User
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import BottomNavigation from '@/components/BottomNavigation';
import toastService from '@/services/toastService';

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  tournament_updates: boolean;
  match_reminders: boolean;
  connection_requests: boolean;
  marketing_emails: boolean;
  weekly_digest: boolean;
  achievement_notifications: boolean;
}

interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  show_email: boolean;
  show_phone: boolean;
  show_location: boolean;
  show_statistics: boolean;
  show_activity: boolean;
  allow_messages: boolean;
  allow_join_requests: boolean;
  data_sharing: boolean;
  analytics_tracking: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  login_notifications: boolean;
  session_timeout: number;
  trusted_devices: Array<{
    id: string;
    name: string;
    last_used: string;
    location: string;
  }>;
}

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'security' | 'notifications' | 'privacy' | 'account'>('security');
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // Settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    tournament_updates: true,
    match_reminders: true,
    connection_requests: true,
    marketing_emails: false,
    weekly_digest: true,
    achievement_notifications: true,
  });
  
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profile_visibility: 'public',
    show_email: false,
    show_phone: false,
    show_location: true,
    show_statistics: true,
    show_activity: true,
    allow_messages: true,
    allow_join_requests: true,
    data_sharing: false,
    analytics_tracking: true,
  });
  
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    login_notifications: true,
    session_timeout: 30,
    trusted_devices: [],
  });
  
  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  
  // Data export state
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // In a real app, you'd load these from the backend
      // For now, we'll use default values
      setLoading(false);
    } catch (err) {
      console.error('Failed to load settings:', err);
      toastService.error('Failed to load settings');
      setLoading(false);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toastService.error('Please fill in all password fields');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toastService.error('New passwords do not match');
      return;
    }

    if (passwordStrength < 3) {
      toastService.error('Password is too weak. Please choose a stronger password.');
      return;
    }

    try {
      setSaving(true);
      await authService.changePassword(passwordForm.current_password, passwordForm.new_password);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      toastService.success('Password changed successfully');
    } catch (err: any) {
      toastService.error(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSave = async () => {
    try {
      setSaving(true);
      // In a real app, you'd save to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      toastService.success('Notification settings saved');
    } catch (err) {
      toastService.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePrivacySave = async () => {
    try {
      setSaving(true);
      // In a real app, you'd save to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      toastService.success('Privacy settings saved');
    } catch (err) {
      toastService.error('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDataExport = async () => {
    try {
      setExportLoading(true);
      // In a real app, you'd request data export from backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate download
      const data = {
        user_profile: user,
        settings: { notificationSettings, privacySettings, securitySettings },
        export_date: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arenax-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toastService.success('Data export downloaded successfully');
    } catch (err) {
      toastService.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      toastService.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    if (!deletionReason.trim()) {
      toastService.error('Please provide a reason for account deletion');
      return;
    }

    try {
      setSaving(true);
      // In a real app, you'd call the backend to delete the account
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toastService.success('Account deletion request submitted. You will receive a confirmation email.');
      logout();
      navigate('/');
    } catch (err) {
      toastService.error('Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  const toggleTwoFactor = async () => {
    try {
      setSaving(true);
      // In a real app, you'd handle 2FA setup/disable
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSecuritySettings(prev => ({
        ...prev,
        two_factor_enabled: !prev.two_factor_enabled
      }));
      
      toastService.success(
        securitySettings.two_factor_enabled 
          ? 'Two-factor authentication disabled' 
          : 'Two-factor authentication enabled'
      );
    } catch (err) {
      toastService.error('Failed to update two-factor authentication');
    } finally {
      setSaving(false);
    }
  };

  const removeTrustedDevice = async (deviceId: string) => {
    try {
      setSecuritySettings(prev => ({
        ...prev,
        trusted_devices: prev.trusted_devices.filter(device => device.id !== deviceId)
      }));
      toastService.success('Device removed from trusted devices');
    } catch (err) {
      toastService.error('Failed to remove device');
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 4:
      case 5: return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return 'Very Weak';
      case 2: return 'Weak';
      case 3: return 'Fair';
      case 4: return 'Strong';
      case 5: return 'Very Strong';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'security', label: 'Security', icon: Shield },
                { key: 'notifications', label: 'Notifications', icon: Bell },
                { key: 'privacy', label: 'Privacy', icon: Eye },
                { key: 'account', label: 'Account', icon: User },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeSection === key
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Security Settings */}
        {activeSection === 'security' && (
          <div className="space-y-6">
            {/* Password Change */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <Lock className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
              </div>
              
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPasswordForm(prev => ({ ...prev, new_password: value }));
                        setPasswordStrength(calculatePasswordStrength(value));
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {passwordForm.new_password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{getPasswordStrengthText()}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Password should contain uppercase, lowercase, numbers, and special characters
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                    <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
                  )}
                </div>
                
                <button
                  onClick={handlePasswordChange}
                  disabled={saving || !passwordForm.current_password || !passwordForm.new_password || passwordForm.new_password !== passwordForm.confirm_password}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Key className="h-4 w-4" />
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securitySettings.two_factor_enabled}
                    onChange={toggleTwoFactor}
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              
              {securitySettings.two_factor_enabled && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">Two-factor authentication is enabled</span>
                  </div>
                </div>
              )}
            </div>

            {/* Login Notifications */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Login Notifications</h3>
                  <p className="text-sm text-gray-600">Get notified when someone logs into your account</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securitySettings.login_notifications}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, login_notifications: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            {/* Session Timeout */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Timeout</h3>
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Automatically log out after (minutes)
                </label>
                <select
                  value={securitySettings.session_timeout}
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, session_timeout: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={480}>8 hours</option>
                  <option value={0}>Never</option>
                </select>
              </div>
            </div>

            {/* Trusted Devices */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trusted Devices</h3>
              
              {securitySettings.trusted_devices.length > 0 ? (
                <div className="space-y-3">
                  {securitySettings.trusted_devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        {device.name.includes('Mobile') ? (
                          <Smartphone className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Monitor className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{device.name}</p>
                          <p className="text-sm text-gray-600">
                            Last used: {device.last_used} • {device.location}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeTrustedDevice(device.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No trusted devices</p>
              )}
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeSection === 'notifications' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              </div>
              <button
                onClick={handleNotificationSave}
                disabled={saving}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Email Notifications */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">Email Notifications</h3>
                <div className="space-y-4">
                  {[
                    { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                    { key: 'tournament_updates', label: 'Tournament Updates', desc: 'Updates about tournaments you\'re participating in' },
                    { key: 'match_reminders', label: 'Match Reminders', desc: 'Reminders about upcoming matches' },
                    { key: 'connection_requests', label: 'Connection Requests', desc: 'When someone wants to connect with you' },
                    { key: 'achievement_notifications', label: 'Achievement Notifications', desc: 'When you earn new achievements' },
                    { key: 'weekly_digest', label: 'Weekly Digest', desc: 'Weekly summary of your activity' },
                    { key: 'marketing_emails', label: 'Marketing Emails', desc: 'Promotional emails and updates' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{setting.label}</h4>
                        <p className="text-xs text-gray-500">{setting.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings[setting.key as keyof NotificationSettings] as boolean}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            [setting.key]: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Push Notifications */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">Push Notifications</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                    <p className="text-xs text-gray-500">Receive push notifications on your device</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.push_notifications}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        push_notifications: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Settings */}
        {activeSection === 'privacy' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Privacy Controls</h2>
              </div>
              <button
                onClick={handlePrivacySave}
                disabled={saving}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Profile Visibility */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">Profile Visibility</h3>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Who can see your profile</h4>
                    <p className="text-xs text-gray-500">Control who can view your profile information</p>
                  </div>
                  <select
                    value={privacySettings.profile_visibility}
                    onChange={(e) => setPrivacySettings(prev => ({ 
                      ...prev, 
                      profile_visibility: e.target.value as any 
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  >
                    <option value="public">Everyone</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Only Me</option>
                  </select>
                </div>
              </div>

              {/* Information Visibility */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">Information Visibility</h3>
                <div className="space-y-4">
                  {[
                    { key: 'show_email', label: 'Show Email Address', desc: 'Display your email on your profile' },
                    { key: 'show_phone', label: 'Show Phone Number', desc: 'Display your phone number on your profile' },
                    { key: 'show_location', label: 'Show Location', desc: 'Display your location on your profile' },
                    { key: 'show_statistics', label: 'Show Game Statistics', desc: 'Display your match and tournament stats' },
                    { key: 'show_activity', label: 'Show Recent Activity', desc: 'Display your recent activity on your profile' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{setting.label}</h4>
                        <p className="text-xs text-gray-500">{setting.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privacySettings[setting.key as keyof PrivacySettings] as boolean}
                          onChange={(e) => setPrivacySettings(prev => ({
                            ...prev,
                            [setting.key]: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Communication Settings */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">Communication</h3>
                <div className="space-y-4">
                  {[
                    { key: 'allow_messages', label: 'Allow Messages', desc: 'Allow other users to send you messages' },
                    { key: 'allow_join_requests', label: 'Allow Connection Requests', desc: 'Allow other users to send you connection requests' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{setting.label}</h4>
                        <p className="text-xs text-gray-500">{setting.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privacySettings[setting.key as keyof PrivacySettings] as boolean}
                          onChange={(e) => setPrivacySettings(prev => ({
                            ...prev,
                            [setting.key]: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data & Analytics */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 mb-4">Data & Analytics</h3>
                <div className="space-y-4">
                  {[
                    { key: 'data_sharing', label: 'Data Sharing', desc: 'Allow sharing anonymized data for research' },
                    { key: 'analytics_tracking', label: 'Analytics Tracking', desc: 'Help improve the platform with usage analytics' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{setting.label}</h4>
                        <p className="text-xs text-gray-500">{setting.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privacySettings[setting.key as keyof PrivacySettings] as boolean}
                          onChange={(e) => setPrivacySettings(prev => ({
                            ...prev,
                            [setting.key]: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Management */}
        {activeSection === 'account' && (
          <div className="space-y-6">
            {/* Data Export */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Data Export</h2>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Download a copy of all your data including profile information, tournament history, and settings.
              </p>
              
              <button
                onClick={handleDataExport}
                disabled={exportLoading}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {exportLoading ? 'Preparing Export...' : 'Export My Data'}
              </button>
            </div>

            {/* Account Deletion */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-semibold text-red-900">Delete Account</h2>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-red-800 mb-2">
                  <strong>Warning:</strong> This action cannot be undone. Deleting your account will:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  <li>Permanently delete your profile and all associated data</li>
                  <li>Remove you from all tournaments and matches</li>
                  <li>Delete all your messages and connections</li>
                  <li>Cancel any active subscriptions</li>
                </ul>
              </div>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <UserX className="h-4 w-4" />
                  Delete My Account
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for deletion (optional)
                    </label>
                    <textarea
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      placeholder="Help us improve by telling us why you're leaving..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type "DELETE MY ACCOUNT" to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleAccountDeletion}
                      disabled={saving || deleteConfirmText !== 'DELETE MY ACCOUNT'}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                      {saving ? 'Deleting...' : 'Confirm Deletion'}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                        setDeletionReason('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout All Devices */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <LogOut className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Logout All Devices</h2>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Sign out of all devices and browsers. You'll need to sign in again on each device.
              </p>
              
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to logout from all devices?')) {
                    logout();
                    navigate('/login');
                  }
                }}
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout All Devices
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}