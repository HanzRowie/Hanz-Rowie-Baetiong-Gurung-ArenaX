import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { venueService } from '@/services/venueService';
import type { Venue } from '@/services/venueService';
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
    const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'availability'>('overview');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
                                <p className="font-semibold text-gray-900">06:00 - 22:00</p>
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
                        {(['overview', 'reviews', 'availability'] as const).map((tab) => (
                            (!isOwner && tab === 'availability') ? null : (
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
                                    {tab}
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

                    {activeTab === 'availability' && isOwner && (
                        <AvailabilityManager
                            venueId={venueId!}
                            date={selectedDate}
                            onDateChange={setSelectedDate}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function AvailabilityManager({ venueId, date, onDateChange }: { venueId: string, date: string, onDateChange: (date: string) => void }) {
    const [availabilities, setAvailabilities] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newSlot, setNewSlot] = useState({ start_time: '', end_time: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadAvailability();
    }, [venueId, date]);

    const loadAvailability = async () => {
        try {
            setLoading(true);
            const data = await venueService.getVenueAvailability(venueId, date);
            // The API returns { venue, bookings, availabilities, date }
            setAvailabilities((data as any).availabilities || []);
            setBookings((data as any).bookings || []);
        } catch (error) {
            console.error('Error loading availability:', error);
            toastService.error('Failed to load availability');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSlot.start_time || !newSlot.end_time) {
            toastService.error('Please select both start and end times');
            return;
        }

        try {
            setSubmitting(true);
            await venueService.createAvailabilitySlot({
                venue: venueId,
                date: date,
                start_time: newSlot.start_time,
                end_time: newSlot.end_time,
                is_available: true
            });
            toastService.success('Availability slot added');
            setNewSlot({ start_time: '', end_time: '' });
            loadAvailability();
        } catch (error) {
            console.error('Error adding slot:', error);
            toastService.error('Failed to add slot');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSlot = async (id: string) => {
        if (!confirm('Are you sure you want to remove this slot?')) return;
        try {
            await venueService.deleteAvailabilitySlot(id);
            toastService.success('Slot removed');
            loadAvailability();
        } catch (error) {
            console.error('Error removing slot:', error);
            toastService.error('Failed to remove slot');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Manage Availability</h3>
                    <p className="text-sm text-gray-500">Set available time slots for {date}</p>
                </div>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => onDateChange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Existing Slots */}
                <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-600" />
                        Current Slots
                    </h4>

                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : availabilities.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-gray-500">No availability slots set for this date.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {availabilities.map((slot) => (
                                <div key={slot.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-md">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-900">
                                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                Available
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteSlot(slot.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove slot"
                                    >
                                        <Users className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {bookings.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <Users className="h-4 w-4 text-orange-500" />
                                Bookings for this day
                            </h4>
                            <div className="space-y-2">
                                {bookings.map((booking) => (
                                    <div key={booking.id} className="flex items-center justify-between p-3 bg-orange-50/50 border border-orange-100 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-100 text-orange-600 rounded-md">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-900">
                                                    {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                                                </span>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                                                    <span>{booking.user?.full_name || 'User'}</span>
                                                    <span>•</span>
                                                    <span className={`capitalize ${booking.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-600'
                                                        }`}>{booking.status.toLowerCase()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Add New Slot */}
                <div className="bg-gray-50 rounded-xl p-6 h-fit">
                    <h4 className="font-medium text-gray-900 mb-4">Add Availability Slot</h4>
                    <form onSubmit={handleAddSlot} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                <input
                                    type="time"
                                    value={newSlot.start_time}
                                    onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                <input
                                    type="time"
                                    value={newSlot.end_time}
                                    onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Adding...' : 'Add Slot'}
                        </button>
                    </form>
                    <p className="text-xs text-gray-500 mt-4">
                        * Add time slots when your venue is open and available for booking. Overlapping slots are not allowed.
                    </p>
                </div>
            </div>
        </div>
    );
}
