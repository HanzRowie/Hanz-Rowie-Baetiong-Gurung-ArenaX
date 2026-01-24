import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { ArrowRight, Calendar, Settings } from 'lucide-react';

const RefereeBookingsPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/referee/management', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="space-y-6">
      <Card className="p-8 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-purple-600" />
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Bookings Page Moved
        </h2>
        
        <p className="text-gray-600 mb-6">
          The bookings functionality has been moved to the Assignment Management page 
          for a better experience. You'll be redirected automatically.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate('/referee/management')}
            className="flex items-center space-x-2 bg-purple-600 text-white hover:bg-purple-700"
          >
            <Settings className="w-4 h-4" />
            <span>Go to Assignment Management</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="secondary"
            onClick={() => navigate('/referee/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          Redirecting in 3 seconds...
        </p>
      </Card>
    </div>
  );
};

export default RefereeBookingsPage;