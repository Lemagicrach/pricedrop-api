import validator from 'validator';
import { z } from 'zod';

// Validation schemas
export const trackProductSchema = z.object({
  url: z.string().url('Invalid URL format'),
  target_price: z.number().positive().optional(),
  notify_on_drop: z.boolean().optional().default(false)
});

export const createAlertSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  target_price: z.number().positive('Target price must be positive'),
  alert_type: z.enum(['price_drop', 'back_in_stock', 'any_change']).optional().default('price_drop'),
  notification_channels: z.array(z.string()).optional().default(['api'])
});

export const validateUrl = (url) => {
  const supportedDomains = [
    'amazon.com',
    'amazon.co.uk',
    'amazon.de',
    'amazon.fr',
    'amazon.ca',
    'bestbuy.com',
    'walmart.com',
    'target.com',
    'ebay.com',
    'newegg.com'
  ];

  if (!validator.isURL(url)) {
    throw new Error('Invalid URL format');
  }

  const domain = new URL(url).hostname.replace('www.', '');
  const isSupported = supportedDomains.some(d => domain.includes(d));
  
  if (!isSupported) {
    throw new Error(`Unsupported store. Supported stores: ${supportedDomains.join(', ')}`);
  }

  return true;
};
