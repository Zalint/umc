/**
 * Phone Number Validator for Gambia
 * Validates and normalizes Gambian phone numbers
 */

/**
 * Normalize phone number to +220XXXXXXXX format
 * Accepts: +220XXXXXXXX, 220XXXXXXXX, or local format (XXXXXXXX)
 */
const normalizePhone = (phone) => {
  if (!phone) return null;
  
  // Remove all spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If starts with +220, keep it
  if (cleaned.startsWith('+220')) {
    cleaned = cleaned.substring(1); // Remove +
  }
  
  // If starts with 220, add +
  if (cleaned.startsWith('220')) {
    cleaned = '+' + cleaned;
  }
  
  // If it's a local format (7-9 digits starting with 3,4,5,6,7,8,9), add +220
  if (/^[3-9]\d{6,7}$/.test(cleaned)) {
    cleaned = '+220' + cleaned;
  }
  
  return cleaned;
};

/**
 * Validate Gambian phone number format
 * Mobile: +220[7-9]XXXXXX (7 digits after country code, starting with 7, 8, or 9)
 * Landline: +220[45]XXXXXX (7 digits after country code, starting with 4 or 5)
 */
const validateGambiaPhone = (phone) => {
  if (!phone) return { valid: false, error: 'Phone number is required' };
  
  const normalized = normalizePhone(phone);
  
  if (!normalized) {
    return { valid: false, error: 'Invalid phone number format' };
  }
  
  // Must start with +220
  if (!normalized.startsWith('+220')) {
    return { valid: false, error: 'Phone number must start with +220' };
  }
  
  // Must be exactly 11 characters (+220 + 7 digits)
  if (normalized.length !== 11) {
    return { valid: false, error: 'Phone number must be 7 digits after country code (+220)' };
  }
  
  // Extract the 7 digits after +220
  const digits = normalized.substring(4);
  
  // Must be 7 digits
  if (!/^\d{7}$/.test(digits)) {
    return { valid: false, error: 'Phone number must contain only digits' };
  }
  
  // Mobile numbers start with 7, 8, or 9
  // Landline numbers start with 4 or 5
  // Some numbers may start with 3 or 6 (less common)
  const firstDigit = digits[0];
  
  if (!/[3-9]/.test(firstDigit)) {
    return { valid: false, error: 'Phone number must start with 3, 4, 5, 6, 7, 8, or 9' };
  }
  
  return { 
    valid: true, 
    normalized,
    type: /[7-9]/.test(firstDigit) ? 'mobile' : 'landline'
  };
};

/**
 * Format phone number for display (+220 XXX XXXX)
 */
const formatPhoneForDisplay = (phone) => {
  if (!phone) return '';
  
  const normalized = normalizePhone(phone);
  if (!normalized || !normalized.startsWith('+220')) return phone;
  
  // Format as +220 XXX XXXX
  const digits = normalized.substring(4);
  if (digits.length === 7) {
    return `+220 ${digits.substring(0, 3)} ${digits.substring(3)}`;
  }
  
  return normalized;
};

module.exports = {
  normalizePhone,
  validateGambiaPhone,
  formatPhoneForDisplay
};

