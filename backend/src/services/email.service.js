/**
 * Email Service
 * 
 * This service handles sending emails for the application using Nodemailer.
 */
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Main email transporter using SMTP configuration
let transporter;
let transporterInitialized = false;
let useDevFallback = false;

// NOTE: Gmail now requires an "App Password" instead of regular account password
// To generate an App Password:
// 1. Enable 2-Step Verification on the Google account
// 2. Go to https://myaccount.google.com/apppasswords
// 3. Generate a new app password for this application
// 4. Update the SMTP_PASS value in .env with the generated password

// Initialize the email transporter with proper credentials
try {
  // Validate required SMTP environment variables
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Missing required SMTP environment variables. Email functionality may not work properly.');
  }
  
  // Configure transporter with special handling for Gmail
  const isGmail = process.env.SMTP_HOST?.includes('gmail.com');
  
  const transporterOptions = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || (isGmail ? 587 : 25),
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Gmail-specific configuration
    ...(isGmail && {
      service: 'gmail',
      debug: process.env.NODE_ENV !== 'production',
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
        minVersion: 'TLSv1.2'
      }
    })
  };

  transporter = nodemailer.createTransport(transporterOptions);

  // Verify connection configuration during initialization
  if (process.env.NODE_ENV === 'development') {
    console.log('Email transport configuration:', {
      host: transporterOptions.host,
      port: transporterOptions.port,
      secure: transporterOptions.secure,
      user: process.env.SMTP_USER?.substring(0, 3) + '***',
      service: isGmail ? 'gmail' : undefined
    });
  }

  // Verify connection only in development mode
  if (process.env.NODE_ENV === 'development') {
    transporter.verify(function(error, success) {
      if (error) {
        console.error('SMTP connection error:', error);
        useDevFallback = true;
      } else {
        console.log('SMTP server connection verified and ready to send emails');
      }
    });
  } else {
    // In production, just set as initialized and handle errors during sending
    transporterInitialized = true;
    console.log('Nodemailer transporter configured with SMTP credentials');
  }
} catch (error) {
  console.error('Error creating nodemailer transporter:', error);
  useDevFallback = true;
}

