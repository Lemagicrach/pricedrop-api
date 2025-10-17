// scripts/migrate-api-keys.js - One-time migration for existing keys
const { supabase } = require('../services/database');
const { hashApiKey, generateApiKey } = require('../lib/security/apiKeys');

async function migrateApiKeys() {
  console.log('🔑 Migrating API keys to secure hashed format...\n');
  
  try {
    // Get all users with old-style keys
    const { data: users, error } = await supabase
      .from('api_users')
      .select('id, email, api_key')
      .not('api_key', 'is', null);
    
    if (error) throw error;
    
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      const oldKey = user.api_key;
      
      // Generate new secure key
      const newKey = generateApiKey('live');
      const keyHash = hashApiKey(newKey);
      
      // Update user record
      const { error: updateError } = await supabase
        .from('api_users')
        .update({
          api_key_hash: keyHash,
          api_key: null, // Remove old key
          key_created_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error(`❌ Failed to migrate ${user.email}:`, updateError);
        continue;
      }
      
      console.log(`✅ Migrated ${user.email}`);
      console.log(`   New key: ${newKey}`);
      console.log(`   ⚠️  Email this to the user securely!\n`);
    }
    
    console.log('✨ Migration complete!');
    console.log('⚠️  IMPORTANT: Email new keys to users - they cannot be recovered!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  migrateApiKeys();
}

module.exports = { migrateApiKeys };