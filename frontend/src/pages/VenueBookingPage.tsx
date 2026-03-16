import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, DollarSign, MapPin, Building2,
  Users, Star, ArrowLeft, Send, AlertCircle
} from 'lucide-react';
import { venueService } from '@/services/venueService';
import toastService from '@/services/toastService';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { BookingSummaryModal } from '@/components/BookingSummaryModal';
import PaymentModal from '@/components/PaymentModal';

export default function VenueBookingPage() {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [venue, setVenue] = useState<any>(null);
  const [bookingData, setBookingData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    purpose: '',
    notes: '',
    expected_participants: ''
  });
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  
  // Payment flow states
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [pendingBooking, setPendingBooking] = useState<any>(null);

  useEffect(() => {
    if (venueId) {
      loadVenue();
      checkPendingBooking();
    }
  }, [venueId]);

  const loadVenue = async () => {
    try {
      setLoading(true);
      const response = await venueService.getVenueDetail(venueId!);
      setVenue(response.venue);
    } catch (error) {
      console.error('Error loading venue:', error);
      toastService.error('Failed to load venue details');
      navigate('/venues');
    } finally {
      setLoading(false);
    }
  };

  const checkPendingBooking = async () => {
    try {
      const response = await venueService.getPendingBooking(venueId!);
      if (response.pending_booking) {
        setPendingBooking(response);
      }
    } catch {
      // no pending booking or endpoint not available — ignore
    }
  };

  const handleResumePayment = () => {
    if (!pendingBooking) return;
    const { pending_booking, payment, expires_at } = pendingBooking;
    setPaymentData({
      bookingId: pending_booking.id,
      paymentId: payment?.id,
      paymentUrl: payment?.metadata?.payment_url,
      pidx: payment?.transaction_id,
      amount: parseFloat(pending_booking.amount),
      expiresAt: expires_at,
    });
    setShowPaymentModal(true);
  };

  useEffect(() => {
    if (venueId && bookingData.date) {
      loadAvailability();
    }
  }, [venueId, bookingData.date]);

  const loadAvailability = async () => {
    try {
      setLoadingAvailability(true);
      const data = await venueService.getVenueAvailability(venueId!, bookingData.date);
      setAvailabilities((data as any).availabilities || []);
      setExistingBookings((data as any).bookings || []);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Helper to parse "HH:MM:SS" or "HH:MM" to minutes from midnight
  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr || typeof timeStr !== 'string') {
      console.warn('Invalid timeStr provided to parseTimeToMinutes:', timeStr);
      return 0;
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper to convert minutes from midnight to "HH:MM"
  const formatMinutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Calculate effective free slots
  const getEffectiveAvailability = () => {
    if (!availabilities.length) return [];

    // Convert initial slots to minutes ranges
    let freeSlots = availabilities.map(slot => ({
      start: parseTimeToMinutes(slot.opening_time),
      end: parseTimeToMinutes(slot.closing_time),
      originalId: slot.id
    }));

    // Subtract booked slots
    existingBookings.forEach(booking => {
      // Basic booking status check - ignore cancelled/rejected
      if (['CANCELLED', 'REJECTED'].includes(booking.status)) return;

      const bookStart = parseTimeToMinutes(booking.start_time);
      const bookEnd = parseTimeToMinutes(booking.end_time);

      const nextFreeSlots = [];

      for (const slot of freeSlots) {
        // Check for overlap
        // Overlap if max(start1, start2) < min(end1, end2)
        const overlapStart = Math.max(slot.start, bookStart);
        const overlapEnd = Math.min(slot.end, bookEnd);

        if (overlapStart < overlapEnd) {
          // They overlap. Split the slot.

          // Part before booking
          if (slot.start < overlapStart) {
            nextFreeSlots.push({ start: slot.start, end: overlapStart, originalId: slot.originalId });
          }

          // Part after booking
          if (overlapEnd < slot.end) {
            nextFreeSlots.push({ start: overlapEnd, end: slot.end, originalId: slot.originalId });
          }
        } else {
          // No overlap, keep slot as is
          nextFreeSlots.push(slot);
        }
      }
      freeSlots = nextFreeSlots;
    });

    return freeSlots;
  };

  const effectiveAvailabilities = getEffectiveAvailability();

  const calculateCost = () => {
    if (!bookingData.start_time || !bookingData.end_time || !venue?.price_per_hour) {
      return 0;
    }

    const start = new Date(`2000-01-01T${bookingData.start_time}`);
    const end = new Date(`2000-01-01T${bookingData.end_time}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    return Math.max(0, hours * venue.price_per_hour);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingData.date || !bookingData.start_time || !bookingData.end_time || !bookingData.purpose) {
      toastService.error('Please fill in all required fields');
      return;
    }

    // Show booking summary modal for review
    setShowSummaryModal(true);
  };

  const handleConfirmBooking = async () => {
    try {
      setSubmitting(true);
      setShowSummaryModal(false);

      console.log('Creating booking with payment...');

      const response = await venueService.bookVenueWithPayment(venueId!, {
        date: bookingData.date,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        purpose: bookingData.purpose,
        notes: bookingData.notes
      });

      console.log('Booking response:', response);

      if (response.payment && response.payment_url) {
        // Store payment data and show payment modal
        const paymentInfo = {
          bookingId: response.booking.id,
          paymentId: response.payment.id,
          paymentUrl: response.payment_url,
          pidx: response.pidx,
          amount: parseFloat(response.payment.amount)
        };
        
        console.log('Setting payment data:', paymentInfo);
        setPaymentData(paymentInfo);
        
        console.log('Setting showPaymentModal to true');
        setShowPaymentModal(true);

        toastService.info('Please complete payment to confirm your booking');
      } else {
        console.error('Missing payment data in response:', response);
        toastService.error('Failed to initiate payment - missing payment data');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      console.error('Error response:', error.response);

      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 503 && data?.retry) {
        // Payment gateway is down but booking was saved
        toastService.warning(data.error || 'Payment gateway is temporarily unavailable. Your booking has been saved — please try again shortly.');
      } else {
        let errorMessage = 'Failed to create booking';
        if (data?.error) {
          errorMessage = data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        toastService.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    
    // Show detailed success message
    toastService.success(
      `Booking confirmed! ${venue?.name} is reserved for ${bookingData.date}. Check your notifications for updates.`
    );
    
    // Wait a moment for the user to see the success message
    setTimeout(() => {
      // Redirect to dashboard with success state
      navigate('/dashboard', { 
        state: { 
          bookingSuccess: true,
          venueName: venue?.name,
          bookingDate: bookingData.date,
          bookingTime: `${bookingData.start_time} - ${bookingData.end_time}`
        } 
      });
    }, 2000);
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    toastService.error('Payment failed. Please try again.');
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPaymentData(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!venue) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Venue Not Found</h2>
        <p className="text-gray-600 mb-4">The venue you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate('/venues')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Venues
        </button>
      </div>
    );
  }

  const totalCost = calculateCost();

  // Format countdown for pending booking
  const getPendingExpiry = () => {
    if (!pendingBooking?.expires_at) return '';
    const diff = new Date(pendingBooking.expires_at).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/venues')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book Venue</h1>
          <p className="text-gray-500 text-sm">Send a booking request to the venue owner</p>
        </div>
      </div>

      {/* Resume pending payment banner */}
      {pendingBooking && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">You have an incomplete booking</p>
              <p className="text-sm text-amber-700">
                {pendingBooking.pending_booking.date} &nbsp;
                {pendingBooking.pending_booking.start_time}–{pendingBooking.pending_booking.end_time}
                &nbsp;· expires in {getPendingExpiry()}
              </p>
            </div>
          </div>
          <button
            onClick={handleResumePayment}
            className="shrink-0 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            Pay Now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Venue Details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <div className="h-48 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
              <Building2 className="h-16 w-16 text-indigo-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{venue.name}</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{venue.location}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span>Capacity: {venue.capacity} people</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold text-gray-900">NPR {venue.price_per_hour}/hour</span>
              </div>

              {venue.rating && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span>{venue.rating.toFixed(1)} rating</span>
                </div>
              )}
            </div>

            {venue.sport_types && venue.sport_types.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Sports Available:</p>
                <div className="flex flex-wrap gap-1">
                  {venue.sport_types.map((sport: string) => (
                    <span key={sport} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                      {sport}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {venue.amenities && venue.amenities.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Amenities:</p>
                <div className="flex flex-wrap gap-1">
                  {venue.amenities.slice(0, 6).map((amenity: string) => (
                    <span key={amenity} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {amenity}
                    </span>
                  ))}
                  {venue.amenities.length > 6 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{venue.amenities.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Booking Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={bookingData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={bookingData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={bookingData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Expected Participants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Participants
                </label>
                <input
                  type="number"
                  value={bookingData.expected_participants}
                  onChange={(e) => handleInputChange('expected_participants', e.target.value)}
                  placeholder="Number of participants"
                  min="1"
                  max={venue.capacity}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Availability Display */}
            {bookingData.date && (
              <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Available Slots for {bookingData.date}
                </h3>

                {loadingAvailability ? (
                  <div className="text-sm text-blue-700 animate-pulse">Checking availability...</div>
                ) : effectiveAvailabilities.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {effectiveAvailabilities.map((slot: any, idx: number) => (
                        <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          {formatMinutesToTime(slot.start)} - {formatMinutesToTime(slot.end)}
                        </span>
                      ))}
                    </div>

                    {existingBookings.length > 0 && (
                      <div>
                        <p className="text-xs text-blue-700 mb-1">Booked times (Unavailable):</p>
                        <div className="flex flex-wrap gap-2">
                          {existingBookings.map((booking: any) => (
                            <span key={booking.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 decoration-line-through">
                              {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-blue-600 mt-2">
                      * Please choose a time within the available slots (green) and avoid booked times (red).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-blue-800">
                      {availabilities.length > 0
                        ? "All time slots for this date are currently booked."
                        : "No specific time slots are defined for this date."}
                    </p>
                    {availabilities.length === 0 && (
                      <p className="text-xs text-blue-600">
                        You can try to book any time, subject to venue approval.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Purpose */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purpose/Event Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bookingData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                placeholder="e.g., Badminton Tournament, Training Session, Corporate Event"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={bookingData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any special requirements, equipment needed, or additional information..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Cost Summary */}
            {totalCost > 0 && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Cost Estimate</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Duration: {bookingData.start_time && bookingData.end_time ?
                      `${((new Date(`2000-01-01T${bookingData.end_time}`).getTime() - new Date(`2000-01-01T${bookingData.start_time}`).getTime()) / (1000 * 60 * 60)).toFixed(1)} hours` :
                      '0 hours'
                    }
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    NPR {totalCost.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * Final cost will be confirmed by the venue owner
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/venues')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Review & Pay
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Booking Summary Modal */}
      {showSummaryModal && venue && (
        <BookingSummaryModal
          isOpen={showSummaryModal}
          venue={venue}
          date={bookingData.date}
          startTime={bookingData.start_time}
          endTime={bookingData.end_time}
          purpose={bookingData.purpose}
          onConfirm={handleConfirmBooking}
          onCancel={() => setShowSummaryModal(false)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentData && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentClose}
          amount={paymentData.amount}
          productName={`Venue Booking - ${venue?.name}`}
          paymentId={paymentData.paymentId}
          paymentUrl={paymentData.paymentUrl}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
    </div>
  );
}