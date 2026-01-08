import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Plus, Search, Grid3X3, List,
  DollarSign, Star, Calendar, MoreVertical,
  Edit, Eye, MapPin, Users, TrendingUp
} from 'lucide-react';
import { UserRole } from '@/types/auth.types';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import toastService from '@/services/toastService';
import { venueService } from '@/services/venueService';
import VenueCard from '@/components/VenueCard';

export default function VenueManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'bookings' | 'revenue'>('name');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (user?.role === UserRole.VENUE_OWNER) {
      loadVenues();
    } else {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const venuesData = await venueService.getMyVenues();
      setVenues(venuesData.venues);
    } catch (error) {
      console.error('Error loading venues:', error);
      toastService.error('Failed to load venues');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (!confirm('Are you sure you want to delete this venue? This action cannot be undone.')) {
      return;
    }

    try {
      await venueService.deleteVenue(venueId);
      setVenues(prev => prev.filter(venue => venue.id !== venueId));
      toastService.success('Venue deleted successfully');
    } catch (error) {
      console.error('Error deleting venue:', error);
      toastService.error('Failed to delete venue');
    }
  };

  const filteredAndSortedVenues = venues
    .filter(venue => {
      const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           venue.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && venue.status !== 'inactive') ||
                           (filterStatus === 'inactive' && venue.status === 'inactive');
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'bookings':
          return (b.total_bookings || 0) - (a.total_bookings || 0);
        case 'revenue':
          return (b.revenue || 0) - (a.revenue || 0);
        default:
          return 0;
      }
    });

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venue Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your venues, track performance, and optimize bookings
          </p>
        </div>
        <button
          onClick={() => navigate('/venues/create')}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add New Venue
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Venues</span>
            <Building2 className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{venues.length}</p>
          <span className="text-xs text-gray-500 mt-1">Active properties</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Bookings</span>
            <Calendar className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{venues.reduce((sum, v) => sum + (v.total_bookings || 0), 0)}</p>
          <span className="text-xs text-gray-500 mt-1">All time</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Rating</span>
            <Star className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {venues.length > 0 ? (venues.reduce((sum, v) => sum + (v.rating || 0), 0) / venues.length).toFixed(1) : '0.0'}
          </p>
          <span className="text-xs text-gray-500 mt-1">Customer rating</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</span>
            <DollarSign className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${venues.reduce((sum, v) => sum + ((v.total_bookings || 0) * (v.price_per_hour || 0) * 2), 0).toLocaleString()}
          </p>
          <span className="text-xs text-gray-500 mt-1">Estimated total</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search venues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="name">Sort by Name</option>
                <option value="created">Sort by Date Created</option>
                <option value="bookings">Sort by Bookings</option>
                <option value="revenue">Sort by Revenue</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Venues Display */}
      {filteredAndSortedVenues.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {venues.length === 0 ? 'No venues yet' : 'No venues match your filters'}
          </h3>
          <p className="text-gray-600 mb-6">
            {venues.length === 0 
              ? 'Get started by adding your first venue to the platform.' 
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          {venues.length === 0 && (
            <button
              onClick={() => navigate('/venues/create')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add Your First Venue
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedVenues.map((venue) => (
            <VenueCard 
              key={venue.id} 
              venue={venue} 
              onDelete={handleDeleteVenue}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredAndSortedVenues.map((venue) => (
              <div key={venue.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-indigo-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{venue.name}</h3>
                        {venue.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium text-gray-700">{venue.rating.toFixed(1)}</span>
                          </div>
                        )}
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-gray-600 mb-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{venue.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span>${venue.price_per_hour}/hour</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>Capacity: {venue.capacity}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{venue.total_bookings || 0} bookings</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>${((venue.total_bookings || 0) * (venue.price_per_hour || 0) * 2).toLocaleString()} revenue</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/venues/${venue.id}`)}
                      className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      Manage
                    </button>
                    <button
                      onClick={() => navigate(`/venues/${venue.id}/edit`)}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <div className="relative">
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}