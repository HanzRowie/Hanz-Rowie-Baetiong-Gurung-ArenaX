import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2 } from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Venue {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  sport_types?: string[];
  price_per_hour?: number;
  coordinates?: { lat: number; lng: number };
}

interface VenueMapProps {
  venues: Venue[];
  onVenueClick?: (venue: Venue) => void;
  height?: string;
}

export default function VenueMap({ venues, onVenueClick, height = '300px' }: VenueMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map with default center (Kathmandu, Nepal)
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([27.7172, 85.3240], 12);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    if (venues.length === 0) {
      return;
    }

    // Add venue markers
    const bounds = L.latLngBounds([]);
    const venuesWithCoords: Venue[] = [];
    
    venues.forEach((venue) => {
      // Check if venue has valid coordinates
      let coords: { lat: number; lng: number } | null = null;
      
      if (venue.coordinates) {
        coords = venue.coordinates;
      } else if (venue.latitude && venue.longitude) {
        coords = { lat: Number(venue.latitude), lng: Number(venue.longitude) };
      }
      
      // Skip venues without coordinates
      if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) {
        console.warn(`Venue "${venue.name}" has no valid coordinates, skipping map marker`);
        return;
      }
      
      venuesWithCoords.push(venue);

      // Create custom icon
      const customIcon = L.divIcon({
        html: `
          <div class="venue-marker">
            <div class="venue-marker-inner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                <path d="M6 12h4"/>
                <path d="M6 8h4"/>
                <path d="M16 8h2"/>
                <path d="M16 12h2"/>
                <path d="M16 16h2"/>
              </svg>
            </div>
          </div>
        `,
        className: 'custom-venue-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: customIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div class="venue-popup">
            <h3 class="font-semibold text-gray-900 mb-1">${venue.name}</h3>
            <p class="text-sm text-gray-600 mb-2">${venue.location}</p>
            <div class="text-xs text-gray-500 mb-2">
              ${venue.sport_types?.join(', ') || 'Multi-sport'}
            </div>
            ${venue.price_per_hour ? `<div class="text-sm font-medium text-green-600">NPR ${venue.price_per_hour}/hour</div>` : ''}
            <button 
              onclick="window.venueMapClick && window.venueMapClick('${venue.id}')"
              class="mt-2 bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 transition-colors"
            >
              View Details
            </button>
          </div>
        `);

      // Add click handler
      marker.on('click', () => {
        if (onVenueClick) {
          onVenueClick(venue);
        }
      });

      markersRef.current.push(marker);
      bounds.extend([coords.lat, coords.lng]);
    });

    // Fit map to show all venues with coordinates
    if (venuesWithCoords.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (venues.length > 0) {
      // If no venues have coordinates, show default location (Kathmandu, Nepal)
      mapInstanceRef.current.setView([27.7172, 85.3240], 12);
    }

    // Global click handler for popup buttons
    (window as any).venueMapClick = (venueId: string) => {
      const venue = venues.find(v => v.id === venueId);
      if (venue && onVenueClick) {
        onVenueClick(venue);
      }
    };

    return () => {
      // Cleanup
      delete (window as any).venueMapClick;
    };
  }, [venues, onVenueClick]);

  useEffect(() => {
    return () => {
      // Cleanup map on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        style={{ height, width: '100%' }}
        className="rounded-lg overflow-hidden border border-gray-200 relative z-0"
      />
      
      {venues.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg z-10">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium mb-1">No venues to display</p>
            <p className="text-sm text-gray-500 mb-4">Add venues to see them on the map</p>
            <button
              onClick={() => window.location.href = '/venues/create'}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              Add Your First Venue
            </button>
          </div>
        </div>
      )}
      
      {venues.length > 0 && venues.every(v => !v.latitude && !v.longitude && !v.coordinates) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 shadow-sm z-10">
          <p className="text-sm text-yellow-800">
            ⚠️ Venues don't have location coordinates. Edit venues to add map locations.
          </p>
        </div>
      )}

      <style>{`
        .venue-marker {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .venue-marker-inner {
          width: 24px;
          height: 24px;
          background: #4f46e5;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        
        .venue-marker-inner:hover {
          background: #4338ca;
          transform: scale(1.1);
        }
        
        .venue-popup {
          min-width: 200px;
        }
        
        .venue-popup h3 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
        }
        
        .venue-popup p {
          margin: 0 0 8px 0;
          font-size: 12px;
        }
        
        .venue-popup button {
          cursor: pointer;
          border: none;
          outline: none;
        }
      `}</style>
    </div>
  );
}