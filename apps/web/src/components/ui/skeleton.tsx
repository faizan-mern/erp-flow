// Reusable skeleton primitives for loading states.
// Use TableSkeleton on any table page — pass the same headers the real table uses.

interface TableSkeletonProps {
  headers: string[]
  rows?: number
}

export function StatCardSkeleton() {
  return (
    <div className="p-5 flex flex-col gap-3 bg-surface rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 animate-pulse bg-divider rounded" />
        <div className="h-6 w-6 animate-pulse bg-divider rounded-md" />
      </div>
      <div className="h-7 w-20 animate-pulse bg-divider rounded" />
      <div className="h-2.5 w-16 animate-pulse bg-divider rounded opacity-60" />
    </div>
  )
}

export function TableSkeleton({ headers, rows = 6 }: TableSkeletonProps) {
  return (
    <table className="w-full text-[13px]">
      <thead className="border-b border-border">
        <tr>
          {headers.map((h) => (
            <th
              key={h}
              className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-divider">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <tr key={rowIdx}>
            {headers.map((_, colIdx) => (
              <td key={colIdx} className="px-5 py-4">
                {colIdx === 0 ? (
                  // First column: two stacked bars (title + sub-label)
                  <div className="space-y-1.5">
                    <div className="h-3 w-36 animate-pulse bg-divider rounded" />
                    <div className="h-2.5 w-20 animate-pulse bg-divider rounded opacity-60" />
                  </div>
                ) : colIdx === headers.length - 1 ? (
                  // Last column (Actions): short bar
                  <div className="h-3 w-12 animate-pulse bg-divider rounded" />
                ) : (
                  // Middle columns: medium bar, slightly different widths per row so it looks natural
                  <div
                    className={`h-3 animate-pulse bg-divider rounded ${
                      rowIdx % 3 === 0 ? 'w-24' : rowIdx % 3 === 1 ? 'w-20' : 'w-28'
                    }`}
                  />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
