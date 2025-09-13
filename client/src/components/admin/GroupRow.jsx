
import React from 'react';
import { Plus, Edit, Trash2, Shield, X, Crown, UserMinus } from 'lucide-react';
import Button from '../common/Button';

const GroupRow = ({ group, onAddUser, onEditGroup, onDeleteGroup, onRemoveUser, onPromoteToManager, onDemoteManager, actionLoading }) => (
    <div className="px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <div className="flex items-center space-x-3">
                    <h4 className="text-sm font-medium text-gray-900">{group.name}</h4>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {group.region}
                    </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                    {group.users?.length || 0} members • {group.managers?.length || 0} managers • Created {new Date(group.createdAt).toLocaleDateString()}
                </p>
                {/* Group Members */}
                <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Members:</p>
                    <div className="flex flex-wrap gap-1">
                        {group.users?.slice(0, 5).map((user) => (
                            <span key={user._id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <div className="flex items-center space-x-1">
                                    <div className="relative">
                                        <span>{user.username}</span>
                                        {/* Online indicator for group members */}
                                        <div
                                            className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                                }`}
                                        />
                                    </div>
                                    {group.managers?.some(m => m._id === user._id) && (
                                        <Shield className="h-3 w-3 text-blue-500" />
                                    )}
                                    <div className="flex items-center space-x-1">
                                        {/* Promote to Manager Button */}
                                        {!group.managers?.some(m => m._id === user._id) && (
                                            <button
                                                onClick={() => onPromoteToManager(group._id, user._id)}
                                                className="p-1 rounded-full hover:bg-blue-100 transition-colors text-blue-500 hover:text-blue-700"
                                                title="Promote to Manager"
                                                disabled={actionLoading[`promoteToManager_${group._id}_${user._id}`]}
                                            >
                                                <Crown className="h-3 w-3" />
                                            </button>
                                        )}
                                        
                                        {/* Demote Manager Button */}
                                        {group.managers?.some(m => m._id === user._id) && (
                                            <button
                                                onClick={() => onDemoteManager(group._id, user._id)}
                                                className="p-1 rounded-full hover:bg-yellow-100 transition-colors text-yellow-500 hover:text-yellow-700"
                                                title="Demote Manager"
                                                disabled={actionLoading[`demoteManager_${group._id}_${user._id}`]}
                                            >
                                                <UserMinus className="h-3 w-3" />
                                            </button>
                                        )}
                                        
                                        {/* Remove User Button */}
                                        <button
                                            onClick={() => {
                                                console.log('Remove user button clicked:', { groupId: group._id, userId: user._id });
                                                onRemoveUser(group._id, user._id);
                                            }}
                                            className="p-1 rounded-full hover:bg-red-100 transition-colors text-red-500 hover:text-red-700"
                                            title="Remove User"
                                            disabled={actionLoading[`removeUserFromGroup_${group._id}_${user._id}`]}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </span>
                        ))}
                        {group.users?.length > 5 && (
                            <span className="text-xs text-gray-500">+{group.users.length - 5} more</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <Button
                    onClick={() => onAddUser(group)}
                    variant="ghost"
                    size="sm"
                    icon={<Plus className="h-4 w-4" />}
                    title="Add User"
                />
                <Button
                    onClick={() => onEditGroup(group)}
                    variant="ghost"
                    size="sm"
                    icon={<Edit className="h-4 w-4" />}
                    title="Edit Group"
                    disabled={actionLoading[`updateGroup_${group._id}`]}
                />
                <Button
                    onClick={() => onDeleteGroup(group._id)}
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="h-4 w-4" />}
                    title="Delete Group"
                    disabled={actionLoading[`deleteGroup_${group._id}`]}
                    loading={actionLoading[`deleteGroup_${group._id}`]}
                />
            </div>
        </div>
    </div>
);

export default GroupRow;
