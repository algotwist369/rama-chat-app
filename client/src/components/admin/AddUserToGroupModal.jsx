// Add User to Group Modal Component
import React, { useState } from 'react';
import InputField from '../common/InputField';
import Button from '../common/Button';

const AddUserToGroupModal = ({ groupId, groupName, users, groups, onClose, onAddUser, onPromoteToManager, onRemoveUser }) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [action, setAction] = useState('add'); // 'add', 'promote', or 'remove'

  const currentGroup = groups.find(g => g._id === groupId);
  const currentGroupUserIds = currentGroup?.users?.map(u => u._id) || [];
  const currentGroupManagerIds = currentGroup?.managers?.map(m => m._id) || [];

  // Filter users who are not already in the group
  const availableUsers = users.filter(user => 
    !currentGroupUserIds.includes(user._id) && user.role !== 'admin'
  );

  // Filter users who are in the group but not managers
  const promotableUsers = users.filter(user => 
    currentGroupUserIds.includes(user._id) && 
    !currentGroupManagerIds.includes(user._id) &&
    user.role !== 'admin'
  );

  // Filter users who are in the group (for removal)
  const removableUsers = users.filter(user => 
    currentGroupUserIds.includes(user._id) && user.role !== 'admin'
  );


  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedUserId) {
      if (action === 'add') {
        onAddUser(selectedUserId);
      } else if (action === 'promote') {
        onPromoteToManager(selectedUserId);
      } else if (action === 'remove') {
        onRemoveUser(selectedUserId);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage {groupName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Current: {currentGroup?.users?.length || 0} users, {currentGroup?.managers?.length || 0} managers
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ×
          </button>
        </div>


        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <InputField
            label="Action"
            name="action"
            type="select"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={[
              { value: 'add', label: 'Add User to Group' },
              { value: 'promote', label: 'Promote to Manager' },
              { value: 'remove', label: 'Remove User from Group' }
            ]}
          />

          <InputField
            label={
              action === 'add' ? 'Select User to Add' : 
              action === 'promote' ? 'Select User to Promote' : 
              'Select User to Remove'
            }
            name="selectedUserId"
            type="select"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            required
            options={[
              { value: '', label: 'Choose a user...' },
              ...(action === 'add' ? availableUsers : 
                  action === 'promote' ? promotableUsers : 
                  removableUsers).map((user) => ({
                value: user._id,
                label: `${user.username} (${user.email})`
              }))
            ]}
            error={
              action === 'add' && availableUsers.length === 0 
                ? 'All users are already in this group'
                : action === 'promote' && promotableUsers.length === 0
                ? 'No users available for promotion'
                : action === 'remove' && removableUsers.length === 0
                ? 'No users to remove from this group'
                : ''
            }
          />

          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={action === 'remove' ? 'danger' : 'primary'}
              disabled={!selectedUserId}
            >
              {action === 'add' ? 'Add User' : 
               action === 'promote' ? 'Promote to Manager' : 
               'Remove User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserToGroupModal;
