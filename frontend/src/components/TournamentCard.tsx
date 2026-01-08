import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, MapPin, DollarSign, 
  Edit, Trash2, Eye, MoreVertical, Users,
  Calendar
} from 'lucide-react';

interface TournamentCardProps {
  tournament: {
    id: string;
    title: string;
    sport_type: string;
    date: string;
    venue: string;
    entry_fee: number;
    max_participants: number;
    registered_count: number;
    status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
    tournament_image?: string;
    description?: string;
    prize_pool?: number;
  };
  onDelete?: (tournamentId: string) => void;
  showActions?: boolean;
}

export default function TournamentCard({ tournament, onDelete, showActions = true }: TournamentCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ONGOING':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSportIcon = () => {
    // You can add sport-specific icons here
    return <Trophy className="h-20 w-20 text-indigo-300" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const registrationPercentage = (tournament.registered_count / tournament.max_participants) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-indigo-200 group hover:-translate-y-1">
      {/* Tournament Image/Header */}
      <div className="h-52 bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 relative overflow-hidden">
        {tournament.tournament_image ? (
          <img 
            src={tournament.tournament_image} 
            alt={tournament.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              {getSportIcon()}
            </div>
          </>
        )}
        
        {/* Overlay Actions */}
        {showActions && (
          <div className="absolute top-4 right-4">
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2.5 bg-white/95 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg hover:shadow-xl"
              >
                <MoreVertical className="h-4 w-4 text-gray-700" />
              </button>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 min-w-[140px]">
                    <button
                      onClick={() => {
                        navigate(`/tournaments/${tournament.id}`);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Eye className="h-4 w-4 text-indigo-500" />
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        navigate(`/tournaments/${tournament.id}/edit`);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Edit className="h-4 w-4 text-blue-500" />
                      Edit Tournament
                    </button>
                    {onDelete && tournament.status === 'UPCOMING' && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this tournament?')) {
                            onDelete(tournament.id);
                          }
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getStatusColor(tournament.status)}`}>
            {tournament.status}
          </span>
        </div>

        {/* Sport Type Badge */}
        <div className="absolute bottom-4 left-4">
          <span className="px-3 py-1.5 bg-white/95 backdrop-blur-sm text-xs font-semibold text-gray-800 rounded-full shadow-sm">
            {tournament.sport_type.charAt(0).toUpperCase() + tournament.sport_type.slice(1)}
          </span>
        </div>

        {/* Date Badge */}
        <div className="absolute bottom-4 right-4">
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-gray-600" />
            <span className="text-xs font-semibold text-gray-800">{formatDate(tournament.date)}</span>
          </div>
        </div>
      </div>

      {/* Tournament Info */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <h3 className="font-bold text-xl text-gray-900 group-hover:text-indigo-600 transition-colors mb-2 line-clamp-1">
            {tournament.title}
          </h3>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm line-clamp-1">{tournament.venue}</span>
          </div>
        </div>

        {/* Description */}
        {tournament.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
            {tournament.description}
          </p>
        )}

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Entry Fee</p>
              <p className="font-semibold text-gray-900">${tournament.entry_fee}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Trophy className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Prize Pool</p>
              <p className="font-semibold text-gray-900">${tournament.prize_pool || (tournament.entry_fee * tournament.registered_count * 0.8)}</p>
            </div>
          </div>
        </div>

        {/* Registration Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Registration</span>
            <span className="text-sm text-gray-600">{tournament.registered_count}/{tournament.max_participants}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(registrationPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">
              {registrationPercentage.toFixed(0)}% filled
            </span>
            {registrationPercentage >= 100 && (
              <span className="text-xs font-medium text-green-600">Full</span>
            )}
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="flex items-center justify-between mb-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{tournament.registered_count} participants</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              tournament.status === 'UPCOMING' ? 'bg-blue-500' :
              tournament.status === 'ONGOING' ? 'bg-green-500' :
              tournament.status === 'COMPLETED' ? 'bg-gray-500' :
              'bg-red-500'
            }`}></div>
            <span className={`text-xs font-medium ${
              tournament.status === 'UPCOMING' ? 'text-blue-700' :
              tournament.status === 'ONGOING' ? 'text-green-700' :
              tournament.status === 'COMPLETED' ? 'text-gray-700' :
              'text-red-700'
            }`}>
              {tournament.status.charAt(0) + tournament.status.slice(1).toLowerCase()}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate(`/tournaments/${tournament.id}`)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Eye className="h-4 w-4" />
          {showActions ? 'Manage Tournament' : 'View Details'}
        </button>
      </div>
    </div>
  );
}