/**
 * Intelligence Widget
 * Widget that displays smart recommendations and contextual information
 */

import React, { useState, useMemo } from 'react';
import { Brain, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { SmartRecommendations, InformationPriority } from '@/components/intelligence';
import { cn } from '@/design-system/utils/cn';
import type { BaseWidget } from '@/types/dashboard.types';
import type { Recommendation, PriorityItem } from '@/components/intelligence';

interface IntelligenceWidgetProps {
  widget: BaseWidget;
}

export function IntelligenceWidget({ widget }: IntelligenceWidgetProps) {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'priorities'>('recommendations');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock priority items - in real implementation, this would come from widget.data
  const priorityItems: PriorityItem[] = useMemo(() => {
    const now = Date.now();
    return [
      {
        id: 'tournament-deadline',
        content: 'Tournament registration closes in 2 hours',
        priority: 'high',
        category: 'Tournament',
        timestamp: new Date(now - 30 * 60 * 1000), // 30 minutes ago
        urgent: true,
        actionable: true,
        metadata: {
          source: 'Tournament System',
          confidence: 1.0,
          expiresAt: new Date(now + 2 * 60 * 60 * 1000), // 2 hours from now
        },
      },
      {
        id: 'match-reminder',
        content: 'Your match against Sarah Wilson starts in 1 hour',
        priority: 'high',
        category: 'Schedule',
        timestamp: new Date(now - 15 * 60 * 1000), // 15 minutes ago
        actionable: true,
        metadata: {
          source: 'Match Scheduler',
          confidence: 1.0,
        },
      },
      {
        id: 'profile-incomplete',
        content: 'Complete your profile to get better match recommendations',
        priority: 'medium',
        category: 'Profile',
        timestamp: new Date(now - 60 * 60 * 1000), // 1 hour ago
        actionable: true,
        metadata: {
          source: 'Profile System',
          confidence: 0.8,
        },
      },
      {
        id: 'new-feature',
        content: 'New tournament bracket visualization is now available',
        priority: 'info',
        category: 'Features',
        timestamp: new Date(now - 2 * 60 * 60 * 1000), // 2 hours ago
        metadata: {
          source: 'System Updates',
          confidence: 1.0,
        },
      },
    ];
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleRecommendationClick = (recommendation: Recommendation) => {
    console.log('Recommendation clicked:', recommendation);
  };

  const handleRecommendationDismiss = (recommendationId: string) => {
    console.log('Recommendation dismissed:', recommendationId);
  };

  const handlePriorityItemClick = (item: PriorityItem) => {
    console.log('Priority item clicked:', item);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Smart Insights
          </h3>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'recommendations'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          )}
        >
          Recommendations
        </button>
        <button
          onClick={() => setActiveTab('priorities')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'priorities'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          )}
        >
          Priorities
          {priorityItems.filter(item => item.urgent || item.priority === 'critical').length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {priorityItems.filter(item => item.urgent || item.priority === 'critical').length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'recommendations' ? (
          <SmartRecommendations
            maxRecommendations={widget.config?.maxRecommendations || 3}
            showPriority={widget.config?.showPriority !== false}
            onRecommendationClick={handleRecommendationClick}
            onRecommendationDismiss={handleRecommendationDismiss}
          />
        ) : (
          <InformationPriority
            items={priorityItems}
            layout="list"
            showTimestamps={true}
            showCategories={true}
            maxItems={widget.config?.maxPriorityItems || 5}
            onItemClick={handlePriorityItemClick}
          />
        )}
      </div>

      {/* Widget Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
          <span>
            {activeTab === 'recommendations' ? 'AI-powered' : 'Real-time'}
          </span>
        </div>
      </div>
    </div>
  );
}