/**
 * Crypto Service
 * Provides advanced encryption for sensitive data and secure key management
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import util from 'util';
import jwt from 'jsonwebtoken';

// Convert callbacks to promises
const randomBytes = util.promisify(crypto.randomBytes);
const scrypt = util.promisify(crypto.scrypt);

// Algorithm Constants
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // for AES-256
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;
const KEY_ITERATIONS = 100000;
const KEY_DIGEST = 'sha512';

class CryptoService {
  constructor() {
    // Load or generate master key
    this.initializeMasterKey();
  }

  /**
   * Initialize the master key (load from env or secure storage)
   */
  async initializeMasterKey() {
    // In production, this should be loaded from a secure key management service
    // like AWS KMS, HashiCorp Vault, etc.
    if (process.env.MASTER_KEY) {
      this.masterKey = Buffer.from(process.env.MASTER_KEY, 'hex');
    } else {
      console.warn('MASTER_KEY not found in environment. Generating a temporary one.');
      console.warn('FOR PRODUCTION: Set a persistent MASTER_KEY in the environment.');
      this.masterKey = await randomBytes(KEY_LENGTH);
      // In development, we could save this to a file, but for production
      // this should be managed by a key management service
      process.env.MASTER_KEY = this.masterKey.toString('hex');
    }
  }

  /**
   * Derive a key from a password
   * @param {string} password - Password to derive key from
   * @param {Buffer} salt - Salt for key derivation
   * @returns {Promise<Buffer>} - Derived key
   */
  async deriveKey(password, salt) {
    return scrypt(password, salt, KEY_LENGTH);
  }

  /**
   * Encrypt sensitive data with AES-256-GCM
   * @param {string|Object} data - Data to encrypt
   * @param {string} [keyScope='default'] - Scope of key (different keys for different types of data)
   * @returns {Promise<string>} - Encrypted data as a hex string with format: iv:salt:authTag:encryptedData
   */
  async encrypt(data, keyScope = 'default') {
    try {
      // Convert data to string if it's an object
      const dataStr = typeof data === 'object' ? JSON.stringify(data) : data;
      
      // Generate random salt and IV
      const salt = await randomBytes(SALT_LENGTH);
      const iv = await randomBytes(IV_LENGTH);
      
      // Derive a unique key for this data using the master key and salt
      const derivedKey = await this.deriveKey(
        Buffer.concat([this.masterKey, Buffer.from(keyScope)]), 
        salt
      );
      
      // Create cipher
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
      
      // Encrypt
      let encrypted = cipher.update(dataStr, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag
      const authTag = cipher.getAuthTag();
      
      // Format: iv:salt:authTag:encryptedData
      return [
        iv.toString('hex'),
        salt.toString('hex'),
        authTag.toString('hex'),
        encrypted
      ].join(':');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data that was encrypted with the encrypt method
   * @param {string} encryptedData - Data encrypted with the encrypt method
   * @param {string} [keyScope='default'] - Scope of key used for encryption
   * @returns {Promise<string|Object>} - Decrypted data
   */
  async decrypt(encryptedData, keyScope = 'default') {
    try {
      // Split the encrypted data into its components
      const [ivHex, saltHex, authTagHex, encryptedHex] = encryptedData.split(':');
      
      if (!ivHex || !saltHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Convert hex strings to buffers
      const iv = Buffer.from(ivHex, 'hex');
      const salt = Buffer.from(saltHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      // Derive the key using the same method as in encrypt
      const derivedKey = await this.deriveKey(
        Buffer.concat([this.masterKey, Buffer.from(keyScope)]), 
        salt
      );
      
      // Create decipher
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Try to parse JSON if the result looks like a JSON object
      if (decrypted.startsWith('{') || decrypted.startsWith('[')) {
        try {
          return JSON.parse(decrypted);
        } catch (e) {
          // If parsing fails, return as string
          return decrypted;
        }
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash a password securely using Argon2id (via scrypt for compatibility)
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password in format: salt:hash
   */
  async hashPassword(password) {
    const salt = await randomBytes(SALT_LENGTH);
    const hash = crypto.scryptSync(password, salt, 64, {
      N: KEY_ITERATIONS,
      r: 8,
      p: 1
    });
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  /**
   * Verify a password against a stored hash
   * @param {string} password - Plain text password to verify
   * @param {string} storedHash - Stored hash from hashPassword in format: salt:hash
   * @returns {Promise<boolean>} - Whether the password matches
   */
  async verifyPassword(password, storedHash) {
    const [saltHex, hashHex] = storedHash.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const hash = Buffer.from(hashHex, 'hex');
    
    const verifyHash = crypto.scryptSync(password, salt, 64, {
      N: KEY_ITERATIONS,
      r: 8,
      p: 1
    });
    
    return crypto.timingSafeEqual(hash, verifyHash);
  }

  /**
   * Generate a secure random token
   * @param {number} [length=32] - Length of the token in bytes
   * @returns {Promise<string>} - Random token as hex string
   */
  async generateToken(length = 32) {
    const buffer = await randomBytes(length);
    return buffer.toString('hex');
  }

  /**
   * Generate a secure OTP (One-Time Password)
   * @param {number} [digits=6] - Number of digits in the OTP
   * @returns {Promise<string>} - OTP as a string
   */
  async generateOTP(digits = 6) {
    const buffer = await randomBytes(4);
    const num = buffer.readUInt32BE(0) % Math.pow(10, digits);
    return num.toString().padStart(digits, '0');
  }

  /**
   * Encrypt data for secure storage in database
   * @param {string|Object} data - Data to encrypt
   * @param {string} userId - User ID for additional context
   * @param {string} [dataType='default'] - Type of data being encrypted
   * @returns {Promise<string>} - Encrypted data
   */
  async encryptForStorage(data, userId, dataType = 'default') {
    // Create a unique scope for each user and data type
    const scope = `user:${userId}:${dataType}`;
    return this.encrypt(data, scope);
  }

  /**
   * Decrypt data from secure storage
   * @param {string} encryptedData - Encrypted data
   * @param {string} userId - User ID for additional context
   * @param {string} [dataType='default'] - Type of data being decrypted
   * @returns {Promise<string|Object>} - Decrypted data
   */
  async decryptFromStorage(encryptedData, userId, dataType = 'default') {
    // Use the same scope as used for encryption
    const scope = `user:${userId}:${dataType}`;
    return this.decrypt(encryptedData, scope);
  }
  
  /**
   * Create a token pair (access token and refresh token)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Token pair object with access and refresh tokens
   */
  async createTokenPair(userId) {
    const accessToken = await this.generateToken(32);
    const refreshToken = await this.generateToken(48);
    
    return {
      token: accessToken,
      refreshToken: refreshToken
    };
  }
  
  /**
   * Create a password reset token
   * @param {string} userId - User ID
   * @returns {Promise<string>} - Reset token
   */
  async createResetToken(userId) {
    // Generate a secure random token
    const token = await this.generateToken(32);
    
    // In a real implementation, you would store this token in the database
    // with an expiration time and associate it with the user
    
    return token;
  }
  
  /**
   * Verify a JWT token
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} - Decoded token payload
   */
  async verifyToken(token) {
    try {
      // In a real implementation, this would use JWT verification
      // For now, we'll use a simple implementation
      
      // Verify the token signature
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Return the decoded payload
      return {
        userId: decoded.id || decoded.userId,
        role: decoded.role,
        ...decoded
      };
    } catch (error) {
      console.error('Token verification error:', error.message);
      throw new Error('Invalid or expired token');
    }
  }
}

// Export a singleton instance
const cryptoService = new CryptoService();

// Export the verifyToken function separately for easier imports
export const verifyToken = async (token) => {
  return cryptoService.verifyToken(token);
};

export default cryptoService;
