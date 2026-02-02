import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, Trophy, AlertCircle, CheckCircle, 
  Users, Upload, X, ArrowLeft, Save 
} from 'lucide-react';
import { tournamentService } from '../services/tournamentService';
import { venueService } from '../services/venueService';
import type { Tournament } from '../types/tournament.types';
import type { Venue } from '../types/venue.types';
import LoadingSkeleton from '../components/LoadingSkeleton';
import BottomNavigation from '../components/BottomNavigation';

interface EditTournamentFormData {
  title: string;
  description: string;
  sport_type: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  entry_fee: string;
  prize_pool: string;
  registration_deadline: string;
  tournament_format: string;
  skill_level: string;
  rules: string;
}

export default function EditTournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<EditTournamentFormData>({
    title: '',
    description: '',
    sport_type: 'FUTSAL',
    date: '',
    time: '',
    venue: '',
    max_participants: 16,
    entry_fee: '0',
    prize_pool: '',
    registration_deadline: '',
    tournament_format: 'SINGLE_ELIMINATION',
    skill_level: 'INTERMEDIATE',
    rules: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [useCustomVenue, setUseCustomVenue] = useState(false);

  // Load tournament data and venues
  useEffect(() => {
    const loadData = async () => {
      if (!tournamentId) {
        setError('Tournament ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Load tournament details
        const tournamentResponse = await tournamentService.getTournamentDetail(tournamentId);
        if (tournamentResponse?.tournament) {
          const tournament = tournamentResponse.tournament;
          setTournament(tournament);
          
          // Populate form with existing data
          setFormData({
            title: tournament.title || '',
            description: tournament.description || '',
            sport_type: tournament.sport_type || 'FUTSAL',
            date: tournament.date ? tournament.date.split('T')[0] : '',
            time: tournament.start_time || '', // Map start_time to time
            venue: tournament.venue || '',
            max_participants: tournament.max_participants || 16,
            entry_fee: tournament.entry_fee?.toString() || '0',
            prize_pool: tournament.prize_pool?.toString() || '',
            registration_deadline: tournament.registration_deadline ? 
              tournament.registration_deadline.split('T')[0] : '', // Extract date part from datetime
            tournament_format: tournament.tournament_type || 'SINGLE_ELIMINATION',
            skill_level: 'INTERMEDIATE', // Default as this field might not exist in Tournament type
            rules: tournament.rules || '',
          });

          // Check if venue is custom (not in the venues list)
          const venuesResponse = await venueService.getVenues({});
          if (venuesResponse?.venues) {
            setVenues(venuesResponse.venues);
            const isCustomVenue = !venuesResponse.venues.some(v => v.name === tournament.venue);
            setUseCustomVenue(isCustomVenue);
          }

          // Set existing image preview if available
          if (tournament.tournament_image) {
            const imageUrl = tournament.tournament_image.startsWith('http') 
              ? tournament.tournament_image 
              : `${import.meta.env.VITE_API_URL}${tournament.tournament_image}`;
            setImagePreview(imageUrl);
          }
        }
      } catch (err) {
        console.error('Error loading tournament data:', err);
        setError('Failed to load tournament data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tournamentId]);

  const handleInputChange = (field: keyof EditTournamentFormData, value: string | number) => {
    setFormData((prev: EditTournamentFormData) => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const validateForm = (): string | null => {
    if (!formData.title?.trim()) return 'Tournament title is required';
    if (!formData.description?.trim()) return 'Tournament description is required';
    if (!formData.date) return 'Tournament date is required';
    if (!formData.time) return 'Tournament time is required';
    if (!formData.venue?.trim()) return 'Venue is required';
    if (!formData.registration_deadline) return 'Registration deadline is required';
    
    const tournamentDate = new Date(`${formData.date}T${formData.time}`);
    const registrationDeadline = new Date(formData.registration_deadline);
    const now = new Date();
    
    if (tournamentDate <= now) return 'Tournament date must be in the future';
    if (registrationDeadline <= now) return 'Registration deadline must be in the future';
    if (registrationDeadline >= tournamentDate) return 'Registration deadline must be before tournament date';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tournamentId) {
      setError('Tournament ID is required');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare form data for submission
      const submitData = new FormData();
      
      // Add all form fields with proper field name mapping
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          // Map frontend field names to backend field names
          let backendFieldName = key;
          let processedValue = value;
          
          if (key === 'time') {
            backendFieldName = 'start_time';
          } else if (key === 'tournament_format') {
            backendFieldName = 'tournament_type';
          } else if (key === 'registration_deadline') {
            // Convert date to datetime by adding end of day time
            processedValue = `${value}T23:59:59`;
          }
          
          console.log(`Mapping ${key} -> ${backendFieldName}:`, processedValue);
          submitData.append(backendFieldName, processedValue.toString());
        }
      });

      // Add image if selected
      if (imageFile) {
        submitData.append('tournament_image', imageFile);
      }

      // Update tournament
      await tournamentService.updateTournament(tournamentId, submitData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate(`/tournaments/${tournamentId}`);
      }, 2000);
      
    } catch (err: any) {
      console.error('Error updating tournament:', err);
      setError(err.response?.data?.message || 'Failed to update tournament');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSkeleton variant="circle" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600">Loading tournament details...</p>
        </div>
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30">
        <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Tournament</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/my-tournaments')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tournaments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Tournament
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl">
              <Trophy className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Tournament</h1>
              <p className="text-gray-600">Update your tournament details and settings</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800">Tournament Updated Successfully!</p>
                <p className="text-sm text-green-600">Redirecting to tournament details...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            </div>
            
            <div className="space-y-6">
              {/* Tournament Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter tournament title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Describe your tournament..."
                  required
                />
              </div>

              {/* Sport Type and Registration Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sport Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.sport_type || 'FUTSAL'}
                      disabled={true}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed outline-none appearance-none"
                    >
                      <option value="FUTSAL">Futsal</option>
                      <option value="BADMINTON">Badminton</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Sport type cannot be changed after creation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Type
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                    {tournament?.participation_type === 'TEAM' ? 'Team Registration' : 'Individual Players'}
                    {tournament?.sport_type === 'FUTSAL' && (
                      <span className="text-sm text-blue-600 ml-2">(Futsal is always team-based)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tournament Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Format <span className="text-red-500">*</span>
                </label>
                <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                  Single Elimination
                  <span className="text-sm text-gray-500 ml-2">(Only format available)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule & Venue */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Schedule & Venue</h2>
            </div>
            
            <div className="space-y-6">
              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tournament Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.time || ''}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue <span className="text-red-500">*</span>
                </label>
                
                {/* Toggle between dropdown and custom input */}
                <div className="mb-3">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomVenue}
                      onChange={(e) => {
                        setUseCustomVenue(e.target.checked);
                        if (!e.target.checked) {
                          // Reset to first venue when switching back to dropdown
                          handleInputChange('venue', venues[0]?.name || '');
                        } else {
                          // Clear venue when switching to custom
                          handleInputChange('venue', '');
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-700">Use custom venue name</span>
                  </label>
                </div>

                {useCustomVenue ? (
                  <input
                    type="text"
                    value={formData.venue || ''}
                    onChange={(e) => handleInputChange('venue', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter custom venue name"
                    required
                  />
                ) : (
                  <select
                    value={formData.venue || ''}
                    onChange={(e) => handleInputChange('venue', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    required
                  >
                    <option value="">Select a venue</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.name}>
                        {venue.name} - {venue.location}
                      </option>
                    ))}
                  </select>
                )}
                
                {useCustomVenue && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Custom venue will not have booking integration
                  </p>
                )}
              </div>

              {/* Registration Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.registration_deadline || ''}
                  onChange={(e) => handleInputChange('registration_deadline', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5">Must be before the tournament date</p>
              </div>
            </div>
          </div>

          {/* Tournament Settings */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Tournament Settings</h2>
            </div>
            
            <div className="space-y-6">
              {/* Participants and Skill Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Participants <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="128"
                    value={formData.max_participants || 16}
                    onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter number of participants"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1.5">Minimum 4, Maximum 128 participants</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skill Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.skill_level || 'INTERMEDIATE'}
                    onChange={(e) => handleInputChange('skill_level', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    required
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="PROFESSIONAL">Professional</option>
                  </select>
                </div>
              </div>

              {/* Entry Fee and Prize Pool */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entry Fee (NPR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">NPR</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.entry_fee || '0'}
                      onChange={(e) => handleInputChange('entry_fee', e.target.value)}
                      className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prize Pool (NPR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">NPR</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.prize_pool || ''}
                      onChange={(e) => handleInputChange('prize_pool', e.target.value)}
                      className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              {/* Rules */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Rules
                </label>
                <textarea
                  value={formData.rules || ''}
                  onChange={(e) => handleInputChange('rules', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Enter tournament rules and regulations..."
                />
              </div>
            </div>
          </div>

          {/* Tournament Image */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Upload className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Tournament Image</h2>
            </div>
            
            <div className="space-y-4">
              {imagePreview ? (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Tournament preview"
                    className="w-full h-64 object-cover rounded-2xl border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-purple-400 transition-colors">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                    <Upload className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-gray-700 font-medium mb-1">Upload tournament image</p>
                  <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate(`/tournaments/${tournamentId}`)}
              disabled={saving}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Update Tournament
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      <BottomNavigation />
    </div>
  );
}