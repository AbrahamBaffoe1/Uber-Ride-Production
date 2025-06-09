const { v4: uuidv4 } = require('uuid');
const { Payment, PaymentMethod, User, Ride } = require('../../../models');
const { processPayment } = require('../../../services/payment.service');
const { mobilePaymentService } = require('../../../services/mobilePayment.service');
const { smsService } = require('../../../services/sms.service');
const { paymentOrchestrationService } = require('../../../services/payment-orchestration.service');
const { paymentReconciliationService } = require('../../../services/payment-reconciliation.service');
const { paymentAnalyticsService } = require('../../../services/payment-analytics.service');

/**
 * Get all payment methods for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getPaymentMethods = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get payment methods from database
    const paymentMethods = await PaymentMethod.findAll({
      where: { userId },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']],
    });

    // Format response data
    const formattedMethods = paymentMethods.map(method => ({
      id: method.id,
      type: method.type,
      isDefault: method.isDefault,
      details: {
        lastFour: method.lastFour,
        brand: method.brand,
        expiryMonth: method.expiryMonth,
        expiryYear: method.expiryYear,
        bankName: method.bankName,
        accountName: method.accountName,
        provider: method.provider,
      },
    }));

    return res.status(200).json({
      status: 'success',
      data: formattedMethods,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new payment method
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const addPaymentMethod = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      type, 
      token, 
      accountNumber, 
      bankCode, 
      phoneNumber, 
      provider, 
      makeDefault 
    } = req.body;

    // Validate payment method type
    if (!['card', 'bank', 'cash', 'mobile_money'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment method type',
      });
    }

    // Prepare payment method data based on type
    let paymentMethodData = {
      id: uuidv4(),
      userId,
      type,
      isDefault: makeDefault || false,
    };

    // For card payments (would typically use a payment processor like Stripe, Flutterwave, etc.)
    if (type === 'card') {
      if (!token) {
        return res.status(400).json({
          status: 'error',
          message: 'Card token is required',
        });
      }

      // In a real implementation, validate token with payment processor
      // For demo, we'll simulate with mock data
      paymentMethodData = {
        ...paymentMethodData,
        lastFour: '4242', // Would come from payment processor response
        brand: 'Visa', // Would come from payment processor response
        expiryMonth: '12', // Would come from payment processor response
        expiryYear: '2025', // Would come from payment processor response
      };
    }

    // For bank accounts
    else if (type === 'bank') {
      if (!accountNumber || !bankCode) {
        return res.status(400).json({
          status: 'error',
          message: 'Account number and bank code are required for bank accounts',
        });
      }

      // In a real implementation, validate with bank API
      // For demo, we'll simulate with mock data
      paymentMethodData = {
        ...paymentMethodData,
        lastFour: accountNumber.slice(-4),
        bankName: getBankName(bankCode), // Helper function to get bank name from code
        accountName: `${req.user.firstName} ${req.user.lastName}`,
      };
    }

    // For mobile money
    else if (type === 'mobile_money') {
      if (!phoneNumber || !provider) {
        return res.status(400).json({
          status: 'error',
          message: 'Phone number and provider are required for mobile money',
        });
      }

      paymentMethodData = {
        ...paymentMethodData,
        phoneNumber,
        provider,
      };
    }

    // If this should be the default method, unset any existing default
    if (makeDefault) {
      await PaymentMethod.update(
        { isDefault: false },
        { where: { userId, isDefault: true } }
      );
    }
    
    // If no payment methods exist yet, make this the default
    const existingMethodsCount = await PaymentMethod.count({ where: { userId } });
    if (existingMethodsCount === 0) {
      paymentMethodData.isDefault = true;
    }

    // Create new payment method
    const newPaymentMethod = await PaymentMethod.create(paymentMethodData);

    // Format response data
    const formattedMethod = {
      id: newPaymentMethod.id,
      type: newPaymentMethod.type,
      isDefault: newPaymentMethod.isDefault,
      details: {
        lastFour: newPaymentMethod.lastFour,
        brand: newPaymentMethod.brand,
        expiryMonth: newPaymentMethod.expiryMonth,
        expiryYear: newPaymentMethod.expiryYear,
        bankName: newPaymentMethod.bankName,
        accountName: newPaymentMethod.accountName,
        provider: newPaymentMethod.provider,
      },
    };

    return res.status(201).json({
      status: 'success',
      data: formattedMethod,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set a payment method as default
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const setDefaultPaymentMethod = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment method ID is required',
      });
    }

    // Check if payment method exists and belongs to the user
    const paymentMethod = await PaymentMethod.findOne({
      where: { id: paymentMethodId, userId },
    });

    if (!paymentMethod) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment method not found',
      });
    }

    // Unset any existing default
    await PaymentMethod.update(
      { isDefault: false },
      { where: { userId, isDefault: true } }
    );

    // Set the new default
    await paymentMethod.update({ isDefault: true });

    return res.status(200).json({
      status: 'success',
      message: 'Default payment method updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process a payment for a ride
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const processRidePayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rideId, paymentMethodId } = req.body;

    if (!rideId) {
      return res.status(400).json({
        status: 'error',
        message: 'Ride ID is required',
      });
    }

    // Get ride details
    const ride = await Ride.findOne({
      where: { id: rideId, userId },
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found',
      });
    }

    // Check if ride is completed
    if (ride.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Only completed rides can be paid for',
      });
    }

    // Check if ride has already been paid for
    if (ride.paymentStatus === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'This ride has already been paid for',
      });
    }

    // Determine payment method - use provided one or default
    let paymentMethod;
    if (paymentMethodId) {
      paymentMethod = await PaymentMethod.findOne({
        where: { id: paymentMethodId, userId },
      });
      
      if (!paymentMethod) {
        return res.status(404).json({
          status: 'error',
          message: 'Payment method not found',
        });
      }
    } else {
      paymentMethod = await PaymentMethod.findOne({
        where: { userId, isDefault: true },
      });
      
      if (!paymentMethod) {
        return res.status(404).json({
          status: 'error',
          message: 'No default payment method found',
        });
      }
    }

    // Calculate the final amount (may differ from estimated fare)
    const amount = ride.actualFare || ride.estimatedFare;

    // In a real implementation, process the payment with a payment processor
    // For demo, we'll simulate successful payment
    const paymentReference = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    
    // Create payment record
    const payment = await Payment.create({
      id: uuidv4(),
      userId,
      rideId,
      paymentMethodId: paymentMethod.id,
      amount,
      currency: ride.currency || 'NGN',
      reference: paymentReference,
      status: 'completed',
      createdAt: new Date(),
    });

    // Update ride payment status
    await ride.update({ paymentStatus: 'completed' });

    // Format response data
    const transaction = {
      id: payment.id,
      amount: payment.amount.toString(),
      status: payment.status,
      rideId: payment.rideId,
      method: paymentMethod.type,
      reference: payment.reference,
      createdAt: payment.createdAt.toISOString(),
    };

    return res.status(200).json({
      status: 'success',
      message: 'Payment processed successfully',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment transaction history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get payments from database
    const { count, rows: payments } = await Payment.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: PaymentMethod,
          as: 'paymentMethod',
          attributes: ['type'],
        },
      ],
    });

    // Format response data
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount.toString(),
      status: payment.status,
      rideId: payment.rideId,
      method: payment.paymentMethod ? payment.paymentMethod.type : 'unknown',
      reference: payment.reference,
      createdAt: payment.createdAt.toISOString(),
    }));

    return res.status(200).json({
      status: 'success',
      data: formattedPayments,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to get bank name from code
 * In a real implementation, this would be a lookup to a bank API or database
 * @param {String} bankCode - Bank code
 * @returns {String} Bank name
 */
