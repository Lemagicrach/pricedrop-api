
const sendPriceDropEmail = async (email, product = {}, oldPrice, newPrice) => {
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const previousPrice = typeof oldPrice === 'number' ? oldPrice : newPrice;
  const currentPrice = typeof newPrice === 'number' ? newPrice : previousPrice;
  const discountPercent = previousPrice
    ? (((previousPrice - currentPrice) / previousPrice) * 100).toFixed(0)
    : '0';

    const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    
    subject: `🔥 Price Drop Alert: ${product.name || 'Tracked Product'}`,
    html: `
      <h2>Great news! The price dropped for:</h2>
      <h3>${product.name || 'Tracked Product'}</h3>
      <p><strong>Old Price:</strong> $${previousPrice}</p>
      <p><strong>New Price:</strong> $${currentPrice}</p>
      <p><strong>You Save:</strong> $${(previousPrice - currentPrice).toFixed(2)} (${discountPercent}% off)</p>
      <p><a href="${product.url || '#'}">Buy Now</a></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
};


const sendNotification = async (notification = {}) => {
  const { type } = notification;

  if (!type) {
    throw new Error('Notification type is required');
  }

  switch (type) {
    case 'price_drop': {
      const {
        email,
        product = {},
        current_price,
        old_price,
        previous_price,
        target_price
      } = notification;

      const results = {};

      const oldPriceValue =
        typeof old_price === 'number'
          ? old_price
          : typeof previous_price === 'number'
          ? previous_price
          : typeof product.previous_price === 'number'
          ? product.previous_price
          : typeof product.original_price === 'number'
          ? product.original_price
          : typeof target_price === 'number'
          ? target_price
          : current_price;

      const newPriceValue =
        typeof current_price === 'number'
          ? current_price
          : typeof product.current_price === 'number'
          ? product.current_price
          : oldPriceValue;

      const previousPriceNum =
        typeof oldPriceValue === 'number' ? oldPriceValue : parseFloat(oldPriceValue) || 0;
      const currentPriceNum =
        typeof newPriceValue === 'number' ? newPriceValue : parseFloat(newPriceValue) || previousPriceNum;

      const discountPercent = previousPriceNum
        ? (((previousPriceNum - currentPriceNum) / previousPriceNum) * 100).toFixed(0)
        : '0';

      if (email) {
        results.email = await sendPriceDropEmail(
          email,
          product,
          previousPriceNum,
          currentPriceNum
        );
      }

      // Add webhook support
      if (notification.webhook_url) {
        // sendWebhook is expected to be defined elsewhere in the project
        results.webhook = await sendWebhook(notification.webhook_url, {
          product: product,
          old_price: previousPriceNum,
          new_price: currentPriceNum,
          drop_percentage: discountPercent
        });
      }

      // Additional notification channels (webhook, SMS, etc.) can be handled here

      return results;
    }
    default:
      console.warn(`Unsupported notification type: ${type}`);
      return {};
  }
};

module.exports = {
  sendPriceDropEmail,
  sendNotification
};