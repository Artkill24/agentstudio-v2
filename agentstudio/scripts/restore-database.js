require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function restoreTable(tableName, data) {
  console.log(`Restoring ${tableName}...`)
  
  // Insert in batches of 100
  for (let i = 0; i < data.length; i += 100) {
    const batch = data.slice(i, i + 100)
    const { error } = await supabase
      .from(tableName)
      .upsert(batch)

    if (error) {
      console.error(`Error restoring ${tableName} batch ${i}:`, error)
      return false
    }
  }

  console.log(`✓ ${tableName}: ${data.length} records restored`)
  return true
}

async function performRestore(backupDate) {
  const backupDir = path.join(__dirname, '../backups', backupDate)

  if (!fs.existsSync(backupDir)) {
    console.error(`Backup not found: ${backupDir}`)
    process.exit(1)
  }

  // Read metadata
  const metadata = JSON.parse(
    fs.readFileSync(path.join(backupDir, '_metadata.json'))
  )

  console.log(`\nRestoring backup from: ${metadata.timestamp}`)
  console.log(`Environment: ${metadata.environment}\n`)

  // Confirm with user
  console.log('⚠️  WARNING: This will overwrite existing data!')
  console.log('Press Ctrl+C to cancel, or wait 5 seconds...\n')
  
  await new Promise(resolve => setTimeout(resolve, 5000))

  for (const table of metadata.tables) {
    const filePath = path.join(backupDir, `${table}.json`)
    
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath))
      await restoreTable(table, data)
    }
  }

  console.log(`\n✓ Restore completed`)
}

const backupDate = process.argv[2]
if (!backupDate) {
  console.error('Usage: node restore-database.js YYYY-MM-DD')
  process.exit(1)
}

performRestore(backupDate).catch(console.error)