import React from 'react';
import { Edit, Trash2, Crown, Shield, User, Mail, Activity, Calendar, Lock, CheckCircle, XCircle } from 'lucide-react';
import Button from '../common/Button';

const UserRow = ({ user, onEditUser, onDeleteUser, actionLoading }) => {
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'manager':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex items-center space-x-2">
              <div className="relative">
                {getRoleIcon(user.role)}
                {/* Online indicator */}
                <div 
                  className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  {user.profile?.firstName && user.profile?.lastName 
                    ? `${user.profile.firstName} ${user.profile.lastName}`
                    : user.username
                  }
                </h4>
                <p className="text-xs text-gray-500">@{user.username}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                user.role === 'admin' ? 'bg-yellow-100 text-yellow-800' :
                user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {user.role}
              </span>
              
              {user.pin && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <Lock className="h-3 w-3 mr-1" />
                  PIN
                </span>
              )}
              
              {user.isActive ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <XCircle className="h-3 w-3 mr-1" />
                  Inactive
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Mail className="h-3 w-3" />
              <span>{user.email}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>
                {user.isOnline ? (
                  <span className="text-green-600 font-medium">Online</span>
                ) : (
                  <span>
                    Offline{user.lastSeen ? ` • Last seen ${new Date(user.lastSeen).toLocaleString()}` : ''}
                  </span>
                )}
              </span>
            </div>
            
            {user.profile?.bio && (
              <div className="md:col-span-2">
                <p className="text-xs text-gray-400 italic">"{user.profile.bio}"</p>
              </div>
            )}
            
            <div className="flex items-center space-x-1 md:col-span-2">
              <Calendar className="h-3 w-3" />
              <span>Created {new Date(user.createdAt).toLocaleDateString()}</span>
              {user.lastLoginAt && (
                <span>• Last login {new Date(user.lastLoginAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button 
            onClick={() => onEditUser(user)}
            disabled={actionLoading[`updateUser_${user._id}`]}
            variant="ghost"
            size="sm"
            icon={<Edit className="h-4 w-4" />}
            title="Edit User"
          />
          <Button 
            onClick={() => onDeleteUser(user._id)}
            disabled={actionLoading[`deleteUser_${user._id}`]}
            variant="ghost"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            title="Delete User"
          />
        </div>
      </div>
    </div>
  );
};

export default UserRow;
