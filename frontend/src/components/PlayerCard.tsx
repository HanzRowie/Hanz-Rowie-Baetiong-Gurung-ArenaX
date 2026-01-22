import { useNavigate } from 'react-router-dom';
import { User, MapPin } from 'lucide-react';
import type { PlayerProfile } from '@/services/dashboardService';

interface PlayerCardProps {
  user: {
    full_name: string;
    gender?: string;
    profile_picture?: string;
    country?: string;
    date_of_birth?: string;
    phone_number?: string;
  };
  profile: PlayerProfile | null;
  stats?: {
    matchesWon: number;
    matchesPlayed: number;
    winRate: number;
  };
}

export default function PlayerCard({ user, profile, stats }: PlayerCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, ' - ');
    } catch {
      return null;
    }
  };

  const calculateAge = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const birthDate = new Date(dateString);
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

  // Format gender for display
  const formatGender = (gender?: string) => {
    if (!gender) return null;
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

  // Use user data first (from Redux auth store which gets updated), then fallback to profile data
  // This ensures we always show the most up-to-date information after profile updates
  const displayCountry = user.country || profile?.country;
  const displayBirthDate = user.date_of_birth || profile?.birthDate;
  const displayAge = calculateAge(displayBirthDate) || profile?.age;
  const displayGender = formatGender(user.gender || profile?.gender);

  const isFemale = (user.gender || profile?.gender) === 'FEMALE';
  const isProfileComplete = displayBirthDate && displayCountry && (user.gender || profile?.gender);

  // Debug logging to help troubleshoot
  console.log('PlayerCard data:', {
    user,
    profile,
    displayCountry,
    displayBirthDate,
    displayAge,
    displayGender,
    rawUserGender: user.gender,
    rawUserDOB: user.date_of_birth,
    rawUserCountry: user.country,
    profileGender: profile?.gender,
    profileBirthDate: profile?.birthDate,
    profileCountry: profile?.country,
    isProfileComplete
  });

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {user.profile_picture ? (
              <img 
                src={user.profile_picture}
                alt={user.full_name}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center ring-2 ring-white shadow-md">
                <User className="h-8 w-8 text-purple-600" />
              </div>
            )}
          </div>
          
          {/* Name and Country */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate mb-1">
              {user.full_name || 'Complete Your Profile'}
            </h3>
            {displayCountry ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{displayCountry}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Country not set</span>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-6 py-5 space-y-4">
        {/* Biography Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Biography</span>
        </div>

        {/* Player Details */}
        <div className="space-y-3">
          {/* Age */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600">Age</span>
            <span className="text-sm font-semibold text-gray-900">
              {displayAge ? `${displayAge}` : <span className="text-gray-400">Not set</span>}
            </span>
          </div>

          {/* Birth Date */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600">Birth</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatDate(displayBirthDate) || <span className="text-gray-400">Not set</span>}
            </span>
          </div>

          {/* Gender */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600">Gender</span>
            <span className="text-sm font-semibold text-gray-900">
              {displayGender || <span className="text-gray-400">Not specified</span>}
            </span>
          </div>

          {/* WTA/ATP Ranking */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600">
              {isFemale ? 'WTA' : 'ATP'}
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {isFemale 
                ? (profile?.wtaRanking ? `${profile.wtaRanking}.` : <span className="text-gray-400">Unranked</span>)
                : (profile?.atpRanking ? `${profile.atpRanking}.` : <span className="text-gray-400">Unranked</span>)
              }
            </span>
          </div>

          {/* Stats Section */}
          {stats && stats.matchesPlayed > 0 && (
            <div className="pt-3 mt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Win Rate</span>
                <span className="text-sm font-bold text-purple-600">
                  {stats.winRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Matches</span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats.matchesWon}W / {stats.matchesPlayed - stats.matchesWon}L
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Complete Profile Button */}
        {!isProfileComplete && (
          <button
            onClick={() => navigate('/profile')}
            className="w-full mt-4 bg-purple-600 text-white py-2.5 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
          >
            Complete Profile
          </button>
        )}
      </div>
    </div>
  );
}

