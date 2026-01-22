import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { api } from '../services/api';

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
  const [selectedReferee, setSelectedReferee] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assignmentFee, setAssignmentFee] = useState('');

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
    } finally {
      setLoading(false);
    }
  };

  const handleAssignReferee = async () => {
    if (!selectedReferee) return;

    try {
      setAssigning(true);
      await api.post(`/api/referees/tournament/${tournamentId}/assign/`, {
        referee_id: selectedReferee,
        notes: assignmentNotes,
        fee: parseFloat(assignmentFee) || 0
      });

      // Show success message and navigate back
      alert('Referee assignment request sent successfully!');
      navigate(`/tournaments/${tournamentId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to assign referee');
    } finally {
      setAssigning(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-lg ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={() => navigate(-1)}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tournament Info Header */}
      <Card className="p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">Select Referee for Tournament</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-semibold">Tournament:</span>
            <p className="text-gray-600">{data.tournament.title}</p>
          </div>
          <div>
            <span className="font-semibold">Date:</span>
            <p className="text-gray-600">{new Date(data.tournament.date).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="font-semibold">Time:</span>
            <p className="text-gray-600">
              {data.tournament.start_time}
              {data.tournament.end_time && ` - ${data.tournament.end_time}`}
            </p>
          </div>
          <div>
            <span className="font-semibold">Sport:</span>
            <p className="text-gray-600">{data.tournament.sport_type}</p>
          </div>
        </div>
      </Card>

      {/* Available Referees */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Available Referees ({data.count})
        </h2>

        {data.available_referees.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-600">No referees available for this tournament time.</p>
            <Button 
              className="mt-4 bg-purple-600 text-white hover:bg-purple-700" 
              onClick={() => navigate(`/tournaments/${tournamentId}`)}
            >
              Back to Tournament
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.available_referees.map((referee) => (
              <Card 
                key={referee.id} 
                className={`p-4 cursor-pointer transition-all ${
                  selectedReferee === referee.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedReferee(referee.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {referee.profile_picture ? (
                      <img 
                        src={referee.profile_picture} 
                        alt={referee.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-semibold">
                          {referee.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {referee.name}
                    </h3>
                    
                    <div className="flex items-center space-x-1 mb-1">
                      {renderStars(Math.floor(referee.rating))}
                      <span className="text-sm text-gray-600">
                        ({referee.rating.toFixed(1)})
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      {referee.certification_level}
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      {referee.years_experience} years exp. • {referee.matches_officiated} matches
                    </p>
                    
                    {referee.specialization.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {referee.specialization.map((sport, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-xs rounded-full"
                          >
                            {sport}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {referee.availability_slot && (
                      <p className="text-xs text-green-600">
                        Available: {referee.availability_slot.start_time || 'All day'} - {referee.availability_slot.end_time || 'All day'}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    <input
                      type="radio"
                      name="referee"
                      value={referee.id}
                      checked={selectedReferee === referee.id}
                      onChange={() => setSelectedReferee(referee.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Form */}
      {selectedReferee && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Assignment Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referee Fee (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={assignmentFee}
                onChange={(e) => setAssignmentFee(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes for Referee (Optional)
            </label>
            <textarea
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              placeholder="Any special instructions or information for the referee..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleAssignReferee}
              disabled={assigning}
              className="flex-1 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {assigning ? 'Sending Request...' : 'Send Assignment Request'}
            </Button>
            <Button
              onClick={() => navigate(`/tournaments/${tournamentId}`)}
              className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RefereeSelectionPage;