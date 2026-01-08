import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Trophy, AlertCircle, CheckCircle, Clock, Users, Upload, X, Building2 } from 'lucide-react';
import { tournamentService } from '@/services/tournamentService';
import { venueService, type Venue } from '@/services/venueService';
import BottomNavigation from '@/components/BottomNavigation';
import toastService from '@/services/toastService';

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [useCustomVenue, setUseCustomVenue] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sport_type: '',
    tournament_type: 'SINGLE_ELIMINATION',
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

  const [tournamentImage, setTournamentImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const sportTypes = [
    'Futsal',
    'Badminton',
  ];

  const tournamentTypes = [
    { value: 'SINGLE_ELIMINATION', label: 'Single Elimination' },
    { value: 'DOUBLE_ELIMINATION', label: 'Double Elimination' },
    { value: 'ROUND_ROBIN', label: 'Round Robin' },
    { value: 'SWISS', label: 'Swiss System' },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      if (formData.date && formData.start_time && !useCustomVenue) {
        setLoadingVenues(true);
        try {
          const endTime = formData.end_time || formData.start_time;
          const response = await venueService.getAvailableVenuesForTournament({
            date: formData.date,
            start_time: formData.start_time,
            end_time: endTime,
            sport_type: formData.sport_type || undefined
          });
          setAvailableVenues(response.venues);
        } catch (error) {
          console.error('Error loading available venues:', error);
          setAvailableVenues([]);
        } finally {
          setLoadingVenues(false);
        }
      } else {
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
      // Prepare registration deadline (24 hours before tournament by default)
      const tournamentDateTime = new Date(`${formData.date}T${formData.start_time}`);
      const defaultDeadline = new Date(tournamentDateTime.getTime() - 24 * 60 * 60 * 1000);

      const tournamentData = {
        title: formData.title,
        description: formData.description,
        sport_type: formData.sport_type,
        tournament_type: formData.tournament_type,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time || undefined,
        venue: formData.venue,
        venue_address: formData.venue_address,
        linked_venue_id: formData.linked_venue_id || undefined, // Include selected venue
        entry_fee: parseFloat(formData.entry_fee),
        max_participants: parseInt(formData.max_participants),
        min_participants: parseInt(formData.min_participants),
        registration_deadline: formData.registration_deadline || defaultDeadline.toISOString(),
        prize_pool: formData.prize_pool ? parseFloat(formData.prize_pool) : undefined,
        rules: formData.rules,
        tournament_image: tournamentImage || undefined,
      };

      console.log('Submitting tournament data:', tournamentData);

      const result = await tournamentService.createTournament(tournamentData);

      console.log('Tournament created:', result);
      toastService.success('Tournament created successfully!');
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating tournament:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create tournament. Please try again.';
      setError(errorMessage);
      toastService.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
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

            {/* Sport Type and Tournament Type */}
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
                <label htmlFor="tournament_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Format
                </label>
                <select
                  id="tournament_type"
                  value={formData.tournament_type}
                  onChange={(e) => setFormData({ ...formData, tournament_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                  disabled={isLoading}
                >
                  {tournamentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="time"
                    id="start_time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                  End Time (Optional)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="time"
                    id="end_time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Venue Information */}
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
                  {formData.date && formData.start_time ? (
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
                            {venue.name} - {venue.location} (${venue.price_per_hour}/hr)
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <Building2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Please select date and start time to see available venues
                      </p>
                    </div>
                  )}
                  
                  {availableVenues.length === 0 && formData.date && formData.start_time && !loadingVenues && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          No venues available for the selected date and time. Consider using a custom venue or changing the schedule.
                        </span>
                      </div>
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

            {/* Participants and Fees */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Participants
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
                  Min Participants
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
    </div>
  );
}
