import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Button, 
  Input, 
  ErrorDisplay, 
  FormContainer, 
  ToggleButton 
} from '../components/common';
import { useFormValidation } from '../hooks/useFormValidation';
import { validationSchemas, validatePasswordConfirmation } from '../utils/validation';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'pin'
  const { login } = useAuth();
  const navigate = useNavigate();

  // Use form validation hook with dynamic schema based on login mode
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
      email: '',
      password: '',
      pin: ''
    },
    // Dynamic validation schema based on login mode
    loginMode === 'password' 
      ? { email: validationSchemas.login.email, password: validationSchemas.login.password }
      : { email: validationSchemas.login.email, pin: validationSchemas.login.pin }
  );

  // Clear unused field when switching login modes
  React.useEffect(() => {
    if (loginMode === 'password') {
      // Clear PIN field when switching to password mode
      handleChange({ target: { name: 'pin', value: '' } });
    } else {
      // Clear password field when switching to PIN mode
      handleChange({ target: { name: 'password', value: '' } });
    }
  }, [loginMode, handleChange]);

  // Prevent page refresh/reload
  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading]);

  // Custom validation for login mode
  const validateLoginForm = () => {
    // Don't clear errors before validation
    const isValid = validateAll();
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form first (don't clear errors before validation)
    if (!validateLoginForm()) {
      console.log({ errors, generalError });
      return;
    }
    
    // Clear general error only after validation passes
    if (generalError) {
      clearErrors();
    }
    
    setLoading(true);

    try {
      const credentials = {
        email: formData.email,
        ...(loginMode === 'pin' ? { pin: formData.pin } : { password: formData.password })
      };
      
      const result = await login(credentials);
      
      if (result.success) {
        // Navigate based on user role
        if (result.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer
      title="Sign in to your account"
      subtitle={
        <>
          Or{' '}
          <Link to="/register" className="font-medium text-blue-600">
            create a new account
          </Link>
        </>
      }
    >
      {/* Login Mode Toggle */}
      <div className="flex justify-center">
        <ToggleButton
          options={[
            { value: 'password', label: 'Password' },
            { value: 'pin', label: 'PIN' }
          ]}
          value={loginMode}
          onChange={setLoginMode}
        />
      </div>
        
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {/* General Error Display */}
        <ErrorDisplay error={generalError} />

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
            
        {loginMode === 'password' ? (
          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            error={errors.password}
            showPasswordToggle
          />
        ) : (
          <div>
            <Input
              label="PIN"
              name="pin"
              type="password"
              value={formData.pin}
              onChange={handleChange}
              placeholder="Enter your PIN"
              required
              autoComplete="off"
              error={errors.pin}
              maxLength="6"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter your 4-6 digit PIN
            </p>
          </div>
        )}
        <Button
          type="submit"
          variant="primary"
          size="medium"
          disabled={loading}
          loading={loading}
          className="w-full"
        >
          {`Sign in with ${loginMode === 'pin' ? 'PIN' : 'Password'}`}
        </Button>
      </form>
    </FormContainer>
  );
};

export default Login;