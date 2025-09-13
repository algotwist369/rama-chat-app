// EditGroupModal.jsx
import React, { useState } from 'react';
import { X, XCircle } from 'lucide-react';
import InputField from '../common/InputField';
import Button from '../common/Button';

const EditGroupModal = ({ group, onClose, onSubmit, loading, errors }) => {
  const [formData, setFormData] = useState({
    name: group.name || '',
    region: group.region || '',
    description: group.description || '',
    isPrivate: group.isPrivate !== undefined ? group.isPrivate : false,
    maxMembers: group.maxMembers || 50,
  });

  const [validationErrors, setValidationErrors] = useState({});

  // ---------------- Validation ----------------
  const validateForm = () => {
    const errors = {};

    if (!formData.name || formData.name.length < 3) {
      errors.name = 'Group name must be at least 3 characters long';
    } else if (formData.name.length > 50) {
      errors.name = 'Group name cannot exceed 50 characters';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.name)) {
      errors.name = 'Group name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    if (!formData.region || formData.region.length < 2) {
      errors.region = 'Region must be at least 2 characters long';
    } else if (formData.region.length > 30) {
      errors.region = 'Region cannot exceed 30 characters';
    }

    if (!formData.description || formData.description.trim() === '') {
      errors.description = 'Description is required';
    } else if (formData.description.length > 200) {
      errors.description = 'Description cannot exceed 200 characters';
    }

    if (formData.maxMembers < 2 || formData.maxMembers > 1000) {
      errors.maxMembers = 'Maximum members must be between 2 and 1000';
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
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear validation error dynamically
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Edit Group</h2>
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
            {errors.updateGroup && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-700">
                  {errors.updateGroup}
                </span>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-5">
              {/* Grid for Name + Region */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField
                  label="Group Name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter group name (3–50 characters)"
                  required
                  error={validationErrors.name}
                  maxLength="50"
                />

                <InputField
                  label="Region"
                  name="region"
                  type="text"
                  value={formData.region}
                  onChange={handleChange}
                  placeholder="Enter region (e.g., North, South, East, West)"
                  required
                  error={validationErrors.region}
                  maxLength="30"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField
                  label="Maximum Members"
                  name="maxMembers"
                  type="number"
                  value={formData.maxMembers}
                  onChange={handleChange}
                  placeholder="Enter maximum members (2-1000)"
                  required
                  error={validationErrors.maxMembers}
                  min="2"
                  max="1000"
                />

                <div className="flex items-center space-x-3 pt-6">
                  <input
                    id="isPrivate"
                    name="isPrivate"
                    type="checkbox"
                    checked={formData.isPrivate}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="isPrivate"
                    className="text-sm font-medium text-gray-700"
                  >
                    Private Group
                  </label>
                </div>
              </div>
            </div>

            {/* Group Information */}
            <div className="pt-2 space-y-5 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">
                Group Information
              </h3>

              <InputField
                label="Description"
                name="description"
                type="textarea"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the group (optional)"
                error={validationErrors.description}
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
            {loading ? 'Updating...' : 'Update Group'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditGroupModal;
