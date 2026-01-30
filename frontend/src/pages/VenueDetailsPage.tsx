import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { venueService } from '@/services/venueService';
import type { Venue } from '@/types/venue.types';
import toastService from '@/services/toastService';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { API_URL } from '@/utils/constants';
import {
    MapPin, Users, Star, Calendar,
    Clock, Info, Edit, ArrowLeft
} from 'lucide-react';

export default function VenueDetailsPage() {
    const { venueId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [venue, setVenue] = useState<Venue | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'operating-hours'>('overview');

    useEffect(() => {
        if (venueId) {
            loadVenue();
        }
    }, [venueId]);

    const loadVenue = async () => {
        try {
            setLoading(true);
            const data = await venueService.getVenueDetail(venueId!);
            setVenue(data.venue);
        } catch (error) {
            console.error('Error loading venue:', error);
            toastService.error('Failed to load venue details');
        } finally {
            setLoading(false);
        }
    };

    const isOwner = user?.role === 'VENUE_OWNER' && venue?.owner?.id === user?.id;
    const rawImage = (venue?.images && venue.images.length > 0) ? venue.images[0] : venue?.image;
    const displayImage = rawImage?.startsWith('/')
        ? `${API_URL?.replace(/\/$/, '')}${rawImage}`
        : rawImage;

    if (loading) return <DashboardSkeleton />;
    if (!venue) return <div className="text-center py-12">Venue not found</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </button>

                {isOwner && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate(`/venues/${venueId}/edit`)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                        >
                            <Edit className="h-4 w-4" />
                            Edit
                        </button>
                    </div>
                )}
            </div>

            {/* Hero Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative h-64 md:h-80 bg-gray-200">
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt={venue.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                            <span className="flex flex-col items-center gap-2">
                                <span className="text-4xl">🏟️</span>
                                <span>No image available</span>
                            </span>
                        </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-indigo-600 shadow-sm">
                        {venue.sport_types?.join(', ') || 'Mixed Sports'}
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
                            <div className="flex items-center text-gray-600 gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{venue.location}</span>
                            </div>
                            <p className="text-sm text-gray-500">Managed by {venue.owner?.name || 'Unknown'}</p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1">
                                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                                <span className="text-xl font-bold text-gray-900">{venue.rating?.toFixed(1) || 'New'}</span>
                                <span className="text-sm text-gray-500">({venue.total_bookings || 0} bookings)</span>
                            </div>
                            <div className="text-2xl font-bold text-indigo-600">
                                ${venue.price_per_hour}<span className="text-sm font-normal text-gray-500">/hour</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="p-2 bg-white rounded-md shadow-sm text-blue-500">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Capacity</p>
                                <p className="font-semibold text-gray-900">{venue.capacity} People</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="p-2 bg-white rounded-md shadow-sm text-green-500">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Open</p>
                                <p className="font-semibold text-gray-900">
                                    {venue.default_opening_time || '06:00'} - {venue.default_closing_time || '22:00'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="p-2 bg-white rounded-md shadow-sm text-purple-500">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Court Size</p>
                                <p className="font-semibold text-gray-900">{venue.court_size || 'Standard'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="p-2 bg-white rounded-md shadow-sm text-orange-500">
                                <Info className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Facilities</p>
                                <p className="font-semibold text-gray-900">{venue.amenities?.length || 0} Items</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px px-6" aria-label="Tabs">
                        {(['overview', 'reviews', 'operating-hours'] as const).map((tab) => (
                            (!isOwner && tab === 'operating-hours') ? null : (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`
                                    py-4 px-6 border-b-2 font-medium text-sm transition-colors capitalize
                                    ${activeTab === tab
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                `}
                                >
                                    {tab === 'operating-hours' ? 'Operating Hours' : tab}
                                </button>
                            )
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">About this venue</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {venue.description || 'No description provided for this venue.'}
                                </p>
                            </div>

                            {venue.amenities && venue.amenities.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {venue.amenities.map((amenity, index) => (
                                            <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                                {amenity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Venue Rules</h3>
                                <ul className="list-disc list-inside space-y-1 text-gray-600">
                                    <li>Non-marking shoes only</li>
                                    <li>No food or drinks on the court</li>
                                    <li>Respect booking times</li>
                                    <li>Cancellation policy applies (24h notice)</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <Star className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                            <h3 className="text-lg font-medium text-gray-900">No reviews yet</h3>
                            <p className="text-gray-500">Be the first to review this venue after your game!</p>
                        </div>
                    )}

                    {activeTab === 'operating-hours' && isOwner && (
                        <OperatingHoursManager venueId={venueId!} venue={venue} />
                    )}
                </div>
            </div>
        </div>
    );
}

function OperatingHoursManager({ venueId, venue }: { venueId: string, venue: Venue }) {
    const [settings, setSettings] = useState({
        default_opening_time: venue.default_opening_time || '06:00',
        default_closing_time: venue.default_closing_time || '22:00',
        operating_days: venue.operating_days || [1, 2, 3, 4, 5, 6, 7],
        is_active: venue.is_active ?? true,
    });
    const [hasChanges, setHasChanges] = useState(false);
    const [saving, setSaving] = useState(false);

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const handleSettingChange = (field: keyof typeof settings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleDayToggle = (dayNumber: number) => {
        const newDays = settings.operating_days.includes(dayNumber)
            ? settings.operating_days.filter(d => d !== dayNumber)
            : [...settings.operating_days, dayNumber].sort();
        handleSettingChange('operating_days', newDays);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await venueService.updateVenueSettings(venueId, settings);
            toastService.success('Operating hours updated successfully');
            setHasChanges(false);
            // Reload the page to reflect changes
            window.location.reload();
        } catch (error) {
            console.error('Error updating operating hours:', error);
            toastService.error('Failed to update operating hours');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setSettings({
            default_opening_time: venue.default_opening_time || '06:00',
            default_closing_time: venue.default_closing_time || '22:00',
            operating_days: venue.operating_days || [1, 2, 3, 4, 5, 6, 7],
            is_active: venue.is_active ?? true,
        });
        setHasChanges(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Operating Hours</h3>
                    <p className="text-sm text-gray-500">Configure your venue's default operating schedule</p>
                </div>
                {hasChanges && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Venue Status */}
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-medium text-gray-900">Venue Status</h4>
                        <p className="text-sm text-gray-600">
                            Customers can book your venue during operating hours
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.is_active}
                            onChange={(e) => handleSettingChange('is_active', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            {/* Default Operating Hours */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Default Operating Hours</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Opening Time</label>
                        <input
                            type="time"
                            value={settings.default_opening_time}
                            onChange={(e) => handleSettingChange('default_opening_time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Closing Time</label>
                        <input
                            type="time"
                            value={settings.default_closing_time}
                            onChange={(e) => handleSettingChange('default_closing_time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    These are your default operating hours. You can override them for specific dates if needed.
                </p>
            </div>

            {/* Operating Days */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Operating Days</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {dayNames.map((day, index) => {
                        const dayNumber = index + 1;
                        const isSelected = settings.operating_days.includes(dayNumber);
                        return (
                            <button
                                key={day}
                                onClick={() => handleDayToggle(dayNumber)}
                                className={`p-3 rounded-lg border-2 transition-colors text-center ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                <div className="font-medium text-sm">{day}</div>
                                {isSelected && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                    Select the days when your venue is open for bookings.
                </p>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
                <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Status:</strong> {settings.is_active ? 'Active' : 'Inactive'}</p>
                    <p><strong>Operating Hours:</strong> {settings.default_opening_time} - {settings.default_closing_time}</p>
                    <p><strong>Operating Days:</strong> {
                        settings.operating_days.length === 7 
                            ? 'All days' 
                            : settings.operating_days.map(d => dayNames[d - 1]).join(', ')
                    }</p>
                </div>
            </div>
        </div>
    );
}
