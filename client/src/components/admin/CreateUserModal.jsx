// CreateUserModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react'; // simpler close icon
import InputField from '../common/InputField';
import Button from '../common/Button';

const CreateUserModal = ({ onClose, onSubmit, loading, errors }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        pin: '',
        role: 'user',
        isActive: true,
        profile: {
            firstName: '',
            lastName: '',
            bio: '',
        },
    });

    const [validationErrors, setValidationErrors] = useState({});

    // ---------------- Validation ----------------
    const validateForm = () => {
        const errors = {};

        if (!formData.username || formData.username.length < 3) {
            errors.username = 'Username must be at least 3 characters long';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            errors.username =
                'Username can only contain letters, numbers, and underscores';
        }

        if (
            !formData.email ||
            !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)
        ) {
            errors.email = 'Please provide a valid email address';
        }

        if (!formData.password || formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters long';
        }

        if (formData.pin && (formData.pin.length < 4 || formData.pin.length > 6)) {
            errors.pin = 'PIN must be 4–6 digits';
        }

        if (!formData.profile.firstName || formData.profile.firstName.trim() === '') {
            errors.firstName = 'First name is required';
        } else if (formData.profile.firstName.length > 50) {
            errors.firstName = 'First name cannot exceed 50 characters';
        }
        
        if (!formData.profile.lastName || formData.profile.lastName.trim() === '') {
            errors.lastName = 'Last name is required';
        } else if (formData.profile.lastName.length > 50) {
            errors.lastName = 'Last name cannot exceed 50 characters';
        }
        
        if (!formData.profile.bio || formData.profile.bio.trim() === '') {
            errors.bio = 'Bio is required';
        } else if (formData.profile.bio.length > 200) {
            errors.bio = 'Bio cannot exceed 200 characters';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ---------------- Handlers ----------------
    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('profile.')) {
            const profileField = name.split('.')[1];
            setFormData((prev) => ({
                ...prev,
                profile: {
                    ...prev.profile,
                    [profileField]: value,
                },
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }

        // Clear validation error dynamically
        if (validationErrors[name]) {
            setValidationErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    // ---------------- UI ----------------
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Create New User
                        </h2>
                        <p className="text-sm text-gray-500">
                            Fill the form to add a new user
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="overflow-y-auto">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Error Display */}
                        {errors.createUser && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                                <X className="h-5 w-5 text-red-500" />
                                <span className="text-sm text-red-700">
                                    {errors.createUser}
                                </span>
                            </div>
                        )}

                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Username */}
                            <InputField
                                label="Username"
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Enter username (3–30 characters)"
                                required
                                error={validationErrors.username}
                                maxLength="30"
                            />

                            {/* Email */}
                            <InputField
                                label="Email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter email address"
                                required
                                error={validationErrors.email}
                            />

                            {/* Password */}
                            <InputField
                                label="Password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter password (min 8 characters)"
                                required
                                error={validationErrors.password}
                                showPasswordToggle
                            />

                            {/* PIN */}
                            <InputField
                                label="PIN (Optional)"
                                name="pin"
                                type="password"
                                value={formData.pin}
                                onChange={handleChange}
                                placeholder="Enter PIN (4–6 digits)"
                                error={validationErrors.pin}
                                maxLength="6"
                                showPasswordToggle
                            />

                            {/* Role – Full width */}
                            <div className="md:col-span-2">
                                <InputField
                                    label="Role"
                                    name="role"
                                    type="select"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                    options={[
                                        { value: 'user', label: 'User' },
                                        { value: 'manager', label: 'Manager' },
                                    ]}
                                />
                            </div>

                            {/* Is Active */}
                            <InputField
                                label="Is Active"
                                name="isActive"
                                type="checkbox"
                                value={formData.isActive}
                                onChange={handleChange}
                            />
                        </div>


                        {/* Profile Information */}
                        <div className="pt-2 space-y-5 border-t border-gray-200">
                            <h3 className="text-sm font-medium text-gray-700">
                                Profile Information
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField
                                    label="First Name"
                                    name="profile.firstName"
                                    type="text"
                                    value={formData.profile.firstName}
                                    onChange={handleChange}
                                    placeholder="First name"
                                    error={validationErrors.firstName}
                                    maxLength="50"
                                />

                                <InputField
                                    label="Last Name"
                                    name="profile.lastName"
                                    type="text"
                                    value={formData.profile.lastName}
                                    onChange={handleChange}
                                    placeholder="Last name"
                                    error={validationErrors.lastName}
                                    maxLength="50"
                                />
                            </div>

                            <InputField
                                label="Bio"
                                name="profile.bio"
                                type="textarea"
                                value={formData.profile.bio}
                                onChange={handleChange}
                                placeholder="Brief bio (optional)"
                                error={validationErrors.bio}
                                maxLength="200"
                                rows={3}
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        size="sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="success"
                        loading={loading}
                        disabled={loading}
                        size="sm"
                        onClick={handleSubmit}
                    >
                        {loading ? 'Creating...' : 'Create User'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CreateUserModal;
