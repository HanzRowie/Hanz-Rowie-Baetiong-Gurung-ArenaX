interface LoadingSkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'chart';
}

export default function LoadingSkeleton({ className = '', variant = 'card' }: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const variants = {
    card: 'h-32 w-full',
    text: 'h-4 w-3/4',
    circle: 'h-12 w-12 rounded-full',
    chart: 'h-48 w-full',
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`}>
      {variant === 'chart' && (
        <div className="p-6 space-y-4">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-300 rounded"></div>
            <div className="h-3 bg-gray-300 rounded w-5/6"></div>
            <div className="h-3 bg-gray-300 rounded w-4/6"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column Skeleton */}
      <div className="lg:col-span-2 space-y-6">
        {/* Next Tournament Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <LoadingSkeleton variant="text" className="w-48" />
            <LoadingSkeleton variant="text" className="w-32" />
          </div>
          <div className="flex items-center justify-between">
            <LoadingSkeleton variant="circle" />
            <LoadingSkeleton variant="circle" className="h-8 w-8" />
            <LoadingSkeleton variant="circle" />
          </div>
        </div>

        {/* Statistics Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <LoadingSkeleton variant="text" className="w-32" />
            <LoadingSkeleton variant="text" className="w-16" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LoadingSkeleton variant="chart" />
            <LoadingSkeleton variant="chart" />
          </div>
        </div>
      </div>

      {/* Right Column Skeleton */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl shadow-lg text-white overflow-hidden">
          <div className="p-6">
            <LoadingSkeleton className="h-6 w-48 bg-white bg-opacity-20" />
            <LoadingSkeleton className="h-4 w-32 bg-white bg-opacity-20 mt-2" />
          </div>
          <div className="flex justify-end pr-6">
            <LoadingSkeleton className="w-48 h-48 bg-white bg-opacity-20" />
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-sm p-6 mt-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <LoadingSkeleton className="h-4 w-20 bg-white bg-opacity-20" />
                <LoadingSkeleton className="h-4 w-16 bg-white bg-opacity-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}