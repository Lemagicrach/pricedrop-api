const {
  supabase,
  getProducts,
  updatePrice: updateProductPrice,
  createAlert
} = require('./database');

const ProductService = {
  async getProductsToCheck(limit = 50) {
    try {
      // Prefer products that haven't been checked recently
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('last_checked', { ascending: true, nullsFirst: true })
        .limit(limit);

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Failed to load products to check:', error);
      return { data: null, error };
    }
  },

  async updatePrice(productId, newPrice, inStock, currency) {
    try {
      const data = await updateProductPrice(productId, {
        price: newPrice,
        in_stock: inStock,
        currency
      });

      return { data, error: null };
    } catch (error) {
      console.error('Failed to update product price:', error);
      return { data: null, error };
    }
  },

  async update(productId, updates = {}) {
    try {
      const payload = { ...updates };

      if (!payload.last_checked) {
        payload.last_checked = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Failed to update product metadata:', error);
      return { data: null, error };
    }
  }
};

const PriceHistoryService = {
  async record(productId, price, metadata = {}) {
    try {
      const entry = {
        product_id: productId,
        price,
        in_stock: metadata.in_stock ?? true,
        recorded_at: metadata.timestamp || new Date().toISOString()
      };

      if (metadata.currency) {
        entry.currency = metadata.currency;
      }

      const { data, error } = await supabase
        .from('price_history')
        .insert([entry])
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Failed to record price history:', error);
      return { data: null, error };
    }
  }
};

const AlertService = {
  async checkAndCreatePriceDropAlerts(product, context = {}) {
    const { oldPrice, newPrice } = context;

    if (!product?.id || newPrice === undefined || newPrice === null) {
      return { created: 0 };
    }

    try {
      const { data: trackers, error: trackerError } = await supabase
        .from('user_tracking')
        .select('id, user_id, target_price, notify_on_any_drop')
        .eq('product_id', product.id);

      if (trackerError) throw trackerError;
      if (!trackers || trackers.length === 0) {
        return { created: 0 };
      }

      let created = 0;

      for (const tracker of trackers) {
        const targetPrice = tracker.target_price !== null && tracker.target_price !== undefined
          ? Number(tracker.target_price)
          : null;

        const meetsTarget = targetPrice !== null && !Number.isNaN(targetPrice) && newPrice <= targetPrice;
        const notifyOnDrop = Boolean(tracker.notify_on_any_drop) && oldPrice !== null && oldPrice !== undefined && newPrice < oldPrice;

        if (!meetsTarget && !notifyOnDrop) {
          continue;
        }

        const { data: existing, error: existingError } = await supabase
          .from('alerts')
          .select('id')
          .eq('user_id', tracker.user_id)
          .eq('product_id', product.id)
          .eq('sent', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingError) {
          console.error('Failed to check existing alerts:', existingError);
          continue;
        }

        if (Array.isArray(existing) && existing.length > 0) {
          continue;
        }

        try {
          await createAlert({
            user_id: tracker.user_id,
            product_id: product.id,
            alert_type: 'price_drop',
            old_price: oldPrice,
            new_price: newPrice,
            sent: false,
            created_at: new Date().toISOString()
          });
          created += 1;
        } catch (alertError) {
          console.error('Failed to create alert record:', alertError);
        }
      }

      return { created };
    } catch (error) {
      console.error('Failed to evaluate price drop alerts:', error);
      return { created: 0, error };
    }
  },

  async getUnsent(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, products(*), api_users(email)')
        .eq('sent', false)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Failed to load unsent alerts:', error);
      return { data: null, error };
    }
  },

  async markAsSent(alertId) {
    if (!alertId) {
      return { data: null, error: new Error('Alert ID is required') };
    }

    try {
      const { data, error } = await supabase
        .from('alerts')
        .update({ sent: true })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Failed to mark alert as sent:', error);
      return { data: null, error };
    }
  }
};

module.exports = {
  ProductService,
  PriceHistoryService,
  AlertService,
  supabase,
  getProducts
};