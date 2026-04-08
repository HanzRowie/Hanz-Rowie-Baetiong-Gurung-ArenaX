import { useState, useEffect } from 'react';
import { getAvatarUrl } from '@/utils/imageUtils';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar, MapPin, Users, Trophy, DollarSign,
  UserPlus, ArrowLeft, Play, Award, Info,
  CheckCircle, XCircle, AlertCircle, Download, Share2,
  Edit, UserCheck, UserX, MessageCircle, Trash2, Check
} from 'lucide-react';
import { tournamentService } from '@/services/tournamentService';
import type { Tournament } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import BottomNavigation from '@/components/BottomNavigation';
import BracketVisualization from '@/components/BracketVisualization';
import { LeagueStandingsTable } from '@/components/LeagueStandingsTable';
import LeagueScheduleTable from '@/components/LeagueScheduleTable';
import type { StandingsRow } from '@/components/LeagueStandingsTable';
import { TopScorersTable } from '@/components/TopScorersTable';
import { TopAssistsTable } from '@/components/TopAssistsTable';
import type { PlayerStats } from '@/components/TopScorersTable';
import toastService from '@/services/toastService';
import { api } from '@/services/api';
import PaymentModal from '@/components/PaymentModal';
import ChatButton from '@/components/chat/ChatButton';
import { getMediaUrl } from '@/utils/constants';
import DocumentSubmissionPanel from '@/components/DocumentSubmissionPanel';
import ConfirmDialog, { TeamPlayersDialog } from '@/components/ConfirmDialog';

