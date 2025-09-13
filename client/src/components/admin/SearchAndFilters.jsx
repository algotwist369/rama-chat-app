import React from 'react';
import { Search, Plus, UserPlus, Users } from 'lucide-react';
import InputField from '../common/InputField';
import Button from '../common/Button';

const SearchAndFilters = ({
    activeTab,
    searchTerm,
    setSearchTerm,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    onCreateUser,
    onCreateGroup
}) => (
    <div className="max-w-[99rem] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <InputField
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            
            <div className="flex gap-2 items-center">
                {activeTab === 'users' && (
                    <>
                        <InputField
                            type="select"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Roles' },
                                { value: 'admin', label: 'Admin' },
                                { value: 'manager', label: 'Manager' },
                                { value: 'user', label: 'User' }
                            ]}
                        />
                        
                        <InputField
                            type="select"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'online', label: 'Online' },
                                { value: 'offline', label: 'Offline' },
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' }
                            ]}
                        />
                    </>
                )}
                
                {/* Create Buttons */}
                {activeTab === 'users' && onCreateUser && (
                    <Button
                        onClick={onCreateUser}
                        variant="primary"
                        size="sm"
                        icon={<UserPlus className="h-4 w-4" />}
                    >
                        Create User
                    </Button>
                )}
                
                {activeTab === 'groups' && onCreateGroup && (
                    <Button
                        onClick={onCreateGroup}
                        variant="primary"
                        size="sm"
                        icon={<Users className="h-4 w-4" />}
                    >
                        Create Group
                    </Button>
                )}
            </div>
        </div>
    </div>
);

export default SearchAndFilters;
