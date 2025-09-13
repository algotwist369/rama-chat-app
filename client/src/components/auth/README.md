# Auth Components & Hooks

This folder contains reusable authentication components and hooks that provide a consistent and maintainable way to handle authentication throughout the application.

## 📁 Structure

```
src/
├── components/
│   └── auth/
│       ├── AuthForm.jsx              # Main authentication form component
│       ├── AuthContainer.jsx         # Container that manages auth modes
│       ├── PasswordChangeModal.jsx   # Modal for changing passwords
│       ├── PasswordResetModal.jsx    # Modal for password reset
│       ├── AuthSettings.jsx          # Settings page for auth management
│       └── index.js                  # Export file
└── hooks/
    ├── useAuth.js                    # Main authentication hook
    └── auth/
        ├── usePasswordManager.js     # Password management hook
        └── index.js                  # Export file
```

## 🚀 Components

### AuthForm

A comprehensive authentication form that supports login, registration, and password reset.

**Props:**
- `type` (string): 'login', 'register', or 'reset'
- `onSuccess` (function): Callback when authentication succeeds
- `onSwitchMode` (function): Callback to switch between auth modes
- `initialData` (object): Initial form data

**Features:**
- Login with email/password or email/PIN
- User registration with role selection
- Password reset functionality
- Built-in validation and error handling
- Responsive design
- Loading states

**Example:**
```jsx
import { AuthForm } from '../components/auth';

const LoginPage = () => {
  const handleAuthSuccess = (result, authMode) => {
    console.log('Auth success:', result);
  };

  const handleSwitchMode = (newMode) => {
    // Handle mode switching
  };

  return (
    <AuthForm
      type="login"
      onSuccess={handleAuthSuccess}
      onSwitchMode={handleSwitchMode}
    />
  );
};
```

### AuthContainer

A container component that manages different authentication modes.

**Props:**
- `onAuthSuccess` (function): Callback when authentication succeeds

**Example:**
```jsx
import { AuthContainer } from '../components/auth';

const AuthPage = () => {
  const handleAuthSuccess = (result, authMode) => {
    console.log('Auth success:', result, authMode);
  };

  return (
    <AuthContainer onAuthSuccess={handleAuthSuccess} />
  );
};
```

### PasswordChangeModal

A modal for changing user passwords.

**Props:**
- `isOpen` (boolean): Whether the modal is open
- `onClose` (function): Callback when modal closes
- `onSuccess` (function): Callback when password change succeeds

**Example:**
```jsx
import { PasswordChangeModal } from '../components/auth';

const SettingsPage = () => {
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const handlePasswordChangeSuccess = (result) => {
    console.log('Password changed:', result);
  };

  return (
    <>
      <button onClick={() => setShowPasswordChange(true)}>
        Change Password
      </button>
      
      <PasswordChangeModal
        isOpen={showPasswordChange}
        onClose={() => setShowPasswordChange(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
    </>
  );
};
```

### PasswordResetModal

A modal for requesting password reset emails.

**Props:**
- `isOpen` (boolean): Whether the modal is open
- `onClose` (function): Callback when modal closes
- `onSuccess` (function): Callback when reset request succeeds

**Example:**
```jsx
import { PasswordResetModal } from '../components/auth';

const ForgotPasswordPage = () => {
  const [showPasswordReset, setShowPasswordReset] = useState(true);

  const handlePasswordResetSuccess = (result) => {
    if (result.action === 'backToLogin') {
      // Navigate back to login
    }
  };

  return (
    <PasswordResetModal
      isOpen={showPasswordReset}
      onClose={() => setShowPasswordReset(false)}
      onSuccess={handlePasswordResetSuccess}
    />
  );
};
```

### AuthSettings

A comprehensive settings page for authentication management.

**Props:**
- `user` (object): Current user object

**Example:**
```jsx
import { AuthSettings } from '../components/auth';

const SettingsPage = ({ user }) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <AuthSettings user={user} />
    </div>
  );
};
```

## 🎣 Hooks

### useAuth

Main authentication hook that provides authentication functionality.

**Returns:**
- `loading` (boolean): Loading state
- `errors` (object): Error messages
- `loginWithPassword` (function): Login with email/password
- `loginWithPin` (function): Login with email/PIN
- `registerUser` (function): Register new user
- `resetPassword` (function): Request password reset
- `changePassword` (function): Change user password
- `validateForm` (function): Validate form data
- `clearErrors` (function): Clear error messages
- `hasErrors` (boolean): Whether there are any errors
- `getError` (function): Get error for specific field

