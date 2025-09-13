import React, { useState, useEffect } from 'react';
import { LogIn, Key, Mail, UserPlus } from 'lucide-react';
import InputField from '../common/InputField';
import Button from '../common/Button';
import useAuth from '../../hooks/auth/useAuth';

const AuthForm = ({
    type = 'login', // 'login', 'register', 'reset'
    onSuccess,
    onSwitchMode,
    initialData = {}
}) => {
    const {
        loading,
        errors,
        loginWithPassword,
        loginWithPin,
        registerUser,
        resetPassword,
        validateForm,
        clearErrors,
        getError
    } = useAuth();

    const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'pin'
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        pin: '',
        role: 'user',
        ...initialData
    });

    // Clear errors when form data changes
    useEffect(() => {
        clearErrors();
    }, [formData, clearErrors]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let isValid = false;
        let result = { success: false };

        switch (type) {
            case 'login':
                if (loginMethod === 'password') {
                    isValid = validateForm(formData, 'login');
                    if (isValid) {
                        result = await loginWithPassword(formData.email, formData.password);
                    }
                } else {
                    isValid = validateForm(formData, 'pin');
                    if (isValid) {
                        result = await loginWithPin(formData.email, formData.pin);
                    }
                }
                break;

            case 'register':
                isValid = validateForm(formData, 'register');
                if (isValid) {
                    result = await registerUser(formData);
                }
                break;

            case 'reset':
                isValid = validateForm(formData, 'login');
                if (isValid) {
                    result = await resetPassword(formData.email);
                }
                break;

            default:
                break;
        }

        if (result.success && onSuccess) {
            onSuccess(result);
        }
    };

    const getFormTitle = () => {
        switch (type) {
            case 'login':
                return 'Welcome Back';
            case 'register':
                return 'Create Account';
            case 'reset':
                return 'Reset Password';
            default:
                return 'Authentication';
        }
    };

    const getFormSubtitle = () => {
        switch (type) {
            case 'login':
                return 'Sign in to your account';
            case 'register':
                return 'Join our chat community';
            case 'reset':
                return 'Enter your email to reset password';
            default:
                return '';
        }
    };

    const getSubmitButtonText = () => {
        switch (type) {
            case 'login':
                return loginMethod === 'password' ? 'Sign In' : 'Sign In with PIN';
            case 'register':
                return 'Create Account';
            case 'reset':
                return 'Send Reset Email';
            default:
                return 'Submit';
        }
    };

    const getSubmitButtonIcon = () => {
        switch (type) {
            case 'login':
                return loginMethod === 'password' ? <LogIn className="h-5 w-5" /> : <Key className="h-5 w-5" />;
            case 'register':
                return <UserPlus className="h-5 w-5" />;
            case 'reset':
                return <Mail className="h-5 w-5" />;
            default:
                return null;
        }
    };

    const renderLoginMethodToggle = () => {
        if (type !== 'login') return null;

        return (
            <div className="mb-6">
                <div className="flex bg-gray-100 rounded-lg p-1 gap-2" >
                    <Button
                        type="button"
                        onClick={() => setLoginMethod('password')}
                        variant={loginMethod === 'password' ? 'primary' : 'ghost'}
                        className={`flex-1 ${loginMethod === 'password' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600'}`}
                        icon={<Mail className="h-4 w-4" />}
                    >
                        Email & Password
                    </Button>
                    <Button
                        type="button"
                        onClick={() => setLoginMethod('pin')}
                        variant={loginMethod === 'pin' ? 'primary' : 'ghost'}
                        className={`flex-1 ${loginMethod === 'pin' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600'}`}
                        icon={<Key className="h-4 w-4" />}
                    >
                        Email & PIN
                    </Button>
                </div>
            </div>
        );
    };

    const renderFormFields = () => {
        const fields = [];

        // Username field (register only)
        if (type === 'register') {
            fields.push(
                <InputField
                    key="username"
                    label="Username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    required
                    error={getError('username')}
                />
            );
        }

        // Email field (all types)
        fields.push(
            <InputField
                key="email"
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                error={getError('email')}
            />
        );

        // Password field (login with password, register)
        if ((type === 'login' && loginMethod === 'password') || type === 'register') {
            fields.push(
                <InputField
                    key="password"
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    error={getError('password')}
                    showPasswordToggle
                />
            );
        }

        // Confirm Password field (register only)
        if (type === 'register') {
            fields.push(
                <InputField
                    key="confirmPassword"
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                    error={getError('confirmPassword')}
                    showPasswordToggle
                />
            );
        }

        // PIN field (login with PIN)
        if (type === 'login' && loginMethod === 'pin') {
            fields.push(
                <InputField
                    key="pin"
                    label="PIN"
                    name="pin"
                    type="text"
                    value={formData.pin}
                    onChange={handleChange}
                    placeholder="••••••"
                    required
                    error={getError('pin')}
                    maxLength="6"
                    className="text-center text-lg tracking-widest"
                />
            );
        }

        // Role field (register only)
        if (type === 'register') {
            fields.push(
                <InputField
                    key="role"
                    label="Role"
                    name="role"
                    type="select"
                    value={formData.role}
                    onChange={handleChange}
                    options={[
                        { value: 'user', label: 'User' },
                        { value: 'manager', label: 'Manager' },
                        { value: 'admin', label: 'Admin' }
                    ]}
                />
            );
        }

        return fields;
    };

    const renderSwitchModeLink = () => {
        if (!onSwitchMode) return null;

        const switchText = type === 'login' ? "Don't have an account?" : "Already have an account?";
        const switchButtonText = type === 'login' ? 'Sign up' : 'Sign in';

        const handleSwitchClick = () => {
            const targetMode = type === 'login' ? 'register' : 'login';
            onSwitchMode(targetMode);
        };

        return (
            <div className="mt-6 text-center">
                <p className="text-gray-600">
                    {switchText}
                    <Button
                        onClick={handleSwitchClick}
                        variant="link"
                        className="ml-2"
                    >
                        {switchButtonText}
                    </Button>
                </p>
            </div>
        );
    };

    const renderResetPasswordLink = () => {
        if (type !== 'login' || !onSwitchMode) return null;

        const handleResetClick = () => {
            onSwitchMode('reset');
        };

        return (
            <div className="mt-4 text-center">
                <Button
                    onClick={handleResetClick}
                    variant="link"
                    className="text-sm"
                >
                    Forgot your password?
                </Button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                            <span className="text-2xl">💬</span>
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-900">{getFormTitle()}</h1>
                        <p className="text-sm text-gray-500 mt-1">{getFormSubtitle()}</p>
                    </div>

                    {/* Login Method Toggle */}
                    <div className="mb-6">{renderLoginMethodToggle()}</div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {renderFormFields()}

                        {/* Global Error Display */}
                        {(errors.login || errors.register || errors.resetPassword) && (
                            <div className="space-y-2">
                                {errors.login && (
                                    <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">
                                        <div className="font-medium mb-1">Login Error:</div>
                                        <div>{errors.login}</div>
                                    </div>
                                )}
                                {errors.register && (
                                    <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">
                                        <div className="font-medium mb-1">Registration Error:</div>
                                        <div>{errors.register}</div>
                                    </div>
                                )}
                                {errors.resetPassword && (
                                    <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">
                                        <div className="font-medium mb-1">Password Reset Error:</div>
                                        <div>{errors.resetPassword}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            loading={loading}
                            disabled={loading}
                            fullWidth
                            icon={getSubmitButtonIcon()}
                        >
                            {getSubmitButtonText()}
                        </Button>
                    </form>

                    {/* Reset Password Link */}
                    <div className="mt-6">{renderResetPasswordLink()}</div>

                    {/* Switch Mode Link */}
                    <div className="mt-4 text-center">{renderSwitchModeLink()}</div>
                </div>
            </div>
        </div>

    );
};

export default AuthForm;
