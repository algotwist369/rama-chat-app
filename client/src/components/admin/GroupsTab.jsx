
import React from 'react';
import { Users } from 'lucide-react';
import GroupRow from './GroupRow';

const GroupsTab = ({ groups, onAddUser, onEditGroup, onDeleteGroup, onRemoveUser, onPromoteToManager, onDemoteManager, actionLoading }) => (
    <div className="max-w-[99rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Groups Management</h3>
            </div>
            <div className="divide-y divide-gray-200">
                {groups.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
                        <p className="text-gray-500">Get started by creating your first group.</p>
                    </div>
                ) : (
                    groups.map((group) => (
                        <GroupRow 
                            key={group._id} 
                            group={group} 
                            onAddUser={onAddUser}
                            onEditGroup={onEditGroup}
                            onDeleteGroup={onDeleteGroup}
                            onRemoveUser={onRemoveUser}
                            onPromoteToManager={onPromoteToManager}
                            onDemoteManager={onDemoteManager}
                            actionLoading={actionLoading}
                        />
                    ))
                )}
            </div>
        </div>
    </div>
);

export default GroupsTab;
