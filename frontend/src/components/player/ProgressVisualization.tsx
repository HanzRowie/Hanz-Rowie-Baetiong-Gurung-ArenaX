import { useState, useEffect } from 'react';
import {
  Trophy,
  Star,
  Target,
  Award,
  Crown,
  Medal,
  Zap,
  TrendingUp,
  CheckCircle,
  Lock,
  Gift,
  Calendar,
  Users,
  BarChart3,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { LinearProgress } from '@/components/charts/ProgressIndicator';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  type: 'tournament' | 'skill' | 'achievement' | 'social' | 'special';
  requirement: number;
  currentProgress: number;
  completed: boolean;
  completedAt?: string;
  reward: {
    type: 'points' | 'badge' | 'title' | 'unlock';
    value: string | number;
    description: string;
  };
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface ProgressPath {
  id: string;
  title: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'master';
  milestones: Milestone[];
  totalProgress: number;
  maxProgress: number;
  estimatedTimeToComplete?: string;
  benefits: string[];
}

interface ProgressVisualizationProps {
  progressPaths: ProgressPath[];
  selectedPathId?: string;
  onPathSelect?: (pathId: string) => void;
  onMilestoneClick?: (milestone: Milestone) => void;
}

const MILESTONE_ICONS = {
  trophy: Trophy,
  star: Star,
  target: Target,
  award: Award,
  crown: Crown,
  medal: Medal,
  zap: Zap,
  trending: TrendingUp,
  gift: Gift,
  calendar: Calendar,
  users: Users,
  chart: BarChart3,
};

const RARITY_COLORS = {
  common: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-800',
    icon: 'text-gray-600',
  },
  rare: {
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-800',
    icon: 'text-blue-600',
  },
  epic: {
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-800',
    icon: 'text-purple-600',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-orange-100 to-red-100',
    border: 'border-orange-300',
    text: 'text-orange-800',
    icon: 'text-orange-600',
  },
};

const CATEGORY_COLORS = {
  beginner: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  intermediate: 'bg-blue-100 text-blue-800 border-blue-200',
  advanced: 'bg-purple-100 text-purple-800 border-purple-200',
  master: 'bg-orange-100 text-orange-800 border-orange-200',
};

