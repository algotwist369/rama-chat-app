// Common validation functions
export const validators = {
  required: (message = 'This field is required') => (value) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return message;
    }
    return null;
  },

  email: (message = 'Please enter a valid email address') => (value) => {
    if (!value) return null; // Let required validator handle empty values
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return message;
    }
    return null;
  },

  minLength: (min, message) => (value) => {
    if (!value) return null; // Let required validator handle empty values
    if (value.length < min) {
      return message || `Must be at least ${min} characters long`;
    }
    return null;
  },

  maxLength: (max, message) => (value) => {
    if (!value) return null; // Let required validator handle empty values
    if (value.length > max) {
      return message || `Must be no more than ${max} characters long`;
    }
    return null;
  },

  pattern: (regex, message) => (value) => {
    if (!value) return null; // Let required validator handle empty values
    if (!regex.test(value)) {
      return message || 'Invalid format';
    }
    return null;
  },

  match: (matchValue, message = 'Values do not match') => (value) => {
    if (!value) return null; // Let required validator handle empty values
    if (value !== matchValue) {
      return message;
    }
    return null;
  },

  pin: (message = 'PIN must be 4-6 digits') => (value) => {
    if (!value) return null; // Let required validator handle empty values
    const pinRegex = /^\d{4,6}$/;
    if (!pinRegex.test(value)) {
      return message;
    }
    return null;
  },

  username: (message = 'Username can only contain letters, numbers, and underscores') => (value) => {
    if (!value) return null; // Let required validator handle empty values
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(value)) {
      return message;
    }
    return null;
  }
};

// Validation schemas for common forms
export const validationSchemas = {
  login: {
    email: [validators.required('Email is required'), validators.email()],
    password: [validators.required('Password is required')],
    pin: [validators.required('PIN is required'), validators.pin()]
  },

  register: {
    username: [
      validators.required('Username is required'),
      validators.minLength(3, 'Username must be at least 3 characters long'),
      validators.maxLength(30, 'Username cannot exceed 30 characters'),
      validators.username()
    ],
    email: [
      validators.required('Email is required'),
      validators.email()
    ],
    password: [
      validators.required('Password is required'),
      validators.minLength(6, 'Password must be at least 6 characters long')
    ],
    confirmPassword: [
      validators.required('Please confirm your password')
    ]
  }
};

// Function to validate a single field
export const validateField = (value, rules) => {
  for (const rule of rules) {
    if (typeof rule !== 'function') {
      console.error('Rule is not a function:', rule);
      continue;
    }
    const error = rule(value);
    if (error) {
      return error;
    }
  }
  return null;
};

// Function to validate entire form
export const validateForm = (formData, schema) => {
  const errors = {};
  
  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = formData[fieldName];
    const error = validateField(value, rules);
    if (error) {
      errors[fieldName] = error;
    }
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

// Function to validate password confirmation
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
};
