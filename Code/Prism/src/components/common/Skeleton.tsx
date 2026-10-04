

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 3 }: SkeletonProps) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded mb-2 skeleton-shimmer"
          style={{ width: `${[75, 90, 60, 80, 70][i % 5]}%` }}
        />
      ))}
    </div>
  );
}
