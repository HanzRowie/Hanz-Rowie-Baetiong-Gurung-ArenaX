import { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Star,
  Crown,
  Target,
  Zap,
  Award,
  Shield,
  Flame,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { useAnimation } from '@/design-system/animations/AnimationProvider';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'tournament' | 'performance' | 'social' | 'milestone' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  icon: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  animated?: boolean;
  onClick?: (achievement: Achievement) => void;
}

const ACHIEVEMENT_ICONS = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  crown: Crown,
  target: Target,
  zap: Zap,
  award: Award,
  shield: Shield,
  flame: Flame,
  trending: TrendingUp,
  users: Users,
  calendar: Calendar,
};

const TIER_COLORS = {
  bronze: {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: 'text-amber-600',
    glow: 'shadow-amber-200',
  },
  silver: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-800',
    icon: 'text-gray-600',
    glow: 'shadow-gray-200',
  },
  gold: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    text: 'text-yellow-800',
    icon: 'text-yellow-600',
    glow: 'shadow-yellow-200',
  },
  platinum: {
    bg: 'bg-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-800',
    icon: 'text-purple-600',
    glow: 'shadow-purple-200',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-orange-100 to-red-100',
    border: 'border-orange-300',
    text: 'text-orange-800',
    icon: 'text-orange-600',
    glow: 'shadow-orange-200',
  },
};

const RARITY_EFFECTS = {
  common: '',
  rare: 'ring-2 ring-blue-200',
  epic: 'ring-2 ring-purple-200 animate-pulse',
  legendary: 'ring-2 ring-orange-200 animate-pulse shadow-lg',
};

const SIZE_CLASSES = {
  sm: {
    container: 'w-16 h-16',
    icon: 'h-6 w-6',
    text: 'text-xs',
    padding: 'p-2',
  },
  md: {
    container: 'w-20 h-20',
    icon: 'h-8 w-8',
    text: 'text-sm',
    padding: 'p-3',
  },
  lg: {
    container: 'w-24 h-24',
    icon: 'h-10 w-10',
    text: 'text-base',
    padding: 'p-4',
  },
};

export default function AchievementBadge({
  achievement,
  size = 'md',
  showProgress = false,
  animated = true,
  onClick
}: AchievementBadgeProps) {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { enableAnimations } = useAnimation();

  const IconComponent = ACHIEVEMENT_ICONS[achievement.icon as keyof typeof ACHIEVEMENT_ICONS] || Trophy;
  const tierColors = TIER_COLORS[achievement.tier];
  const sizeClasses = SIZE_CLASSES[size];
  const rarityEffect = RARITY_EFFECTS[achievement.rarity];

  useEffect(() => {
    if (achievement.unlocked && animated && enableAnimations) {
      setIsUnlocking(true);
      const timer = setTimeout(() => setIsUnlocking(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [achievement.unlocked, animated, enableAnimations]);

  const handleClick = () => {
    if (onClick) {
      onClick(achievement);
    }
  };

  const progressPercentage = Math.round((achievement.progress / achievement.maxProgress) * 100);

  return (
    <div className="relative group">
      <Card
        className={`
          ${sizeClasses.container} ${sizeClasses.padding}
          ${achievement.unlocked ? tierColors.bg : 'bg-gray-100'}
          ${achievement.unlocked ? tierColors.border : 'border-gray-300'}
          ${achievement.unlocked ? tierColors.glow : ''}
          ${rarityEffect}
          ${onClick ? 'cursor-pointer' : ''}
          ${isUnlocking ? 'animate-bounce' : ''}
          border-2 transition-all duration-300 hover:scale-105
          flex flex-col items-center justify-center relative overflow-hidden
        `}
        onClick={handleClick}
      >
        {/* Background pattern for legendary achievements */}
        {achievement.tier === 'legendary' && achievement.unlocked && (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-red-400 to-pink-400 animate-pulse" />
          </div>
        )}

        {/* Lock overlay for locked achievements */}
        {!achievement.unlocked && (
          <div className="absolute inset-0 bg-gray-200 bg-opacity-80 flex items-center justify-center">
            <Lock className="h-6 w-6 text-gray-500" />
          </div>
        )}

        {/* Achievement Icon */}
        <div className="relative z-10">
          <IconComponent 
            className={`
              ${sizeClasses.icon}
              ${achievement.unlocked ? tierColors.icon : 'text-gray-400'}
              ${isUnlocking ? 'animate-spin' : ''}
            `}
          />
        </div>

        {/* Tier indicator */}
        {achievement.unlocked && (
          <div className="absolute top-1 right-1">
            <div className={`w-2 h-2 rounded-full ${tierColors.bg.replace('bg-', 'bg-opacity-80 bg-')}`} />
          </div>
        )}

        {/* Rarity sparkles for epic/legendary */}
        {achievement.unlocked && (achievement.rarity === 'epic' || achievement.rarity === 'legendary') && (
          <div className="absolute inset-0 pointer-events-none">
            <Star className="absolute top-1 left-1 h-2 w-2 text-yellow-400 animate-pulse" />
            <Star className="absolute bottom-1 right-1 h-2 w-2 text-yellow-400 animate-pulse delay-500" />
          </div>
        )}
      </Card>

      {/* Progress bar */}
      {showProgress && !achievement.unlocked && achievement.progress > 0 && (
        <div className="absolute -bottom-2 left-0 right-0 px-1">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap max-w-xs">
          <div className="font-semibold">{achievement.title}</div>
          <div className="text-gray-300 mt-1">{achievement.description}</div>
          {!achievement.unlocked && (
            <div className="text-emerald-400 mt-1">
              Progress: {achievement.progress}/{achievement.maxProgress}
            </div>
          )}
          {achievement.unlocked && achievement.unlockedAt && (
            <div className="text-gray-400 mt-1">
              Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
            </div>
          )}
          <div className="text-yellow-400 mt-1">
            +{achievement.points} points
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>

      {/* Unlock animation effect */}
      {isUnlocking && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-yellow-400 opacity-50 animate-ping rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500 animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
}