import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { venueService } from '@/services/venueService';
import toastService from '@/services/toastService';
import VenueLocationPicker from '@/components/VenueLocationPicker';
import { Building2, MapPin, Users, Info, Image as ImageIcon, ArrowLeft } from 'lucide-react';

export default function CreateVenuePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        latitude: null as number | null,
        longitude: null as number | null,
        sport_types: [] as string[],
        court_size: 'Standard',
        facilities: '',
        capacity: '',
        price_per_hour: '',
        image: null as File | null
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSportTypeToggle = (sportType: string) => {
        setFormData(prev => ({
            ...prev,
            sport_types: prev.sport_types.includes(sportType)
                ? prev.sport_types.filter(s => s !== sportType)
                : [...prev.sport_types, sportType]
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData(prev => ({ ...prev, image: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate
            if (!formData.name || !formData.location || !formData.price_per_hour || !formData.capacity) {
                toastService.error('Please fill in all required fields');
                setLoading(false);
                return;
            }

            if (formData.sport_types.length === 0) {
                toastService.error('Please select at least one sport type');
                setLoading(false);
                return;
            }

            // Prepare data for service
            const venueData = {
                name: formData.name,
                location: formData.location,
                address: formData.location,
                latitude: formData.latitude,
                longitude: formData.longitude,
                description: formData.facilities,
                capacity: parseInt(formData.capacity),
                price_per_hour: parseFloat(formData.price_per_hour),
                sport_types: formData.sport_types,
                amenities: [],
                court_size: formData.court_size,
                images: formData.image ? [formData.image] : undefined
            };

            await venueService.createVenue(venueData);
            toastService.success('Venue created successfully');
            navigate('/venue-management');
        } catch (error) {
            console.error('Error creating venue:', error);
            toastService.error('Failed to create venue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
                <ArrowLeft className="h-4 w-12 mr-2" />
                Back
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h1 className="text-2xl font-bold text-gray-900">List New Venue</h1>
                    <p className="text-gray-500 mt-1">Add your sports venue to the platform</p>
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
                                    placeholder="e.g. Downtown Futsal Arena"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sport Types * (Select all that apply)</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.sport_types.includes('FUTSAL')}
                                            onChange={() => handleSportTypeToggle('FUTSAL')}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700">Futsal</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.sport_types.includes('BADMINTON')}
                                            onChange={() => handleSportTypeToggle('BADMINTON')}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700">Badminton</span>
                                    </label>
                                </div>
                                {formData.sport_types.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Selected: {formData.sport_types.join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-indigo-600" />
                                Venue Location *
                            </label>
                            <VenueLocationPicker
                                onLocationSelect={(location) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        location: location.address,
                                        latitude: location.latitude,
                                        longitude: location.longitude
                                    }));
                                }}
                                initialLocation={
                                    formData.latitude && formData.longitude
                                        ? {
                                            address: formData.location,
                                            latitude: formData.latitude,
                                            longitude: formData.longitude
                                        }
                                        : undefined
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Facilities</label>
                            <textarea
                                name="facilities"
                                value={formData.facilities}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Describe facilities like parking, showers, locker rooms..."
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
                                    placeholder="e.g. 5-a-side"
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
                                        placeholder="e.g. 10"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Hour *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-sm font-medium text-gray-400">₨</span>
                                    <input
                                        type="number"
                                        name="price_per_hour"
                                        value={formData.price_per_hour}
                                        onChange={handleChange}
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="0.00"
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
                                            alt="Preview"
                                            className="h-48 w-full object-cover rounded-lg mb-4"
                                        />
                                        <span className="text-sm text-indigo-600 font-medium">Click to change image</span>
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
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Venue'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
