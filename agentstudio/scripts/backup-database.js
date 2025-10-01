require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function backupTable(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')

  if (error) {
    console.error(`Error backing up ${tableName}:`, error)
    return null
  }

  return data
}

async function performBackup() {
  const timestamp = new Date().toISOString().split('T')[0]
  const backupDir = path.join(__dirname, '../backups', timestamp)

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const tables = [
    'studio_profiles',
    'subscriptions',
    'teams',
    'team_members',
    'team_invitations',
    'generated_documents',
    'research_history'
  ]

  console.log(`Starting backup: ${timestamp}`)

  for (const table of tables) {
    console.log(`Backing up ${table}...`)
    const data = await backupTable(table)
    
    if (data) {
      const filePath = path.join(backupDir, `${table}.json`)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      console.log(`✓ ${table}: ${data.length} records`)
    }
  }

  // Create metadata file
  const metadata = {
    timestamp: new Date().toISOString(),
    tables: tables,
    environment: process.env.NODE_ENV || 'development'
  }

  fs.writeFileSync(
    path.join(backupDir, '_metadata.json'),
    JSON.stringify(metadata, null, 2)
  )

  console.log(`\n✓ Backup completed: ${backupDir}`)
}

performBackup().catch(console.error)