import React, { useEffect, useState } from 'react';
import { venueService } from '@/services';
import { DollarSign, Clock, AlertCircle } from 'lucide-react';

interface VenueCostPreviewProps {
  venueId: string;
  venueName: string;
  startTime: string;
  endTime: string;
  entryFee?: string;
  maxParticipants?: string;
}

export const VenueCostPreview: React.FC<VenueCostPreviewProps> = ({
  venueId,
  venueName,
  startTime,
  endTime,
  entryFee,
  maxParticipants
}) => {
  const [loading, setLoading] = useState(false);
  const [priceData, setPriceData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startTime && endTime && venueId) {
      calculatePrice();
    }
  }, [startTime, endTime, venueId]);

  const calculatePrice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await venueService.calculateBookingCost(venueId, {
        start_time: startTime,
        end_time: endTime
      });
      
      setPriceData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate price');
      console.error('Price calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenue = () => {
    if (!entryFee || !maxParticipants) return null;
    
    const fee = Number.parseFloat(entryFee);
    const participants = Number.parseInt(maxParticipants);
    
    if (Number.isNaN(fee) || Number.isNaN(participants)) return null;
    
    return fee * participants;
  };

  const calculateNetProfit = () => {
    const revenue = calculateRevenue();
    if (!revenue || !priceData) return null;
    
    return revenue - priceData.breakdown.total;
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-blue-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!priceData) {
    return null;
  }

  const revenue = calculateRevenue();
  const netProfit = calculateNetProfit();

  return (
    <div className="space-y-4">
      {/* Venue Cost */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold text-blue-900">Venue Cost</h4>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              NPR {priceData.venue.price_per_hour.toLocaleString()}/hr × {priceData.duration_hours} hrs
            </span>
            <span className="font-medium">
              NPR {priceData.breakdown.base_price.toLocaleString()}
            </span>
          </div>
          
          <div className="flex justify-between text-sm text-gray-500">
            <span>Service Fee ({priceData.breakdown.service_fee_percentage}%)</span>
            <span>NPR {priceData.breakdown.service_fee.toLocaleString()}</span>
          </div>
          
          <div className="border-t border-blue-200 pt-2 mt-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Total Venue Cost</span>
              <span className="text-blue-600">
                NPR {priceData.breakdown.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <Clock className="h-3 w-3" />
            <span>Payment required before tournament goes live</span>
          </div>
        </div>
      </div>

      {/* Revenue Estimate */}
      {revenue !== null && (
        <div className={`border rounded-lg p-4 ${
          netProfit && netProfit >= 0 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className={`h-5 w-5 ${
              netProfit && netProfit >= 0 ? 'text-green-600' : 'text-yellow-600'
            }`} />
            <h4 className={`font-semibold ${
              netProfit && netProfit >= 0 ? 'text-green-900' : 'text-yellow-900'
            }`}>
              Revenue Estimate
            </h4>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                Entry Fees ({maxParticipants} players × NPR {parseFloat(entryFee).toLocaleString()})
              </span>
              <span className="font-medium text-green-600">
                + NPR {revenue.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Venue Cost</span>
              <span className="font-medium text-red-600">
                - NPR {priceData.breakdown.total.toLocaleString()}
              </span>
            </div>
            
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Net Profit</span>
                <span className={netProfit && netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  NPR {netProfit?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {netProfit !== null && netProfit < 0 && (
            <div className="mt-3 pt-3 border-t border-yellow-200">
              <div className="flex items-center gap-2 text-xs text-yellow-700">
                <AlertCircle className="h-3 w-3" />
                <span>Consider increasing entry fee or reducing venue duration</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>🔒</span>
            <span>Secure payment via Khalti</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>Instant venue confirmation after payment</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔄</span>
            <span>Free cancellation up to 48 hours before</span>
          </div>
        </div>
      </div>
    </div>
  );
};
