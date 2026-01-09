import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, Edit3, MapPin, Trophy, Calendar, Award,
  X, Save, Camera, Mail, Phone, MessageCircle,
  TrendingUp, Target, Users, Clock, ArrowLeft, Settings,
  Shield, Activity, BarChart3, Zap, Medal, Crown,
  ChevronRight, ChevronDown, ChevronUp, Globe, Crop, Building2
} from 'lucide-react';
import { profileService } from '@/services/profileService';
import type { ExtendedUserProfile } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import BottomNavigation from '@/components/BottomNavigation';
import toastService from '@/services/toastService';

export default function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Statistics and activity data
  const [statistics, setStatistics] = useState<any>(null);
  const [activityHistory, setActivityHistory] = useState<any>(null);
  const [achievements, setAchievements] = useState<any>(null);
  const [connections, setConnections] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'achievements' | 'connections'>('overview');
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personalInfo: true,
    sportsSkills: true,
    achievements: true,
    privacy: false,
    statistics: true
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    location: '',
    country: '',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    preferred_sports: [] as string[],
    skill_level: '',
    achievements: '',
    social_links: {} as Record<string, string>,
    is_available_for_matches: true,
    business_name: '',
    business_registration: '',
    business_contact: '',
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    profile_visibility: 'public' as 'public' | 'friends' | 'private',
    show_email: false,
    show_phone: false,
    show_location: true,
    show_statistics: true,
    show_activity: true,
    allow_messages: true,
    allow_join_requests: true,
  });

  // Image cropping state
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [cropData, setCropData] = useState({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    scale: 1
  });

  const [newProfilePicture, setNewProfilePicture] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isOwnProfile = !userId || userId === currentUser?.id;

  const skillLevels = [
    { value: 'BEGINNER', label: 'Beginner' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'ADVANCED', label: 'Advanced' },
    { value: 'PROFESSIONAL', label: 'Professional' },
  ];

  const sportTypes = [
    'Futsal', 'Badminton'
  ];

  const genderOptions = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' },
  ];

  const socialPlatforms = [
    { key: 'twitter', label: 'Twitter', placeholder: 'https://twitter.com/username' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/username' },
  ];

  useEffect(() => {
    loadProfile();
    if (isOwnProfile) {
      loadAdditionalData();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileService.getUserProfile(userId);

      // Debug logging
      console.log('Profile API response:', response);

      // Check if response has the expected structure
      if (!response || !response.profile) {
        throw new Error('Invalid response format from server');
      }

      setProfile(response.profile);

      // Initialize edit form with current data
      if (isOwnProfile) {
        setEditForm({
          full_name: response.profile.full_name || '',
          bio: response.profile.bio || '',
          location: response.profile.location || '',
          country: response.profile.country || '',
          phone_number: response.profile.phone_number || '',
          date_of_birth: response.profile.date_of_birth || '',
          gender: response.profile.gender || '',
          preferred_sports: response.profile.preferred_sports || [],
          skill_level: response.profile.skill_level || '',
          achievements: response.profile.achievements || '',
          social_links: response.profile.social_links || {},
          is_available_for_matches: response.profile.is_available_for_matches || false,
          business_name: response.profile.business_name || '',
          business_registration: response.profile.business_registration || '',
          business_contact: response.profile.business_contact || '',
        });
      }
    } catch (err: any) {
      console.error('Profile loading error:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadAdditionalData = async () => {
    if (!isOwnProfile) return;

    try {
      setLoadingStats(true);
      const [statsResponse, activityResponse, achievementsResponse, connectionsResponse, recentResponse] = await Promise.allSettled([
        profileService.getUserStatistics(),
        profileService.getUserActivityHistory(),
        profileService.getUserAchievements(),
        profileService.getPlayerConnections(),
        profileService.getRecentActivity()
      ]);

      if (statsResponse.status === 'fulfilled') {
        setStatistics(statsResponse.value);
      }
      if (activityResponse.status === 'fulfilled') {
        setActivityHistory(activityResponse.value);
      }
      if (achievementsResponse.status === 'fulfilled') {
        setAchievements(achievementsResponse.value);
      }
      if (connectionsResponse.status === 'fulfilled') {
        setConnections(connectionsResponse.value);
      }
      if (recentResponse.status === 'fulfilled') {
        setRecentActivity(recentResponse.value);
      }
    } catch (err) {
      console.error('Failed to load additional data:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toastService.error('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toastService.error('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setOriginalImage(reader.result as string);
        setShowImageCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropImage = () => {
    if (!canvasRef.current || !originalImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size
      canvas.width = 200;
      canvas.height = 200;

      // Calculate crop dimensions
      const scaleX = img.width / 400; // Assuming display width of 400px
      const scaleY = img.height / 400; // Assuming display height of 400px

      // Draw cropped image
      ctx.drawImage(
        img,
        cropData.x * scaleX,
        cropData.y * scaleY,
        cropData.width * scaleX,
        cropData.height * scaleY,
        0,
        0,
        200,
        200
      );

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
          setNewProfilePicture(file);
          setCroppedImage(canvas.toDataURL());
          setShowImageCropper(false);
          setOriginalImage(null);
        }
      }, 'image/jpeg', 0.9);
    };
    img.src = originalImage;
  };

  const removeImage = () => {
    setNewProfilePicture(null);
    setImagePreview(null);
    setCroppedImage(null);
    setOriginalImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSportToggle = (sport: string) => {
    setEditForm(prev => ({
      ...prev,
      preferred_sports: prev.preferred_sports.includes(sport)
        ? prev.preferred_sports.filter(s => s !== sport)
        : [...prev.preferred_sports, sport]
    }));
  };

  const handleSocialLinkChange = (platform: string, url: string) => {
    setEditForm(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: url
      }
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updateData = {
        ...editForm,
        profile_picture: newProfilePicture || undefined,
      };

      console.log('Saving profile with data:', updateData);

      await profileService.updateProfile(updateData);
      await loadProfile(); // Reload to get updated data
      if (isOwnProfile) {
        await loadAdditionalData(); // Reload additional data
      }
      setIsEditing(false);
      setNewProfilePicture(null);
      setImagePreview(null);
      setCroppedImage(null);
      toastService.success('Profile updated successfully!');
    } catch (err: any) {
      console.error('Profile save error:', err);
      toastService.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewProfilePicture(null);
    setImagePreview(null);
    setCroppedImage(null);
    setOriginalImage(null);
    setShowImageCropper(false);
    // Reset form to original values
    if (profile) {
      setEditForm({
        full_name: profile.full_name,
        bio: profile.bio || '',
        location: profile.location || '',
        country: profile.country || '',
        phone_number: profile.phone_number || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        preferred_sports: profile.preferred_sports || [],
        skill_level: profile.skill_level || '',
        achievements: profile.achievements || '',
        social_links: profile.social_links || {},
        is_available_for_matches: profile.is_available_for_matches,
        business_name: profile.business_name || '',
        business_registration: profile.business_registration || '',
        business_contact: profile.business_contact || '',
      });
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE': return 'bg-blue-100 text-blue-800';
      case 'ADVANCED': return 'bg-purple-100 text-purple-800';
      case 'PROFESSIONAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The profile you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Dashboard
          </button>
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
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                {isOwnProfile ? 'My Profile' : `${profile?.full_name}'s Profile`}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              {!isOwnProfile && (
                <button
                  onClick={() => navigate('/chats')}
                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
              )}

              {isOwnProfile && (
                <>
                  <button
                    onClick={() => navigate('/account-settings')}
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to logout?')) {
                        logout();
                      }
                    }}
                    className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Image Cropper Modal */}
      {showImageCropper && originalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Crop Profile Picture</h3>

            <div className="relative mb-4">
              <img
                src={originalImage}
                alt="Crop preview"
                className="w-full h-64 object-contain border rounded"
              />
              {/* Simple crop overlay - in a real app, you'd use a proper cropping library */}
              <div
                className="absolute border-2 border-purple-500 bg-purple-500 bg-opacity-20"
                style={{
                  left: `${cropData.x}px`,
                  top: `${cropData.y}px`,
                  width: `${cropData.width}px`,
                  height: `${cropData.height}px`,
                }}
              />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2">
              <button
                onClick={handleCropImage}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Crop className="h-4 w-4 inline mr-2" />
                Crop & Save
              </button>
              <button
                onClick={() => {
                  setShowImageCropper(false);
                  setOriginalImage(null);
                }}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Profile Picture */}
            <div className="relative">
              {isEditing && isOwnProfile ? (
                <div className="relative">
                  {croppedImage || newProfilePicture || profile?.profile_picture ? (
                    <div className="relative">
                      <img
                        src={croppedImage || (newProfilePicture ? URL.createObjectURL(newProfilePicture) : profile?.profile_picture!)}
                        alt={profile?.full_name}
                        className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-32 w-32 rounded-full bg-purple-100 flex items-center justify-center border-4 border-white shadow-lg">
                      <User className="h-16 w-16 text-purple-600" />
                    </div>
                  )}

                  <label className="absolute bottom-0 right-0 p-2 bg-purple-600 text-white rounded-full cursor-pointer hover:bg-purple-700 transition-colors">
                    <Camera className="h-4 w-4" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                profile?.profile_picture ? (
                  <img
                    src={profile.profile_picture}
                    alt={profile.full_name}
                    className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-purple-100 flex items-center justify-center border-4 border-white shadow-lg">
                    <User className="h-16 w-16 text-purple-600" />
                  </div>
                )
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              {isEditing && isOwnProfile ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-purple-300 focus:border-purple-500 outline-none w-full"
                    placeholder="Full Name"
                  />

                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
              ) : (
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile?.full_name}</h1>
                  <div className="flex items-center gap-4 mb-3">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      {profile?.role}
                    </span>
                    {profile?.skill_level && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSkillLevelColor(profile.skill_level)}`}>
                        {profile.skill_level}
                      </span>
                    )}
                    {profile?.is_available_for_matches && profile?.role === 'PLAYER' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Available for matches
                      </span>
                    )}
                  </div>

                  {profile?.bio && (
                    <p className="text-gray-600 mb-4 leading-relaxed">{profile.bio}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {profile?.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{profile.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {new Date(profile?.date_joined || '').toLocaleDateString()}</span>
                    </div>

                    {isOwnProfile && profile?.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{profile.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isOwnProfile && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Profile
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        {isOwnProfile && (
          <div className="bg-white rounded-lg shadow-sm mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { key: 'overview', label: 'Overview', icon: User },
                  ...(profile?.role !== 'VENUE_OWNER' ? [
                    { key: 'activity', label: 'Activity', icon: Activity },
                    { key: 'achievements', label: 'Achievements', icon: Award },
                    { key: 'connections', label: 'Connections', icon: Users },
                  ] : []),
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === key
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
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white rounded-lg shadow-sm">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer"
                  onClick={() => toggleSection('personalInfo')}
                >
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  {expandedSections.personalInfo ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                {expandedSections.personalInfo && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    {isEditing && isOwnProfile ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                          <input
                            type="tel"
                            value={editForm.phone_number}
                            onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
                            placeholder="Your phone number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                          <input
                            type="text"
                            value={editForm.country}
                            onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                            placeholder="Your country"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                          <input
                            type="date"
                            value={editForm.date_of_birth}
                            onChange={(e) => setEditForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                          <select
                            value={editForm.gender}
                            onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          >
                            <option value="">Select gender</option>
                            {genderOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                        {profile?.phone_number && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{profile.phone_number}</span>
                          </div>
                        )}
                        {profile?.country && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{profile.country}</span>
                          </div>
                        )}
                        {profile?.date_of_birth && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              Born {new Date(profile.date_of_birth).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {profile?.gender && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{profile.gender}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sports & Skills / Business Info */}
              <div className="bg-white rounded-lg shadow-sm">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer"
                  onClick={() => toggleSection('sportsSkills')}
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profile?.role === 'VENUE_OWNER' ? 'Business Information' : 'Sports & Skills'}
                  </h3>
                  {expandedSections.sportsSkills ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                {expandedSections.sportsSkills && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    {isEditing && isOwnProfile ? (
                      <div className="space-y-4 mt-4">
                        {profile?.role === 'VENUE_OWNER' ? (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                              <input
                                type="text"
                                value={editForm.business_name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, business_name: e.target.value }))}
                                placeholder="Registered Business Name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
                              <input
                                type="text"
                                value={editForm.business_registration}
                                onChange={(e) => setEditForm(prev => ({ ...prev, business_registration: e.target.value }))}
                                placeholder="Business Registration/License Number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Business Contact</label>
                              <input
                                type="text"
                                value={editForm.business_contact}
                                onChange={(e) => setEditForm(prev => ({ ...prev, business_contact: e.target.value }))}
                                placeholder="Official Contact Info"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                              <input
                                type="text"
                                value={editForm.location}
                                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="Headquarters Location"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Sports</label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {sportTypes.map((sport) => (
                                  <label key={sport} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editForm.preferred_sports.includes(sport)}
                                      onChange={() => handleSportToggle(sport)}
                                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm">{sport}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
                              <select
                                value={editForm.skill_level}
                                onChange={(e) => setEditForm(prev => ({ ...prev, skill_level: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              >
                                <option value="">Select skill level</option>
                                {skillLevels.map((level) => (
                                  <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                              <input
                                type="text"
                                value={editForm.location}
                                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="Your location"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 mt-4">
                        {profile?.role === 'VENUE_OWNER' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profile.business_name && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Business Name</h4>
                                <p className="text-gray-900">{profile.business_name}</p>
                              </div>
                            )}
                            {profile.business_registration && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Registration Number</h4>
                                <p className="text-gray-900">{profile.business_registration}</p>
                              </div>
                            )}
                            {profile.business_contact && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Contact Info</h4>
                                <p className="text-gray-900">{profile.business_contact}</p>
                              </div>
                            )}
                            {profile.location && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Location</h4>
                                <p className="text-gray-900">{profile.location}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {profile?.preferred_sports && profile.preferred_sports.length > 0 ? (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Preferred Sports</h4>
                                <div className="flex flex-wrap gap-2">
                                  {profile.preferred_sports.map((sport) => (
                                    <span key={sport} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                      {sport}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No preferred sports specified</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Social Links */}
              {isOwnProfile && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h3>

                  {isEditing ? (
                    <div className="space-y-4">
                      {socialPlatforms.map((platform) => (
                        <div key={platform.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {platform.label}
                          </label>
                          <input
                            type="url"
                            value={editForm.social_links[platform.key] || ''}
                            onChange={(e) => handleSocialLinkChange(platform.key, e.target.value)}
                            placeholder={platform.placeholder}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {socialPlatforms.map((platform) => {
                        const url = profile?.social_links?.[platform.key];
                        return url ? (
                          <div key={platform.key} className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 w-20">
                              {platform.label}:
                            </span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-700 text-sm truncate"
                            >
                              {url}
                            </a>
                          </div>
                        ) : null;
                      })}
                      {!Object.values(profile?.social_links || {}).some(Boolean) && (
                        <p className="text-gray-500 text-sm">No social links added</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Achievements */}
              <div className="bg-white rounded-lg shadow-sm">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer"
                  onClick={() => toggleSection('achievements')}
                >
                  <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
                  {expandedSections.achievements ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                {expandedSections.achievements && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    {isEditing && isOwnProfile ? (
                      <textarea
                        value={editForm.achievements}
                        onChange={(e) => setEditForm(prev => ({ ...prev, achievements: e.target.value }))}
                        placeholder="Share your achievements and accomplishments..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none mt-4"
                      />
                    ) : (
                      <div className="mt-4">
                        {profile?.achievements ? (
                          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{profile.achievements}</p>
                        ) : (
                          <p className="text-gray-500 text-sm">No achievements shared yet</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Privacy Settings */}
              {isOwnProfile && (
                <div className="bg-white rounded-lg shadow-sm">
                  <div
                    className="flex items-center justify-between p-6 cursor-pointer"
                    onClick={() => toggleSection('privacy')}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
                    </div>
                    {expandedSections.privacy ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>

                  {expandedSections.privacy && (
                    <div className="px-6 pb-6 border-t border-gray-100">
                      <div className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Profile Visibility</h4>
                            <p className="text-xs text-gray-500">Who can see your profile</p>
                          </div>
                          <select
                            value={privacySettings.profile_visibility}
                            onChange={(e) => setPrivacySettings(prev => ({
                              ...prev,
                              profile_visibility: e.target.value as any
                            }))}
                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          >
                            <option value="public">Public</option>
                            <option value="friends">Friends Only</option>
                            <option value="private">Private</option>
                          </select>
                        </div>

                        {[
                          { key: 'show_email', label: 'Show Email', desc: 'Display email on profile' },
                          { key: 'show_phone', label: 'Show Phone', desc: 'Display phone number on profile' },
                          { key: 'show_location', label: 'Show Location', desc: 'Display location on profile' },
                          { key: 'show_statistics', label: 'Show Statistics', desc: 'Display game statistics' },
                          { key: 'show_activity', label: 'Show Activity', desc: 'Display recent activity' },
                          { key: 'allow_messages', label: 'Allow Messages', desc: 'Allow others to message you' },
                          { key: 'allow_join_requests', label: 'Allow Join Requests', desc: 'Allow connection requests' },
                        ].map((setting) => (
                          <div key={setting.key} className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{setting.label}</h4>
                              <p className="text-xs text-gray-500">{setting.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={privacySettings[setting.key as keyof typeof privacySettings] as boolean}
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
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Enhanced Statistics */}
              {statistics && profile?.role !== 'VENUE_OWNER' && (
                <div className="bg-white rounded-lg shadow-sm">
                  <div
                    className="flex items-center justify-between p-6 cursor-pointer"
                    onClick={() => toggleSection('statistics')}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Statistics</h3>
                    </div>
                    {expandedSections.statistics ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>

                  {expandedSections.statistics && (
                    <div className="px-6 pb-6 border-t border-gray-100">
                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {statistics.tournaments_participated || 0}
                            </div>
                            <div className="text-xs text-gray-600">Tournaments</div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {statistics.matches_played || 0}
                            </div>
                            <div className="text-xs text-gray-600">Matches</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {statistics.matches_won || 0}
                            </div>
                            <div className="text-xs text-gray-600">Wins</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">
                              {statistics.win_rate?.toFixed(1) || 0}%
                            </div>
                            <div className="text-xs text-gray-600">Win Rate</div>
                          </div>
                        </div>

                        {statistics.activity_streak > 0 && (
                          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-orange-600" />
                              <span className="text-sm font-medium text-gray-900">Activity Streak</span>
                            </div>
                            <span className="text-lg font-bold text-orange-600">
                              {statistics.activity_streak} days
                            </span>
                          </div>
                        )}

                        {statistics.profile_completion < 100 && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">Profile Completion</span>
                              <span className="text-sm text-gray-600">{statistics.profile_completion}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${statistics.profile_completion}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Availability */}
              {profile?.role !== 'VENUE_OWNER' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability</h3>

                  {isEditing && isOwnProfile ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.is_available_for_matches}
                        onChange={(e) => setEditForm(prev => ({ ...prev, is_available_for_matches: e.target.checked }))}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm">Available for matches</span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className={`text-sm font-medium ${profile?.is_available_for_matches ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {profile?.is_available_for_matches ? 'Available for matches' : 'Not available'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              {isOwnProfile && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate('/account-settings')}
                      className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Account Settings</span>
                      <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                    </button>
                    <button
                      onClick={() => toggleSection('privacy')}
                      className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Privacy Settings</span>
                      <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                    </button>
                    {profile?.role === 'VENUE_OWNER' && (
                      <>
                        <button
                          onClick={() => navigate('/venue-management')}
                          className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">Manage Venues</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                        </button>
                        <button
                          onClick={() => navigate('/venue-bookings')}
                          className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">Venue Bookings</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && recentActivity && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.activities?.map((activity: any) => (
                <div key={activity.id} className="flex items-start gap-3 p-4 border border-gray-100 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    {activity.type === 'tournament_join' && <Trophy className="h-4 w-4 text-purple-600" />}
                    {activity.type === 'match_result' && <Target className="h-4 w-4 text-purple-600" />}
                    {activity.type === 'connection_made' && <Users className="h-4 w-4 text-purple-600" />}
                    {activity.type === 'achievement_earned' && <Award className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{activity.title}</h4>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!recentActivity.activities || recentActivity.activities.length === 0) && (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              )}
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && achievements && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
              {achievements.total_points > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm font-medium">{achievements.total_points} points</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.achievements?.map((achievement: any) => (
                <div key={achievement.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          {achievement.category}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(achievement.earned_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!achievements.achievements || achievements.achievements.length === 0) && (
                <div className="col-span-2 text-center py-8">
                  <Medal className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No achievements earned yet</p>
                </div>
              )}
            </div>

            {achievements.next_achievement && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Next Achievement</h4>
                <p className="text-sm text-blue-700 mb-3">{achievements.next_achievement.title}</p>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(achievements.next_achievement.progress / achievements.next_achievement.target) * 100}%`
                    }}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {achievements.next_achievement.progress} / {achievements.next_achievement.target}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && connections && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                {connections.total_connections} connections
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.connections?.map((connection: any) => (
                <div key={connection.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    {connection.profile_picture ? (
                      <img
                        src={connection.profile_picture}
                        alt={connection.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-purple-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{connection.full_name}</h4>
                      <p className="text-sm text-gray-600">{connection.location}</p>
                      {connection.preferred_sports && connection.preferred_sports.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {connection.preferred_sports.slice(0, 2).map((sport: string) => (
                            <span key={sport} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                              {sport}
                            </span>
                          ))}
                          {connection.preferred_sports.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              +{connection.preferred_sports.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => navigate(`/profile/${connection.id}`)}
                      className="flex-1 px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => navigate('/chats')}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {(!connections.connections || connections.connections.length === 0) && (
                <div className="col-span-3 text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No connections yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}