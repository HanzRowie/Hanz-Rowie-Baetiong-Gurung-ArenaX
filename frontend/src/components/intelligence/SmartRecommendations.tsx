/**
 * Smart Recommendations Component
 * AI-powered recommendations based on user behavior and context
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  Users, 
  Calendar, 
  Trophy, 
  MapPin,
  X,
  ChevronRight,
  Star
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { cn } from '@/design-system/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';

export interface Recommendation {
  id: string;
  type: 'action' | 'insight' | 'opportunity' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  icon: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: {
    confidence: number;
    category: string;
    timeRelevant?: boolean;
  };
  dismissible?: boolean;
}

interface SmartRecommendationsProps {
  className?: string;
  maxRecommendations?: number;
  showPriority?: boolean;
  onRecommendationClick?: (recommendation: Recommendation) => void;
  onRecommendationDismiss?: (recommendationId: string) => void;
}

export function SmartRecommendations({
  className,
  maxRecommendations = 5,
  showPriority = true,
  onRecommendationClick,
  onRecommendationDismiss,
}: SmartRecommendationsProps) {
  const { user } = useAuth();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Generate role-specific recommendations using useMemo to avoid setState in effect
  const recommendations = useMemo((): Recommendation[] => {
    if (!user) return [];

    const generateRecommendations = (): Recommendation[] => {
      const baseRecommendations: Recommendation[] = [];

      switch (user.role) {
        case UserRole.PLAYER:
          baseRecommendations.push(
            {
              id: 'player-tournament-match',
              type: 'opportunity',
              priority: 'high',
              title: 'Perfect Tournament Match Found',
              description: 'City Championship matches your skill level and preferred sport',
              icon: 'trophy',
              action: {
                label: 'View Tournament',
                onClick: () => console.log('Navigate to tournament')
              },
              metadata: {
                confidence: 0.92,
                category: 'tournaments',
                timeRelevant: true
              },
              dismissible: true
            },
            {
              id: 'player-practice-partner',
              type: 'insight',
              priority: 'medium',
              title: 'Find Practice Partners',
              description: 'Connect with 3 players near you with similar skill levels',
              icon: 'users',
              action: {
                label: 'Find Players',
                onClick: () => console.log('Navigate to players')
              },
              metadata: {
                confidence: 0.78,
                category: 'social'
              },
              dismissible: true
            },
            {
              id: 'player-performance-trend',
              type: 'insight',
              priority: 'medium',
              title: 'Performance Trending Up',
              description: 'Your win rate increased 15% this month. Keep up the momentum!',
              icon: 'trending-up',
              metadata: {
                confidence: 0.95,
                category: 'performance'
              },
              dismissible: true
            }
          );
          break;

        case UserRole.ORGANIZER:
          baseRecommendations.push(
            {
              id: 'organizer-venue-booking',
              type: 'action',
              priority: 'high',
              title: 'Book Venue for Upcoming Tournament',
              description: 'Elite Sports Center has availability for your tournament date',
              icon: 'map-pin',
              action: {
                label: 'Book Now',
                onClick: () => console.log('Navigate to venue booking')
              },
              metadata: {
                confidence: 0.88,
                category: 'logistics',
                timeRelevant: true
              },
              dismissible: true
            },
            {
              id: 'organizer-registration-boost',
              type: 'optimization',
              priority: 'medium',
              title: 'Boost Tournament Registration',
              description: 'Add early bird discount to increase registrations by ~30%',
              icon: 'trending-up',
              action: {
                label: 'Add Discount',
                onClick: () => console.log('Navigate to tournament settings')
              },
              metadata: {
                confidence: 0.73,
                category: 'marketing'
              },
              dismissible: true
            }
          );
          break;

        case UserRole.VENUE_OWNER:
          baseRecommendations.push(
            {
              id: 'venue-pricing-optimization',
              type: 'optimization',
              priority: 'high',
              title: 'Optimize Peak Hour Pricing',
              description: 'Increase evening rates by 20% to maximize revenue',
              icon: 'trending-up',
              action: {
                label: 'Adjust Pricing',
                onClick: () => console.log('Navigate to pricing')
              },
              metadata: {
                confidence: 0.82,
                category: 'revenue'
              },
              dismissible: true
            },
            {
              id: 'venue-maintenance-reminder',
              type: 'action',
              priority: 'medium',
              title: 'Schedule Court Maintenance',
              description: 'Court 2 is due for maintenance based on usage patterns',
              icon: 'calendar',
              action: {
                label: 'Schedule',
                onClick: () => console.log('Navigate to maintenance')
              },
              metadata: {
                confidence: 0.76,
                category: 'maintenance'
              },
              dismissible: true
            }
          );
          break;
      }

      return baseRecommendations
        .filter(rec => !dismissedIds.has(rec.id))
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .slice(0, maxRecommendations);
    };

    // Use a callback to avoid setState in effect
    const newRecommendations = generateRecommendations();
    return newRecommendations;
  }, [user, dismissedIds, maxRecommendations]);

  const getIcon = (iconName: string) => {
    const iconClass = "h-5 w-5";
    
    switch (iconName) {
      case 'trophy':
        return <Trophy className={iconClass} />;
      case 'users':
        return <Users className={iconClass} />;
      case 'trending-up':
        return <TrendingUp className={iconClass} />;
      case 'calendar':
        return <Calendar className={iconClass} />;
      case 'map-pin':
        return <MapPin className={iconClass} />;
      case 'star':
        return <Star className={iconClass} />;
      default:
        return <Lightbulb className={iconClass} />;
    }
  };

  const getPriorityColor = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getTypeIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'action':
        return '⚡';
      case 'insight':
        return '💡';
      case 'opportunity':
        return '🎯';
      case 'optimization':
        return '📈';
    }
  };

  const handleRecommendationClick = (recommendation: Recommendation) => {
    onRecommendationClick?.(recommendation);
    if (recommendation.action) {
      recommendation.action.onClick();
    }
  };

  const handleDismiss = (recommendationId: string) => {
    setDismissedIds(prev => new Set([...prev, recommendationId]));
    onRecommendationDismiss?.(recommendationId);
  };

  if (recommendations.length === 0) {
    return (
      <Card className={cn('p-6 text-center', className)}>
        <Lightbulb className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          All Caught Up!
        </h3>
        <p className="text-gray-600">
          No new recommendations at the moment. Check back later for personalized insights.
        </p>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Smart Recommendations
        </h3>
      </div>

      {recommendations.map((recommendation) => (
        <Card
          key={recommendation.id}
          className={cn(
            'p-4 border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md',
            getPriorityColor(recommendation.priority)
          )}
          onClick={() => handleRecommendationClick(recommendation)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-1">
                {getIcon(recommendation.icon)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">
                    {getTypeIcon(recommendation.type)}
                  </span>
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {recommendation.title}
                  </h4>
                  {showPriority && (
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      recommendation.priority === 'high' && 'bg-red-100 text-red-800',
                      recommendation.priority === 'medium' && 'bg-yellow-100 text-yellow-800',
                      recommendation.priority === 'low' && 'bg-blue-100 text-blue-800'
                    )}>
                      {recommendation.priority}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {recommendation.description}
                </p>
                
                {recommendation.metadata && (
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>
                      Confidence: {Math.round(recommendation.metadata.confidence * 100)}%
                    </span>
                    {recommendation.metadata.timeRelevant && (
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                        Time sensitive
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-3">
              {recommendation.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    recommendation.action!.onClick();
                  }}
                >
                  {recommendation.action.label}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
              
              {recommendation.dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(recommendation.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}