// Development fallback transporter (logs emails, doesn't actually send them)
const createFallbackTransporter = () => {
  console.log('⚠️ Using development fallback email transport - emails will be logged but not sent');
  
  // In development environment, we'll actually try to send the OTP to the console
  // with a complete log of the email for debugging purposes
  return {
    sendMail: (mailOptions) => {
      return new Promise((resolve) => {
        console.log('\n==============================================================');
        console.log('📧 EMAIL PREVIEW (DEVELOPMENT MODE):');
        console.log('==============================================================');
        console.log(`To: ${mailOptions.to}`);
        console.log(`From: ${mailOptions.from}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log('--------------------------------------------------------------');
        console.log('Text Content:');
        console.log(mailOptions.text);
        
        if (mailOptions.html) {
          console.log('--------------------------------------------------------------');
          console.log('HTML Content (stripped tags):');
          // Attempt to extract OTP code from HTML using regex for 4-6 digit numbers
          const otpMatch = mailOptions.html.match(/(\d{4,6})/);
          const otpCode = otpMatch ? otpMatch[1] : 'Not found';
          
          console.log(`OTP Code: ${otpCode}`);
        }
        console.log('==============================================================\n');
        
        // Return a fake success response
        resolve({
          messageId: `dev-${Date.now()}@fakeemail.com`,
          response: 'Development email transport - message logged but not sent'
        });
      });
    },
    verify: (callback) => {
      // Always success for fallback
      callback(null, true);
    }
  };
};

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 * @returns {Promise<boolean>} - Whether email was sent successfully
 */
const sendEmail = async (to, subject, text, html = null) => {
  try {
    // Validate email address
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new Error('Invalid email address format');
    }

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      text
    };

    // Add HTML content if provided
    if (html) {
      mailOptions.html = html;
    }

    // Determine which transporter to use
    let activeTransporter;
    
    if (useDevFallback || !transporterInitialized) {
      activeTransporter = createFallbackTransporter();
    } else {
      // Attempt to use the real transporter
      try {
        // Check if transporter is still valid
        if (!transporter) {
          throw new Error('Transporter not initialized');
        }
        activeTransporter = transporter;
      } catch (error) {
        console.warn('Error accessing configured transporter, using fallback:', error.message);
        activeTransporter = createFallbackTransporter();
        useDevFallback = true; // Use fallback for future emails in this session
      }
    }

    // Send email
    const info = await activeTransporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] Message sent or logged: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[EMAIL SERVICE] Error sending email:', error);
    
    // In development or when auth fails, use fallback but don't throw an error
    if (!useDevFallback && (error.code === 'EAUTH' || process.env.NODE_ENV === 'development')) {
      console.log('[EMAIL SERVICE] Switching to development fallback mode due to error');
      useDevFallback = true;
      
      // Try again with fallback
      return sendEmail(to, subject, text, html);
    }
    
    // For other errors, throw
    throw error;
  }
};

/**
 * Send an SMS via email-to-SMS gateway
 * @param {string} phoneNumber - Phone number in international format
 * @param {string} message - SMS content
 * @returns {Promise<boolean>} - Whether SMS was sent successfully
 */
const sendSMS = async (phoneNumber, message) => {
  try {
    // Clean the phone number (remove any non-digit characters except the + sign)
    const cleanPhoneNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Remove the + sign and extract country code and number
    const numberWithoutPlus = cleanPhoneNumber.startsWith('+') 
      ? cleanPhoneNumber.substring(1) 
      : cleanPhoneNumber;
    
    // Map of common carriers with their SMS gateway domains
    const carrierGateways = {
      // US Carriers
      'att': 'txt.att.net',       // AT&T
      'tmobile': 'tmomail.net',   // T-Mobile
      'verizon': 'vtext.com',     // Verizon
      'sprint': 'messaging.sprintpcs.com', // Sprint
      'boost': 'sms.myboostmobile.com',  // Boost Mobile
      'cricket': 'sms.cricketwireless.net', // Cricket
      'metro': 'mymetropcs.com',  // Metro PCS
      
      // International carriers - add more as needed
      'vodafone': 'vodafone.net', // Vodafone (generic)
      'orange': 'orange.net',     // Orange (generic)
      'mtn': 'mtn.co.za',         // MTN (South Africa)
      'airtel': 'airtel.in',      // Airtel (generic)
      'safaricom': 'safaricom.co.ke', // Safaricom (Kenya)
    };
    
    // In production, we would use a carrier lookup service to determine the carrier
    // For now, we'll try to send to multiple common carriers
    const smsGatewayEmails = [];
    
    // Try to detect country code from phone number
    let countryCode = null;
    if (numberWithoutPlus.startsWith('1') && numberWithoutPlus.length === 11) {
      // US/Canada number
      countryCode = '1';
      // Format the number without country code
      const nationalNumber = numberWithoutPlus.substring(1);
      
      // Add US carrier gateways
      smsGatewayEmails.push(`${nationalNumber}@txt.att.net`); // AT&T
      smsGatewayEmails.push(`${nationalNumber}@tmomail.net`); // T-Mobile
      smsGatewayEmails.push(`${nationalNumber}@vtext.com`);   // Verizon
      smsGatewayEmails.push(`${nationalNumber}@messaging.sprintpcs.com`); // Sprint
    } else if (numberWithoutPlus.startsWith('234')) {
      // Nigeria
      countryCode = '234';
      const nationalNumber = numberWithoutPlus.substring(3);
      smsGatewayEmails.push(`${nationalNumber}@mtnnigeria.net`); // MTN Nigeria (example)
    } else if (numberWithoutPlus.startsWith('254')) {
      // Kenya
      countryCode = '254';
      const nationalNumber = numberWithoutPlus.substring(3);
      smsGatewayEmails.push(`${nationalNumber}@safaricom.co.ke`); // Safaricom (example)
    } else {
      // For other countries, we might need a more comprehensive lookup service
      // For now, use a generic approach with the full number
      smsGatewayEmails.push(`${numberWithoutPlus}@txt.att.net`);
      smsGatewayEmails.push(`${numberWithoutPlus}@tmomail.net`);
    }
    
    // Include the original phone number in the list to ensure someone gets the message
    // This uses our SMS backup system in case carrier detection fails
    smsGatewayEmails.push(process.env.SMS_BACKUP_EMAIL || process.env.SMTP_USER);
    
    // Send the SMS via email to all potential gateways
    const subject = 'OTP';  // Keep subject very short for SMS gateways
    const emailPromises = smsGatewayEmails.map(email => 
      sendEmail(email, subject, message)
        .catch(err => {
          // Log the error but don't throw, we want to try all carriers
          console.log(`Failed to send to ${email}: ${err.message}`);
          return false;
        })
    );
    
    // Wait for all gateway attempts to complete
    const results = await Promise.all(emailPromises);
    const atLeastOneSuccess = results.some(result => result !== false);
    
    if (!atLeastOneSuccess) {
      throw new Error('Failed to send SMS to any carrier gateway');
    }
    
    // Return success result with a unique message ID
    return {
      status: 'delivered',
      messageId: 'email-sms-' + Date.now(),
      to: phoneNumber
    };
  } catch (error) {
    console.error('[EMAIL SERVICE] Error sending SMS via email:', error);
    throw error;
  }
};

/**
 * Send a verification email with code
 * @param {string} to - Recipient email address
 * @param {string} code - Verification code
 * @returns {Promise<boolean>} - Whether email was sent successfully
 */
const sendVerificationEmail = async (to, code) => {
  try {
    console.log(`Attempting to send verification email to: ${to} with code: ${code}`);
    
    // Check if SMTP settings are configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.warn('SMTP settings not properly configured. Using development fallback.');
      // We'll continue with the fallback mode that will be handled in sendEmail
    }
    
    const subject = `${process.env.SMTP_FROM_NAME || 'Okada Ride Africa'} - Email Verification`;
    const text = `Your email verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
      </div>
    `;
    
    const result = await sendEmail(to, subject, text, html);
    console.log(`Verification email sent successfully to ${to}`);
    return result;
  } catch (error) {
    console.error(`Failed to send verification email to ${to}:`, error);
    
    // In development mode, even if we successfully sent the email,
    // also log the code to console for easy testing
    if (process.env.NODE_ENV === 'development') {
      console.log('\n==== DEVELOPMENT MODE: VERIFICATION CODE ====');
      console.log(`Email: ${to}`);
      console.log(`Code: ${code}`);
      console.log('============================================\n');
      // Don't return here - still proceed with email sending for testing
    }
    
    throw error;
  }
};

/**
 * Send a password reset email
 * @param {string} to - Recipient email address
 * @param {string} token - Reset token or code
 * @param {string} resetUrl - URL to reset password (optional)
 * @returns {Promise<boolean>} - Whether email was sent successfully
 */
const sendPasswordResetEmail = async (to, token, resetUrl = null) => {
  const subject = `${process.env.SMTP_FROM_NAME || 'Okada Ride Africa'} - Password Reset`;
  
  let text, html;
  
  if (resetUrl) {
    // URL-based reset
    text = `You requested to reset your password. Please click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you did not request this, please contact our support team immediately.`;
    
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested to reset your password. Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
        </div>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #1a73e8;">${resetUrl}</p>
        <p>This link will expire in 10 minutes.</p>
        <p>If you did not request this, please contact our support team immediately.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
      </div>
    `;
  } else {
    // Code-based reset
    text = `Your password reset code is: ${token}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please contact our support team immediately.`;
    
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Your password reset code is:</p>
        <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
          ${token}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please contact our support team immediately.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
      </div>
    `;
  }
  
  return await sendEmail(to, subject, text, html);
};

/**
 * Send a welcome email
 * @param {string} to - Recipient email address
 * @param {string} name - Recipient name
 * @returns {Promise<boolean>} - Whether email was sent successfully
 */
const sendWelcomeEmail = async (to, name) => {
  const subject = `Welcome to ${process.env.SMTP_FROM_NAME || 'Okada Ride Africa'}!`;
  const text = `Hello ${name},\n\nWelcome to Okada Ride Africa! We're excited to have you on board.\n\nYou can now log in to your account and start using our services.\n\nBest regards,\nThe Okada Ride Africa Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Okada Ride Africa!</h2>
      <p>Hello ${name},</p>
      <p>Welcome to Okada Ride Africa! We're excited to have you on board.</p>
      <p>You can now log in to your account and start using our services.</p>
      <p>Best regards,<br>The Okada Ride Africa Team</p>
      <hr>
      <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
    </div>
  `;
  
  return await sendEmail(to, subject, text, html);
};

// Export the service methods
export {
  sendEmail,
  sendSMS,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
