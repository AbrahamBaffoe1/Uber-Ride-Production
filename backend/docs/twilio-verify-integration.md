# Twilio Integration for Okada Ride Africa

This guide details the integration of Twilio services for SMS-based OTP (One-Time Password) verification in the Okada Ride Africa platform.

## Twilio Integration Components

The system implements two approaches for SMS verification:

1. **Basic SMS OTP**: Using direct SMS messages via Twilio's Programmable SMS
2. **Twilio Verify API**: Using Twilio's Verify API for enhanced verification workflows

## Configuration

### Environment Variables

The following environment variables are used for Twilio configuration:

```
# SMS configuration
SMS_PROVIDER=twilio
SMS_SENDER_ID=OKADA

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid
```

### Required Twilio Resources

1. **Twilio Account**: Create an account at [Twilio](https://www.twilio.com/)
2. **Twilio Phone Number**: Obtain a phone number with SMS capabilities
3. **Verify Service**: Create a Verify service in the Twilio console for enhanced verification

## API Endpoints

### Standard OTP Endpoints

```
POST /api/v1/auth/request-otp    # Request an OTP for verification/login/reset
POST /api/v1/auth/verify-otp     # Verify the OTP code
```

### Twilio Verify API Endpoints

```
POST /api/v1/verify/send         # Send verification code using Twilio Verify
POST /api/v1/verify/check        # Check verification code status
POST /api/v1/verify/register     # Register and verify a new user in one step
POST /api/v1/verify/login        # Login with phone verification
```

## Verification Workflows

### Registration Verification Flow

1. **User Registration**: Collect user information including phone number
2. **Send Verification**: 
   ```
   POST /api/v1/verify/send
   {
     "phoneNumber": "+1234567890"
   }
   ```
3. **Verify Code**: User enters verification code
   ```
   POST /api/v1/verify/check
   {
     "phoneNumber": "+1234567890",
     "code": "123456"
   }
   ```

### One-Step Registration + Verification

```
POST /api/v1/verify/register
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "password": "securePassword123",
  "email": "john@example.com",
  "code": "123456"
}
```

### Login with Phone Verification

```
# Step 1: Send verification
POST /api/v1/verify/send
{
  "phoneNumber": "+1234567890"
}

# Step 2: Login with verification code
POST /api/v1/verify/login
{
  "phoneNumber": "+1234567890",
  "code": "123456"
}
```

## Implementation Details

### Services

1. **SMS Service**: `backend/src/services/sms.service.js`
   - Handles direct SMS sending via Twilio
   
2. **OTP Service**: `backend/src/services/otp.service.js`
   - Manages OTP generation, storage, and verification
   - Integrates with SMS service for delivery
   
3. **Verify Service**: `backend/src/services/verify.service.js`
   - Implements Twilio Verify API integration
   - Handles verification code sending and checking

### Models

- **OTP Model**: Stores OTP codes and verification status
  - Located at `backend/src/models/otp.js`
  - Tracks OTP codes, expiration, usage status, and verification attempts

## Security Considerations

1. **Rate Limiting**: The OTP service includes cooldown periods to prevent abuse:
   - 60-second cooldown between OTP requests
   - Maximum of 5 verification attempts per OTP
   
2. **OTP Expiration**: All OTPs expire after 10 minutes for security
   
3. **Secure Comparison**: The system uses timing-safe comparison to prevent timing attacks

## Development vs. Production

In development mode:
- If SMS sending fails, the system falls back to console logging the OTP for testing
- Twilio credentials can be omitted, and the system will use console output

For production:
- All Twilio credentials must be configured
- Console fallbacks should be disabled
- OTP codes should not be returned in API responses

## Troubleshooting

### Common Issues

1. **SMS Not Received**:
   - Check Twilio logs for delivery status
   - Verify phone number format (must include country code, e.g., +1234567890)
   - Confirm Twilio account has sufficient balance

2. **Verification Failures**:
   - Check that OTP hasn't expired (10-minute lifetime)
   - Ensure the correct verification type is being used
   - Verify the user hasn't exceeded maximum attempt count

3. **Service Initialization Issues**:
   - Confirm all environment variables are correctly set
   - Check Twilio service SID is valid and active
   - Verify Twilio auth token hasn't been regenerated

## Sample Requests

### Send Verification (Twilio Verify)

```bash
curl -X POST http://localhost:3000/api/v1/verify/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890"
  }'
```

### Check Verification (Twilio Verify)

```bash
curl -X POST http://localhost:3000/api/v1/verify/check \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "code": "123456"
  }'
```

### Twilio API Direct (Reference)

```bash
curl 'https://verify.twilio.com/v2/Services/YOUR_VERIFY_SERVICE_SID/VerificationCheck' -X POST \
  --data-urlencode 'To=+1234567890' \
  --data-urlencode 'Code=123456' \
  -u YOUR_TWILIO_ACCOUNT_SID:your_auth_token
