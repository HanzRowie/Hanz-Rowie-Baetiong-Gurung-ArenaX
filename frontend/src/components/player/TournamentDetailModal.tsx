import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  MapPin,
  Users,
  Trophy,
  DollarSign,
  Clock,
  Award,
  User,
  FileText,
  Share2,
  Heart,
  UserPlus,
  Eye,
  Star,
  Zap,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Modal } from '@/design-system/components/Modal';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import type { Tournament } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import toastService from '@/services/toastService';

interface TournamentDetailModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  onRegister?: (tournamentId: string) => void;
  onShare?: (tournament: Tournament) => void;
  onBookmark?: (tournament: Tournament) => void;
  isBookmarked?: boolean;
}

export default function TournamentDetailModal({
  tournament,
  isOpen,
  onClose,
  onRegister,
  onShare,
  onBookmark,
  isBookmarked = false
}: TournamentDetailModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'rules'>('overview');
  const [registering, setRegistering] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'full' | 'closed'>('checking');

  useEffect(() => {
    if (tournament) {
      // Simulate real-time availability check
      const timer = setTimeout(() => {
        if (!tournament.is_registration_open) {
          setAvailabilityStatus('closed');
        } else if (tournament.registered_count >= tournament.max_participants) {
          setAvailabilityStatus('full');
        } else {
          setAvailabilityStatus('available');
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [tournament]);

  if (!tournament) return null;

  const handleRegister = async () => {
    if (!onRegister) return;
    
    try {
      setRegistering(true);
      await onRegister(tournament.id);
      toastService.success('Registration successful!');
    } catch (error) {
      toastService.error('Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(tournament);
    } else {
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
    }
  };

  const handleBookmark = () => {
    if (onBookmark) {
      onBookmark(tournament);
    } else {
      toastService.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
      return { icon: Clock, text: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800', description: 'Your registration is being reviewed' };
    }
    if (tournament.user_registration_status === 'ACCEPTED') {
      return { icon: CheckCircle, text: 'Registered', color: 'bg-green-100 text-green-800', description: 'You are registered for this tournament' };
    }
    if (tournament.user_registration_status === 'REJECTED') {
      return { icon: X, text: 'Rejected', color: 'bg-red-100 text-red-800', description: 'Your registration was not accepted' };
    }
    return null;
  };

  const getParticipationPercentage = () => {
    return Math.round((tournament.registered_count / tournament.max_participants) * 100);
  };

  const isPopular = () => getParticipationPercentage() > 70;
  const isFeatured = () => tournament.prize_pool && parseFloat(tournament.prize_pool) > 10000;

  const registrationStatus = getRegistrationStatus();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'rules', label: 'Rules', icon: FileText },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative">
          {/* Tournament Image */}
          <div className="h-64 overflow-hidden">
            {tournament.tournament_image ? (
              <img
                src={tournament.tournament_image}
                alt={tournament.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Trophy className="h-24 w-24 text-white opacity-80" />
              </div>
            )}
          </div>

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Status badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border backdrop-blur-sm ${getStatusColor(tournament.status)}`}>
              {tournament.status}
            </span>
            {isFeatured() && (
              <span className="px-3 py-1 bg-amber-500 text-white text-sm font-medium rounded-full flex items-center gap-1">
                <Star className="h-3 w-3" />
                Featured
              </span>
            )}
            {isPopular() && (
              <span className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-full flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Popular
              </span>
            )}
          </div>

          {/* Title and basic info */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <h1 className="text-3xl font-bold mb-2">{tournament.title}</h1>
            <div className="flex items-center gap-4 text-sm">
              <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                {tournament.sport_type}
              </span>
              <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                {tournament.tournament_type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Action buttons */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1">
              {registrationStatus ? (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${registrationStatus.color}`}>
                  <registrationStatus.icon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{registrationStatus.text}</p>
                    <p className="text-xs opacity-80">{registrationStatus.description}</p>
                  </div>
                </div>
              ) : user?.role === 'PLAYER' && availabilityStatus === 'available' ? (
                <Button
                  onClick={handleRegister}
                  disabled={registering}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 py-3"
                  size="lg"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  {registering ? 'Registering...' : 'Register Now'}
                </Button>
              ) : availabilityStatus === 'full' ? (
                <Button disabled className="w-full py-3" size="lg">
                  <Users className="h-5 w-5 mr-2" />
                  Tournament Full
                </Button>
              ) : availabilityStatus === 'closed' ? (
                <Button disabled className="w-full py-3" size="lg">
                  <X className="h-5 w-5 mr-2" />
                  Registration Closed
                </Button>
              ) : (
                <Button disabled className="w-full py-3" size="lg">
                  <Clock className="h-5 w-5 mr-2" />
                  Checking Availability...
                </Button>
              )}
            </div>

            <Button
              variant="secondary"
              onClick={handleShare}
              className="p-3"
            >
              <Share2 className="h-5 w-5" />
            </Button>

            <Button
              variant="secondary"
              onClick={handleBookmark}
              className="p-3"
            >
              <Heart className={`h-5 w-5 ${isBookmarked ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>

          {/* Real-time availability status */}
          {availabilityStatus === 'available' && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Registration Available</span>
              </div>
              <p className="text-sm text-emerald-600 mt-1">
                {tournament.max_participants - tournament.registered_count} spots remaining
              </p>
            </div>
          )}

          {availabilityStatus === 'full' && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Tournament Full</span>
              </div>
              <p className="text-sm text-amber-600 mt-1">
                All {tournament.max_participants} spots have been filled
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              {tournament.description && (
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">About This Tournament</h3>
                  <p className="text-gray-600 leading-relaxed">{tournament.description}</p>
                </Card>
              )}

              {/* Tournament Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="h-5 w-5 text-emerald-500" />
                    <h4 className="font-semibold text-gray-900">Date & Time</h4>
                  </div>
                  <p className="text-gray-600 mb-1">{formatDate(tournament.date)}</p>
                  <p className="text-sm text-gray-500">
                    {formatTime(tournament.start_time)}
                    {tournament.end_time && ` - ${formatTime(tournament.end_time)}`}
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="h-5 w-5 text-emerald-500" />
                    <h4 className="font-semibold text-gray-900">Venue</h4>
                  </div>
                  <p className="text-gray-600 mb-1">{tournament.venue}</p>
                  {tournament.venue_address && (
                    <p className="text-sm text-gray-500">{tournament.venue_address}</p>
                  )}
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-5 w-5 text-emerald-500" />
                    <h4 className="font-semibold text-gray-900">Participants</h4>
                  </div>
                  <p className="text-gray-600 mb-2">
                    {tournament.registered_count} / {tournament.max_participants} registered
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(getParticipationPercentage(), 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{getParticipationPercentage()}% filled</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                    <h4 className="font-semibold text-gray-900">Entry Fee</h4>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {tournament.entry_fee === '0.00' ? 'Free' : `NPR ${tournament.entry_fee}`}
                  </p>
                  {tournament.prize_pool && (
                    <p className="text-sm text-emerald-600 mt-1">
                      Prize Pool: NPR {tournament.prize_pool}
                    </p>
                  )}
                </Card>
              </div>

              {/* Registration Deadline */}
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <h4 className="font-semibold text-gray-900">Registration Deadline</h4>
                </div>
                <p className="text-gray-600">
                  {formatDate(tournament.registration_deadline)} at {formatTime(tournament.registration_deadline.split('T')[1]?.split('.')[0] || '23:59:59')}
                </p>
              </Card>

              {/* Organizer */}
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-5 w-5 text-emerald-500" />
                  <h4 className="font-semibold text-gray-900">Organizer</h4>
                </div>
                <div className="flex items-center gap-3">
                  {tournament.organizer.profile_picture ? (
                    <img
                      src={tournament.organizer.profile_picture}
                      alt={tournament.organizer.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-lg font-medium text-emerald-600">
                        {tournament.organizer.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{tournament.organizer.name}</p>
                    <p className="text-sm text-gray-500">Tournament Organizer</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Registered Participants ({tournament.registered_count})
                </h3>
                <span className="text-sm text-gray-500">
                  {tournament.max_participants - tournament.registered_count} spots remaining
                </span>
              </div>

              {tournament.registered_players && tournament.registered_players.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tournament.registered_players.map((player, index) => (
                    <Card key={player.id} className="p-4">
                      <div className="flex items-center gap-3">
                        {player.profile_picture ? (
                          <img
                            src={player.profile_picture}
                            alt={player.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-emerald-600">
                              {player.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{player.name}</p>
                          {player.skill_level && (
                            <p className="text-sm text-gray-500">{player.skill_level}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No participants yet</h3>
                  <p className="text-gray-500">Be the first to register for this tournament!</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Tournament Rules</h3>
              
              {tournament.rules ? (
                <Card className="p-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                      {tournament.rules}
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No specific rules provided</h3>
                  <p className="text-gray-500">Standard tournament rules will apply.</p>
                </Card>
              )}

              {/* General Tournament Info */}
              <Card className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Tournament Format</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Type:</strong> {tournament.tournament_type.replace('_', ' ')}</p>
                  <p><strong>Sport:</strong> {tournament.sport_type}</p>
                  <p><strong>Min Participants:</strong> {tournament.min_participants}</p>
                  <p><strong>Max Participants:</strong> {tournament.max_participants}</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}