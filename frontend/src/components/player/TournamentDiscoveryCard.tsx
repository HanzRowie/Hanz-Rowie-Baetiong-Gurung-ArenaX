import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  DollarSign,
  Eye,
  UserPlus,
  Clock,
  X,
  Star,
  Award,
  Zap,
  Heart,
  Share2,
  Bookmark,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/design-system/components/Card';
import { Button } from '@/design-system/components/Button';
import type { Tournament } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { tournamentService } from '@/services/tournamentService';
import toastService from '@/services/toastService';
import { getMediaUrl } from '@/utils/constants';

interface TournamentDiscoveryCardProps {
  tournament: Tournament;
  onRegister?: (tournamentId: string) => void;
  viewMode?: 'grid' | 'list';
}

export default function TournamentDiscoveryCard({ 
  tournament, 
  onRegister,
  viewMode = 'grid' 
}: TournamentDiscoveryCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [registering, setRegistering] = useState(false);

  const handleRegister = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRegister) return;
    
    try {
      setRegistering(true);
      await onRegister(tournament.id);
    } finally {
      setRegistering(false);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    toastService.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/tournaments/${tournament.id}`;
    if (navigator.share) {
      navigator.share({
        title: tournament.title,
        text: `Check out this ${tournament.sport_type} tournament!`,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toastService.success('Tournament link copied to clipboard!');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ONGOING': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRegistrationStatus = () => {
    if (tournament.user_registration_status === 'PENDING') {
      return { icon: Clock, text: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (tournament.user_registration_status === 'ACCEPTED') {
      return { icon: Trophy, text: 'Registered', color: 'bg-green-100 text-green-800' };
    }
    if (tournament.user_registration_status === 'REJECTED') {
      return { icon: X, text: 'Rejected', color: 'bg-red-100 text-red-800' };
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getParticipationPercentage = () => {
    return Math.round((tournament.registered_count / tournament.max_participants) * 100);
  };

  const isPopular = () => {
    return getParticipationPercentage() > 70;
  };

  const isFeatured = () => {
    // Mock logic for featured tournaments - could be based on prize pool, organizer rating, etc.
    return tournament.prize_pool && parseFloat(tournament.prize_pool) > 10000;
  };

  const registrationStatus = getRegistrationStatus();

  if (viewMode === 'list') {
    return (
      <Card
        interactive
        animation="hover-lift"
        role="player"
        className="group cursor-pointer"
        onClick={() => navigate(`/tournaments/${tournament.id}`)}
      >
        <CardContent className="p-6">
          <div className="flex gap-6">
            {/* Tournament Image */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-24 rounded-lg overflow-hidden">
                {tournament.tournament_image ? (
                  <img
                    src={getMediaUrl(tournament.tournament_image)!}
                    alt={tournament.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
              
              {/* Status badges */}
              <div className="absolute -top-2 -right-2 flex flex-col gap-1">
                {isFeatured() && (
                  <div className="bg-amber-500 text-white p-1 rounded-full shadow-lg">
                    <Star className="h-3 w-3" />
                  </div>
                )}
                {isPopular() && (
                  <div className="bg-red-500 text-white p-1 rounded-full shadow-lg">
                    <Zap className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                      {tournament.title}
                    </h3>
                    {isFeatured() && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full border border-amber-200">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-emerald-600 font-medium text-sm">{tournament.sport_type}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(tournament.status)}`}>
                    {tournament.status}
                  </span>
                  <button
                    onClick={handleBookmark}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Heart className={`h-4 w-4 ${isBookmarked ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                </div>
              </div>

              {tournament.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {tournament.description}
                </p>
              )}

              {/* Tournament details grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="font-medium">{formatDate(tournament.date)}</p>
                    <p className="text-xs">{formatTime(tournament.start_time)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="font-medium truncate">{tournament.venue}</p>
                    <p className="text-xs">Venue</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="font-medium">{tournament.registered_count}/{tournament.max_participants}</p>
                    <p className="text-xs">Players</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="font-medium">
                      {tournament.entry_fee === '0.00' ? 'Free' : `NPR ${tournament.entry_fee}`}
                    </p>
                    <p className="text-xs">Entry Fee</p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Registration Progress</span>
                  <span>{getParticipationPercentage()}% filled</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(getParticipationPercentage(), 100)}%` }}
                  />
                </div>
              </div>

              {/* Organizer and actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tournament.organizer.profile_picture ? (
                    <img
                      src={tournament.organizer.profile_picture}
                      alt={tournament.organizer.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-emerald-600">
                        {tournament.organizer.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tournament.organizer.name}</p>
                    <p className="text-xs text-gray-500">Organizer</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  
                  {registrationStatus ? (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${registrationStatus.color}`}>
                      <registrationStatus.icon className="h-4 w-4" />
                      {registrationStatus.text}
                    </div>
                  ) : user?.role === 'PLAYER' && tournament.is_registration_open ? (
                    <Button
                      onClick={handleRegister}
                      disabled={registering}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {registering ? 'Registering...' : 'Register'}
                    </Button>
                  ) : (
                    <Button variant="secondary">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
      interactive
      animation="hover-lift"
      role="player"
      className="group cursor-pointer overflow-hidden"
      onClick={() => navigate(`/tournaments/${tournament.id}`)}
    >
      {/* Tournament Image */}
      <div className="relative h-48 overflow-hidden">
        {tournament.tournament_image ? (
          <img
            src={getMediaUrl(tournament.tournament_image)!}
            alt={tournament.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Trophy className="h-16 w-16 text-white opacity-80" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        {/* Status and badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${getStatusColor(tournament.status)}`}>
            {tournament.status}
          </span>
          {isFeatured() && (
            <span className="px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
              <Star className="h-3 w-3" />
              Featured
            </span>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={handleBookmark}
            className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <Heart className={`h-4 w-4 ${isBookmarked ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <button
            onClick={handleShare}
            className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        
        {/* Popular indicator */}
        {isPopular() && (
          <div className="absolute bottom-3 left-3">
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
              <Zap className="h-3 w-3" />
              Popular
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">
            {tournament.title}
          </h3>
          <p className="text-emerald-600 font-medium text-sm">{tournament.sport_type}</p>
        </div>

        {/* Description */}
        {tournament.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {tournament.description}
          </p>
        )}

        {/* Tournament details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <span className="font-medium">{formatDate(tournament.date)}</span>
            <span className="text-gray-400">•</span>
            <span>{formatTime(tournament.start_time)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-emerald-500" />
            <span className="truncate">{tournament.venue}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4 text-emerald-500" />
              <span>{tournament.registered_count}/{tournament.max_participants} players</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="font-medium">
                {tournament.entry_fee === '0.00' ? 'Free' : `NPR ${tournament.entry_fee}`}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Registration</span>
            <span>{getParticipationPercentage()}% filled</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(getParticipationPercentage(), 100)}%` }}
            />
          </div>
        </div>

        {/* Prize pool */}
        {tournament.prize_pool && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <Award className="h-4 w-4 text-amber-500" />
            <span className="font-medium">Prize Pool: NPR {tournament.prize_pool}</span>
          </div>
        )}

        {/* Organizer */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
          {tournament.organizer.profile_picture ? (
            <img
              src={tournament.organizer.profile_picture}
              alt={tournament.organizer.name}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-xs font-medium text-emerald-600">
                {tournament.organizer.name.charAt(0)}
              </span>
            </div>
          )}
          <span className="text-sm text-gray-600">by {tournament.organizer.name}</span>
        </div>
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-0">
        <div className="flex gap-2 w-full">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/tournaments/${tournament.id}`);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          
          {registrationStatus ? (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${registrationStatus.color} flex-1 justify-center`}>
              <registrationStatus.icon className="h-4 w-4" />
              {registrationStatus.text}
            </div>
          ) : user?.role === 'PLAYER' && tournament.is_registration_open ? (
            <Button
              onClick={handleRegister}
              disabled={registering}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {registering ? 'Registering...' : 'Register'}
            </Button>
          ) : !tournament.is_registration_open ? (
            <Button variant="secondary" disabled className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Closed
            </Button>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
}