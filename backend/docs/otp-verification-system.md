# OTP Verification System

This document describes the OTP (One-Time Password) verification system used in the Okada Transportation application.

## Overview

The OTP system is designed to provide secure verification codes for user authentication, password resets, and account verification. It's built to be resilient against database connection issues, ensuring that users can still receive and verify codes even when MongoDB experiences timeouts or connectivity problems.

## Architecture

The system follows a layered architecture:

1. **API Layer**: Express routes that handle HTTP requests
2. **Controller Layer**: Business logic controllers that process requests
3. **Service Layer**: Core OTP services that generate, store, and verify codes
4. **Data Layer**: MongoDB storage for OTP records

### Key Components

- `otp-auth.service.js` - Core service with fail-safe OTP operations
- `new-otp.controller.js` - Controller handling OTP requests/verification
- `new-otp.routes.js` - API routes for OTP operations
- `OTP.js` - MongoDB model for OTP records

## Fail-Safe Design

The system is designed to work even when MongoDB connections fail:

1. **Generate First**: OTP codes are generated before any database operations
2. **Database Independence**: Codes are delivered (email/SMS) independent of database success
3. **Non-Blocking Save**: Database operations use non-blocking patterns
4. **Fallback Mechanisms**: Multiple fallback layers if primary operations fail

## Usage

### Sending OTP Codes

To send a verification code:

```javascript
// API endpoint: POST /api/v1/mongo/otp/send
// Request body:
{
  "userId": "user_id_here",
  "channel": "email", // or "sms"
  "type": "verification", // or "passwordReset", "login"
  "email": "user@example.com" // or "phoneNumber": "+1234567890"
}
```

### Verifying OTP Codes

To verify a code:

```javascript
// API endpoint: POST /api/v1/mongo/otp/verify
// Request body:
{
  "userId": "user_id_here",
  "code": "123456", // 6-digit code
  "type": "verification" // or "passwordReset", "login"
}
```

### Public (Unauthenticated) OTP Operations

For users who aren't logged in:

```javascript
// API endpoint: POST /api/v1/mongo/otp/public/request
// Request body:
{
  "channel": "email", // or "sms"
  "type": "verification", // or "passwordReset", "login"
  "email": "user@example.com" // or "phoneNumber": "+1234567890"
}
```

## Testing

A test script is provided to verify the OTP system works correctly:

```bash
cd backend
./test-otp.sh
```

This tests OTP generation, delivery, and verification without requiring a working database connection.

## Timeouts and Retries

The system no longer relies on database timeouts and avoids blocking operations:

1. Code generation is immediate and deterministic
2. OTP delivery happens before database operations
3. Database saves are non-blocking and won't prevent the OTP flow from completing
4. Verification attempts will succeed even if the database is unavailable

## Security Considerations

- OTP codes expire after 10 minutes
- Maximum 3 verification attempts per code
- Rate limiting prevents abuse (5 requests per minute for authenticated, 3 for public)
- Phone numbers and emails are partially masked in logs
- Sensitive information like OTP codes are not logged in production

## Mobile App Integration

The mobile apps (rider and passenger) integrate with this system via:

- `authService.ts` - Authentication service in the mobile app
- `otpService.ts` - OTP-specific service for verification workflows

## Troubleshooting

If OTP codes aren't being delivered:

1. Check email/SMS service configuration
2. Verify the user's email/phone is correct
3. Check server logs for delivery errors
4. Run the test script to verify the system works without database

If verification is failing:

1. Ensure the code hasn't expired (10 minute window)
2. Check that the user hasn't exceeded maximum attempts
3. Verify the code is being entered correctly
4. Check server logs for verification errors

## Future Improvements

Potential future enhancements:

1. Add alternative verification methods (QR codes, push notifications)
2. Implement TOTP (Time-based One-Time Password) for enhanced security
3. Add SMS delivery status tracking and automatic retries
4. Implement analytics for OTP success/failure rates