export default function ProgressVisualization({
  progressPaths,
  selectedPathId,
  onPathSelect,
  onMilestoneClick
}: ProgressVisualizationProps) {
  const [selectedPath, setSelectedPath] = useState<ProgressPath | null>(null);
  const [animatedProgress, setAnimatedProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    if (selectedPathId) {
      const path = progressPaths.find(p => p.id === selectedPathId);
      setSelectedPath(path || null);
    } else if (progressPaths.length > 0) {
      setSelectedPath(progressPaths[0]);
    }
  }, [selectedPathId, progressPaths]);

  useEffect(() => {
    if (selectedPath) {
      // Animate milestone progress
      const duration = 1000;
      const steps = 50;
      const stepDuration = duration / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);

        const newAnimatedProgress: Record<string, number> = {};
        selectedPath.milestones.forEach(milestone => {
          newAnimatedProgress[milestone.id] = Math.round(
            milestone.currentProgress * easeOutQuart
          );
        });

        setAnimatedProgress(newAnimatedProgress);

        if (currentStep >= steps) {
          clearInterval(timer);
          const finalProgress: Record<string, number> = {};
          selectedPath.milestones.forEach(milestone => {
            finalProgress[milestone.id] = milestone.currentProgress;
          });
          setAnimatedProgress(finalProgress);
        }
      }, stepDuration);

      return () => clearInterval(timer);
    }
  }, [selectedPath]);

  const handlePathSelect = (path: ProgressPath) => {
    setSelectedPath(path);
    onPathSelect?.(path.id);
  };

  const getCompletedMilestones = (path: ProgressPath) => {
    return path.milestones.filter(m => m.completed).length;
  };

  const getNextMilestone = (path: ProgressPath) => {
    return path.milestones.find(m => !m.completed);
  };

  const getMilestoneProgressPercentage = (milestone: Milestone) => {
    return Math.min(100, Math.round((milestone.currentProgress / milestone.requirement) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Path Selection */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Progress Paths</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {progressPaths.map((path) => {
            const completedMilestones = getCompletedMilestones(path);
            const progressPercentage = Math.round((path.totalProgress / path.maxProgress) * 100);
            const isSelected = selectedPath?.id === path.id;

            return (
              <Card
                key={path.id}
                className={`p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 bg-emerald-50'
                    : 'hover:shadow-md hover:scale-105'
                }`}
                onClick={() => handlePathSelect(path)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${CATEGORY_COLORS[path.category]}`}>
                    {path.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {completedMilestones}/{path.milestones.length}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2">{path.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{path.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">{progressPercentage}%</span>
                  </div>
                  <LinearProgress
                    value={progressPercentage}
                    max={100}
                    color="primary"
                  />
                </div>

                {path.estimatedTimeToComplete && (
                  <p className="text-xs text-gray-500 mt-2">
                    Est. {path.estimatedTimeToComplete} to complete
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Selected Path Details */}
      {selectedPath && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Path Overview */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{selectedPath.title}</h3>
            <p className="text-gray-600 mb-6">{selectedPath.description}</p>

            {/* Overall Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm text-gray-600">
                  {getCompletedMilestones(selectedPath)}/{selectedPath.milestones.length} completed
                </span>
              </div>
              <LinearProgress
                value={Math.round((selectedPath.totalProgress / selectedPath.maxProgress) * 100)}
                max={100}
                color="primary"
                size="lg"
              />
            </div>

            {/* Next Milestone */}
            {(() => {
              const nextMilestone = getNextMilestone(selectedPath);
              if (nextMilestone) {
                const IconComponent = MILESTONE_ICONS[nextMilestone.icon as keyof typeof MILESTONE_ICONS] || Target;
                const rarityColors = RARITY_COLORS[nextMilestone.rarity];

                return (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Next Milestone</h4>
                    <div className={`p-4 rounded-lg border ${rarityColors.bg} ${rarityColors.border}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <IconComponent className={`h-5 w-5 ${rarityColors.icon}`} />
                        <span className={`font-medium ${rarityColors.text}`}>{nextMilestone.title}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{nextMilestone.description}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">
                            {animatedProgress[nextMilestone.id] || 0}/{nextMilestone.requirement}
                          </span>
                        </div>
                        <LinearProgress
                          value={getMilestoneProgressPercentage(nextMilestone)}
                          max={100}
                          color="primary"
                        />
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Benefits */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Path Benefits</h4>
              <ul className="space-y-2">
                {selectedPath.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Milestone Timeline */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Milestone Timeline</h3>
              
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                
                <div className="space-y-6">
                  {selectedPath.milestones.map((milestone, index) => {
                    const IconComponent = MILESTONE_ICONS[milestone.icon as keyof typeof MILESTONE_ICONS] || Target;
                    const rarityColors = RARITY_COLORS[milestone.rarity];
                    const progressPercentage = getMilestoneProgressPercentage(milestone);
                    const isCompleted = milestone.completed;
                    const isNext = !isCompleted && index === selectedPath.milestones.findIndex(m => !m.completed);

                    return (
                      <div key={milestone.id} className="relative flex items-start gap-4">
                        {/* Timeline node */}
                        <div className={`
                          relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                          ${isCompleted 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : isNext
                            ? 'bg-white border-blue-500 ring-4 ring-blue-100'
                            : 'bg-white border-gray-300'
                          }
                        `}>
                          {isCompleted ? (
                            <CheckCircle className="h-6 w-6 text-white" />
                          ) : isNext ? (
                            <IconComponent className="h-6 w-6 text-blue-500" />
                          ) : (
                            <Lock className="h-6 w-6 text-gray-400" />
                          )}
                        </div>

                        {/* Milestone content */}
                        <div className="flex-1 min-w-0">
                          <Card 
                            className={`p-4 transition-all duration-300 ${
                              isNext ? 'ring-2 ring-blue-200 bg-blue-50' : ''
                            } ${
                              isCompleted ? 'bg-emerald-50 border-emerald-200' : ''
                            }`}
                            onClick={() => onMilestoneClick?.(milestone)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${rarityColors.bg} ${rarityColors.border} ${rarityColors.text}`}>
                                  {milestone.rarity}
                                </span>
                              </div>
                              {isCompleted && milestone.completedAt && (
                                <span className="text-xs text-emerald-600">
                                  Completed {new Date(milestone.completedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>

                            {/* Progress */}
                            {!isCompleted && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-600">Progress</span>
                                  <span className="font-medium">
                                    {animatedProgress[milestone.id] || 0}/{milestone.requirement}
                                  </span>
                                </div>
                                <LinearProgress
                                  value={progressPercentage}
                                  max={100}
                                  color="primary"
                                />
                              </div>
                            )}

                            {/* Reward */}
                            <div className="flex items-center gap-2 text-sm">
                              <Gift className="h-4 w-4 text-amber-500" />
                              <span className="text-gray-600">Reward:</span>
                              <span className="font-medium text-amber-600">
                                {milestone.reward.description}
                              </span>
                            </div>
                          </Card>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}