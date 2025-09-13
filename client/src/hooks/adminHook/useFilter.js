// src/hooks/useFilter.js
import { useMemo } from 'react';

export function useFilteredUsers(users, searchTerm, filterRole, filterStatus) {
    return useMemo(() => {
        return users.filter(u => {
            const matchesSearch = [u.username, u.email, u.profile?.firstName, u.profile?.lastName]
                .filter(Boolean)
                .some(val => val.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesRole = filterRole === 'all' || u.role === filterRole;
            const matchesStatus = filterStatus === 'all' ||
                (filterStatus === 'online' && u.isOnline) ||
                (filterStatus === 'offline' && !u.isOnline) ||
                (filterStatus === 'active' && u.isActive) ||
                (filterStatus === 'inactive' && !u.isActive);
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchTerm, filterRole, filterStatus]);
}

export function useFilteredGroups(groups, searchTerm) {
    return useMemo(() => {
        return groups.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.region.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [groups, searchTerm]);
}