const getBankName = (bankCode) => {
  const bankCodes = {
    '044': 'Access Bank',
    '063': 'Access Bank (Diamond)',
    '035A': 'ALAT by WEMA',
    '023': 'Citibank Nigeria',
    '033': 'EcoBank Nigeria',
    '050': 'Ecobank Nigeria',
    '562': 'Ekondo Microfinance Bank',
    '084': 'Enterprise Bank',
    '070': 'Fidelity Bank',
    '011': 'First Bank of Nigeria',
    '214': 'First City Monument Bank',
    '058': 'Guaranty Trust Bank',
    '030': 'Heritage Bank',
    '301': 'Jaiz Bank',
    '082': 'Keystone Bank',
    '014': 'MainStreet Bank',
    '526': 'Parallex Bank',
    '076': 'Polaris Bank',
    '101': 'Providus Bank',
    '221': 'Stanbic IBTC Bank',
    '068': 'Standard Chartered Bank',
    '232': 'Sterling Bank',
    '100': 'Suntrust Bank',
    '032': 'Union Bank of Nigeria',
    '033': 'United Bank For Africa',
    '215': 'Unity Bank',
    '035': 'Wema Bank',
    '057': 'Zenith Bank',
  };

  return bankCodes[bankCode] || 'Unknown Bank';
};

