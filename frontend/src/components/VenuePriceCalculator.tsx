import React, { useEffect, useState } from 'react';
import { venueService } from '@/services';

interface PriceCalculatorProps {
  venueId: string;
  startTime: string;
  endTime: string;
  onCalculated?: (total: number) => void;
}

export const VenuePriceCalculator: React.FC<PriceCalculatorProps> = ({
  venueId,
  startTime,
  endTime,
  onCalculated
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
      onCalculated?.(response.breakdown.total);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate price');
      console.error('Price calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!priceData) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Price Breakdown</h3>
      
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
        
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-primary-600">
              NPR {priceData.breakdown.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-xs text-gray-600">
        <div className="flex items-start gap-2">
          <span className="text-base">🔒</span>
          <span>{priceData.policies.payment_protection}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-base">🔄</span>
          <span>{priceData.policies.cancellation}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-base">✅</span>
          <span>Instant confirmation after payment</span>
        </div>
      </div>
    </div>
  );
};
