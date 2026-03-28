import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Trophy, AlertCircle, CheckCircle, Users, Upload, X, Building2 } from 'lucide-react';
import { tournamentService } from '@/services/tournamentService';
import { venueService } from '@/services/venueService';
import type { Venue } from '@/types/venue.types';
import BottomNavigation from '@/components/BottomNavigation';
import toastService from '@/services/toastService';
import TimePicker from '@/components/TimePicker';
import TournamentTypeSelector from '@/components/TournamentTypeSelector';
import LeagueOptionsForm, { type LeagueOptions } from '@/components/LeagueOptionsForm';
import { VenueCostPreview } from '@/components/VenueCostPreview';
import PaymentModal from '@/components/PaymentModal';

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [useCustomVenue, setUseCustomVenue] = useState(false);
  
  // Payment flow states
  const [showVenuePaymentModal, setShowVenuePaymentModal] = useState(false);
  const [venuePaymentData, setVenuePaymentData] = useState<any>(null);
  const [createdTournament, setCreatedTournament] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sport_type: '',
    tournament_type: 'knockout' as 'knockout' | 'league', // Updated to support both types
    registration_type: 'INDIVIDUAL', // New field
    team_size: '5', // New field for team tournaments
    allow_substitutes: false, // New field
    max_substitutes: '3', // New field
    date: '',
    start_time: '',
    end_time: '',
    venue: '',
    venue_address: '',
    linked_venue_id: '', // New field for selected venue
    entry_fee: '',
    max_participants: '16',
    min_participants: '4',
    registration_deadline: '',
    prize_pool: '',
    rules: '',
  });

  // League-specific options
  const [leagueOptions, setLeagueOptions] = useState<LeagueOptions>({
    roundRobinType: 'single',
    startDate: undefined,
  });

  const [tournamentImage, setTournamentImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const sportTypes = [
    'FUTSAL',
    'BADMINTON',
  ];

  const registrationTypes = [
    { value: 'INDIVIDUAL', label: 'Individual Players' },
    { value: 'TEAM', label: 'Team Registration' },
  ];

  // Helper functions for dynamic labels and defaults
  const getParticipantLabel = () => {
    if (formData.registration_type === 'TEAM') {
      return formData.sport_type === 'FUTSAL' ? 'Teams' : 'Teams';
    }
    return 'Participants';
  };

  const getTeamSizeForSport = (sportType: string) => {
    switch (sportType) {
      case 'FUTSAL':
        return '5';
      case 'BADMINTON':
        return '2'; // For doubles
      default:
        return '1';
    }
  };

  const getMaxSubstitutesForSport = (sportType: string) => {
    switch (sportType) {
      case 'FUTSAL':
        return '3';
      case 'BADMINTON':
        return '0'; // No substitutes in badminton
      default:
        return '0';
    }
  };

  const getTeamSizeOptions = (sportType: string) => {
    switch (sportType) {
      case 'FUTSAL':
        return { min: 5, max: 11, label: 'Players per team (5 for standard futsal)' };
      case 'BADMINTON':
        return { min: 1, max: 2, label: 'Players per team (1 for singles, 2 for doubles)' };
      default:
        return { min: 1, max: 11, label: 'Players per team' };
    }
  };

  // Update team size and substitutes when sport type changes
  useEffect(() => {
    if (formData.sport_type) {
      // Automatically set registration type based on sport
      let newRegistrationType = formData.registration_type;
      if (formData.sport_type === 'FUTSAL') {
        newRegistrationType = 'TEAM'; // Futsal is always team-based
      }

      if (newRegistrationType === 'TEAM') {
        const newTeamSize = getTeamSizeForSport(formData.sport_type);
        const newMaxSubstitutes = getMaxSubstitutesForSport(formData.sport_type);
        const allowSubs = formData.sport_type === 'FUTSAL';

        setFormData(prev => ({
          ...prev,
          registration_type: newRegistrationType,
          team_size: newTeamSize,
          max_substitutes: newMaxSubstitutes,
          allow_substitutes: allowSubs
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          registration_type: newRegistrationType
        }));
      }
    }
  }, [formData.sport_type]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[CreateTournament] Image selected:', file.name, file.size, file.type);
      setTournamentImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setTournamentImage(null);
    setImagePreview(null);
  };

  // Load available venues when date, time, or sport changes
  useEffect(() => {
    const loadAvailableVenues = async () => {
      console.log('Loading venues with params:', {
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        sport_type: formData.sport_type,
        useCustomVenue,
        dateCheck: !!formData.date,
        startTimeCheck: !!formData.start_time,
        customVenueCheck: !useCustomVenue
      });

      if (formData.date && formData.start_time && formData.sport_type && !useCustomVenue) {
        setLoadingVenues(true);
        try {
          // Use end_time if set, otherwise default to 1 hour after start_time
          let endTime = formData.end_time;
          if (!endTime && formData.start_time) {
            const [h, m] = formData.start_time.split(':').map(Number);
            const endDate = new Date(0, 0, 0, h + 1, m);
            endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
          }
          const response = await venueService.getAvailableVenuesForTournament({
            date: formData.date,
            start_time: formData.start_time,
            end_time: endTime!,
            sport_type: formData.sport_type
          });
          console.log('Venues loaded:', response);
          setAvailableVenues(response.venues);
          // Clear stale venue selection if it's no longer in the available list
          if (formData.linked_venue_id) {
            const stillAvailable = response.venues.some((v: any) => v.id === formData.linked_venue_id);
            if (!stillAvailable) {
              setFormData(prev => ({ ...prev, linked_venue_id: '', venue: '', venue_address: '' }));
            }
          }
        } catch (error) {
          console.error('Error loading available venues:', error);
          setAvailableVenues([]);
        } finally {
          setLoadingVenues(false);
        }
      } else {
        console.log('Not loading venues - missing required fields or using custom venue');
        console.log('Detailed checks:', {
          'formData.date exists': !!formData.date,
          'formData.date value': formData.date,
          'formData.start_time exists': !!formData.start_time,
          'formData.start_time value': formData.start_time,
          'useCustomVenue': useCustomVenue,
          'condition result': !!(formData.date && formData.start_time && !useCustomVenue)
        });
        setAvailableVenues([]);
      }
    };

    loadAvailableVenues();
  }, [formData.date, formData.start_time, formData.end_time, formData.sport_type, useCustomVenue]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate venue selection (not required for league tournaments - venues are per-match)
      if (formData.tournament_type === 'league') {
        // League tournaments don't need a venue at creation — set a placeholder if empty
        if (!formData.venue.trim()) {
          formData.venue = 'TBD - Assigned per match';
        }
      } else if (!useCustomVenue) {
        if (!formData.linked_venue_id) {
          throw new Error('Please select a venue from the available options, or use a custom venue');
        }
        // Confirm the selected venue is still in the available list (client-side guard)
        const venueStillAvailable = availableVenues.some(v => v.id === formData.linked_venue_id);
        if (!venueStillAvailable) {
          throw new Error('The selected venue is no longer available. Please choose another venue');
        }
      } else {
        if (!formData.venue.trim()) {
          throw new Error('Please enter a venue name');
        }
      }

      // Validate tournament type
      if (!formData.tournament_type || (formData.tournament_type !== 'knockout' && formData.tournament_type !== 'league')) {
        throw new Error('Please select a valid tournament type (Knockout or League)');
      }

      // Validate league-specific requirements
      if (formData.tournament_type === 'league') {
        if (!leagueOptions.roundRobinType) {
          throw new Error('Please select a round-robin format for league tournaments');
        }
        if (leagueOptions.roundRobinType !== 'single' && leagueOptions.roundRobinType !== 'double') {
          throw new Error('Invalid round-robin format selected');
        }
      }

      // Validate scores are non-negative
      if (parseFloat(formData.entry_fee) < 0) {
        throw new Error('Entry fee cannot be negative');
      }
      if (formData.prize_pool && parseFloat(formData.prize_pool) < 0) {
        throw new Error('Prize pool cannot be negative');
      }

      // Validate participant counts
      const maxParticipants = parseInt(formData.max_participants);
      const minParticipants = parseInt(formData.min_participants);

      if (minParticipants < 2) {
        throw new Error('Minimum participants must be at least 2');
      }
      if (maxParticipants < minParticipants) {
        throw new Error('Maximum participants must be greater than or equal to minimum participants');
      }

      // Validate time
      if (formData.start_time && formData.end_time) {
        if (formData.start_time >= formData.end_time) {
          throw new Error('End time must be after start time');
        }
      }

      // Prepare registration deadline (24 hours before tournament by default)
      const tournamentDateTime = new Date(`${formData.date}T${formData.start_time}`);
      const defaultDeadline = new Date(tournamentDateTime.getTime() - 24 * 60 * 60 * 1000);

      const tournamentData = {
        title: formData.title,
        description: formData.description,
        sport_type: formData.sport_type,
        tournament_type: formData.tournament_type, // Now supports 'knockout' or 'league'
        registration_type: formData.registration_type,
        team_size: formData.registration_type === 'TEAM' ? parseInt(formData.team_size) : undefined,
        allow_substitutes: formData.registration_type === 'TEAM' ? formData.allow_substitutes : undefined,
        max_substitutes: formData.registration_type === 'TEAM' && formData.allow_substitutes ? parseInt(formData.max_substitutes) : undefined,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time || undefined,
        venue: formData.venue,
        venue_address: formData.venue_address,
        linked_venue_id: formData.linked_venue_id || undefined, // Include selected venue
        entry_fee: parseFloat(formData.entry_fee),
        max_participants: maxParticipants,
        min_participants: minParticipants,
        registration_deadline: formData.registration_deadline || defaultDeadline.toISOString(),
        prize_pool: formData.prize_pool ? parseFloat(formData.prize_pool) : undefined,
        rules: formData.rules,
        tournament_image: tournamentImage || undefined,
        // League-specific options
        ...(formData.tournament_type === 'league' && {
          round_robin_type: leagueOptions.roundRobinType,
          league_start_date: leagueOptions.startDate || formData.date,
        }),
      };

      console.log('Submitting tournament data:', tournamentData);

      const result = await tournamentService.createTournament(tournamentData);

      console.log('Tournament created:', result);
      
      // Check if venue payment is required
      if (result.requires_venue_payment && result.venue_payment) {
        setCreatedTournament(result);
        setVenuePaymentData({
          tournamentId: result.id,
          paymentId: result.venue_payment.payment_id,
          paymentUrl: result.venue_payment.payment_url,
          pidx: result.venue_payment.pidx,
          amount: parseFloat(result.venue_payment.amount),
          venueBookingId: result.venue_payment.venue_booking_id
        });
        setShowVenuePaymentModal(true);
        
        toastService.info('Please complete venue payment to activate your tournament');
      } else {
        // No payment required (custom venue)
        toastService.success('Tournament created successfully!');
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error creating tournament:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create tournament. Please try again.';
      setError(errorMessage);
      toastService.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVenuePaymentSuccess = async () => {
    try {
      setShowVenuePaymentModal(false);
      
      // Verify payment with backend
      await tournamentService.verifyTournamentVenuePayment(
        venuePaymentData.tournamentId,
        { pidx: venuePaymentData.pidx }
      );
      
      toastService.success('Venue payment successful! Your tournament is now active.');
      setSuccess(true);
      
      setTimeout(() => {
        navigate(`/tournaments/${createdTournament.id}`);
      }, 2000);
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toastService.error('Payment verification failed. Please contact support.');
    }
  };

  const handleVenuePaymentError = (error: any) => {
    console.error('Payment error:', error);
    toastService.error('Payment failed. Your tournament has been created but venue is not confirmed.');
    setShowVenuePaymentModal(false);
  };

  const handleVenuePaymentClose = () => {
    setShowVenuePaymentModal(false);
    toastService.warning('Payment cancelled. Your tournament has been created but venue is not confirmed.');
    navigate('/dashboard');
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tournament Created!</h2>
            <p className="text-gray-600 mb-6">
              Your tournament has been successfully created. Players can now register for it.
            </p>
            <p className="text-sm text-gray-500 mb-8">Redirecting to dashboard...</p>
          </div>
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
            <div className="flex items-center space-x-3">
              <img
                src="/images/Logo.jpg"
                alt="ArenaX Logo"
                className="h-10 w-10 object-contain rounded-lg"
              />
              <span className="text-2xl font-bold text-gray-900">ArenaX</span>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-12">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Trophy className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Tournament</h1>
                <p className="text-gray-600 mt-1">Set up a new tournament for players to join</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tournament Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Tournament Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter tournament title"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                required
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your tournament..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                disabled={isLoading}
              />
            </div>

            {/* Tournament Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tournament Image
              </label>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Tournament preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="tournament_image" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload tournament image
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </span>
                    </label>
                    <input
                      id="tournament_image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sport Type and Registration Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="sport_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Sport Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Trophy className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    id="sport_type"
                    value={formData.sport_type}
                    onChange={(e) => setFormData({ ...formData, sport_type: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                    required
                    disabled={isLoading}
                  >
                    <option value="">Select a sport</option>
                    {sportTypes.map((sport) => (
                      <option key={sport} value={sport}>
                        {sport}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="registration_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Type <span className="text-red-500">*</span>
                  {formData.sport_type === 'FUTSAL' && (
                    <span className="text-sm text-blue-600 font-normal ml-2">(Futsal is always team-based)</span>
                  )}
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    id="registration_type"
                    value={formData.registration_type}
                    onChange={(e) => setFormData({ ...formData, registration_type: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white ${formData.sport_type === 'FUTSAL' ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    required
                    disabled={isLoading || formData.sport_type === 'FUTSAL'}
                  >
                    {registrationTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tournament Type Selection */}
            <TournamentTypeSelector
              value={formData.tournament_type}
              onChange={(type) => setFormData({ ...formData, tournament_type: type })}
              disabled={isLoading}
            />

            {/* League Options - Show only when league type is selected */}
            {formData.tournament_type === 'league' && (
              <LeagueOptionsForm
                options={leagueOptions}
                onChange={setLeagueOptions}
                disabled={isLoading}
              />
            )}

            {/* Team-specific settings */}
            {formData.registration_type === 'TEAM' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Team Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="team_size" className="block text-sm font-medium text-gray-700 mb-2">
                      Team Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="team_size"
                      value={formData.team_size}
                      onChange={(e) => setFormData({ ...formData, team_size: e.target.value })}
                      min="1"
                      max="11"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      required={formData.registration_type === 'TEAM'}
                      disabled={isLoading}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.sport_type === 'FUTSAL' && 'Players on field (typically 5)'}
                      {formData.sport_type === 'BADMINTON' && 'Players per team (1 for singles, 2 for doubles)'}
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        checked={formData.allow_substitutes}
                        onChange={(e) => setFormData({ ...formData, allow_substitutes: e.target.checked })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        disabled={isLoading || formData.sport_type === 'BADMINTON'}
                      />
                      <span className="text-sm font-medium text-gray-700">Allow Substitutes</span>
                    </label>
                    {formData.sport_type === 'BADMINTON' && (
                      <p className="text-sm text-gray-500">Substitutes not allowed in badminton</p>
                    )}
                  </div>

                  {formData.allow_substitutes && (
                    <div>
                      <label htmlFor="max_substitutes" className="block text-sm font-medium text-gray-700 mb-2">
                        Max Substitutes
                      </label>
                      <input
                        type="number"
                        id="max_substitutes"
                        value={formData.max_substitutes}
                        onChange={(e) => setFormData({ ...formData, max_substitutes: e.target.value })}
                        min="0"
                        max="7"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    id="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <TimePicker
                  value={formData.start_time}
                  onChange={(value) => {
                    console.log('Start time changed:', value);
                    let newEndTime = formData.end_time;

                    // If end_time is empty, default to 1 hour after start_time
                    if (!newEndTime && value) {
                      const [hours, minutes] = value.split(':').map(Number);
                      const date = new Date();
                      date.setHours(hours + 1, minutes, 0, 0);
                      newEndTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    }

                    setFormData({ ...formData, start_time: value, end_time: newEndTime });
                  }}
                  placeholder="Select start time"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time (Optional)
                </label>
                <TimePicker
                  value={formData.end_time}
                  onChange={(value) => {
                    console.log('End time changed:', value);
                    setFormData({ ...formData, end_time: value });
                  }}
                  placeholder="Select end time"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Venue Information */}
            {formData.tournament_type === 'league' ? (
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">Venue</h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Venues are assigned per match for league tournaments</p>
                    <p className="text-xs text-blue-700 mt-1">After generating the schedule, you can assign a venue to each individual match from the Schedule tab.</p>
                  </div>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Venue Selection</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useCustomVenue"
                    checked={useCustomVenue}
                    onChange={(e) => {
                      setUseCustomVenue(e.target.checked);
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, linked_venue_id: '' }));
                      } else {
                        setFormData(prev => ({ ...prev, venue: '', venue_address: '' }));
                      }
                    }}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="useCustomVenue" className="text-sm text-gray-600">
                    Use custom venue
                  </label>
                </div>
              </div>

              {!useCustomVenue ? (
                /* Venue Dropdown */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Venue <span className="text-red-500">*</span>
                  </label>
                  {formData.date && formData.start_time && formData.sport_type ? (
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={formData.linked_venue_id}
                        onChange={(e) => {
                          const selectedVenue = availableVenues.find(v => v.id === e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            linked_venue_id: e.target.value,
                            venue: selectedVenue?.name || '',
                            venue_address: selectedVenue?.location || ''
                          }));
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                        required={!useCustomVenue}
                        disabled={isLoading || loadingVenues}
                      >
                        <option value="">
                          {loadingVenues ? 'Loading venues...' : 'Select an available venue'}
                        </option>
                        {availableVenues.map((venue) => (
                          <option key={venue.id} value={venue.id}>
                            {venue.name} - {venue.location} (NPR {venue.price_per_hour}/hr)
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <Building2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Please select sport type, date, and start time to see available venues
                      </p>
                    </div>
                  )}

                  {availableVenues.length === 0 && formData.date && formData.start_time && formData.sport_type && !loadingVenues && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          No venues available for the selected date and time. Consider using a custom venue or changing the schedule.
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Venue Cost Preview */}
                  {formData.linked_venue_id && formData.start_time && formData.end_time && (
                    <div className="mt-4">
                      <VenueCostPreview
                        venueId={formData.linked_venue_id}
                        venueName={formData.venue}
                        startTime={formData.start_time}
                        endTime={formData.end_time}
                        entryFee={formData.entry_fee}
                        maxParticipants={formData.max_participants}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Custom Venue Fields */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                      Venue Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        id="venue"
                        value={formData.venue}
                        onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                        placeholder="Enter venue name"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                        required={useCustomVenue}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="venue_address" className="block text-sm font-medium text-gray-700 mb-2">
                      Venue Address
                    </label>
                    <input
                      type="text"
                      id="venue_address"
                      value={formData.venue_address}
                      onChange={(e) => setFormData({ ...formData, venue_address: e.target.value })}
                      placeholder="Full address"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </div>
            )} {/* end league/knockout venue conditional */}

            {/* Participants and Fees */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-2">
                  Max {getParticipantLabel()}
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="max_participants"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                    min="4"
                    max="128"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="min_participants" className="block text-sm font-medium text-gray-700 mb-2">
                  Min {getParticipantLabel()}
                </label>
                <input
                  type="number"
                  id="min_participants"
                  value={formData.min_participants}
                  onChange={(e) => setFormData({ ...formData, min_participants: e.target.value })}
                  min="2"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="entry_fee" className="block text-sm font-medium text-gray-700 mb-2">
                  Entry Fee (NPR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="entry_fee"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    required
                    disabled={isLoading}
                  />
                </div>
                {formData.registration_type === 'TEAM' && (
                  <p className="mt-1 text-sm text-gray-500">Fee per team</p>
                )}
              </div>

              <div>
                <label htmlFor="prize_pool" className="block text-sm font-medium text-gray-700 mb-2">
                  Prize Pool (NPR)
                </label>
                <input
                  type="number"
                  id="prize_pool"
                  value={formData.prize_pool}
                  onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Rules */}
            <div>
              <label htmlFor="rules" className="block text-sm font-medium text-gray-700 mb-2">
                Tournament Rules
              </label>
              <textarea
                id="rules"
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                placeholder="Enter tournament rules and regulations..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Tournament...' : 'Create Tournament'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <BottomNavigation />
      
      {/* Venue Payment Modal */}
      {showVenuePaymentModal && venuePaymentData && (
        <PaymentModal
          isOpen={showVenuePaymentModal}
          onClose={handleVenuePaymentClose}
          amount={venuePaymentData.amount}
          productName={`Venue Booking - ${formData.venue}`}
          paymentId={venuePaymentData.paymentId}
          paymentUrl={venuePaymentData.paymentUrl}
          onSuccess={handleVenuePaymentSuccess}
          onError={handleVenuePaymentError}
        />
      )}
    </div>
  );
}
