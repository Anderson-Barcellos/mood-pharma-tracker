#!/usr/bin/env tsx
/**
 * Script to populate demo data for testing
 *
 * Usage: npx tsx scripts/populate-demo-data.ts
 */

import seedCompleteDemo from '../src/dev/seed-complete-demo';

async function main() {
  console.log('🌱 Populating demo data...\n');

  try {
    await seedCompleteDemo({
      days: 30,
      dosesPerDay: 2,
      moodPerDay: 4,
      heartRatePerDay: 12,
      clear: true, // Clear existing data
    });

    console.log('\n✅ Demo data populated successfully!');
    console.log('🌐 Open http://127.0.0.1:8112/ and navigate to Analytics to view correlations');
  } catch (error) {
    console.error('\n❌ Error populating demo data:', error);
    process.exit(1);
  }
}

main();