/**
 * Initiate a mobile money payment
 * @route POST /api/v1/payments/mobile-money
 * @access Private (User)
 */
const initiateMobileMoneyPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { provider, amount, type, rideId, phoneNumber } = req.body;
    
    // Validate required fields
    if (!provider || !amount || !type || !phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Provider, amount, type, and phone number are required'
      });
    }
    
    // If payment type is for a ride, validate ride ID
    if (type === 'PAYMENT' && !rideId) {
      return res.status(400).json({
        status: 'error',
        message: 'Ride ID is required for ride payments'
      });
    }
    
    // Get device info from request headers or user agent
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };
    
    // Prepare payment data
    const paymentData = {
      userId,
      provider,
      phoneNumber,
      amount: parseFloat(amount),
      type,
      rideId: type === 'PAYMENT' ? rideId : null,
      channel: 'APP', // Payment initiated from the app
      initiatedBy: 'USER',
      deviceInfo,
      ipAddress: req.ip
    };
    
    // Initiate payment
    const result = await mobilePaymentService.initiatePayment(paymentData);
    
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: result.error
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Payment initiated successfully',
      data: result.payment
    });
  } catch (error) {
    console.error('Error initiating mobile money payment:', error);
    return next(error);
  }
};

/**
 * Process payment callback
 * @route POST /api/v1/payments/callback/:provider
 * @access Public (Webhook)
 */
const processPaymentCallback = async (req, res, next) => {
  try {
    const { provider } = req.params;
    let callbackData;
    
    // Format callback data based on provider
    switch (provider.toUpperCase()) {
      case 'MTN':
        callbackData = {
          provider: 'MTN',
          transactionId: req.body.transactionId,
          status: req.body.status,
          amount: req.body.amount,
          currency: req.body.currency,
          reason: req.body.reason,
          timestamp: req.body.timestamp
        };
        break;
        
      case 'VODAFONE':
        callbackData = {
          provider: 'VODAFONE',
          transactionId: req.body.transID,
          status: req.body.status,
          amount: req.body.amount,
          currency: req.body.currency,
          reason: req.body.reason,
          timestamp: req.body.timestamp
        };
        break;
        
      case 'AIRTEL':
        callbackData = {
          provider: 'AIRTEL',
          transactionId: req.body.txnId,
          status: req.body.txnStatus,
          amount: req.body.amount,
          currency: req.body.currency,
          reason: req.body.responseDesc,
          timestamp: req.body.timestamp
        };
        break;
        
      case 'PAYSTACK':
        callbackData = {
          provider: 'PAYSTACK',
          transactionId: req.body.data?.id?.toString(),
          reference: req.body.data?.reference,
          status: req.body.data?.status,
          amount: req.body.data?.amount / 100, // Convert from smallest currency unit
          currency: req.body.data?.currency,
          reason: req.body.message,
          timestamp: new Date().toISOString()
        };
        break;
        
      case 'FLUTTERWAVE':
        callbackData = {
          provider: 'FLUTTERWAVE',
          transactionId: req.body.data?.id?.toString(),
          reference: req.body.data?.tx_ref,
          status: req.body.data?.status,
          amount: req.body.data?.amount,
          currency: req.body.data?.currency,
          reason: req.body.message,
          timestamp: new Date().toISOString()
        };
        break;
        
      default:
        return res.status(400).json({
          status: 'error',
          message: `Unsupported payment provider: ${provider}`
        });
    }
    
    // Process payment callback with orchestration service
    const result = await paymentOrchestrationService.processPayment({
      paymentData: callbackData,
      provider: provider.toLowerCase()
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Payment callback processed successfully'
    });
  } catch (error) {
    console.error('Error processing payment callback:', error);
    return next(error);
  }
};

/**
 * Get user wallet balance
 * @route GET /api/v1/payments/wallet/balance
 * @access Private (User)
 */
