import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Star, Award, Calendar, Clock, 
  DollarSign, CheckCircle, Trophy, Shield, Users, Search, Filter, AlertCircle, XCircle
} from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';
import PaymentModal from '../components/PaymentModal';
import { api } from '../services/api';
import toastService from '../services/toastService';

interface RefereeProfile {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  rating: number;
  specialization: string[];
  certification_level: string;
  years_experience: number;
  matches_officiated: number;
  profile_picture: string | null;
  availability_slot: {
    start_time: string | null;
    end_time: string | null;
    notes: string;
  } | null;
  booking_status: {
    status: 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
    requested_at: string;
    fee: number;
    notes: string;
  } | null;
}

interface Tournament {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string | null;
  sport_type: string;
}

interface RefereeSelectionData {
  tournament: Tournament;
  available_referees: RefereeProfile[];
  count: number;
}

const RefereeSelectionPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<RefereeSelectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReferee, setSelectedReferee] = useState<RefereeProfile | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assignmentFee, setAssignmentFee] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    fetchAvailableReferees();
  }, [tournamentId]);

  const fetchAvailableReferees = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/referees/tournament/${tournamentId}/available/`);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch available referees');
      toastService.error('Failed to load referees');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignReferee = async () => {
    if (!selectedReferee) return;

    const fee = Number.parseFloat(assignmentFee) || 0;

    try {
      setAssigning(true);
      
      const response = await api.post(`/api/referees/tournament/${tournamentId}/assign/`, {
        referee_id: selectedReferee.id,
        notes: assignmentNotes,
        fee: fee
      });

      // Check if payment is required
      if (response.data.payment && fee > 0) {
        setPaymentData(response.data.payment);
        setShowPaymentModal(true);
        return;
      }

      // No payment required
      toastService.success('Referee assignment request sent successfully!');
      navigate(`/tournaments/${tournamentId}`);
    } catch (err: any) {
      toastService.error(err.response?.data?.error || 'Failed to assign referee');
    } finally {
      setAssigning(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    toastService.success('Payment completed! Referee assignment request sent.');
    setTimeout(() => {
      navigate(`/tournaments/${tournamentId}`);
    }, 1500);
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setAssigning(false);
    toastService.info('Payment cancelled');
  };

  const handlePaymentError = (error: any) => {
    setShowPaymentModal(false);
    setAssigning(false);
    toastService.error('Payment failed. Please try again.');
    console.error('Payment error:', error);
  };

  const getCertificationColor = (level: string) => {
    const colors: Record<string, string> = {
      'LEVEL_1': 'bg-gray-100 text-gray-700',
      'LEVEL_2': 'bg-blue-100 text-blue-700',
      'LEVEL_3': 'bg-purple-100 text-purple-700',
      'LEVEL_4': 'bg-orange-100 text-orange-700',
      'INTERNATIONAL': 'bg-red-100 text-red-700'
    };
    return colors[level] || 'bg-gray-100 text-gray-700';
  };

  const getBookingStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      'REQUESTED': { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: AlertCircle, text: 'Request Pending' },
      'ACCEPTED': { color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle, text: 'Accepted' },
      'DECLINED': { color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle, text: 'Declined' },
      'COMPLETED': { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: CheckCircle, text: 'Completed' },
      'CANCELLED': { color: 'bg-gray-100 text-gray-700 border-gray-300', icon: XCircle, text: 'Cancelled' }
    };
    return badges[status] || badges['REQUESTED'];
  };

  const filteredReferees = data?.available_referees.filter(referee => {
    const matchesSearch = referee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         referee.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterLevel === 'all' || referee.certification_level === filterLevel;
    return matchesSearch && matchesFilter;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center border border-gray-200">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Referees</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate(-1)}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/tournaments/${tournamentId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Select Referee</h1>
              <p className="text-sm text-gray-600">Choose the best referee for your tournament</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tournament Info Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{data.tournament.title}</h2>
              <div className="flex items-center gap-2 text-gray-600">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-medium">{data.tournament.sport_type}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <Calendar className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-semibold text-gray-900">{new Date(data.tournament.date).toLocaleDateString('en-US', { 
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                })}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <Clock className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">Time</p>
                <p className="font-semibold text-gray-900">
                  {data.tournament.start_time}
                  {data.tournament.end_time && ` - ${data.tournament.end_time}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <Users className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">Available Referees</p>
                <p className="font-semibold text-gray-900">{data.count} referee{data.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search referees by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none bg-white"
              >
                <option value="all">All Certification Levels</option>
                <option value="LEVEL_1">Level 1 - Beginner</option>
                <option value="LEVEL_2">Level 2 - Intermediate</option>
                <option value="LEVEL_3">Level 3 - Advanced</option>
                <option value="LEVEL_4">Level 4 - Professional</option>
                <option value="INTERNATIONAL">International</option>
              </select>
            </div>
          </div>
        </div>

        {/* Referees Grid */}
        {filteredReferees.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
              <Shield className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Referees Available</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterLevel !== 'all' 
                ? 'No referees match your search criteria. Try adjusting your filters.'
                : 'No referees are available for this tournament time.'}
            </p>
            <button 
              onClick={() => navigate(`/tournaments/${tournamentId}`)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Back to Tournament
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {filteredReferees.map((referee) => (
              <div
                key={referee.id}
                onClick={() => !referee.booking_status && setSelectedReferee(referee)}
                className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-2 ${
                  referee.booking_status 
                    ? 'border-gray-300 opacity-75 cursor-not-allowed' 
                    : selectedReferee?.id === referee.id
                    ? 'border-purple-600 bg-purple-50 cursor-pointer'
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                }`}
              >
                <div className="p-6">
                  {/* Booking Status Badge */}
                  {referee.booking_status && (
                    <div className="mb-4">
                      {(() => {
                        const badge = getBookingStatusBadge(referee.booking_status.status);
                        const Icon = badge.icon;
                        return (
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${badge.color}`}>
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-semibold">{badge.text}</span>
                            <span className="text-xs ml-auto">
                              {new Date(referee.booking_status.requested_at).toLocaleDateString()}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {referee.profile_picture ? (
                        <img
                          src={referee.profile_picture}
                          alt={referee.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center border-2 border-gray-200">
                          <span className="text-2xl font-bold text-white">
                            {referee.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      {selectedReferee?.id === referee.id && !referee.booking_status && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{referee.name}</h3>
                      
                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(referee.rating)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {referee.rating.toFixed(1)}
                        </span>
                      </div>

                      {/* Certification */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCertificationColor(referee.certification_level)}`}>
                          <Award className="h-3 w-3 inline mr-1" />
                          {referee.certification_level.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Experience</p>
                          <p className="text-sm font-semibold text-gray-900">{referee.years_experience} years</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-500">Matches</p>
                          <p className="text-sm font-semibold text-gray-900">{referee.matches_officiated}</p>
                        </div>
                      </div>

                      {/* Specializations */}
                      {referee.specialization.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {referee.specialization.map((sport, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md font-medium"
                            >
                              {sport}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Availability */}
                      {referee.availability_slot && (
                        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md w-fit">
                          <CheckCircle className="h-3 w-3" />
                          <span>
                            Available: {referee.availability_slot.start_time || 'All day'} - {referee.availability_slot.end_time || 'All day'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assignment Form */}
        {selectedReferee && (
          <div className="bg-white rounded-lg shadow-lg p-6 sticky bottom-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center border border-purple-200">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assignment Details</h3>
                <p className="text-sm text-gray-600">Selected: {selectedReferee.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Referee Fee (NPR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={assignmentFee}
                  onChange={(e) => setAssignmentFee(e.target.value)}
                  placeholder="Enter amount (optional)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for no fee</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes for Referee
                </label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAssignReferee}
                disabled={assigning}
                className="flex-1 bg-purple-600 text-white py-4 rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending Request...
                  </span>
                ) : (
                  'Send Assignment Request'
                )}
              </button>
              <button
                onClick={() => setSelectedReferee(null)}
                className="px-6 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold border border-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentData && data && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentCancel}
          paymentId={paymentData.payment_id}
          amount={paymentData.amount}
          paymentUrl={paymentData.payment_url}
          productName={`Referee fee for ${data.tournament.title}`}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
    </div>
  );
};

export default RefereeSelectionPage;
