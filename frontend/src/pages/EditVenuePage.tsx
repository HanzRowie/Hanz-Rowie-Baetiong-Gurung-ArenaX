import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { venueService } from '@/services/venueService';
import toastService from '@/services/toastService';
import { Building2, MapPin, DollarSign, Users, Info, Image as ImageIcon, ArrowLeft, Trash2 } from 'lucide-react';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';

export default function EditVenuePage() {
    const navigate = useNavigate();
    const { venueId } = useParams();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        location: '',
        sport_type: 'FUTSAL',
        court_size: 'Standard',
        facilities: '',
        capacity: '',
        price_per_hour: '',
        image: null as File | null
    });

    useEffect(() => {
        if (venueId) {
            loadVenue();
        }
    }, [venueId]);

    const loadVenue = async () => {
        try {
            setLoading(true);
            // returns { venue: Venue }
            const { venue } = await venueService.getVenueDetail(venueId!);

            setFormData({
                name: venue.name,
                location: venue.location,
                sport_type: venue.sport_types && venue.sport_types.length > 0 ? venue.sport_types[0].toUpperCase() : 'FUTSAL',
                court_size: 'Standard', // Not in venue type? Assuming standard or fetch from description if stored there
                facilities: venue.description || '',
                capacity: venue.capacity.toString(),
                price_per_hour: venue.price_per_hour.toString(),
                image: null
            });

            if (venue.images && venue.images.length > 0) {
                setCurrentImage(venue.images[0]);
            }
        } catch (error) {
            console.error('Error loading venue:', error);
            toastService.error('Failed to load venue details');
            navigate('/venue-management');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, image: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!venueId) return;

        setSaving(true);

        try {
            // Validate
            if (!formData.name || !formData.location || !formData.price_per_hour || !formData.capacity) {
                toastService.error('Please fill in all required fields');
                setSaving(false);
                return;
            }

            // Prepare data
            const venueData = {
                name: formData.name,
                location: formData.location,
                address: formData.location, // Using location as address
                description: formData.facilities,
                capacity: parseInt(formData.capacity),
                price_per_hour: parseFloat(formData.price_per_hour),
                sport_types: [formData.sport_type.toUpperCase()], // Ensure uppercase for backend
                court_size: formData.court_size,
                images: formData.image ? [formData.image] : undefined
            };

            await venueService.updateVenue(venueId, venueData);
            toastService.success('Venue updated successfully');
            navigate('/venue-management');
        } catch (error) {
            console.error('Error updating venue:', error);
            toastService.error('Failed to update venue');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!venueId) return;

        if (window.confirm('Are you sure you want to delete this venue? This cannot be undone.')) {
            try {
                await venueService.deleteVenue(venueId);
                toastService.success('Venue deleted successfully');
                navigate('/venue-management');
            } catch (error) {
                console.error('Error deleting venue:', error);
                toastService.error('Failed to delete venue');
            }
        }
    };

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </button>
                <button
                    onClick={handleDelete}
                    className="flex items-center text-red-600 hover:text-red-700 font-medium"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Venue
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h1 className="text-2xl font-bold text-gray-900">Edit Venue</h1>
                    <p className="text-gray-500 mt-1">Update operational details for {formData.name}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            Venue Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sport Type *</label>
                                <select
                                    name="sport_type"
                                    value={formData.sport_type}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="FUTSAL">Futsal</option>
                                    <option value="BADMINTON">Badminton</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Facilities</label>
                            <textarea
                                name="facilities"
                                value={formData.facilities}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Info className="h-5 w-5 text-indigo-600" />
                            Specifications & Pricing
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Court Size</label>
                                <input
                                    type="text"
                                    name="court_size"
                                    value={formData.court_size}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity *</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="number"
                                        name="capacity"
                                        value={formData.capacity}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Hour *</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="number"
                                        name="price_per_hour"
                                        value={formData.price_per_hour}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Image */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-indigo-600" />
                            Venue Image
                        </h3>

                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors">
                            <input
                                type="file"
                                id="venue-image"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                            <label htmlFor="venue-image" className="cursor-pointer block">
                                {formData.image ? (
                                    <div className="flex flex-col items-center">
                                        <img
                                            src={URL.createObjectURL(formData.image)}
                                            alt="New Preview"
                                            className="h-48 w-full object-cover rounded-lg mb-4"
                                        />
                                        <span className="text-sm text-indigo-600 font-medium">Click to change new image</span>
                                    </div>
                                ) : currentImage ? (
                                    <div className="flex flex-col items-center">
                                        <img
                                            src={currentImage}
                                            alt="Current"
                                            className="h-48 w-full object-cover rounded-lg mb-4"
                                        />
                                        <span className="text-sm text-indigo-600 font-medium">Click to upload new image</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                                            <ImageIcon className="h-6 w-6" />
                                        </div>
                                        <p className="text-gray-900 font-medium">Click to upload venue image</p>
                                        <p className="text-gray-500 text-sm mt-1">PNG, JPG up to 5MB</p>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={() => navigate('/venue-management')}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
