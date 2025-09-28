
const sendPriceDropEmail = async (email, product, oldPrice, newPrice) => {
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

  const discountPercent = (((oldPrice - newPrice) / oldPrice) * 100).toFixed(0);
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: `🔥 Price Drop Alert: ${product.name}`,
    html: `
      <h2>Great news! The price dropped for:</h2>
      <h3>${product.name}</h3>
      <p><strong>Old Price:</strong> $${oldPrice}</p>
      <p><strong>New Price:</strong> $${newPrice}</p>
      <p><strong>You Save:</strong> $${(oldPrice - newPrice).toFixed(2)} (${discountPercent}% off)</p>
      <p><a href="${product.url}">Buy Now</a></p>
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

module.exports = {
  sendPriceDropEmail
};