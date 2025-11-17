'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/shared/ui/skeleton';
import { Card, CardContent } from '@/shared/ui/card';
import QuickMoodButton from '@/features/mood/components/QuickMoodButton';
import MoodHistory from '@/features/mood/components/MoodHistory';
import MoodTrends from '@/features/mood/components/MoodTrends';

/**
 * Enhanced Mood Page - Complete mood tracking experience
 *
 * Features:
 * - QuickMoodButton: Floating action button for quick logging
 * - MoodTrends: 7-day visualization with statistics
 * - MoodHistory: Timeline with swipe-to-delete and inline editing
 */
export default function EnhancedMoodPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rastreamento de Humor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitore seu estado emocional ao longo do tempo
          </p>
        </div>

        {/* Desktop: Show QuickMoodButton inline */}
        <div className="hidden md:block">
          <QuickMoodButton />
        </div>
      </motion.div>

      {/* Trends Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Suspense fallback={<TrendsSkeleton />}>
          <MoodTrends />
        </Suspense>
      </motion.div>

      {/* History Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Suspense fallback={<HistorySkeleton />}>
          <MoodHistory />
        </Suspense>
      </motion.div>

      {/* Mobile: Show QuickMoodButton as FAB */}
      <div className="md:hidden">
        <QuickMoodButton />
      </div>
    </div>
  );
}

// Loading skeletons
function TrendsSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex justify-between items-end h-32 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <Skeleton key={i} className="flex-1 h-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Skeleton className="h-10 w-full mb-3" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      {[1, 2].map(i => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-10 w-32" />
          <Card className="p-4">
            <div className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
