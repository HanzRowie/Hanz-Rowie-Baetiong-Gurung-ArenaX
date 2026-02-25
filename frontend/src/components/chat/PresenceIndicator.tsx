/**
 * PresenceIndicator Component
 * 
 * Displays online/offline status with a colored dot.
 * Shows last seen timestamp for offline users.
 * Updates in real-time via WebSocket.
 * 
 * Requirements: 6.5, 6.6
 */

import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { usePresence } from '@/hooks/usePresence';

interface PresenceIndicatorProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  showLastSeen?: boolean;
  showLabel?: boolean;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  userId,
  size = 'medium',
  showLastSeen = false,
  showLabel = false
}) => {
  const { presenceMap } = usePresence([userId]);
  const [presence, setPresence] = useState(presenceMap.get(userId));

  // Update presence when map changes
  useEffect(() => {
    setPresence(presenceMap.get(userId));
  }, [presenceMap, userId]);

  // Size classes
  const sizeClasses = {
    small: 'h-2.5 w-2.5',
    medium: 'h-3 w-3',
    large: 'h-4 w-4'
  };

  const dotSize = sizeClasses[size];
  const isOnline = presence?.is_online ?? false;

  // Format last seen
  const getLastSeenText = (): string => {
    if (!presence?.last_seen) return 'Last seen unknown';
    
    try {
      return `Last seen ${formatDistanceToNow(new Date(presence.last_seen), { addSuffix: true })}`;
    } catch {
      return 'Last seen recently';
    }
  };

  // Render just the dot
  if (!showLastSeen && !showLabel) {
    return (
      <div
        className={`
          ${dotSize} rounded-full border-2 border-white
          ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
        `}
        title={isOnline ? 'Online' : getLastSeenText()}
        aria-label={isOnline ? 'Online' : 'Offline'}
      />
    );
  }

  // Render with label or last seen
  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          ${dotSize} rounded-full
          ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
        `}
        aria-label={isOnline ? 'Online' : 'Offline'}
      />
      
      {showLabel && (
        <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
      
      {showLastSeen && !isOnline && (
        <span className="text-xs text-gray-500">
          {getLastSeenText()}
        </span>
      )}
    </div>
  );
};

export default PresenceIndicator;
