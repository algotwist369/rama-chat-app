import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import useAdminData from '../hooks/adminHook/useAdminData';
import { useFilteredUsers, useFilteredGroups } from '../hooks/adminHook/useFilter';
import { useNotifications } from '../hooks/useNotifications';
import adminSocketService from '../sockets/adminSocket';
import AdminHeader from '../components/admin/AdminHeader';
import SearchAndFilters from '../components/admin/SearchAndFilters';
import GroupsTab from '../components/admin/GroupsTab';
import UsersTab from '../components/admin/UsersTab';
import MessagesTab from '../components/admin/MessagesTab';
import NotificationsTab from '../components/admin/NotificationsTab';
import CreateUserModal from '../components/admin/CreateUserModal';
import EditUserModal from '../components/admin/EditUserModal';
import AddUserToGroupModal from '../components/admin/AddUserToGroupModal';
import CreateGroupModal from '../components/admin/CreateGroupModal';
import EditGroupModal from '../components/admin/EditGroupModal';
import AdminErrorBoundary from '../components/AdminErrorBoundary';
import { 
  Users, 
  MessageSquare, 
  Bell, 
  Shield,
  Crown,
  Activity
} from 'lucide-react';

const EnhancedAdminPanel = () => {
  const { token, logout } = useAuth();
  const { groups, users, loading, loadData } = useAdminData(token);
  const { notificationCount, loadNotifications } = useNotifications();

  // Helper function to extract error messages
  const extractErrorMessage = (error, defaultMessage) => {
    if (error.response?.data?.error) {
      if (typeof error.response.data.error === 'string') {
        return error.response.data.error;
      } else if (error.response.data.error.message) {
        return error.response.data.error.message;
      } else if (error.response.data.error.details && Array.isArray(error.response.data.error.details)) {
        return error.response.data.error.details.map(detail => detail.message).join(', ');
      }
    }
    return defaultMessage;
  };

  const [activeTab, setActiveTab] = useState('groups');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modal states
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(null);
  const [errors, setErrors] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const filteredUsers = useFilteredUsers(users, searchTerm, filterRole, filterStatus);
  const filteredGroups = useFilteredGroups(groups, searchTerm);

  // Load data on mount
  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, loadData]);

  // Load data when component mounts
  useEffect(() => {
    if (token && !loading) {
      loadData();
      loadNotifications(); // Load notifications for admin panel
    }
  }, []);

  // Message management handlers
  const handleDeleteMessage = async (messageId) => {
    const actionKey = `deleteMessage_${messageId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      const { messageApi } = await import('../api/messageApi');
      await messageApi.deleteMessage(messageId);
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Failed to delete message:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete message');
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleEditMessage = async (messageId, content) => {
    const actionKey = `editMessage_${messageId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      const { messageApi } = await import('../api/messageApi');
      await messageApi.editMessage(messageId, content);
      toast.success('Message updated successfully');
    } catch (error) {
      console.error('Failed to edit message:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to edit message');
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Notification management handlers
  const handleClearNotifications = async () => {
    const actionKey = 'clearNotifications';
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      const { notificationApi } = await import('../api/notificationApi');
      await notificationApi.clearNotifications();
      toast.success('Notifications cleared successfully');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to clear notifications');
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleMarkNotificationsAsSeen = async () => {
    const actionKey = 'markNotificationsAsSeen';
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      const { notificationApi } = await import('../api/notificationApi');
      await notificationApi.markNotificationsAsSeen();
      toast.success('Notifications marked as seen');
    } catch (error) {
      console.error('Failed to mark notifications as seen:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to mark notifications as seen');
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // User management handlers
  const handleCreateUser = async (userData) => {
    const actionKey = 'createUser';
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      setErrors({});
      const { authApi } = await import('../api/authApi');
      await authApi.createUser(userData);
      toast.success('User created successfully');
      await loadData(); // Refresh data
      setShowCreateUser(false);
    } catch (error) {
      console.error('Failed to create user:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create user');
      setErrors({ [actionKey]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleEditUser = async (userId, userData) => {
    const actionKey = `editUser_${userId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      setErrors({});
      const { authApi } = await import('../api/authApi');
      await authApi.updateUser(userId, userData);
      toast.success('User updated successfully');
      await loadData(); // Refresh data
      setShowEditUser(null);
    } catch (error) {
      console.error('Failed to edit user:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update user');
      setErrors({ [actionKey]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleDeleteUser = async (userId) => {
    const actionKey = `deleteUser_${userId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      setErrors({});
      const { authApi } = await import('../api/authApi');
      await authApi.deleteUser(userId);
      toast.success('User deleted successfully');
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete user:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete user');
      setErrors({ [actionKey]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Group management handlers
  const handleCreateGroup = async (groupData) => {
    const actionKey = 'createGroup';
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      setErrors({});
      const { groupApi } = await import('../api/groupApi');
      await groupApi.createGroup(groupData);
      toast.success('Group created successfully');
      await loadData(); // Refresh data
      setShowCreateGroup(false);
    } catch (error) {
      console.error('Failed to create group:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to create group');
      setErrors({ [actionKey]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleEditGroup = async (groupId, groupData) => {
    const actionKey = `editGroup_${groupId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      setErrors({});
      const { groupApi } = await import('../api/groupApi');
      await groupApi.updateGroup(groupId, groupData);
      toast.success('Group updated successfully');
      await loadData(); // Refresh data
      setShowEditGroup(null);
    } catch (error) {
      console.error('Failed to edit group:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to update group');
      setErrors({ [actionKey]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const actionKey = `deleteGroup_${groupId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      setErrors({});
      const { groupApi } = await import('../api/groupApi');
      await groupApi.deleteGroup(groupId);
      toast.success('Group deleted successfully');
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete group:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to delete group');
      setErrors({ [actionKey]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleAddUserToGroup = async (groupId, userId) => {
    const actionKey = `addUser_${groupId}_${userId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      setErrors({});
      const { groupApi } = await import('../api/groupApi');
      await groupApi.addUserToGroup(groupId, userId);
      toast.success('User added to group successfully');
      await loadData(); // Refresh data
      setShowAddUserModal(null);
    } catch (error) {
      console.error('Failed to add user to group:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to add user to group');
      setErrors({ [actionKey]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handlePromoteToManager = async (groupId, userId) => {
    const actionKey = `promoteUser_${groupId}_${userId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      setErrors({});
      const { groupApi } = await import('../api/groupApi');
      await groupApi.addManager(groupId, userId);
      toast.success('User promoted to manager successfully');
      await loadData(); // Refresh data
      setShowAddUserModal(null);
    } catch (error) {
      console.error('Failed to promote user to manager:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to promote user to manager');
      setErrors({ [actionKey]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleRemoveUserFromGroup = async (groupId, userId) => {
    const actionKey = `removeUser_${groupId}_${userId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      setErrors({});
      const { groupApi } = await import('../api/groupApi');
      await groupApi.removeUserFromGroup(groupId, userId);
      toast.success('User removed from group successfully');
      await loadData(); // Refresh data
      setShowAddUserModal(null);
    } catch (error) {
      console.error('Failed to remove user from group:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to remove user from group');
      setErrors({ [actionKey]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleRemoveManagerFromGroup = async (groupId, userId) => {
    const actionKey = `removeManager_${groupId}_${userId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));
      setErrors({});
      const { groupApi } = await import('../api/groupApi');
      await groupApi.removeManager(groupId, userId);
      toast.success('Manager removed from group successfully');
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to remove manager from group:', error);
      const errorMessage = extractErrorMessage(error, 'Failed to remove manager from group');
      setErrors({ [actionKey]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Statistics
  const stats = {
    totalUsers: users.length,
    totalGroups: groups.length,
    activeUsers: users.filter(user => user.isOnline).length,
    adminUsers: users.filter(user => user.role === 'admin').length,
    managerUsers: users.filter(user => user.role === 'manager').length,
    regularUsers: users.filter(user => user.role === 'user').length
  };

  const tabs = [
    { id: 'groups', label: 'Groups', icon: Users, count: filteredGroups.length },
    { id: 'users', label: 'Users', icon: Shield, count: filteredUsers.length },
    { id: 'messages', label: 'Messages', icon: MessageSquare, count: 0 },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: 0 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Handle notification bell click
  const handleNotificationClick = () => {
    setActiveTab('notifications');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <AdminHeader 
        onLogout={logout} 
        notificationCount={notificationCount}
        onNotificationClick={handleNotificationClick}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Users</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Users</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.activeUsers}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Groups</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalGroups}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Admins</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.adminUsers}</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-0.5 px-2 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search and Filters */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <SearchAndFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterRole={filterRole}
              setFilterRole={setFilterRole}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              activeTab={activeTab}
              onCreateUser={() => setShowCreateUser(true)}
              onCreateGroup={() => setShowCreateGroup(true)}
            />
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'groups' && (
              <GroupsTab
                groups={filteredGroups}
                onEditGroup={setShowEditGroup}
                onDeleteGroup={handleDeleteGroup}
                onAddUser={setShowAddUserModal}
                onRemoveUser={handleRemoveUserFromGroup}
                onPromoteToManager={handlePromoteToManager}
                onDemoteManager={handleRemoveManagerFromGroup}
                actionLoading={actionLoading}
                errors={errors}
              />
            )}
            {activeTab === 'users' && (
              <UsersTab
                users={filteredUsers}
                onEditUser={setShowEditUser}
                onDeleteUser={handleDeleteUser}
                actionLoading={actionLoading}
                errors={errors}
              />
            )}
            {activeTab === 'messages' && (
              <MessagesTab 
                groups={groups || []}
                actionLoading={actionLoading}
                onDeleteMessage={handleDeleteMessage}
                onEditMessage={handleEditMessage}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationsTab 
                actionLoading={actionLoading}
                onClearNotifications={handleClearNotifications}
                onMarkAsSeen={handleMarkNotificationsAsSeen}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateUser && (
        <CreateUserModal
          isOpen={showCreateUser}
          onClose={() => setShowCreateUser(false)}
          onSubmit={handleCreateUser}
          loading={actionLoading.createUser}
          errors={errors}
        />
      )}

      {showEditUser && (
        <EditUserModal
          isOpen={!!showEditUser}
          onClose={() => setShowEditUser(null)}
          user={showEditUser}
          onSubmit={(userData) => handleEditUser(showEditUser._id, userData)}
          loading={actionLoading[`editUser_${showEditUser._id}`]}
          errors={errors}
        />
      )}

      {showAddUserModal && (
        <AddUserToGroupModal
          groupId={showAddUserModal._id}
          groupName={showAddUserModal.name}
          users={users}
          groups={groups}
          onClose={() => setShowAddUserModal(null)}
          onAddUser={(userId) => handleAddUserToGroup(showAddUserModal._id, userId)}
          onPromoteToManager={(userId) => handlePromoteToManager(showAddUserModal._id, userId)}
          onRemoveUser={(userId) => handleRemoveUserFromGroup(showAddUserModal._id, userId)}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          isOpen={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onSubmit={handleCreateGroup}
          loading={actionLoading.createGroup}
          errors={errors}
        />
      )}

      {showEditGroup && (
        <EditGroupModal
          isOpen={!!showEditGroup}
          onClose={() => setShowEditGroup(null)}
          group={showEditGroup}
          onSubmit={(groupData) => handleEditGroup(showEditGroup._id, groupData)}
          loading={actionLoading[`editGroup_${showEditGroup._id}`]}
          errors={errors}
        />
      )}
    </div>
  );
};

export default EnhancedAdminPanel;
