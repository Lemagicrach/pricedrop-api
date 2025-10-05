// api/diagnose.js - Diagnostic endpoint to identify issues
module.exports = async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    
    environment_variables: {
      RAPIDAPI_PROXY_SECRET: process.env.RAPIDAPI_PROXY_SECRET ? '✅ Set' : '❌ Missing',
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      EBAY_APP_ID: process.env.EBAY_APP_ID ? '✅ Set' : '❌ Missing',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      VERCEL: process.env.VERCEL ? '✅ Running on Vercel' : '❌ Not on Vercel',
      VERCEL_ENV: process.env.VERCEL_ENV || 'not set'
    },
    
    module_checks: {},
    
    recommendations: []
  };

  // Test module imports
  const modules = [
    '@supabase/supabase-js',
    'axios',
    'cheerio',
    'express-rate-limit'
  ];

  for (const moduleName of modules) {
    try {
      require(moduleName);
      diagnostics.module_checks[moduleName] = '✅ Installed';
    } catch (error) {
      diagnostics.module_checks[moduleName] = '❌ Missing - run: npm install ' + moduleName;
      diagnostics.recommendations.push(`Install missing module: npm install ${moduleName}`);
    }
  }

  // Test Supabase connection if configured
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      const { error } = await supabase.from('products').select('count').limit(1);
      diagnostics.database_connection = error ? `❌ Error: ${error.message}` : '✅ Connected';
    } catch (error) {
      diagnostics.database_connection = `❌ Failed: ${error.message}`;
      diagnostics.recommendations.push('Check Supabase credentials and table setup');
    }
  } else {
    diagnostics.database_connection = '⚠️ Not configured';
    diagnostics.recommendations.push('Add SUPABASE_URL and SUPABASE_ANON_KEY to environment variables');
  }

  // Test eBay API if configured
  if (process.env.EBAY_APP_ID) {
    try {
      const axios = require('axios');
      const response = await axios.get('https://svcs.ebay.com/services/search/FindingService/v1', {
        params: {
          'OPERATION-NAME': 'findItemsByKeywords',
          'SERVICE-VERSION': '1.0.0',
          'SECURITY-APPNAME': process.env.EBAY_APP_ID,
          'RESPONSE-DATA-FORMAT': 'JSON',
          'keywords': 'test',
          'paginationInput.entriesPerPage': '1'
        },
        timeout: 5000
      });
      diagnostics.ebay_api = '✅ Connected';
    } catch (error) {
      diagnostics.ebay_api = `❌ Failed: ${error.message}`;
      diagnostics.recommendations.push('Verify eBay App ID is valid');
    }
  } else {
    diagnostics.ebay_api = '⚠️ Not configured';
    diagnostics.recommendations.push('Add EBAY_APP_ID to environment variables');
  }

  // Add final recommendations
  if (diagnostics.recommendations.length === 0) {
    diagnostics.recommendations.push('✅ Everything looks good!');
  }

  // Check for common issues
  const issues = [];
  
  if (!process.env.VERCEL) {
    issues.push('Running locally - deploy to Vercel for production');
  }
  
  if (Object.values(diagnostics.module_checks).some(v => v.includes('❌'))) {
    issues.push('Missing required npm packages');
  }
  
  if (Object.values(diagnostics.environment_variables).filter(v => v.includes('❌')).length > 0) {
    issues.push('Missing environment variables');
  }

  diagnostics.issues = issues.length > 0 ? issues : ['None detected'];

  res.status(200).json(diagnostics);
};