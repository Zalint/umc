/**
 * Email Validator
 * Validates email addresses
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {Object} - { valid: boolean, normalized: string, error: string }
 */
const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return {
      valid: true, // Email is optional
      normalized: null,
      error: null
    };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic email regex pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmedEmail)) {
    return {
      valid: false,
      normalized: null,
      error: 'Invalid email format. Please enter a valid email address (e.g., user@example.com)'
    };
  }

  // Additional validation: check for common issues
  if (trimmedEmail.length > 255) {
    return {
      valid: false,
      normalized: null,
      error: 'Email address is too long (maximum 255 characters)'
    };
  }

  // Check for consecutive dots
  if (trimmedEmail.includes('..')) {
    return {
      valid: false,
      normalized: null,
      error: 'Invalid email format (cannot contain consecutive dots)'
    };
  }

  // Check for leading/trailing dots
  if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
    return {
      valid: false,
      normalized: null,
      error: 'Invalid email format (cannot start or end with a dot)'
    };
  }

  return {
    valid: true,
    normalized: trimmedEmail,
    error: null
  };
};

module.exports = {
  validateEmail
};