**Example:**
```jsx
import { useAuth } from '../hooks/auth';

const LoginForm = () => {
  const {
    loading,
    errors,
    loginWithPassword,
    validateForm,
    getError
  } = useAuth();

  const handleSubmit = async (formData) => {
    const isValid = validateForm(formData, 'login');
    if (isValid) {
      const result = await loginWithPassword(formData.email, formData.password);
      if (result.success) {
        // Handle success
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
      />
      {getError('email') && <span className="error">{getError('email')}</span>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  );
};
```

### usePasswordManager

Hook for password management operations.

**Returns:**
- `loading` (boolean): Loading state
- `errors` (object): Error messages
- `changePassword` (function): Change password
- `requestPasswordReset` (function): Request password reset
- `resetPasswordWithToken` (function): Reset password with token
- `clearErrors` (function): Clear error messages
- `hasErrors` (boolean): Whether there are any errors
- `getError` (function): Get error for specific field

**Example:**
```jsx
import { usePasswordManager } from '../hooks/auth';

const PasswordChangeForm = () => {
  const {
    loading,
    changePassword,
    getError
  } = usePasswordManager();

  const handleSubmit = async (formData) => {
    const result = await changePassword(
      formData.currentPassword,
      formData.newPassword,
      formData.confirmPassword
    );
    
    if (result.success) {
      // Handle success
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        name="currentPassword"
        placeholder="Current Password"
        required
      />
      {getError('currentPassword') && (
        <span className="error">{getError('currentPassword')}</span>
      )}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  );
};
```

## 🎨 Styling

All components use Tailwind CSS classes and are designed to be responsive. They follow the application's design system and use the common `InputField` and `Button` components for consistency.

## 🔧 Customization

### Form Validation

You can customize validation by modifying the `validateForm` function in the `useAuth` hook:

```jsx
const validateForm = useCallback((formData, type = 'login') => {
  const newErrors = {};

  // Add custom validation rules
  if (type === 'register' && formData.username.length < 3) {
    newErrors.username = 'Username must be at least 3 characters';
  }

  // ... more validation rules

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}, []);
```

### Error Handling

Customize error handling by modifying the error messages in the hooks:

```jsx
const loginWithPassword = useCallback(async (email, password) => {
  try {
    await login({ email, password });
    return { success: true };
  } catch (error) {
    const errorMessage = error.response?.data?.error || 'Custom error message';
    setErrors({ login: errorMessage });
    return { success: false, error: errorMessage };
  }
}, [login]);
```

## 📱 Responsive Design

All components are fully responsive and work on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## ♿ Accessibility

Components include:
- Proper ARIA labels
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Color contrast compliance

## 🧪 Testing

Components are designed to be easily testable:
- Pure functions where possible
- Clear prop interfaces
- Predictable state management
- Error boundary compatibility

## 🔄 Migration Guide

### From Old Login/Register Components

**Before:**
```jsx
// Old Login.jsx
const Login = ({ onGoToRegister }) => {
  const [formData, setFormData] = useState({...});
  const [loading, setLoading] = useState(false);
  // ... lots of form logic
  
  return (
    <div className="min-h-screen...">
      {/* ... lots of JSX */}
    </div>
  );
};
```

**After:**
```jsx
// New Login.jsx
import { AuthForm } from '../components/auth';

const Login = ({ onGoToRegister }) => {
  const handleAuthSuccess = (result, authMode) => {
    console.log('Auth success:', result);
  };

  const handleSwitchMode = (newMode) => {
    if (newMode === 'register') {
      onGoToRegister();
    }
  };

  return (
    <AuthForm
      type="login"
      onSuccess={handleAuthSuccess}
      onSwitchMode={handleSwitchMode}
    />
  );
};
```

## 🚀 Benefits

1. **Consistency**: All auth forms look and behave the same
2. **Maintainability**: Changes in one place affect all forms
3. **Reusability**: Components can be used anywhere in the app
4. **Type Safety**: Clear prop interfaces and return types
5. **Error Handling**: Centralized error management
6. **Loading States**: Built-in loading indicators
7. **Validation**: Comprehensive form validation
8. **Accessibility**: WCAG compliant components
9. **Responsive**: Works on all device sizes
10. **Testing**: Easy to test and mock

## 📚 Examples

See the updated `Login.jsx` and `Register.jsx` files for complete examples of how to use these components.
