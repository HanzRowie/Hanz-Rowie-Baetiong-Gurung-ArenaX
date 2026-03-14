import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import { Search, MapPin, Loader } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface VenueLocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialLocation?: LocationData;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    state?: string;
    country?: string;
  };
}

// Component to handle map events
function LocationMarker({ position, setPosition }: { position: LatLng; setPosition: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return <Marker position={position} draggable={true} eventHandlers={{
    dragend: (e) => {
      setPosition(e.target.getLatLng());
    },
  }} />;
}

// Component to update map center
function MapUpdater({ center }: { center: LatLng }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

export default function VenueLocationPicker({ onLocationSelect, initialLocation }: VenueLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [position, setPosition] = useState<LatLng>(
    initialLocation 
      ? new LatLng(initialLocation.latitude, initialLocation.longitude)
      : new LatLng(27.7172, 85.3240) // Default to Kathmandu, Nepal
  );
  const [selectedAddress, setSelectedAddress] = useState(initialLocation?.address || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchLocation = async (query: string) => {
    setSearching(true);
    try {
      // Using Nominatim (OpenStreetMap) geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    const newPosition = new LatLng(parseFloat(result.lat), parseFloat(result.lon));
    setPosition(newPosition);
    setSelectedAddress(result.display_name);
    setSearchQuery('');
    setShowResults(false);
    
    onLocationSelect({
      address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    });
  };

  const handlePositionChange = async (newPosition: LatLng) => {
    setPosition(newPosition);
    
    // Reverse geocode to get address
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPosition.lat}&lon=${newPosition.lng}&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        const address = data.display_name;
        setSelectedAddress(address);
        
        onLocationSelect({
          address,
          latitude: newPosition.lat,
          longitude: newPosition.lng,
        });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      onLocationSelect({
        address: `${newPosition.lat.toFixed(6)}, ${newPosition.lng.toFixed(6)}`,
        latitude: newPosition.lat,
        longitude: newPosition.lng,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Location
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search for a city, address, or landmark..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {searching && (
            <Loader className="absolute right-3 top-3 h-5 w-5 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleResultSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-indigo-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.display_name}
                    </p>
                    {result.address && (
                      <p className="text-xs text-gray-500 mt-1">
                        {[result.address.city, result.address.state, result.address.country]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Address Display */}
      {selectedAddress && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-indigo-900">Selected Location</p>
              <p className="text-xs text-indigo-700 mt-1">{selectedAddress}</p>
              <p className="text-xs text-indigo-600 mt-1">
                Coordinates: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Drag the marker to adjust location
        </label>
        <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-300">
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={handlePositionChange} />
            <MapUpdater center={position} />
          </MapContainer>
        </div>
        <p className="text-xs text-gray-500">
          💡 Tip: Click anywhere on the map or drag the marker to set the exact venue location
        </p>
      </div>
    </div>
  );
}
