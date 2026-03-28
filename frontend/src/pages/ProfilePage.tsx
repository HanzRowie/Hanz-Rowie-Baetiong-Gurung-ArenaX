import { useState, useEffect, useRef } from 'react';
import { getAvatarUrl } from '@/utils/imageUtils';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, Edit3, MapPin, Trophy, Calendar, Award,
  X, Save, Camera, Mail, Phone, MessageCircle,
  Target, Users, Clock, Settings,
  Shield, Activity, BarChart3, Zap, Medal, Crown,
  ChevronRight, ChevronDown, ChevronUp, Globe, Crop, Building2, Star
} from 'lucide-react';
import { profileService } from '@/services/profileService';
import type { ExtendedUserProfile } from '@/types';
import type { User as UserType } from '@/types/auth.types';
import { useAuth } from '@/hooks/useAuth';
import BottomNavigation from '@/components/BottomNavigation';
import PlayerStatsDashboard from '@/components/PlayerStatsDashboard';
import toastService from '@/services/toastService';
import { useDispatch } from 'react-redux';
import { updateUser } from '@/store/authSlice';
import type { AppDispatch } from '@/store';

export default function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Statistics and activity data
  const [statistics, setStatistics] = useState<any>(null);
  const [achievements, setAchievements] = useState<any>(null);
  const [connections, setConnections] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any>(null);

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
    // Referee-specific fields
    sports_specialization: [] as string[],
    certification_level: '',
    years_experience: 0,
    license_number: '',
    license_expiry: '',
    default_fee_per_match: 0,
    default_fee_per_session: 0,
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

  const [newProfilePicture, setNewProfilePicture] = useState<File | null>(null);

  const isOwnProfile = !userId || userId === currentUser?.id;

  const skillLevels = [
    { value: 'BEGINNER', label: 'Beginner' },
    { value: 'INTERMEDIATE', label: 'Intermediate' },
    { value: 'ADVANCED', label: 'Advanced' },
    { value: 'PROFESSIONAL', label: 'Professional' },
  ];

  const certificationLevels = [
    { value: 'LEVEL_1', label: 'Level 1 - Beginner' },
    { value: 'LEVEL_2', label: 'Level 2 - Intermediate' },
    { value: 'LEVEL_3', label: 'Level 3 - Advanced' },
    { value: 'LEVEL_4', label: 'Level 4 - Professional' },
    { value: 'INTERNATIONAL', label: 'International' },
  ];

  const sportTypes = [
    'FUTSAL', 'BADMINTON'
  ];

  const formatSportName = (sport: string) => {
    return sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
  };

  // Format gender for display
  const formatGender = (gender?: string) => {
    if (!gender) return 'Not specified';
    switch (gender.toUpperCase()) {
      case 'MALE':
        return 'Male';
      case 'FEMALE':
        return 'Female';
      case 'OTHER':
        return 'Other';
      default:
        return gender;
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    try {
      const birthDate = new Date(dateOfBirth);
      if (isNaN(birthDate.getTime())) return null;
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch {
      return null;
    }
  };

  // List of countries for dropdown
  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
    'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria',
    'Cambodia', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic',
    'Denmark', 'Ecuador', 'Egypt', 'Estonia', 'Ethiopia',
    'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Guatemala',
    'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
    'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait',
    'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg', 'Malaysia', 'Mexico', 'Morocco',
    'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway',
    'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal',
    'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland',
    'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Venezuela', 'Vietnam'
  ];

  // Normalize and deduplicate sports array
  const normalizeSports = (sports: string[]) => {
    if (!sports || !Array.isArray(sports)) return [];
    
    // Convert all to uppercase and remove duplicates
    const normalized = sports.map(sport => sport.toUpperCase());
    return [...new Set(normalized)];
  };

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
          preferred_sports: normalizeSports(response.profile.preferred_sports || []),
          skill_level: response.profile.skill_level || '',
          achievements: response.profile.achievements || '',
          social_links: response.profile.social_links || {},
          is_available_for_matches: response.profile.is_available_for_matches || false,
          business_name: response.profile.business_name || '',
          business_registration: response.profile.business_registration || '',
          business_contact: response.profile.business_contact || '',
          // Referee-specific fields
          sports_specialization: response.profile.referee_profile?.sports_specialization || [],
          certification_level: response.profile.referee_profile?.certification_level || 'LEVEL_1',
          years_experience: response.profile.referee_profile?.years_experience || 0,
          license_number: response.profile.referee_profile?.license_number || '',
          license_expiry: response.profile.referee_profile?.license_expiry || '',
          default_fee_per_match: response.profile.referee_profile?.default_fee_per_match || 0,
          default_fee_per_session: response.profile.referee_profile?.default_fee_per_session || 0,
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
      const [statsResponse, connectionsResponse] = await Promise.allSettled([
        profileService.getUserStatistics(),
        profileService.getPlayerConnections(),
      ]);

      if (statsResponse.status === 'fulfilled') {
        setStatistics(statsResponse.value);
      }
      if (connectionsResponse.status === 'fulfilled') {
        setConnections(connectionsResponse.value);
      }
      
      // Set placeholder data for achievements and recent activity
      // These can be implemented later when the backend endpoints are ready
      setAchievements({ achievements: [], total_points: 0 });
      setRecentActivity({ activities: [] });
    } catch (err) {
      console.error('Failed to load additional data:', err);
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

      // Calculate crop dimensions (center crop)
      const size = Math.min(img.width, img.height);
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;

      // Draw cropped image
      ctx.drawImage(
        img,
        x,
        y,
        size,
        size,
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

      // Build update data based on user role
      const updateData: any = {
        full_name: editForm.full_name,
        bio: editForm.bio,
        location: editForm.location,
        country: editForm.country,
        phone_number: editForm.phone_number,
        date_of_birth: editForm.date_of_birth,
        gender: editForm.gender,
        preferred_sports: editForm.preferred_sports,
        skill_level: editForm.skill_level,
        achievements: editForm.achievements,
        social_links: editForm.social_links,
        is_available_for_matches: editForm.is_available_for_matches,
        business_name: editForm.business_name,
        business_registration: editForm.business_registration,
        business_contact: editForm.business_contact,
        profile_picture: newProfilePicture || undefined,
      };

      // Only include referee fields if user is a referee
      if (profile?.role === 'REFEREE') {
        updateData.sports_specialization = editForm.sports_specialization;
        updateData.certification_level = editForm.certification_level;
        updateData.years_experience = editForm.years_experience;
        updateData.license_number = editForm.license_number;
        updateData.license_expiry = editForm.license_expiry;
        updateData.default_fee_per_match = editForm.default_fee_per_match;
        updateData.default_fee_per_session = editForm.default_fee_per_session;
      }

      console.log('Saving profile with data:', updateData);

      const response = await profileService.updateProfile(updateData);
      
      // Update Redux auth store with updated user data if this is the current user's profile
      if (isOwnProfile && currentUser && response.profile) {
        const updatedUser: UserType = {
          ...currentUser,
          full_name: response.profile.full_name || currentUser.full_name,
          profile_picture: response.profile.profile_picture || currentUser.profile_picture,
          phone_number: response.profile.phone_number || currentUser.phone_number,
          bio: response.profile.bio,
          location: response.profile.location,
          country: response.profile.country,
          date_of_birth: response.profile.date_of_birth,
          gender: response.profile.gender,
          preferred_sports: response.profile.preferred_sports,
          skill_level: response.profile.skill_level,
          achievements: response.profile.achievements,
          social_links: response.profile.social_links,
          is_available_for_matches: response.profile.is_available_for_matches,
        };
        dispatch(updateUser(updatedUser));
        
        // Also trigger a custom event to notify other components (like dashboard) to refresh
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedUser }));
      }
      
      await loadProfile(); // Reload to get updated data
      if (isOwnProfile) {
        await loadAdditionalData(); // Reload additional data
      }
      setIsEditing(false);
      setNewProfilePicture(null);
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
        preferred_sports: normalizeSports(profile.preferred_sports || []),
        skill_level: profile.skill_level || '',
        achievements: profile.achievements || '',
        social_links: profile.social_links || {},
        is_available_for_matches: profile.is_available_for_matches,
        business_name: profile.business_name || '',
        business_registration: profile.business_registration || '',
        business_contact: profile.business_contact || '',
        // Referee-specific fields
        sports_specialization: profile.referee_profile?.sports_specialization || [],
        certification_level: profile.referee_profile?.certification_level || 'LEVEL_1',
        years_experience: profile.referee_profile?.years_experience || 0,
        license_number: profile.referee_profile?.license_number || '',
        license_expiry: profile.referee_profile?.license_expiry || '',
        default_fee_per_match: profile.referee_profile?.default_fee_per_match || 0,
        default_fee_per_session: profile.referee_profile?.default_fee_per_session || 0,
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
      {/* Image Cropper Modal */}
      {showImageCropper && originalImage && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Crop Profile Picture</h3>

            <div className="relative mb-4">
              <img
                src={originalImage}
                alt="Crop preview"
                className="w-full h-64 object-contain border rounded"
              />
              {/* Crop guide - dashed border outline only, no fill */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-dashed border-purple-500 w-48 h-48 rounded" />
              </div>
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
                        src={croppedImage || (newProfilePicture ? URL.createObjectURL(newProfilePicture) : getAvatarUrl(profile?.profile_picture)!)}
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
                    src={getAvatarUrl(profile.profile_picture)!}
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
                          <select
                            value={editForm.country}
                            onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          >
                            <option value="">Select your country</option>
                            {countries.map((country) => (
                              <option key={country} value={country}>{country}</option>
                            ))}
                          </select>
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
                        {calculateAge(profile?.date_of_birth) && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">
                              Age {calculateAge(profile?.date_of_birth)} years
                            </span>
                          </div>
                        )}
                        {profile?.gender && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{formatGender(profile.gender)}</span>
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
                    {profile?.role === 'VENUE_OWNER' ? 'Business Information' : 
                     profile?.role === 'REFEREE' ? 'Referee Information' : 
                     'Sports & Skills'}
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
                        ) : profile?.role === 'REFEREE' ? (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Sports Specialization *</label>
                              <div className="grid grid-cols-2 gap-2">
                                {sportTypes.map((sport) => (
                                  <label key={sport} className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                                    <input
                                      type="checkbox"
                                      checked={editForm.sports_specialization.includes(sport)}
                                      onChange={() => {
                                        setEditForm(prev => ({
                                          ...prev,
                                          sports_specialization: prev.sports_specialization.includes(sport)
                                            ? prev.sports_specialization.filter(s => s !== sport)
                                            : [...prev.sports_specialization, sport]
                                        }));
                                      }}
                                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm font-medium">{formatSportName(sport)}</span>
                                  </label>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Select the sports you can officiate</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Certification Level</label>
                              <select
                                value={editForm.certification_level}
                                onChange={(e) => setEditForm(prev => ({ ...prev, certification_level: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              >
                                {certificationLevels.map((level) => (
                                  <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                value={editForm.years_experience}
                                onChange={(e) => setEditForm(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
                                placeholder="Years as a referee"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                              <input
                                type="text"
                                value={editForm.license_number}
                                onChange={(e) => setEditForm(prev => ({ ...prev, license_number: e.target.value }))}
                                placeholder="Your referee license number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">License Expiry Date</label>
                              <input
                                type="date"
                                value={editForm.license_expiry}
                                onChange={(e) => setEditForm(prev => ({ ...prev, license_expiry: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Default Fee per Match (NPR)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editForm.default_fee_per_match}
                                onChange={(e) => setEditForm(prev => ({ ...prev, default_fee_per_match: parseFloat(e.target.value) || 0 }))}
                                placeholder="e.g. 1500"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              />
                              <p className="text-xs text-gray-500 mt-1">This will be pre-filled when organizers book you</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Default Fee per Session (NPR)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editForm.default_fee_per_session}
                                onChange={(e) => setEditForm(prev => ({ ...prev, default_fee_per_session: parseFloat(e.target.value) || 0 }))}
                                placeholder="e.g. 5000"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                              />
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
                                    <span className="text-sm">{formatSportName(sport)}</span>
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
                        ) : profile?.role === 'REFEREE' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profile.referee_profile?.sports_specialization && profile.referee_profile.sports_specialization.length > 0 && (
                              <div className="md:col-span-2">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Sports Specialization</h4>
                                <div className="flex flex-wrap gap-2">
                                  {profile.referee_profile.sports_specialization.map((sport: string) => (
                                    <span key={sport} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                                      {formatSportName(sport)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {profile.referee_profile?.certification_level && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Certification Level</h4>
                                <p className="text-gray-900">
                                  {certificationLevels.find(l => l.value === profile.referee_profile?.certification_level)?.label || profile.referee_profile.certification_level}
                                </p>
                              </div>
                            )}
                            
                            {profile.referee_profile?.years_experience !== undefined && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Experience</h4>
                                <p className="text-gray-900">{profile.referee_profile.years_experience} years</p>
                              </div>
                            )}
                            
                            {isOwnProfile && profile.referee_profile?.license_number && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">License Number</h4>
                                <p className="text-gray-900">{profile.referee_profile.license_number}</p>
                              </div>
                            )}
                            
                            {isOwnProfile && profile.referee_profile?.license_expiry && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">License Expiry</h4>
                                <p className="text-gray-900">
                                  {new Date(profile.referee_profile.license_expiry).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            
                            {profile.referee_profile?.rating !== undefined && profile.referee_profile.rating > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Rating</h4>
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`h-5 w-5 ${
                                          star <= Math.round(profile.referee_profile?.rating || 0)
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-gray-900 font-medium">
                                    {profile.referee_profile.rating.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {profile.referee_profile?.total_matches_officiated !== undefined && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Matches Officiated</h4>
                                <p className="text-gray-900">{profile.referee_profile.total_matches_officiated}</p>
                              </div>
                            )}
                            
                            {profile.location && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Location</h4>
                                <p className="text-gray-900">{profile.location}</p>
                              </div>
                            )}
                            
                            {profile.referee_profile?.is_verified && (
                              <div className="md:col-span-2">
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                  <Shield className="h-5 w-5 text-green-600" />
                                  <span className="text-sm font-medium text-green-800">Verified Referee</span>
                                </div>
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
                                      {formatSportName(sport)}
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

              {/* League Tournament Player Statistics */}
              {profile?.role === 'PLAYER' && !isEditing && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">League Tournament Statistics</h3>
                  <PlayerStatsDashboard />
                </div>
              )}

              {/* Referee Statistics */}
              {profile?.role === 'REFEREE' && !isEditing && profile.referee_profile && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Referee Statistics</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Rating Card */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-yellow-900">Overall Rating</h4>
                        <Award className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-6 w-6 ${
                                star <= Math.round(profile.referee_profile?.rating || 0)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-yellow-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-yellow-900 mt-2">
                        {profile.referee_profile.rating > 0 ? profile.referee_profile.rating.toFixed(1) : 'N/A'}
                      </p>
                    </div>

                    {/* Matches Officiated Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-blue-900">Matches Officiated</h4>
                        <Activity className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-3xl font-bold text-blue-900">
                        {profile.referee_profile.total_matches_officiated || 0}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">Total matches</p>
                    </div>

                    {/* Experience Card */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-purple-900">Experience</h4>
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                      <p className="text-3xl font-bold text-purple-900">
                        {profile.referee_profile.years_experience || 0}
                      </p>
                      <p className="text-xs text-purple-700 mt-1">Years</p>
                    </div>
                  </div>

                  {/* Booking Statistics */}
                  {(profile.total_bookings || profile.accepted_bookings || profile.completed_bookings) && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Total Bookings</h4>
                        <p className="text-2xl font-bold text-gray-900">{profile.total_bookings || 0}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <h4 className="text-sm font-medium text-green-700 mb-1">Accepted</h4>
                        <p className="text-2xl font-bold text-green-900">{profile.accepted_bookings || 0}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="text-sm font-medium text-blue-700 mb-1">Completed</h4>
                        <p className="text-2xl font-bold text-blue-900">{profile.completed_bookings || 0}</p>
                      </div>
                    </div>
                  )}

                  {/* Certification Badge */}
                  {profile.referee_profile.certification_level && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-full">
                          <Medal className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Certification</h4>
                          <p className="text-lg font-semibold text-indigo-900">
                            {certificationLevels.find(l => l.value === profile.referee_profile?.certification_level)?.label}
                          </p>
                        </div>
                        {profile.referee_profile.is_verified && (
                          <div className="ml-auto">
                            <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
                              <Shield className="h-4 w-4 text-green-600" />
                              <span className="text-xs font-medium text-green-800">Verified</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                        src={getAvatarUrl(connection.profile_picture)!}
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
                              {formatSportName(sport)}
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