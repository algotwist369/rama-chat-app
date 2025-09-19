import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  Input,
  ErrorDisplay,
  FormContainer
} from '../components/common';
import { useFormValidation } from '../hooks/useFormValidation';
import { validationSchemas, validatePasswordConfirmation } from '../utils/validation';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Use form validation hook
  const {
    formData,
    errors,
    generalError,
    handleChange,
    clearErrors,
    setError,
    validateAll
  } = useFormValidation(
    {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationSchemas.register
  );

  // Custom validation for password confirmation
  const validateRegisterForm = () => {
    // Don't clear errors before validation
    const isValid = validateAll();

    // Additional validation for password confirmation
    const passwordMatchError = validatePasswordConfirmation(
      formData.password,
      formData.confirmPassword
    );

    if (passwordMatchError) {
      setError(passwordMatchError);
      return false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form first (don't clear errors before validation)
    if (!validateRegisterForm()) {
      console.log({ errors, generalError });
      return;
    }


    // Clear general error only after validation passes
    if (generalError) {
      clearErrors();
    }

    setLoading(true);

    try {
      const result = await login({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer
      title="Create your account"
      subtitle={
        <>
          Or{' '}
          <Link to="/login" className="font-medium text-blue-600">
            sign in to your existing account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {/* General Error Display */}
        <ErrorDisplay error={generalError} />
        <Input
          label="Username"
          name="username"
          type="text"
          value={formData.username}
          onChange={handleChange}
          placeholder="Enter your username"
          required
          autoComplete="username"
          error={errors.username}
        />

        <Input
          label="Email address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
          autoComplete="email"
          error={errors.email}
        />

        <Input
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
          autoComplete="new-password"
          error={errors.password}
        />

        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          required
          autoComplete="new-password"
          error={errors.confirmPassword}
        />

        <Button
          type="submit"
          variant="primary"
          size="medium"
          disabled={loading}
          loading={loading}
          className="w-full"
        >
          Create account
        </Button>
      </form>
    </FormContainer>
  );
};

export default Register;