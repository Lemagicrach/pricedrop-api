// lib/services/database.js - Database Connection Service
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
  try {
    const { error } = await supabase.from('api_keys').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

/**
 * Execute a raw SQL query (if needed for complex operations)
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function executeQuery(query, params = []) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query,
      params,
    });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get database client instance
 * @returns {Object} Supabase client
 */
function getClient() {
  return supabase;
}

module.exports = {
  supabase,
  testConnection,
  executeQuery,
  getClient,
};