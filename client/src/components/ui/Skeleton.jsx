export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="td">
          <div className="h-4 bg-bg-tertiary rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-3 bg-bg-tertiary rounded w-1/2 mb-3" />
      <div className="h-7 bg-bg-tertiary rounded w-3/4" />
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex gap-4">
            <div className="h-4 bg-bg-tertiary rounded flex-1" />
            <div className="h-4 bg-bg-tertiary rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
