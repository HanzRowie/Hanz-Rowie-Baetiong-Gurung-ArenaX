import React, { useState } from 'react';
import { VenuePriceCalculator } from './VenuePriceCalculator';

interface BookingSummaryModalProps {
  isOpen: boolean;
  venue: any;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BookingSummaryModal: React.FC<BookingSummaryModalProps> = ({
  isOpen,
  venue,
  date,
  startTime,
  endTime,
  purpose,
  onConfirm,
  onCancel
}) => {
  const [totalAmount, setTotalAmount] = useState(0);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateDuration = () => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onCancel}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="w-full">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Your Booking</h2>

                {/* Venue Info */}
                <div className="mb-6">
                  {venue.image && (
                    <img 
                      src={venue.image} 
                      alt={venue.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="text-xl font-semibold text-gray-900">{venue.name}</h3>
                  <p className="text-gray-600">{venue.location}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {venue.sport_type}
                  </span>
                </div>

                {/* Booking Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📅</span>
                    <div>
                      <div className="text-sm text-gray-600">Date</div>
                      <div className="font-medium">{formatDate(date)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏰</span>
                    <div>
                      <div className="text-sm text-gray-600">Time</div>
                      <div className="font-medium">{startTime} - {endTime}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏱️</span>
                    <div>
                      <div className="text-sm text-gray-600">Duration</div>
                      <div className="font-medium">{calculateDuration()} hours</div>
                    </div>
                  </div>

                  {purpose && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📝</span>
                      <div>
                        <div className="text-sm text-gray-600">Purpose</div>
                        <div className="font-medium">{purpose}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Calculator */}
                <VenuePriceCalculator
                  venueId={venue.id}
                  startTime={startTime}
                  endTime={endTime}
                  onCalculated={setTotalAmount}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Proceed to Payment
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
