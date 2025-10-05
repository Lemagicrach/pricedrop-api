const { supabase, UserService } = require('./database');

const normalizeHeader = (req, name) => {
  if (!req || !req.headers) {
    return undefined;
  }

  const headerKeys = Object.keys(req.headers);
  const lowerName = name.toLowerCase();

  for (const key of headerKeys) {
    if (key.toLowerCase() === lowerName) {
      return req.headers[key];
    }
  }

  return undefined;
};

const verifyRapidAPI = async (req) => {
  const providedKey = normalizeHeader(req, 'x-rapidapi-key');

  if (!providedKey) {
    throw new Error('RapidAPI key missing from request headers.');
  }

  const { data, error } = await UserService.findByApiKey(providedKey.trim());

  if (error) {
    throw new Error(error.message || 'Unable to validate RapidAPI key against user store.');
  }

  if (!data) {
    throw new Error('Provided RapidAPI key is not recognized.');
  }

  return {
    apiKey: data.api_key,
    plan: data.plan,
    user: {
      id: data.id,
      email: data.email,
      plan: data.plan,
      credits_limit: data.credits_limit,
      credits_used: data.credits_used
    }
  };
};

const countRequestsSince = async (userId, since) => {
  if (!supabase || !userId || !since) {
    return 0;
  }

  const { count, error } = await supabase
    .from('api_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  if (error) {
    throw new Error(error.message || 'Failed to evaluate rate limits.');
  }

  return count || 0;
};

const checkRateLimit = async ({ user, limits }) => {
  if (!limits || (!limits.requests_per_hour && !limits.requests_per_day)) {
    return true;
  }

  if (!user || !user.id || !supabase) {
    return true;
  }

  const now = Date.now();
  const hourWindowStart = new Date(now - 60 * 60 * 1000).toISOString();
  const dayWindowStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [hourlyCount, dailyCount] = await Promise.all([
    limits.requests_per_hour ? countRequestsSince(user.id, hourWindowStart) : 0,
    limits.requests_per_day ? countRequestsSince(user.id, dayWindowStart) : 0
  ]);

  if (limits.requests_per_hour && hourlyCount >= limits.requests_per_hour) {
    return false;
  }

  if (limits.requests_per_day && dailyCount >= limits.requests_per_day) {
    return false;
  }

  return true;
};

module.exports = {
  verifyRapidAPI,
  checkRateLimit

};