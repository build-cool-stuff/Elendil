/**
 * Australian Suburbs Seeder Script
 *
 * This script seeds the suburbs table with Australian postcode data.
 * Data source: Australian Post / ABS (Australian Bureau of Statistics)
 *
 * Usage:
 *   npx tsx scripts/seed-suburbs.ts
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in environment
 *   - Download postcodes data from: https://www.matthewproctor.com/australian_postcodes
 *     or use the embedded sample data for major metros
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

// Sample Australian suburb data for major metropolitan areas
// In production, this should be loaded from a full ABS dataset
const AUSTRALIAN_SUBURBS = [
  // New South Wales - Sydney Metro
  { name: 'Sydney', postcode: '2000', state: 'NSW', latitude: -33.8688, longitude: 151.2093, population: 250000 },
  { name: 'Parramatta', postcode: '2150', state: 'NSW', latitude: -33.8151, longitude: 151.0011, population: 30000 },
  { name: 'Bondi', postcode: '2026', state: 'NSW', latitude: -33.8915, longitude: 151.2767, population: 11000 },
  { name: 'Manly', postcode: '2095', state: 'NSW', latitude: -33.7969, longitude: 151.2879, population: 16000 },
  { name: 'Chatswood', postcode: '2067', state: 'NSW', latitude: -33.7969, longitude: 151.1835, population: 25000 },
  { name: 'Blacktown', postcode: '2148', state: 'NSW', latitude: -33.7668, longitude: 150.9063, population: 50000 },
  { name: 'Liverpool', postcode: '2170', state: 'NSW', latitude: -33.9200, longitude: 150.9256, population: 30000 },
  { name: 'Penrith', postcode: '2750', state: 'NSW', latitude: -33.7511, longitude: 150.6942, population: 13000 },
  { name: 'Hornsby', postcode: '2077', state: 'NSW', latitude: -33.7025, longitude: 151.0994, population: 22000 },
  { name: 'Sutherland', postcode: '2232', state: 'NSW', latitude: -34.0316, longitude: 151.0554, population: 22000 },
  { name: 'Newcastle', postcode: '2300', state: 'NSW', latitude: -32.9283, longitude: 151.7817, population: 160000 },
  { name: 'Wollongong', postcode: '2500', state: 'NSW', latitude: -34.4278, longitude: 150.8931, population: 300000 },

  // Victoria - Melbourne Metro
  { name: 'Melbourne', postcode: '3000', state: 'VIC', latitude: -37.8136, longitude: 144.9631, population: 180000 },
  { name: 'St Kilda', postcode: '3182', state: 'VIC', latitude: -37.8676, longitude: 144.9810, population: 20000 },
  { name: 'South Yarra', postcode: '3141', state: 'VIC', latitude: -37.8383, longitude: 144.9930, population: 25000 },
  { name: 'Richmond', postcode: '3121', state: 'VIC', latitude: -37.8182, longitude: 145.0000, population: 30000 },
  { name: 'Fitzroy', postcode: '3065', state: 'VIC', latitude: -37.7986, longitude: 144.9783, population: 11000 },
  { name: 'Carlton', postcode: '3053', state: 'VIC', latitude: -37.8000, longitude: 144.9669, population: 18000 },
  { name: 'Brunswick', postcode: '3056', state: 'VIC', latitude: -37.7667, longitude: 144.9600, population: 24000 },
  { name: 'Footscray', postcode: '3011', state: 'VIC', latitude: -37.8000, longitude: 144.9000, population: 16000 },
  { name: 'Box Hill', postcode: '3128', state: 'VIC', latitude: -37.8189, longitude: 145.1219, population: 12000 },
  { name: 'Dandenong', postcode: '3175', state: 'VIC', latitude: -37.9875, longitude: 145.2150, population: 30000 },
  { name: 'Geelong', postcode: '3220', state: 'VIC', latitude: -38.1499, longitude: 144.3617, population: 190000 },

  // Queensland - Brisbane Metro
  { name: 'Brisbane', postcode: '4000', state: 'QLD', latitude: -27.4698, longitude: 153.0251, population: 230000 },
  { name: 'South Brisbane', postcode: '4101', state: 'QLD', latitude: -27.4809, longitude: 153.0185, population: 12000 },
  { name: 'Fortitude Valley', postcode: '4006', state: 'QLD', latitude: -27.4569, longitude: 153.0360, population: 10000 },
  { name: 'West End', postcode: '4101', state: 'QLD', latitude: -27.4810, longitude: 153.0100, population: 10000 },
  { name: 'Paddington', postcode: '4064', state: 'QLD', latitude: -27.4600, longitude: 152.9970, population: 9000 },
  { name: 'New Farm', postcode: '4005', state: 'QLD', latitude: -27.4680, longitude: 153.0480, population: 12000 },
  { name: 'Chermside', postcode: '4032', state: 'QLD', latitude: -27.3870, longitude: 153.0330, population: 12000 },
  { name: 'Indooroopilly', postcode: '4068', state: 'QLD', latitude: -27.5000, longitude: 152.9750, population: 12000 },
  { name: 'Gold Coast', postcode: '4217', state: 'QLD', latitude: -28.0167, longitude: 153.4000, population: 600000 },
  { name: 'Surfers Paradise', postcode: '4217', state: 'QLD', latitude: -28.0027, longitude: 153.4298, population: 23000 },
  { name: 'Sunshine Coast', postcode: '4558', state: 'QLD', latitude: -26.6500, longitude: 153.0667, population: 350000 },
  { name: 'Cairns', postcode: '4870', state: 'QLD', latitude: -16.9186, longitude: 145.7781, population: 150000 },
  { name: 'Townsville', postcode: '4810', state: 'QLD', latitude: -19.2590, longitude: 146.8169, population: 180000 },

  // Western Australia - Perth Metro
  { name: 'Perth', postcode: '6000', state: 'WA', latitude: -31.9505, longitude: 115.8605, population: 30000 },
  { name: 'Fremantle', postcode: '6160', state: 'WA', latitude: -32.0569, longitude: 115.7439, population: 30000 },
  { name: 'Subiaco', postcode: '6008', state: 'WA', latitude: -31.9494, longitude: 115.8278, population: 18000 },
  { name: 'Northbridge', postcode: '6003', state: 'WA', latitude: -31.9458, longitude: 115.8575, population: 4000 },
  { name: 'Scarborough', postcode: '6019', state: 'WA', latitude: -31.8950, longitude: 115.7600, population: 15000 },
  { name: 'Joondalup', postcode: '6027', state: 'WA', latitude: -31.7444, longitude: 115.7672, population: 35000 },
  { name: 'Rockingham', postcode: '6168', state: 'WA', latitude: -32.2900, longitude: 115.7300, population: 130000 },

  // South Australia - Adelaide Metro
  { name: 'Adelaide', postcode: '5000', state: 'SA', latitude: -34.9285, longitude: 138.6007, population: 25000 },
  { name: 'North Adelaide', postcode: '5006', state: 'SA', latitude: -34.9100, longitude: 138.5900, population: 8000 },
  { name: 'Glenelg', postcode: '5045', state: 'SA', latitude: -34.9833, longitude: 138.5167, population: 8000 },
  { name: 'Norwood', postcode: '5067', state: 'SA', latitude: -34.9225, longitude: 138.6300, population: 6000 },
  { name: 'Unley', postcode: '5061', state: 'SA', latitude: -34.9500, longitude: 138.6000, population: 7000 },
  { name: 'Prospect', postcode: '5082', state: 'SA', latitude: -34.8833, longitude: 138.5833, population: 5000 },

  // Tasmania - Hobart Metro
  { name: 'Hobart', postcode: '7000', state: 'TAS', latitude: -42.8821, longitude: 147.3272, population: 55000 },
  { name: 'Sandy Bay', postcode: '7005', state: 'TAS', latitude: -42.9000, longitude: 147.3167, population: 11000 },
  { name: 'North Hobart', postcode: '7000', state: 'TAS', latitude: -42.8700, longitude: 147.3100, population: 6000 },
  { name: 'Launceston', postcode: '7250', state: 'TAS', latitude: -41.4332, longitude: 147.1441, population: 90000 },

  // ACT - Canberra Metro
  { name: 'Canberra', postcode: '2600', state: 'ACT', latitude: -35.2809, longitude: 149.1300, population: 430000 },
  { name: 'Civic', postcode: '2601', state: 'ACT', latitude: -35.2800, longitude: 149.1300, population: 5000 },
  { name: 'Braddon', postcode: '2612', state: 'ACT', latitude: -35.2700, longitude: 149.1350, population: 5000 },
  { name: 'Kingston', postcode: '2604', state: 'ACT', latitude: -35.3100, longitude: 149.1400, population: 5000 },
  { name: 'Belconnen', postcode: '2617', state: 'ACT', latitude: -35.2400, longitude: 149.0700, population: 100000 },
  { name: 'Woden', postcode: '2606', state: 'ACT', latitude: -35.3500, longitude: 149.0900, population: 30000 },

  // Northern Territory
  { name: 'Darwin', postcode: '0800', state: 'NT', latitude: -12.4634, longitude: 130.8456, population: 140000 },
  { name: 'Alice Springs', postcode: '0870', state: 'NT', latitude: -23.6980, longitude: 133.8807, population: 25000 },
]

async function seedSuburbs() {
  console.log('Starting suburb seeding...')
  console.log(`Total suburbs to seed: ${AUSTRALIAN_SUBURBS.length}`)

  // Check existing count
  const { count: existingCount } = await supabase
    .from('suburbs')
    .select('*', { count: 'exact', head: true })

  console.log(`Existing suburbs in database: ${existingCount}`)

  if (existingCount && existingCount > 0) {
    console.log('Suburbs already exist. Skipping seed to avoid duplicates.')
    console.log('To re-seed, first truncate the suburbs table.')
    return
  }

  // Insert in batches of 50
  const BATCH_SIZE = 50
  let inserted = 0
  let errors = 0

  for (let i = 0; i < AUSTRALIAN_SUBURBS.length; i += BATCH_SIZE) {
    const batch = AUSTRALIAN_SUBURBS.slice(i, i + BATCH_SIZE).map((suburb) => ({
      name: suburb.name,
      postcode: suburb.postcode,
      state: suburb.state,
      latitude: suburb.latitude,
      longitude: suburb.longitude,
      population: suburb.population,
      locality_type: suburb.population > 100000 ? 'city' : suburb.population > 10000 ? 'suburb' : 'town',
    }))

    const { error } = await supabase.from('suburbs').insert(batch)

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
      console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} suburbs`)
    }
  }

  console.log('\n--- Seeding Complete ---')
  console.log(`Successfully inserted: ${inserted}`)
  console.log(`Errors: ${errors}`)
  console.log(`Total: ${AUSTRALIAN_SUBURBS.length}`)
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.error('Error: Missing environment variables')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY')
    process.exit(1)
  }

  try {
    await seedSuburbs()
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main()
