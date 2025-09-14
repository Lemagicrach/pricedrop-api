export const verifyRapidAPI = (req) => {
  return { apiKey: "demo-key", plan: "free" };
};

export const checkRateLimit = async (data) => {
  return true;
};
