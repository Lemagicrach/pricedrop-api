
const verifyRapidAPI = (req) => {
  return { apiKey: "demo-key", plan: "free" };
};

const checkRateLimit = async (data) => {
  return true;
};

module.exports = {
  verifyRapidAPI,
  checkRateLimit
};