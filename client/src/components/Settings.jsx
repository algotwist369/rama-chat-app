import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings as SettingsIcon, 
  LogOut, 
  Users, 
  Shield, 
  Bell, 
  Palette,
  Save,
  X,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import userApi from '../api/userApi';
import { groupApi } from '../api/groupApi';

const Settings = ({ 
  isVisible, 
  onClose, 
  currentUser, 
  selectedGroup, 
  onUserUpdate,
  onGroupLeave 
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    username: currentUser?.username || '',
    email: currentUser?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Group settings state
  const [groupSettings, setGroupSettings] = useState({
    notifications: true,
    messagePrivacy: 'enabled',
    autoDelete: false,
    autoDeleteDays: 30
  });

  // Permission state (for managers)
  const [permissions, setPermissions] = useState({
    canInviteUsers: false,
    canRemoveUsers: false,
    canDeleteMessages: false,
    canEditMessages: false,
    canManageSettings: false
  });

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        username: currentUser.username || '',
        email: currentUser.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedGroup) {
      // Load group settings
      loadGroupSettings();
      // Load permissions if user is manager
      if (currentUser?.role === 'manager' || selectedGroup.managers?.includes(currentUser?.id)) {
        loadPermissions();
      }
    }
  }, [selectedGroup, currentUser]);

  const loadGroupSettings = async () => {
    try {
      // This would be an API call to get group settings
      // For now, using default values
      setGroupSettings({
        notifications: true,
        messagePrivacy: 'enabled',
        autoDelete: false,
        autoDeleteDays: 30
      });
    } catch (error) {
      console.error('Failed to load group settings:', error);
    }
  };

  const loadPermissions = async () => {
    try {
      // This would be an API call to get user permissions in the group
      // For now, using default values based on role
      const isManager = currentUser?.role === 'manager' || selectedGroup.managers?.includes(currentUser?.id);
      setPermissions({
        canInviteUsers: isManager,
        canRemoveUsers: isManager,
        canDeleteMessages: isManager,
        canEditMessages: isManager,
        canManageSettings: isManager
      });
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        username: profileData.username,
        email: profileData.email
      };

      // Add password change if provided
      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          toast.error('New passwords do not match');
          setLoading(false);
          return;
        }
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      const response = await userApi.updateProfile(updateData);
      toast.success('Profile updated successfully');
      
      // Update parent component
      if (onUserUpdate) {
        onUserUpdate(response.user);
      }

      // Clear password fields
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSettingsUpdate = async () => {
    setLoading(true);
    try {
      // This would be an API call to update group settings
      toast.success('Group settings updated successfully');
    } catch (error) {
      console.error('Failed to update group settings:', error);
      toast.error('Failed to update group settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;

    const confirmed = window.confirm(
      `Are you sure you want to leave "${selectedGroup.name}"? You will lose access to all messages and will need to be re-invited to rejoin.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      await groupApi.leaveGroup(selectedGroup._id);
      toast.success('Left group successfully');
      
      if (onGroupLeave) {
        onGroupLeave(selectedGroup._id);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to leave group:', error);
      toast.error(error.response?.data?.error || 'Failed to leave group');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionUpdate = async () => {
    setLoading(true);
    try {
      // This would be an API call to update permissions
      toast.success('Permissions updated successfully');
    } catch (error) {
      console.error('Failed to update permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  const isManager = currentUser?.role === 'manager' || selectedGroup?.managers?.includes(currentUser?.id);
  const isAdmin = currentUser?.role === 'admin';

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
            <nav className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('group')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'group'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Group Settings</span>
              </button>

              {(isManager || isAdmin) && (
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === 'permissions'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Permissions</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'notifications'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </button>

              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'appearance'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Palette className="h-4 w-4" />
                <span>Appearance</span>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'profile' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Profile Settings
                </h3>
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      Change Password
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={profileData.currentPassword}
                            onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={profileData.newPassword}
                          onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={profileData.confirmPassword}
                          onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'group' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Group Settings
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Notifications</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications for new messages</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupSettings.notifications}
                        onChange={(e) => setGroupSettings(prev => ({ ...prev, notifications: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Message Privacy</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Control who can see your messages</p>
                    </div>
                    <select
                      value={groupSettings.messagePrivacy}
                      onChange={(e) => setGroupSettings(prev => ({ ...prev, messagePrivacy: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Auto Delete Messages</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Automatically delete messages after specified days</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupSettings.autoDelete}
                        onChange={(e) => setGroupSettings(prev => ({ ...prev, autoDelete: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {groupSettings.autoDelete && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Auto Delete After (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={groupSettings.autoDeleteDays}
                        onChange={(e) => setGroupSettings(prev => ({ ...prev, autoDeleteDays: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGroupSettingsUpdate}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>{loading ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                  </div>
                </div>

                {/* Leave Group Section */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <h4 className="font-medium text-red-900 dark:text-red-100">Leave Group</h4>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          You will lose access to all messages and need to be re-invited to rejoin.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleLeaveGroup}
                      disabled={loading}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Leave Group</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (isManager || isAdmin) && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Permission Management
                </h3>
                
                <div className="space-y-4">
                  {Object.entries(permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getPermissionDescription(key)}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePermissionUpdate}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save Permissions'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Notification Settings
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Notification settings will be implemented here.
                </p>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Appearance Settings
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Appearance settings will be implemented here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const getPermissionDescription = (permission) => {
  const descriptions = {
    canInviteUsers: 'Allow inviting new users to the group',
    canRemoveUsers: 'Allow removing users from the group',
    canDeleteMessages: 'Allow deleting any messages in the group',
    canEditMessages: 'Allow editing any messages in the group',
    canManageSettings: 'Allow managing group settings and permissions'
  };
  return descriptions[permission] || 'Manage group permissions';
};

export default Settings;
