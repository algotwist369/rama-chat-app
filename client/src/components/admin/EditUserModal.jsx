// EditUserModal.jsx
import React, { useState } from 'react';
import { X, XCircle } from 'lucide-react';
import InputField from '../common/InputField';
import Button from '../common/Button';

const EditUserModal = ({ user, onClose, onSubmit, loading, errors }) => {
  const [formData, setFormData] = useState({
    username: user.username || '',
    email: user.email || '',
    role: user.role || 'user',
    isActive: user.isActive !== undefined ? user.isActive : true,
    profile: {
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      bio: user.profile?.bio || '',
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
    const { name, value, type, checked } = e.target;
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
        [name]: type === 'checkbox' ? checked : value,
      }));
    }

    // Clear validation error dynamically
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
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
            {errors.updateUser && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-700">
                  {errors.updateUser}
                </span>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-5">
              {/* Grid for Username + Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

                <div className="flex items-center space-x-3 pt-6">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-gray-700"
                  >
                    Active Account
                  </label>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="pt-2 space-y-5 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">
                Profile Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            variant="primary"
            loading={loading}
            disabled={loading}
            size="sm"
            onClick={handleSubmit}
          >
            {loading ? 'Updating...' : 'Update User'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
