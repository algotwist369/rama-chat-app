import { useState, useCallback } from 'react';
import { validateForm, validateField } from '../utils/validation';

// Custom hook for form validation
export const useFormValidation = (initialData = {}, validationSchema = {}) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // Update form data
  const updateField = useCallback((name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Clear general error
    if (generalError) {
      setGeneralError('');
    }
  }, [errors, generalError]);

  // Handle input change
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    updateField(name, value);
  }, [updateField]);

  // Validate single field
  const validateSingleField = useCallback((fieldName) => {
    if (!validationSchema[fieldName]) return;

    const fieldRules = validationSchema[fieldName];
    const fieldValue = formData[fieldName];
    const error = validateField(fieldValue, fieldRules);

    setErrors(prev => ({
      ...prev,
      [fieldName]: error || ''
    }));

    return !error;
  }, [formData, validationSchema]);

  // Validate entire form
  const validateAll = useCallback(() => {
    console.log('Validating form:', { formData, validationSchema });
    const { errors: validationErrors, isValid } = validateForm(formData, validationSchema);
    console.log('Validation result:', { validationErrors, isValid });
    setErrors(validationErrors);
    return isValid;
  }, [formData, validationSchema]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
    setGeneralError('');
  }, []);

  // Set general error
  const setError = useCallback((error) => {
    setGeneralError(error);
  }, []);

  // Reset form
  const resetForm = useCallback((newData = {}) => {
    setFormData(newData);
    setErrors({});
    setGeneralError('');
  }, []);

  // Set form data
  const setData = useCallback((data) => {
    setFormData(data);
  }, []);

  return {
    formData,
    errors,
    generalError,
    handleChange,
    updateField,
    validateSingleField,
    validateAll,
    clearErrors,
    setError,
    resetForm,
    setData
  };
};