const getWalletBalance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // In a real implementation, this would retrieve the user's wallet balance
    // For demonstration, we'll just return a fixed balance
    
    return res.status(200).json({
      status: 'success',
      data: {
        balance: 1500.75,
        currency: 'GHS',
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return next(error);
  }
};

/**
 * Top up wallet
 * @route POST /api/v1/payments/wallet/topup
 * @access Private (User)
 */
const topUpWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { provider, amount, phoneNumber } = req.body;
    
    // Validate required fields
    if (!provider || !amount || !phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Provider, amount, and phone number are required'
      });
    }
    
    // Prepare payment data
    const paymentData = {
      userId,
      provider,
      phoneNumber,
      amount: parseFloat(amount),
      type: 'TOP_UP', // Top-up transaction
      channel: 'APP', // Payment initiated from the app
      initiatedBy: 'USER',
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      },
      ipAddress: req.ip
    };
    
    // Initiate payment
    const result = await mobilePaymentService.initiatePayment(paymentData);
    
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: result.error
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Wallet top-up initiated successfully',
      data: result.payment
    });
  } catch (error) {
    console.error('Error initiating wallet top-up:', error);
    return next(error);
  }
};

/**
 * Get mobile payment history
 * @route GET /api/v1/payments/mobile/history
 * @access Private (User)
 */
const getMobilePaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, status, limit, offset } = req.query;
    
    // Prepare query options
    const options = {
      type,
      status,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0
    };
    
    // Get user payments
    const result = await mobilePaymentService.getUserPayments(userId, options);
    
    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting mobile payment history:', error);
    return next(error);
  }
};

// =============== New Enhanced Payment Methods ===============

/**
 * Get available payment providers
 * @route GET /api/v1/payments/providers
 * @access Private (User)
 */
const getPaymentProviders = async (req, res, next) => {
  try {
    // Return list of available payment providers with their capabilities
    const providers = [
      {
        id: 'mtn_momo',
        name: 'MTN Mobile Money',
        type: 'mobile_money',
        countries: ['Ghana', 'Nigeria', 'Uganda', 'Rwanda'],
        currencies: ['GHS', 'NGN', 'UGX', 'RWF'],
        features: ['payment', 'withdrawal', 'refund']
      },
      {
        id: 'airtel',
        name: 'Airtel Money',
        type: 'mobile_money',
        countries: ['Ghana', 'Nigeria', 'Tanzania', 'Kenya'],
        currencies: ['GHS', 'NGN', 'TZS', 'KES'],
        features: ['payment', 'withdrawal']
      },
      {
        id: 'vodafone',
        name: 'Vodafone Cash',
        type: 'mobile_money',
        countries: ['Ghana'],
        currencies: ['GHS'],
        features: ['payment', 'withdrawal']
      },
      {
        id: 'paystack',
        name: 'Paystack',
        type: 'aggregator',
        countries: ['Ghana', 'Nigeria', 'South Africa', 'Kenya'],
        currencies: ['GHS', 'NGN', 'ZAR', 'KES', 'USD'],
        features: ['card', 'mobile_money', 'bank_transfer', 'ussd', 'refund']
      },
      {
        id: 'flutterwave',
        name: 'Flutterwave',
        type: 'aggregator',
        countries: ['Ghana', 'Nigeria', 'South Africa', 'Kenya', 'Uganda'],
        currencies: ['GHS', 'NGN', 'ZAR', 'KES', 'UGX', 'USD'],
        features: ['card', 'mobile_money', 'bank_transfer', 'ussd', 'refund']
      }
    ];
    
    return res.status(200).json({
      status: 'success',
      data: providers
    });
  } catch (error) {
    console.error('Error fetching payment providers:', error);
    return next(error);
  }
};

/**
 * Initiate payment with a specific provider
 * @route POST /api/v1/payments/providers/:provider/initiate
 * @access Private (User)
 */
const initiatePaymentWithProvider = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { provider } = req.params;
    const { 
      paymentMethodId, 
      amount, 
      currency = 'GHS', 
      rideId, 
      description,
      phoneNumber,
      network,
      email,
      callbackUrl
    } = req.body;
    
    // Get user details
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Prepare payment data
    const paymentData = {
      paymentMethodId,
      amount: parseFloat(amount),
      currency,
      userId,
      rideId,
      description: description || 'Payment to Okada Transportation',
      phoneNumber: phoneNumber || user.phoneNumber,
      email: email || user.email,
      network,
      callbackUrl
    };
    
    // Process payment with the orchestration service
    const result = await paymentOrchestrationService.processPayment(paymentData);
    
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: result.error
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Payment initiated successfully',
      data: {
        paymentId: result.paymentId,
        transactionId: result.transactionId,
        status: result.status,
        provider: result.provider,
        requiresAction: result.requiresAction,
        actionUrl: result.actionUrl
      }
    });
  } catch (error) {
    console.error('Error initiating payment with provider:', error);
    return next(error);
  }
};

