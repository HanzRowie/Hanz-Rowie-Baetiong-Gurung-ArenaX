import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, DollarSign, Star,
  Edit, Trash2, Eye, MoreVertical, Users,
  Calendar
} from 'lucide-react';

import { API_URL } from '@/utils/constants';

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    location: string;
    price_per_hour: number;
    rating?: number;
    total_bookings?: number;
    sport_types?: string[];
    amenities?: string[];
    description?: string;
    capacity: number;
    images?: string[];
    image?: string;
  };
  onDelete?: (venueId: string) => void;
  showActions?: boolean;
}

export default function VenueCard({ venue, onDelete, showActions = true, showBookNow = false }: VenueCardProps & { showBookNow?: boolean }) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  const rawImage = (venue.images && venue.images.length > 0) ? venue.images[0] : venue.image;
  const displayImage = rawImage?.startsWith('/')
    ? `${API_URL?.replace(/\/$/, '')}${rawImage}`
    : rawImage;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-indigo-200 group hover:-translate-y-1">
      {/* Venue Image */}
      <div className="h-52 bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 relative overflow-hidden">
        {displayImage && !imgError ? (
          <img
            src={displayImage}
            alt={venue.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="h-20 w-20 text-indigo-300" />
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
                        navigate(`/venues/${venue.id}`);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Eye className="h-4 w-4 text-indigo-500" />
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        navigate(`/venues/${venue.id}/edit`);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <Edit className="h-4 w-4 text-blue-500" />
                      Edit Venue
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this venue?')) {
                            onDelete(venue.id);
                          }
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sport Type Badge */}
        <div className="absolute bottom-4 left-4">
          <div className="flex flex-wrap gap-2">
            {venue.sport_types?.map((sport) => (
              <span key={sport} className="px-3 py-1.5 bg-white/95 backdrop-blur-sm text-xs font-semibold text-gray-800 rounded-full shadow-sm">
                {sport.charAt(0).toUpperCase() + sport.slice(1)}
              </span>
            )) || (
                <span className="px-3 py-1.5 bg-white/95 backdrop-blur-sm text-xs font-semibold text-gray-800 rounded-full shadow-sm">
                  Multi-sport
                </span>
              )}
          </div>
        </div>

        {/* Rating Badge */}
        {venue.rating && (
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white/95 backdrop-blur-sm rounded-full shadow-sm">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
              <span className="text-xs font-semibold text-gray-800">{venue.rating.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Venue Info */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-4">
          <h3 className="font-bold text-xl text-gray-900 group-hover:text-indigo-600 transition-colors mb-2 line-clamp-1">
            {venue.name}
          </h3>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm line-clamp-1">{venue.location}</span>
          </div>
        </div>

        {/* Description */}
        {venue.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
            {venue.description}
          </p>
        )}

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Price/Hour</p>
              <p className="font-semibold text-gray-900">${venue.price_per_hour}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Capacity</p>
              <p className="font-semibold text-gray-900">{venue.capacity}</p>
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5">
            {venue.amenities?.slice(0, 3).map((amenity) => (
              <span key={amenity} className="px-2.5 py-1 bg-gray-100 text-xs text-gray-700 rounded-md font-medium">
                {amenity}
              </span>
            ))}
            {venue.amenities && venue.amenities.length > 3 && (
              <span className="px-2.5 py-1 bg-indigo-100 text-xs text-indigo-700 rounded-md font-medium">
                +{venue.amenities.length - 3} more
              </span>
            )}
            {(!venue.amenities || venue.amenities.length === 0) && (
              <span className="px-2.5 py-1 bg-gray-100 text-xs text-gray-500 rounded-md">
                Basic facilities
              </span>
            )}
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="flex items-center justify-between mb-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{venue.total_bookings || 0} bookings</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium text-green-700">Active</span>
          </div>
        </div>

        {/* Action Button */}
        {showActions ? (
          <button
            onClick={() => navigate(`/venues/${venue.id}`)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Eye className="h-4 w-4" />
            Manage Venue
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/venues/${venue.id}`)}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              View Details
            </button>
            {showBookNow && (
              <button
                onClick={() => navigate(`/venues/${venue.id}/book`)}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Book Now
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}