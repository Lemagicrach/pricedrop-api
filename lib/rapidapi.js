import { supabase } from './supabase.js';

export const verifyRapidAPI = (req) => {
  const rapidApiKey = req.headers['x-rapidapi-key'];
  const rapidApiHost = req.headers['x-rapidapi-host'];
  const rapidApiUser = req.headers['x-rapidapi-user'];
  
  const expectedHost = process.env.RAPIDAPI_HOST || 'pricedrop-api.p.rapidapi.com';

  if (!rapidApiKey) {
    throw new Error('Missing X-RapidAPI-Key header');
  }

  if (rapidApiHost && rapidApiHost !== expectedHost) {
    throw new Error('Invalid X-RapidAPI-Host');
  }

  // RapidAPI provides the user ID in headers
  return {
    apiKey: rapidApiKey,
    userId: rapidApiUser || rapidApiKey // Fallback to key if user not provided
  };
};

export const checkRateLimit = async (rapidApiData) => {
  const { apiKey, userId } = rapidApiData;
  
  const { data: user } = await supabase
    .from('users')
    .select('plan, requests_today, last_request')
    .eq('rapidapi_key', apiKey)
    .single();

  const limits = {
    free: 100,
    basic: 1000,
    pro: 10000,
    ultra: 50000,
    enterprise: null
  };

  if (user) {
    const today = new Date().toDateString();
    const lastRequestDate = user.last_request ? new Date(user.last_request).toDateString() : null;
    
    // Reset daily counter
    if (lastRequestDate !== today) {
      await supabase
        .from('users')
        .update({ requests_today: 0 })
        .eq('rapidapi_key', apiKey);
      user.requests_today = 0;
    }

    const limit = limits[user.plan] || limits.free;
    if (limit && user.requests_today >= limit) {
      throw new Error(`Rate limit exceeded. Plan: ${user.plan}, Limit: ${limit}/day`);
    }

    // Increment counter
    await supabase
      .from('users')
      .update({ 
        requests_today: user.requests_today + 1,
        last_request: new Date().toISOString()
      })
      .eq('rapidapi_key', apiKey);
  } else {
    // Create new user entry
    await supabase
      .from('users')
      .insert({
        rapidapi_key: apiKey,
        rapidapi_user: userId,
        plan: 'free',
        requests_today: 1,
        last_request: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
  }

  return true;
};