/**
 * Verify payment with a specific provider
 * @route GET /api/v1/payments/providers/:provider/verify/:reference
 * @access Private (User)
 */
const verifyPaymentWithProvider = async (req, res, next) => {
  try {
    const { provider, reference } = req.params;
    
    // Verify the payment using the orchestration service
    const result = await paymentOrchestrationService.verifyPayment({
      provider,
      reference
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        verified: result.success,
        status: result.status,
        paymentId: result.paymentId,
        amount: result.amount,
        currency: result.currency,
        completedAt: result.completedAt,
        failureReason: result.failureReason
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return next(error);
  }
};

/**
 * Process a refund
 * @route POST /api/v1/payments/refund
 * @access Private (User) with risk score check
 */
const processRefund = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { paymentId, amount, reason } = req.body;
    
    // Validate required fields
    if (!paymentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment ID is required'
      });
    }
    
    // Get payment details
    const payment = await Payment.findOne({
      where: { id: paymentId }
    });
    
    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }
    
    // Only payment owner or admin can refund
    if (payment.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to refund this payment'
      });
    }
    
    // Only completed payments can be refunded
    if (payment.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Only completed payments can be refunded'
      });
    }
    
    // Check if payment is already refunded
    if (payment.status === 'refunded') {
      return res.status(400).json({
        status: 'error',
        message: 'This payment has already been refunded'
      });
    }
    
    // Determine refund amount (partial or full)
    const refundAmount = amount ? parseFloat(amount) : payment.amount;
    
    // Validate refund amount
    if (refundAmount <= 0 || refundAmount > payment.amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid refund amount'
      });
    }
    
    // Process refund with payment provider
    // This would be implemented in a real application
    // For demo, we'll simulate successful refund
    
    // Update payment status
    await payment.update({
      status: 'refunded',
      metadata: {
        ...payment.metadata,
        refund: {
          amount: refundAmount,
          reason: reason || 'Customer requested refund',
          refundedAt: new Date().toISOString(),
          refundedBy: userId,
          isPartial: refundAmount < payment.amount
        }
      }
    });
    
    // Create refund record if applicable
    const refundId = uuidv4();
    
    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'Payment refunded successfully',
      data: {
        refundId,
        paymentId: payment.id,
        amount: refundAmount,
        currency: payment.currency,
        reason: reason || 'Customer requested refund',
        refundedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    return next(error);
  }
};

/**
 * Get payment analytics data 
 * @route GET /api/v1/payments/analytics
 * @access Private (Admin)
 */
const getPaymentAnalytics = async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    
    if (!period || !['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid period (daily, weekly, monthly) is required'
      });
    }
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get metrics for the period
    const analytics = await paymentAnalyticsService.getMetricsForPeriod(period, start, end);
    
    return res.status(200).json({
      status: 'success',
      data: {
        period,
        timeframe: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        metrics: analytics
      }
    });
  } catch (error) {
    console.error('Error getting payment analytics:', error);
    return next(error);
  }
};

/**
 * Generate payment report
 * @route POST /api/v1/payments/reports/generate
 * @access Private (Admin)
 */
const generatePaymentReport = async (req, res, next) => {
  try {
    const { reportType, startDate, endDate, includeDetails } = req.body;
    
    if (!reportType || !['daily', 'weekly', 'monthly', 'custom'].includes(reportType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid report type (daily, weekly, monthly, custom) is required'
      });
    }
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    // Generate report
    const options = {
      startDate: start,
      endDate: end,
      period: reportType,
      generateReport: true,
      includeDetails: !!includeDetails
    };
    
    const result = await paymentAnalyticsService.calculateMetrics(options);
    
    return res.status(200).json({
      status: 'success',
      message: 'Payment report generated successfully',
      data: {
        reportId: result.reportId || uuidv4(),
        reportType,
        timeframe: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        summary: {
          totalTransactions: result.totalTransactions,
          successfulTransactions: result.metrics.successfulTransactions,
          failedTransactions: result.metrics.failedTransactions,
          totalRevenue: result.metrics.totalRevenue
        },
        reportUrl: result.reportPath ? `/reports/analytics/${result.reportPath.split('/').pop()}` : null
      }
    });
  } catch (error) {
    console.error('Error generating payment report:', error);
    return next(error);
  }
};

