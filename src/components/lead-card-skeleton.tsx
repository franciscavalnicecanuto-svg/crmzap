'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function LeadCardSkeleton() {
  return (
    <div className="p-2 rounded-lg border bg-card">
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          {/* Name */}
          <Skeleton className="h-3.5 w-24 mb-1" />
          {/* Last message */}
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      
      {/* Tags placeholder */}
      <div className="flex gap-1 mt-2">
        <Skeleton className="h-4 w-12 rounded" />
        <Skeleton className="h-4 w-10 rounded" />
      </div>
    </div>
  )
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex-shrink-0 w-40 flex flex-col">
      {/* Column header */}
      <Skeleton className="h-8 w-full rounded-md mb-2" />
      
      {/* Cards */}
      <div className="space-y-1.5">
        <LeadCardSkeleton />
        <LeadCardSkeleton />
        <LeadCardSkeleton />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex gap-2 p-2 overflow-hidden">
      <KanbanColumnSkeleton />
      <KanbanColumnSkeleton />
      <KanbanColumnSkeleton />
      <KanbanColumnSkeleton />
    </div>
  )
}
