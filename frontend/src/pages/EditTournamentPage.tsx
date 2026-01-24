import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, Trophy, AlertCircle, CheckCircle, 
  Users, Upload, X, ArrowLeft, Save 
} from 'lucide-react';
import { Button } from '../design-system/components/Button/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/components/Card/Card';
import { tournamentService } from '../services/tournamentService';
import { venueService } from '../services/venueService';
import type { Tournament } from '../types/tournament.types';
import type { Venue } from '../types/venue.types';
import LoadingSkeleton from '../components/LoadingSkeleton';

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
    sport_type: 'TENNIS',
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
            sport_type: tournament.sport_type || 'TENNIS',
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

          // Set existing image preview if available
          if (tournament.tournament_image) {
            const imageUrl = tournament.tournament_image.startsWith('http') 
              ? tournament.tournament_image 
              : `${import.meta.env.VITE_API_URL}${tournament.tournament_image}`;
            setImagePreview(imageUrl);
          }
        }

        // Load venues
        const venuesResponse = await venueService.getVenues({});
        if (venuesResponse?.venues) {
          setVenues(venuesResponse.venues);
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
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Tournament</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate('/tournaments')} variant="primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tournaments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/tournaments/${tournamentId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tournament
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-competitive-100 rounded-xl">
              <Trophy className="w-8 h-8 text-competitive-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Tournament</h1>
              <p className="text-gray-600">Update your tournament details and settings</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <Card className="mb-6 border-success-200 bg-success-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success-600" />
                <div>
                  <p className="font-medium text-success-800">Tournament Updated Successfully!</p>
                  <p className="text-sm text-success-600">Redirecting to tournament details...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-error-200 bg-error-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-error-600" />
                <div>
                  <p className="font-medium text-error-800">Error</p>
                  <p className="text-sm text-error-600">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-competitive-600" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tournament Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Title *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                  placeholder="Enter tournament title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                  placeholder="Describe your tournament..."
                  required
                />
              </div>

              {/* Sport Type and Format */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sport Type *
                  </label>
                  <select
                    value={formData.sport_type || 'TENNIS'}
                    onChange={(e) => handleInputChange('sport_type', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                    required
                  >
                    <option value="TENNIS">Tennis</option>
                    <option value="BADMINTON">Badminton</option>
                    <option value="FUTSAL">Futsal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tournament Format *
                  </label>
                  <select
                    value={formData.tournament_format || 'SINGLE_ELIMINATION'}
                    onChange={(e) => handleInputChange('tournament_format', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                    required
                  >
                    <option value="SINGLE_ELIMINATION">Single Elimination</option>
                    <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                    <option value="ROUND_ROBIN">Round Robin</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Venue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Schedule & Venue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tournament Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={formData.time || ''}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                    required
                  />
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue *
                </label>
                <select
                  value={formData.venue || ''}
                  onChange={(e) => handleInputChange('venue', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                  required
                >
                  <option value="">Select a venue</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.name}>
                      {venue.name} - {venue.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Registration Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Deadline *
                </label>
                <input
                  type="date"
                  value={formData.registration_deadline || ''}
                  onChange={(e) => handleInputChange('registration_deadline', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Tournament Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Tournament Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Participants and Skill Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Participants *
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="128"
                    value={formData.max_participants || 16}
                    onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                    placeholder="Enter number of participants"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 4, Maximum 128 participants</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skill Level *
                  </label>
                  <select
                    value={formData.skill_level || 'INTERMEDIATE'}
                    onChange={(e) => handleInputChange('skill_level', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
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
                    Entry Fee ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.entry_fee || '0'}
                    onChange={(e) => handleInputChange('entry_fee', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prize Pool ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.prize_pool || ''}
                    onChange={(e) => handleInputChange('prize_pool', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                    placeholder="Optional"
                  />
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                  placeholder="Enter tournament rules and regulations..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Tournament Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-600" />
                Tournament Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Upload tournament image</p>
                    <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-competitive-500 focus:border-competitive-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 -mx-4 sm:-mx-6 lg:-mx-8">
            <div className="flex justify-end gap-4 max-w-4xl mx-auto">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/tournaments/${tournamentId}`)}
                disabled={saving}
                className="px-6 py-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                disabled={saving}
                className="min-w-[150px] px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Updating...' : 'Update Tournament'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}