/**
 * Run payment reconciliation job
 * @route POST /api/v1/payments/reconciliation/run
 * @access Private (Super Admin)
 */
const runPaymentReconciliation = async (req, res, next) => {
  try {
    const { startDate, endDate, providers, fixDiscrepancies } = req.body;
    
    // Parse dates
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
    const end = endDate ? new Date(endDate) : new Date();
    
    // Run reconciliation
    const options = {
      startDate: start,
      endDate: end,
      providers: providers || ['paystack', 'flutterwave', 'mtnMomo'],
      fixDiscrepancies: fixDiscrepancies !== false, // Default to true
      generateReport: true,
      reportType: 'custom'
    };
    
    // Start reconciliation in background
    const jobId = uuidv4();
    
    // In a real implementation, this would be a background job
    // For now, we'll just set up a timeout to simulate async processing
    setTimeout(async () => {
      try {
        const result = await paymentReconciliationService.reconcilePayments(options);
        console.log(`Reconciliation job ${jobId} completed successfully`);
      } catch (error) {
        console.error(`Reconciliation job ${jobId} failed:`, error);
      }
    }, 100);
    
    return res.status(202).json({
      status: 'success',
      message: 'Payment reconciliation job started',
      data: {
        jobId,
        timeframe: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        providers: options.providers,
        fixDiscrepancies: options.fixDiscrepancies,
        status: 'processing'
      }
    });
  } catch (error) {
    console.error('Error running payment reconciliation:', error);
    return next(error);
  }
};

/**
 * Get reconciliation job status
 * @route GET /api/v1/payments/reconciliation/status
 * @access Private (Super Admin)
 */
const getReconciliationStatus = async (req, res, next) => {
  try {
    const { jobId } = req.query;
    
    if (!jobId) {
      return res.status(400).json({
        status: 'error',
        message: 'Job ID is required'
      });
    }
    
    // In a real implementation, this would check the status of the background job
    // For now, we'll just simulate a completed job
    
    return res.status(200).json({
      status: 'success',
      data: {
        jobId,
        status: 'completed',
        startedAt: new Date(Date.now() - 60000).toISOString(),
        completedAt: new Date().toISOString(),
        summary: {
          totalPayments: 1245,
          reconciled: 1230,
          mismatches: 10,
          missingLocal: 3,
          missingProvider: 2,
          errors: 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting reconciliation status:', error);
    return next(error);
  }
};

/**
 * Get reconciliation report
 * @route GET /api/v1/payments/reconciliation/reports/:id
 * @access Private (Super Admin)
 */
const getReconciliationReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Report ID is required'
      });
    }
    
    // In a real implementation, this would fetch the reconciliation report
    // For now, we'll just simulate a report response
    
    return res.status(200).json({
      status: 'success',
      data: {
        reportId: id,
        generatedAt: new Date().toISOString(),
        timeframe: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        summary: {
          totalPayments: 1245,
          reconciled: 1230,
          mismatches: 10,
          missingLocal: 3,
          missingProvider: 2,
          errors: 0
        },
        providerBreakdown: {
          paystack: {
            totalPayments: 734,
            reconciled: 728,
            mismatches: 5,
            missingLocal: 1,
            missingProvider: 0,
            errors: 0
          },
          flutterwave: {
            totalPayments: 412,
            reconciled: 407,
            mismatches: 3,
            missingLocal: 1,
            missingProvider: 1,
            errors: 0
          },
          mtnMomo: {
            totalPayments: 99,
            reconciled: 95,
            mismatches: 2,
            missingLocal: 1,
            missingProvider: 1,
            errors: 0
          }
        },
        reportUrl: `/reports/reconciliation/${id}.csv`
      }
    });
  } catch (error) {
    console.error('Error getting reconciliation report:', error);
    return next(error);
  }
};

module.exports = {
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  processRidePayment,
  getPaymentHistory,
  initiateMobileMoneyPayment,
  processPaymentCallback,
  getWalletBalance,
  topUpWallet,
  getMobilePaymentHistory,
  // New enhanced payment methods
  getPaymentProviders,
  initiatePaymentWithProvider,
  verifyPaymentWithProvider,
  processRefund,
  // Admin-only methods
  getPaymentAnalytics,
  generatePaymentReport,
  runPaymentReconciliation,
  getReconciliationStatus,
  getReconciliationReport
};
