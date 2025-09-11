export const verifyRapidAPI = (req) => {
  const rapidApiKey = req.headers['x-rapidapi-key'];
  const rapidApiHost = req.headers['x-rapidapi-host'];
  
  const expectedHost = process.env.RAPIDAPI_HOST || 'pricedropapi.p.rapidapi.com';

  if (!rapidApiKey) {
    throw new Error('Missing X-RapidAPI-Key header');
  }

  if (rapidApiHost && rapidApiHost !== expectedHost) {
    throw new Error('Invalid X-RapidAPI-Host');
  }

  return rapidApiKey;
};

export const checkRateLimit = async (rapidApiKey) => {
  const { data: user } = await supabase
    .from('users')
    .select('plan, requests_today, last_request')
    .eq('rapidapi_key', rapidApiKey)
    .single();

  const limits = {
    free: 100,
    basic: 1000,
    pro: 10000,
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
        .eq('rapidapi_key', rapidApiKey);
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
      .eq('rapidapi_key', rapidApiKey);
  } else {
    // Create new user entry
    await supabase
      .from('users')
      .insert({
        rapidapi_key: rapidApiKey,
        plan: 'free',
        requests_today: 1,
        last_request: new Date().toISOString()
      });
  }

  return true;
};