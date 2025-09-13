
import React from 'react';
import { User } from 'lucide-react';
import UserRow from './UserRow';

const UsersTab = ({ users, onEditUser, onDeleteUser, actionLoading }) => (
    <div className="max-w-[99rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Users Management</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {users.length} users
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{users.filter(u => u.isOnline).length} online</span>
                    </div>
                </div>
            </div>
            
            <div className="divide-y divide-gray-200">
                {users.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                        <p className="text-gray-500">Get started by creating your first user.</p>
                    </div>
                ) : (
                    users.map((user) => (
                        <UserRow 
                            key={user._id} 
                            user={user} 
                            onEditUser={onEditUser}
                            onDeleteUser={onDeleteUser}
                            actionLoading={actionLoading}
                        />
                    ))
                )}
            </div>
        </div>
    </div>
);

export default UsersTab;
