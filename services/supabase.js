
const supabase = {
  from: () => ({
    select: () => ({ data: null, error: null }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    eq: () => ({ single: () => ({ data: null, error: null }) })
  })
};

module.exports = {
  supabase
};