/**
 * Payment Configuration
 * Central configuration for payment gateways
 */
require('dotenv').config();

/**
 * Get payment gateway configuration
 * @returns {Object} Payment configuration
 */
const getPaymentConfig = () => {
  return {
    defaultCurrency: process.env.PAYMENT_DEFAULT_CURRENCY || 'NGN',
    defaultProvider: process.env.DEFAULT_PAYMENT_PROVIDER || 'flutterwave',
    callbackUrl: process.env.PAYMENT_CALLBACK_URL,
    webhookUrl: process.env.PAYMENT_WEBHOOK_URL,
    
    providers: {
      flutterwave: {
        publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
        secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
        encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
        webhookHash: process.env.FLUTTERWAVE_WEBHOOK_HASH,
        isConfigured: !!process.env.FLUTTERWAVE_SECRET_KEY
      },
      
      paystack: {
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        secretKey: process.env.PAYSTACK_SECRET_KEY,
        webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
        isConfigured: !!process.env.PAYSTACK_SECRET_KEY
      },
      
      // Add other payment providers here as needed (e.g., PayPal, Stripe)
    },
    
    // Payment method type to provider mapping
    methodTypeToProvider: {
      card: ['flutterwave', 'paystack'],
      bank_transfer: ['flutterwave', 'paystack'],
      mobile_money: ['flutterwave'],
      ussd: ['paystack'],
      qr: ['flutterwave'],
      mpesa: ['flutterwave']
    },
    
    // Countries supported by each provider
    countrySupport: {
      flutterwave: [
        'NG', // Nigeria
        'GH', // Ghana
        'KE', // Kenya
        'UG', // Uganda
        'ZA', // South Africa
        'TZ', // Tanzania
        'RW', // Rwanda
        'CM', // Cameroon
        'CI', // Côte d'Ivoire
        'ZM'  // Zambia
      ],
      paystack: [
        'NG', // Nigeria
        'GH', // Ghana
        'ZA', // South Africa
        'KE'  // Kenya
      ]
    },
    
    // Webhook verification settings
    webhookVerification: {
      flutterwave: {
        headerName: 'verif-hash',
        signatureKey: process.env.FLUTTERWAVE_WEBHOOK_HASH
      },
      paystack: {
        headerName: 'x-paystack-signature',
        signatureKey: process.env.PAYSTACK_WEBHOOK_SECRET
      }
    }
  };
};

module.exports = {
  getPaymentConfig
};
