// api/test.js - Minimal test endpoint to debug crashes
module.exports = async (req, res) => {
  console.log('Test endpoint called');
  
  // Test 1: Basic response
  try {
    res.status(200).json({
      success: true,
      message: 'Basic endpoint works',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Basic error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};