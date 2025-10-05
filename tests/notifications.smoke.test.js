const assert = require('assert');

const notifications = require('../services/notifications');

describe('notifications module smoke test', () => {
  it('exports sendPriceDropEmail function', () => {
    assert.strictEqual(typeof notifications.sendPriceDropEmail, 'function');
  });

  it('has nodemailer dependency available', () => {
    assert.doesNotThrow(() => require.resolve('nodemailer'));
  });
});