export default function TournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [topScorers, setTopScorers] = useState<PlayerStats[]>([]);
  const [topAssists, setTopAssists] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'bracket' | 'schedule' | 'standings' | 'rules' | 'referees'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [referees, setReferees] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [refereesLoading, setRefereesLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog state
  const [dialog, setDialog] = useState<{
    open: boolean; title: string; message: string; variant: 'danger' | 'warning' | 'info';
    confirmLabel?: string; inputLabel?: string; inputPlaceholder?: string;
    onConfirm: (val?: string) => void;
  } | null>(null);
  const [teamPlayersDialog, setTeamPlayersDialog] = useState<{ open: boolean; teamName: string; players: { full_name: string }[] } | null>(null);

  const showConfirm = (opts: typeof dialog) => setDialog(opts);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Debug payment modal state changes
  useEffect(() => {
    console.log('💳 Payment Modal State Changed:', {
      showPaymentModal,
      paymentId,
      paymentUrl,
      tournament: tournament?.title
    });
  }, [showPaymentModal, paymentId, paymentUrl]);

  const getTournamentsPath = () => {
    return user?.role === 'ORGANIZER' ? '/my-tournaments' : '/tournaments';
  };

  useEffect(() => {
    if (tournamentId) {
      loadTournament();
      loadReferees();
      loadMatches();
    }
  }, [tournamentId]);

  // Handle auto-registration from URL parameter
  useEffect(() => {
    const autoRegister = searchParams.get('autoRegister');
    if (autoRegister === 'true' && tournament && canUserRegister()) {
      console.log('🔄 Auto-registering from URL parameter');
      // Remove the parameter from URL
      searchParams.delete('autoRegister');
      setSearchParams(searchParams, { replace: true });
      // Trigger registration
      handleRegister();
    }
  }, [tournament, searchParams]);

  const loadStandings = async () => {
    if (!tournamentId) return;

    try {
      const standingsData = await tournamentService.getStandings(tournamentId);
      setStandings(standingsData);
    } catch (err: any) {
      console.error('Error fetching standings:', err);
      setStandings([]);
    }
  };

  const loadLeaderboards = async () => {
    if (!tournamentId) return;

    try {
      const [scorersData, assistsData] = await Promise.all([
        tournamentService.getTopScorers(tournamentId),
        tournamentService.getTopAssists(tournamentId)
      ]);

      console.log('Top Scorers Data:', scorersData);
      console.log('Top Assists Data:', assistsData);

      setTopScorers(scorersData);
      setTopAssists(assistsData);
    } catch (err: any) {
      console.error('Error fetching leaderboards:', err);
      setTopScorers([]);
      setTopAssists([]);
    }
  };

  const loadReferees = async () => {
    if (!tournamentId) return;

    try {
      const response = await api.get(`/api/tournaments/${tournamentId}/referees/`);
      // This endpoint returns a plain array, not paginated
      setReferees(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Error fetching referees:', err);
      setReferees([]);
    }
  };

  const loadMatches = async () => {
    if (!tournamentId) return;

    try {
      const response = await api.get(`/api/tournaments/${tournamentId}/matches/`);
      const matchesData = response.data.matches || response.data || [];
      setMatches(matchesData);
    } catch (err: any) {
      console.error('Error fetching matches:', err);
      setMatches([]);
    }
  };

  const loadTournament = async () => {
    try {
      setLoading(true);

      // Load tournament details
      const response = await tournamentService.getTournamentDetail(tournamentId!);
      setTournament(response.tournament);
      console.log('[TournamentDetail] tournament_image raw:', response.tournament.tournament_image);
      console.log('[TournamentDetail] getMediaUrl result:', getMediaUrl(response.tournament.tournament_image));

      // Load standings if this is a league tournament
      if (response.tournament.tournament_type === 'league') {
        await loadStandings();
        await loadLeaderboards();
      }

      // Load detailed participants for organizers, or basic participant info for others
      if (user?.role === 'ORGANIZER') {
        try {
          const participantsResponse = await tournamentService.getTournamentParticipants(tournamentId!);
          setParticipants(participantsResponse.participants);
        } catch (participantError) {
          console.warn('Failed to load participants:', participantError);
          // Fallback to registered_players from tournament data
          if (response.tournament.registered_players) {
            const basicParticipants = response.tournament.registered_players.map(player => ({
              id: player.id, // This will be user ID, not registration ID
              user: {
                id: player.id,
                full_name: player.name,
                email: '', // Email might not be available in registered_players
                profile_picture: player.profile_picture
              },
              status: 'ACCEPTED', // Assume accepted if in registered_players
              registration_date: player.registered_at
            }));
            setParticipants(basicParticipants);
          }
        }
      } else {
        // For non-organizers, use the basic registered_players data
        if (response.tournament.registered_players) {
          const basicParticipants = response.tournament.registered_players.map(player => ({
            id: player.id, // This will be user ID for non-organizers
            user: {
              id: player.id,
              full_name: player.name,
              email: '', // Email might not be available in registered_players
              profile_picture: player.profile_picture
            },
            status: 'ACCEPTED', // Assume accepted if in registered_players
            registration_date: player.registered_at
          }));
          setParticipants(basicParticipants);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      console.log('=== REGISTRATION ATTEMPT ===');
      console.log('Tournament:', tournament?.title);
      console.log('Entry Fee:', tournament?.entry_fee);
      console.log('Entry Fee Type:', typeof tournament?.entry_fee);
      console.log('Participation Type:', tournament?.participation_type);

      // Check if tournament requires team registration
      if (tournament?.participation_type === 'TEAM') {
        toastService.error('This tournament requires team registration. Please register as a team from the Teams page.');
        return;
      }

      setRegistering(true);

      // Check if tournament has entry fee (handle both string and number types)
      const entryFee = typeof tournament?.entry_fee === 'string'
        ? parseFloat(tournament.entry_fee)
        : tournament?.entry_fee || 0;

      console.log('Parsed Entry Fee:', entryFee);

      if (tournament && entryFee > 0) {
        console.log('Paid tournament - initiating payment flow');
        // Paid tournament - initiate payment flow
        const response = await tournamentService.registerWithPayment(tournamentId!);
        console.log('Registration response:', response);
        console.log('Response payment_required:', response.payment_required);
        console.log('Response payment:', response.payment);
        console.log('Response khalti_response:', response.khalti_response);

        if (response.payment_required && response.payment && response.khalti_response) {
          console.log('✅ Payment required - setting state to show modal');
          console.log('Payment ID:', response.payment.id);
          console.log('Khalti Response:', response.khalti_response);
          console.log('Payment URL:', response.khalti_response.payment_url);

          // Store payment ID, URL and show payment modal
          setPaymentId(response.payment.id);
          console.log('State updated: paymentId =', response.payment.id);

          setPaymentUrl(response.khalti_response.payment_url);
          console.log('State updated: paymentUrl =', response.khalti_response.payment_url);

          setShowPaymentModal(true);
          console.log('State updated: showPaymentModal = true');

          toastService.info('Please complete the payment to confirm your registration');
        } else {
          console.log('❌ No payment required or payment failed');
          console.log('Missing fields:', {
            payment_required: response.payment_required,
            payment: !!response.payment,
            khalti_response: !!response.khalti_response
          });
          // Free tournament or payment not required
          await loadTournament();
          toastService.success('Successfully registered for tournament!');
        }
      } else {
        console.log('Free tournament - direct registration');
        // Free tournament - direct registration
        await tournamentService.registerForTournament(tournamentId!);
        await loadTournament();
        toastService.success('Successfully registered for tournament!');
      }
    } catch (err: any) {
      console.error('=== REGISTRATION ERROR ===');
      console.error('Error:', err);
      console.error('Error message:', err.message);
      console.error('Error details:', err.details);
      console.error('Error response:', err.response);
      toastService.error(err.message || 'Failed to register for tournament');
    } finally {
      setRegistering(false);
      console.log('=== REGISTRATION ATTEMPT END ===');
      console.log('Final state: showPaymentModal =', showPaymentModal, ', paymentId =', paymentId);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setPaymentId(null);
    setPaymentUrl(null);
    await loadTournament(); // Reload to update registration status
    toastService.success('Payment successful! Your registration is being processed.');
  };

  const handlePaymentError = (error: string) => {
    toastService.error(`Payment failed: ${error}`);
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPaymentId(null);
    setPaymentUrl(null);
  };

  const handleWithdraw = async () => {
    showConfirm({
      open: true, title: 'Withdraw from tournament', variant: 'danger',
      message: 'Are you sure you want to withdraw from this tournament?',
      confirmLabel: 'Withdraw',
      onConfirm: async () => {
        setDialog(null);
        try {
          await tournamentService.withdrawFromTournament(tournamentId!);
          await loadTournament();
          toastService.success('Successfully withdrawn from tournament');
        } catch (err: any) {
          toastService.error(err.message || 'Failed to withdraw from tournament');
        }
      },
    });
  };

  const handleGenerateBracket = async () => {
    const isLeague = tournament?.tournament_type === 'league';
    const actionText = isLeague ? 'Generate schedule' : 'Generate tournament bracket';
    showConfirm({
      open: true, title: actionText, variant: 'warning',
      message: `${actionText}? This cannot be undone.`,
      confirmLabel: 'Generate',
      onConfirm: async () => {
        setDialog(null);
        try {
          if (isLeague) {
            await tournamentService.generateSchedule(tournamentId!);
            toastService.success('Tournament schedule generated successfully!');
          } else {
            await tournamentService.generateBracket(tournamentId!);
            toastService.success('Tournament bracket generated successfully!');
          }
          await loadTournament();
        } catch (err: any) {
          toastService.error(err.message || `Failed to generate ${isLeague ? 'schedule' : 'bracket'}`);
        }
      },
    });
  };

  const handleShareTournament = () => {
    const shareUrl = tournament?.share_token
      ? `${window.location.origin}/t/${tournament.share_token}`
      : window.location.href;
    if (navigator.share) {
      navigator.share({
        title: tournament?.title,
        text: `Check out this tournament: ${tournament?.title}`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toastService.success('Tournament link copied to clipboard!');
    }
    setShowShareModal(false);
  };

  const handleAddReferee = () => {
    navigate(`/tournaments/${tournamentId}/select-referee`);
  };

  const handleRemoveReferee = async (refereeId: number) => {
    showConfirm({
      open: true, title: 'Remove referee', variant: 'danger',
      message: 'Are you sure you want to remove this referee assignment?',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        setDialog(null);
        try {
          setRefereesLoading(true);
          await api.delete(`/api/tournaments/${tournamentId}/referees/${refereeId}/`);
          await loadReferees();
          toastService.success('Referee removed successfully!');
        } catch (err: any) {
          toastService.error(err.response?.data?.error || 'Failed to remove referee');
        } finally {
          setRefereesLoading(false);
        }
      },
    });
  };

  const handleGenerateSchedule = async () => {
    if (!tournamentId) return;
    showConfirm({
      open: true, title: 'Generate league schedule', variant: 'warning',
      message: 'This will create matches for all teams. Continue?',
      confirmLabel: 'Generate',
      onConfirm: async () => {
        setDialog(null);
        try {
          setScheduleLoading(true);
          setError(null);
          setSuccessMessage(null);
          const result = await tournamentService.generateSchedule(tournamentId);
          setSuccessMessage(result.message || `Successfully generated ${result.matches_created} matches!`);
          await loadMatches();
          await loadStandings();
          setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
          const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to generate schedule';
          setError(errorMsg);
          toastService.error(errorMsg);
        } finally {
          setScheduleLoading(false);
        }
      },
    });
  };

  const handleEditMatch = async (matchId: string, updates: any) => {
    if (!tournamentId) return;

    try {
      if (updates.scheduled_time) {
        await tournamentService.scheduleMatch(tournamentId, matchId, updates.scheduled_time);
        toastService.success('Match schedule updated successfully!');
      } else {
        await tournamentService.updateMatchResult(tournamentId, matchId, updates);
        toastService.success('Match result updated successfully!');
      }

      await loadMatches();
      if (tournament.tournament_type === 'league') {
        await loadStandings();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update match';
      toastService.error(errorMsg);
      console.error('Match update error:', err);
    }
  };

  // Venue assignment state
  const [venueModalMatchId, setVenueModalMatchId] = useState<string | null>(null);
  const [venueInput, setVenueInput] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [availableVenues, setAvailableVenues] = useState<any[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [savingVenue, setSavingVenue] = useState(false);

  const handleAssignVenue = async (matchId: string) => {
    const match = matches.find((m: any) => m.id === matchId);
    setVenueInput(match?.match_venue_name || '');
    setSelectedVenueId(match?.match_venue ? String(match.match_venue) : '');
    setVenueModalMatchId(matchId);
    // Load approved venues
    try {
      setLoadingVenues(true);
      const res = await api.get('/api/venues/venues/');
      const venues = res.data.venues || res.data;
      setAvailableVenues(Array.isArray(venues) ? venues : []);
    } catch {
      setAvailableVenues([]);
    } finally {
      setLoadingVenues(false);
    }
  };

  // Payment modal state for venue booking from match assignment
  const [showVenueBookingPayment, setShowVenueBookingPayment] = useState(false);
  const [venueBookingPaymentData, setVenueBookingPaymentData] = useState<any>(null);
  const [venueBookingDate, setVenueBookingDate] = useState('');
  const [venueBookingStartTime, setVenueBookingStartTime] = useState('');
  const [venueBookingEndTime, setVenueBookingEndTime] = useState('');

  const handleSaveVenue = async () => {
    if (!tournamentId || !venueModalMatchId) return;

    // Custom name — no payment needed, just save the label
    if (!selectedVenueId && venueInput.trim()) {
      try {
        setSavingVenue(true);
        await api.put(`/api/tournaments/${tournamentId}/matches/${venueModalMatchId}/result/`, {
          match_venue_name: venueInput,
        });
        toastService.success('Venue assigned successfully!');
        setVenueModalMatchId(null);
        await loadMatches();
      } catch (err: any) {
        toastService.error(err.response?.data?.error || 'Failed to assign venue');
      } finally {
        setSavingVenue(false);
      }
      return;
    }

    // Linked venue — need date/time and payment
    if (selectedVenueId) {
      if (!venueBookingDate || !venueBookingStartTime || !venueBookingEndTime) {
        toastService.error('Please enter the match date and time slot for the venue booking');
        return;
      }
      try {
        setSavingVenue(true);
        const selectedVenue = availableVenues.find((v: any) => v.id === selectedVenueId);
        const res = await api.post(`/api/venues/venues/${selectedVenueId}/book/`, {
          date: venueBookingDate,
          start_time: venueBookingStartTime,
          end_time: venueBookingEndTime,
          purpose: `Match - ${tournament?.title || 'Tournament'}`,
          notes: `Auto-booked for match ${venueModalMatchId}`,
          match_id: venueModalMatchId,
          tournament_id: tournamentId,
        });

        if (res.data.payment_url) {
          setVenueBookingPaymentData({
            paymentId: res.data.payment?.id,
            paymentUrl: res.data.payment_url,
            pidx: res.data.pidx,
            amount: parseFloat(res.data.payment?.amount || 0),
            matchId: venueModalMatchId,
            venueId: selectedVenueId,
            bookingId: res.data.booking?.id,
            venueName: selectedVenue?.name,
          });
          setVenueModalMatchId(null);
          setShowVenueBookingPayment(true);
        } else {
          // No payment required (free venue or mock mode)
          await api.put(`/api/tournaments/${tournamentId}/matches/${venueModalMatchId}/result/`, {
            match_venue_id: selectedVenueId,
          });
          toastService.success('Venue booked and assigned!');
          setVenueModalMatchId(null);
          await loadMatches();
        }
      } catch (err: any) {
        toastService.error(err.response?.data?.error || 'Failed to book venue');
      } finally {
        setSavingVenue(false);
      }
    }
  };

  const handleVenueBookingPaymentSuccess = async () => {
    setShowVenueBookingPayment(false);
    if (venueBookingPaymentData?.matchId && venueBookingPaymentData?.venueId) {
      try {
        await api.put(`/api/tournaments/${tournamentId}/matches/${venueBookingPaymentData.matchId}/result/`, {
          match_venue_id: venueBookingPaymentData.venueId,
        });
        toastService.success('Venue booked and assigned to match!');
        await loadMatches();
      } catch {
        toastService.error('Payment succeeded but failed to link venue to match. Please contact support.');
      }
    }
    setVenueBookingPaymentData(null);
  };

  const handleDeleteTournament = async () => {
    showConfirm({
      open: true, title: 'Delete tournament', variant: 'danger',
      message: 'Are you sure you want to delete this tournament? This action cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setDialog(null);
        try {
          await api.delete(`/api/tournaments/tournaments/${tournamentId}/`);
          toastService.success('Tournament deleted successfully!');
          navigate('/my-tournaments');
        } catch (err: any) {
          toastService.error(err.response?.data?.error || 'Failed to delete tournament');
        }
      },
    });
  };

  const handleExportParticipants = () => {
    // Export participants to CSV
    if (!participants || participants.length === 0) return;

    const csvContent = [
      tournament?.participation_type === 'TEAM'
        ? ['Team Name', 'Registered By', 'Status', 'Registration Date', 'Selected Players']
        : ['Name', 'Email', 'Status', 'Registration Date'],
      ...participants.map(participant => {
        if (participant.type === 'team') {
          return [
            participant.team.name,
            participant.registered_by.full_name,
            participant.status,
            new Date(participant.registration_date || '').toLocaleDateString(),
            participant.selected_players.map((p: any) => p.full_name).join('; ')
          ];
        } else {
          return [
            participant.user.full_name,
            participant.user.email,
            participant.status,
            new Date(participant.registration_date || '').toLocaleDateString()
          ];
        }
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament?.title || 'tournament'}_participants.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAcceptParticipants = async () => {
    if (selectedParticipants.length === 0) return;

    try {
      let acceptedCount = 0;
      // Process all selected participants in parallel
      await Promise.all(selectedParticipants.map(async (participantId) => {
        const participant = participants.find(p => p.id === participantId);
        if (!participant) return;

        if (participant.type === 'team') {
          await tournamentService.acceptTeamParticipant(tournamentId!, participant.id);
        } else {
          await tournamentService.acceptParticipant(tournamentId!, participant.id);
        }
        acceptedCount++;
      }));

      toastService.success(`${acceptedCount} participants accepted successfully!`);
      setSelectedParticipants([]);
      await loadTournament(); // Reload to update participant list
    } catch (err: any) {
      console.error('Error accepting participants:', err);
      toastService.error(err.message || 'Failed to accept participants. Some may have been processed.');
      // Reload to reflect any successful changes
      await loadTournament();
    }
  };

  const handleRejectParticipants = async () => {
    if (selectedParticipants.length === 0) return;
    showConfirm({
      open: true, title: `Reject ${selectedParticipants.length} participant(s)`, variant: 'danger',
      message: 'Provide an optional reason for rejection.',
      confirmLabel: 'Reject',
      inputLabel: 'Reason (optional)',
      inputPlaceholder: 'e.g. Incomplete registration...',
      onConfirm: async (reason) => {
        setDialog(null);
        try {
          let rejectedCount = 0;
          await Promise.all(selectedParticipants.map(async (participantId) => {
            const participant = participants.find(p => p.id === participantId);
            if (!participant) return;
            if (participant.type === 'team') {
              await tournamentService.rejectTeamParticipant(tournamentId!, participant.id, reason || undefined);
            } else {
              await tournamentService.rejectParticipant(tournamentId!, participant.id, reason || undefined);
            }
            rejectedCount++;
          }));
          toastService.success(`${rejectedCount} participants rejected successfully!`);
          setSelectedParticipants([]);
          await loadTournament();
        } catch (err: any) {
          toastService.error(err.message || 'Failed to reject participants. Some may have been processed.');
          await loadTournament();
        }
      },
    });
  };

  const filteredParticipants = participants?.filter(participant => {
    if (participant.type === 'team') {
      return participant.team.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
        (participant.status && participant.status.toLowerCase().includes(participantSearch.toLowerCase()));
    } else {
      return participant.user.full_name.toLowerCase().includes(participantSearch.toLowerCase()) ||
        (participant.status && participant.status.toLowerCase().includes(participantSearch.toLowerCase()));
    }
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'bg-blue-100 text-blue-800';
      case 'ONGOING': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const isUserRegistered = () => {
    return tournament?.registered_players?.some(player => player.id === user?.id);
  };

  const canUserRegister = () => {
    return user?.role === 'PLAYER' &&
      tournament?.is_registration_open &&
      !isUserRegistered();
  };

  const isOrganizer = () => {
    return user?.id === tournament?.organizer.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tournament details...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tournament Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The tournament you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate(getTournamentsPath())}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(getTournamentsPath())}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Tournaments
            </button>

            <div className="flex items-center gap-2">
              {/* Message Organizer button for non-organizers */}
              {user && !isOrganizer() && (
                <ChatButton
                  targetUserId={tournament.organizer.id}
                  targetUserName={tournament.organizer.name}
                  buttonText="Message Organizer"
                  variant="primary"
                  context="tournament"
                />
              )}

              {/* Organizer-only actions */}
              {isOrganizer() && (
                <>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>

                  {tournament.status === 'UPCOMING' && tournament.registered_count >= (tournament.min_participants || 2) && matches.length === 0 && (
                    <button
                      onClick={handleGenerateBracket}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      {tournament.tournament_type === 'league' ? 'Generate Schedule' : 'Generate Bracket'}
                    </button>
                  )}

                  {tournament.status !== 'COMPLETED' && tournament.status !== 'CANCELLED' && (
                    <button
                      onClick={() => navigate(`/tournaments/${tournament.id}/edit`)}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative h-64">
        {tournament.tournament_image ? (
          <img
            src={getMediaUrl(tournament.tournament_image)!}
            alt={tournament.title}
            className="absolute inset-0 w-full h-full object-cover z-0"
            onLoad={() => console.log('[TournamentDetail] Image loaded OK:', getMediaUrl(tournament.tournament_image))}
            onError={(e) => console.error('[TournamentDetail] Image FAILED to load:', getMediaUrl(tournament.tournament_image), e)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-purple-800 z-0" />
        )}
        <div className="absolute inset-0 bg-black/40 z-10" />

        <div className="absolute inset-0 flex items-end z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <div className="flex items-end justify-between">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tournament.status)}`}>
                    {tournament.status}
                  </span>
                  <span className="text-sm opacity-90">{tournament.sport_type}</span>
                </div>
                <h1 className="text-4xl font-bold mb-2">{tournament.title}</h1>
                <p className="text-lg opacity-90">Organized by {tournament.organizer.name}</p>
              </div>

              <div className="flex flex-col gap-2">
                {canUserRegister() && (
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <UserPlus className="h-5 w-5" />
                    {registering ? 'Registering...' : 'Register Now'}
                  </button>
                )}

                {isUserRegistered() && tournament.status === 'UPCOMING' && (
                  <button
                    onClick={handleWithdraw}
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                    Withdraw
                  </button>
                )}

                {isUserRegistered() && (
                  <div className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    Registered
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Submission Panel — visible to organizer when CONDITIONAL_APPROVAL */}
      {isOrganizer() && (tournament as any).approval_status === 'CONDITIONAL_APPROVAL' && (
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <DocumentSubmissionPanel
            resourceType="tournament"
            resourceId={tournamentId!}
            onDocumentsSubmitted={loadTournament}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: Info },
                    { id: 'participants', label: 'Participants', icon: Users },
                    // Show schedule and standings tabs for league tournaments
                    ...(tournament.tournament_type === 'league'
                      ? [
                        { id: 'schedule', label: 'Schedule', icon: Calendar },
                        { id: 'standings', label: 'Standings', icon: Trophy }
                      ]
                      // Show bracket tab only for knockout tournaments
                      : [{ id: 'bracket', label: 'Bracket', icon: Trophy }]
                    ),
                    { id: 'rules', label: 'Rules', icon: AlertCircle },
                    { id: 'referees', label: 'Referees', icon: UserPlus },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {tournament.description && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                        <p className="text-gray-600 leading-relaxed">{tournament.description}</p>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Tournament Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Date & Time</p>
                            <p className="font-medium">{formatDate(tournament.date)}</p>
                            <p className="text-sm text-gray-600">{formatTime(tournament.start_time)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Venue</p>
                            <p className="font-medium">{tournament.venue}</p>
                            {tournament.venue_address && (
                              <p className="text-sm text-gray-600">{tournament.venue_address}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Entry Fee</p>
                            <p className="font-medium">
                              {tournament.entry_fee === '0.00' ? 'Free' : `NPR ${tournament.entry_fee}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Award className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Prize Pool</p>
                            <p className="font-medium">
                              {tournament.prize_pool ? `NPR ${tournament.prize_pool}` : 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Participants Tab */}
                {activeTab === 'participants' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Participants ({tournament.registered_count}/{tournament.max_participants})
                        </h3>
                        <div className="w-full max-w-md bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((tournament.registered_count / tournament.max_participants) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {isOrganizer() && participants && participants.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExportParticipants}
                            className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Export
                          </button>

                          {selectedParticipants.length > 0 && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleAcceptParticipants}
                                className="flex items-center gap-2 px-3 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                              >
                                <UserCheck className="h-4 w-4" />
                                Accept ({selectedParticipants.length})
                              </button>
                              <button
                                onClick={handleRejectParticipants}
                                className="flex items-center gap-2 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                <UserX className="h-4 w-4" />
                                Reject ({selectedParticipants.length})
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Participant Search */}
                    {participants && participants.length > 5 && (
                      <div className="mb-4">
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search participants..."
                            value={participantSearch}
                            onChange={(e) => setParticipantSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {filteredParticipants.length > 0 ? (
                      <div className="space-y-3">
                        {filteredParticipants.map((participant, index) => (
                          <div key={participant.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            {isOrganizer() && (
                              <input
                                type="checkbox"
                                checked={selectedParticipants.includes(participant.id)}
                                disabled={['ACCEPTED', 'CONFIRMED', 'REJECTED', 'CANCELLED'].includes(participant.status)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedParticipants([...selectedParticipants, participant.id]);
                                  } else {
                                    setSelectedParticipants(selectedParticipants.filter(id => id !== participant.id));
                                  }
                                }}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              />
                            )}

                            <div className="flex items-center gap-3 flex-1">
                              <div className="relative">
                                {participant.type === 'team' ? (
                                  // Team display
                                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600" />
                                  </div>
                                ) : (
                                  // Individual player display
                                  participant.user.profile_picture ? (
                                    <img
                                      src={getAvatarUrl(participant.user.profile_picture)!}
                                      alt={participant.user.full_name}
                                      className="h-12 w-12 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                      <span className="text-lg font-medium text-purple-600">
                                        {participant.user.full_name.charAt(0)}
                                      </span>
                                    </div>
                                  )
                                )}
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-gray-200">
                                  <span className="text-xs font-bold text-gray-600">#{index + 1}</span>
                                </div>
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {participant.type === 'team' ? (
                                    <>
                                      <p className="font-medium text-gray-900">{participant.team.name}</p>
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        {participant.selected_player_count} players
                                      </span>
                                    </>
                                  ) : (
                                    <p className="font-medium text-gray-900">{participant.user.full_name}</p>
                                  )}
                                  {participant.status && (
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      participant.status === 'ACCEPTED' || participant.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                      participant.status === 'PENDING' || participant.status === 'PENDING_PAYMENT' ? 'bg-yellow-100 text-yellow-800' :
                                      participant.status === 'REJECTED' || participant.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {participant.status === 'CONFIRMED' ? 'ACCEPTED' : participant.status}
                                    </span>
                                  )}
                                </div>
                                {participant.type === 'team' ? (
                                  <div className="text-sm text-gray-500">
                                    <p>Registered by {participant.registered_by.full_name}</p>
                                    {participant.registration_date && (
                                      <p>on {new Date(participant.registration_date).toLocaleDateString()}</p>
                                    )}
                                  </div>
                                ) : (
                                  participant.registration_date && (
                                    <p className="text-sm text-gray-500">
                                      Registered {new Date(participant.registration_date).toLocaleDateString()}
                                    </p>
                                  )
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {participant.type === 'team' && (
                                <button
                                  onClick={() => {
                                    setTeamPlayersDialog({
                                      open: true,
                                      teamName: participant.team.name,
                                      players: participant.selected_players,
                                    });
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                  <Users className="h-4 w-4" />
                                  View Players
                                </button>
                              )}

                              {participant.type === 'individual' && user?.role === 'PLAYER' && participant.user.id !== user.id && (
                                <button
                                  onClick={() => navigate('/chats', { state: { startChatWith: participant.user.id } })}
                                  className="flex items-center gap-2 px-3 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  Message
                                </button>
                              )}

                              {isOrganizer() && participant.status === 'PENDING' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={async () => {
                                      try {
                                        if (participant.type === 'team') {
                                          // Use team-specific endpoint
                                          await tournamentService.acceptTeamParticipant(tournamentId!, participant.id);
                                        } else {
                                          // Use individual participant endpoint
                                          await tournamentService.acceptParticipant(tournamentId!, participant.id);
                                        }
                                        toastService.success('Participant accepted successfully!');
                                        await loadTournament();
                                      } catch (err: any) {
                                        toastService.error(err.message || 'Failed to accept participant');
                                      }
                                    }}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Accept participant"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      showConfirm({
                                        open: true, title: 'Reject participant', variant: 'danger',
                                        message: `Reject ${participant.type === 'team' ? participant.team.name : participant.user.full_name}?`,
                                        confirmLabel: 'Reject',
                                        inputLabel: 'Reason (optional)',
                                        inputPlaceholder: 'e.g. Incomplete registration...',
                                        onConfirm: async (reason) => {
                                          setDialog(null);
                                          try {
                                            if (participant.type === 'team') {
                                              await tournamentService.rejectTeamParticipant(tournamentId!, participant.id, reason || undefined);
                                            } else {
                                              await tournamentService.rejectParticipant(tournamentId!, participant.id, reason || undefined);
                                            }
                                            toastService.success('Participant rejected successfully!');
                                            await loadTournament();
                                          } catch (err: any) {
                                            toastService.error(err.message || 'Failed to reject participant');
                                          }
                                        },
                                      });
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Reject participant"
                                  >
                                    <UserX className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : participants && participants.length > 0 ? (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">No participants match your search</p>
                        <button
                          onClick={() => setParticipantSearch('')}
                          className="mt-2 text-purple-600 hover:text-purple-700"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">No participants registered yet</p>
                        {isOrganizer() && (
                          <p className="text-sm text-gray-500 mt-2">
                            Share your tournament link to get participants
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bracket Tab */}
                {activeTab === 'bracket' && tournament.tournament_type !== 'league' && (
                  <BracketVisualization
                    tournament={tournament}
                    onMatchUpdate={loadTournament}
                    isOrganizer={isOrganizer()}
                  />
                )}

                {/* Schedule Tab - for league tournaments */}
                {activeTab === 'schedule' && tournament.tournament_type === 'league' && (
                  <div className="space-y-6">
                    {/* Success Message */}
                    {successMessage && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-600" />
                        <p className="text-green-800 font-medium">{successMessage}</p>
                      </div>
                    )}

                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-red-800 font-medium">{error}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">League Schedule</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {matches.length > 0
                            ? `${matches.length} matches scheduled`
                            : 'No schedule generated yet'
                          }
                        </p>
                      </div>
                      {isOrganizer() && matches.length === 0 && (
                        <button
                          onClick={handleGenerateSchedule}
                          disabled={scheduleLoading || tournament.registered_count < 2}
                          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {scheduleLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <Calendar className="w-4 h-4" />
                              Generate Schedule
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {scheduleLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                      </div>
                    ) : matches.length > 0 ? (
                      <LeagueScheduleTable
                        matches={matches.map((match: any) => ({
                          id: match.id,
                          round_number: match.round_number || 1,
                          home_team: match.home_team || match.team1,
                          away_team: match.away_team || match.team2,
                          home_score: match.home_score || match.team1_score,
                          away_score: match.away_score || match.team2_score,
                          scheduled_time: match.scheduled_time,
                          venue: match.venue || tournament.venue || 'TBD',
                          match_venue: match.match_venue,
                          match_venue_name: match.match_venue_name,
                          match_venue_display: match.match_venue_display,
                          status: match.status || 'SCHEDULED'
                        }))}
                        tournamentId={tournamentId}
                        isTeamTournament={tournament.participation_type === 'TEAM'}
                        editable={isOrganizer()}
                        onEditMatch={isOrganizer() ? handleEditMatch : undefined}
                        onEnterScore={isOrganizer() ? (matchId) => navigate(`/match-scoring?tournamentId=${tournamentId}&matchId=${matchId}`) : undefined}
                        onAssignVenue={isOrganizer() ? handleAssignVenue : undefined}
                        tournamentStartDate={tournament?.date}
                      />
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schedule Generated</h3>
                        <p className="text-gray-600">
                          {isOrganizer()
                            ? 'Generate a schedule to see matches here'
                            : 'The organizer hasn\'t generated the schedule yet'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Standings Tab */}
                {activeTab === 'standings' && tournament.tournament_type === 'league' && (
                  <div className="space-y-6">
                    <LeagueStandingsTable standings={standings} />
                    <TopScorersTable scorers={topScorers} />
                    <TopAssistsTable assists={topAssists} />
                  </div>
                )}

                {/* Rules Tab */}
                {activeTab === 'rules' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Rules</h3>
                    {tournament.rules ? (
                      <div className="prose prose-gray max-w-none">
                        <pre className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                          {tournament.rules}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600">No specific rules have been set for this tournament</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Referees Tab */}
                {activeTab === 'referees' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Referee Assignments</h3>
                      {isOrganizer() && tournament.status !== 'COMPLETED' && tournament.status !== 'CANCELLED' && (
                        <button
                          onClick={handleAddReferee}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add Referee
                        </button>
                      )}
                    </div>

                    {refereesLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                      </div>
                    ) : referees && referees.length === 0 ? (
                      <div className="text-center py-16 bg-gray-50 rounded-lg">
                        <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">No referees assigned</h4>
                        <p className="text-gray-600 mb-6">
                          {isOrganizer()
                            ? 'Add referees to manage your tournament matches professionally'
                            : 'No referees have been assigned to this tournament yet'}
                        </p>
                        {isOrganizer() && tournament.status !== 'COMPLETED' && tournament.status !== 'CANCELLED' && (
                          <button
                            onClick={handleAddReferee}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <UserPlus className="w-5 h-5" />
                            Add First Referee
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Array.isArray(referees) && referees.map((referee) => {
                          if (!referee || !referee.id) return null;

                          return (
                            <div key={referee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                  <UserCheck className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {referee.referee?.full_name || 'Unknown Referee'}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {referee.referee?.email || 'No email'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Match Date: {referee.match_date
                                      ? new Date(referee.match_date).toLocaleDateString()
                                      : 'TBD'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">NPR {referee.fee || 0}</p>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${referee.status === 'accepted'
                                    ? 'bg-green-100 text-green-700'
                                    : referee.status === 'requested'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                    }`}>
                                    {referee.status || 'pending'}
                                  </span>
                                </div>
                                {isOrganizer() && (
                                  <>
                                    <ChatButton
                                      targetUserId={referee.referee?.id || ''}
                                      targetUserName={referee.referee?.full_name || 'Referee'}
                                      buttonText="Message"
                                      variant="icon"
                                      context="referee"
                                    />
                                    <button
                                      onClick={() => handleRemoveReferee(referee.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      disabled={refereesLoading}
                                      title="Remove referee"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Format</span>
                  <span className={`font-medium px-2 py-1 rounded-full text-xs ${tournament.tournament_type === 'league'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-purple-100 text-purple-700'
                    }`}>
                    {tournament.tournament_type === 'league' ? 'League' : 'Knockout'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Participants</span>
                  <span className="font-medium">{tournament.registered_count}/{tournament.max_participants}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Registration</span>
                  <span className={`font-medium ${tournament.is_registration_open ? 'text-green-600' : 'text-red-600'}`}>
                    {tournament.is_registration_open ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Deadline</span>
                  <span className="font-medium text-sm">
                    {new Date(tournament.registration_deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Organizer Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Organizer</h3>
              <div className="flex items-center gap-3">
                {tournament.organizer.profile_picture ? (
                  <img
                    src={getAvatarUrl(tournament.organizer.profile_picture)!}
                    alt={tournament.organizer.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-lg font-medium text-purple-600">
                      {tournament.organizer.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{tournament.organizer.name}</p>
                  <p className="text-sm text-gray-600">Tournament Organizer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Share Tournament</h3>
            <p className="text-gray-500 text-sm mb-4">Anyone with this link can view the tournament — no account needed.</p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={tournament?.share_token ? `${window.location.origin}/t/${tournament.share_token}` : window.location.href}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={() => {
                  const shareUrl = tournament?.share_token
                    ? `${window.location.origin}/t/${tournament.share_token}`
                    : window.location.href;
                  navigator.clipboard.writeText(shareUrl);
                  toastService.success('Link copied!');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                Copy
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleShareTournament}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentId && tournament && (
        <PaymentModal
          isOpen={showPaymentModal}
          paymentId={paymentId}
          paymentUrl={paymentUrl || undefined}
          amount={typeof tournament.entry_fee === 'string' ? parseFloat(tournament.entry_fee) : tournament.entry_fee}
          productName={tournament.title || 'Tournament Registration'}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onClose={handlePaymentClose}
        />
      )}

      {/* Venue Assignment Modal */}
      {venueModalMatchId && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              Assign Venue for Match
            </h3>

            {loadingVenues ? (
              <div className="text-sm text-gray-500 py-4 text-center">Loading venues...</div>
            ) : availableVenues.length > 0 ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select a venue</label>
                <select
                  value={selectedVenueId}
                  onChange={(e) => {
                    setSelectedVenueId(e.target.value);
                    setVenueInput('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-3"
                >
                  <option value="">— Choose a venue —</option>
                  {availableVenues.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.location} (NPR {v.price_per_hour}/hr)
                    </option>
                  ))}
                </select>

                {/* Date/time fields shown only when a linked venue is selected */}
                {selectedVenueId && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-blue-800">Booking details (required for payment)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-600 mb-1">Date</label>
                        <input type="date" value={venueBookingDate}
                          onChange={(e) => setVenueBookingDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start</label>
                        <input type="time" value={venueBookingStartTime}
                          onChange={(e) => setVenueBookingStartTime(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">End</label>
                        <input type="time" value={venueBookingEndTime}
                          onChange={(e) => setVenueBookingEndTime(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none" />
                      </div>
                    </div>
                    {venueBookingDate && venueBookingStartTime && venueBookingEndTime && (() => {
                      const venue = availableVenues.find((v: any) => v.id === selectedVenueId);
                      if (!venue) return null;
                      const hrs = (new Date(`2000-01-01T${venueBookingEndTime}`).getTime() - new Date(`2000-01-01T${venueBookingStartTime}`).getTime()) / 3600000;
                      const cost = hrs > 0 ? (hrs * venue.price_per_hour).toFixed(2) : null;
                      return cost ? <p className="text-xs text-blue-700 font-medium">Estimated cost: NPR {cost}</p> : null;
                    })()}
                  </div>
                )}

                <p className="text-xs text-gray-500 mb-3 text-center">or enter a custom venue name below (no payment)</p>
              </>
            ) : (
              <p className="text-sm text-gray-500 mb-3">No approved venues found. Enter a custom name.</p>
            )}

            <input
              type="text"
              value={venueInput}
              onChange={(e) => {
                setVenueInput(e.target.value);
                setSelectedVenueId('');
              }}
              placeholder="e.g. Futsal Arena, Court 2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-4"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setVenueModalMatchId(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVenue}
                disabled={savingVenue || (!selectedVenueId && !venueInput.trim())}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
              >
                {savingVenue ? 'Processing...' : selectedVenueId ? 'Book & Pay' : 'Save Venue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Venue Booking Payment Modal */}
      {showVenueBookingPayment && venueBookingPaymentData && (
        <PaymentModal
          isOpen={showVenueBookingPayment}
          onClose={() => { setShowVenueBookingPayment(false); setVenueBookingPaymentData(null); }}
          amount={venueBookingPaymentData.amount}
          productName={`Venue Booking - ${venueBookingPaymentData.venueName}`}
          paymentId={venueBookingPaymentData.paymentId}
          paymentUrl={venueBookingPaymentData.paymentUrl}
          onSuccess={handleVenueBookingPaymentSuccess}
          onError={() => { setShowVenueBookingPayment(false); toastService.error('Payment failed'); }}
        />
      )}

      <BottomNavigation />

      {/* Custom dialogs — replaces all native alert/confirm/prompt */}
      {dialog && (
        <ConfirmDialog
          open={dialog.open}
          title={dialog.title}
          message={dialog.message}
          variant={dialog.variant}
          confirmLabel={dialog.confirmLabel}
          inputLabel={dialog.inputLabel}
          inputPlaceholder={dialog.inputPlaceholder}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
      {teamPlayersDialog && (
        <TeamPlayersDialog
          open={teamPlayersDialog.open}
          teamName={teamPlayersDialog.teamName}
          players={teamPlayersDialog.players}
          onClose={() => setTeamPlayersDialog(null)}
        />
      )}
    </div>
  );
}