// src/hooks/useAdminData.js
import { useEffect, useState, useCallback } from 'react';
import { groupApi } from '../../api/groupApi';
import { authApi } from '../../api/authApi';
import adminSocketService from '../../sockets/adminSocket';
import toast from 'react-hot-toast';

export default function useAdminData(token) {
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [groupsResponse, usersResponse] = await Promise.all([
                groupApi.getAllGroups(),
                authApi.getUsers()
            ]);
            setGroups(groupsResponse.groups || []);
            setUsers(usersResponse.users || []);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!token) return;
        
        // Connect admin socket if not already connected
        const socket = adminSocketService.connect(token);
        if (!socket) return;

        // Set up socket listeners
        const setupSocketListeners = () => {
            socket.on('connect', () => {
                console.log('Admin panel socket connected, joining admin room');
                socket.emit('join:admin');
            });

            // User status listeners
            socket.on('user:online', (data) => {
                setUsers(prevUsers => prevUsers.map(user => user._id === data.userId ? { ...user, isOnline: true } : user));
            });
            
            socket.on('user:offline', (data) => {
                setUsers(prevUsers => prevUsers.map(user => user._id === data.userId ? { ...user, isOnline: false } : user));
            });

            socket.on('user:status:changed', (data) => {
                setUsers(prevUsers => prevUsers.map(user => user._id === data.userId ? { ...user, isOnline: data.isOnline } : user));
            });

            // Group listeners
            socket.on('group:updated', (data) => {
                setGroups(prevGroups => prevGroups.map(group => group._id === data.groupId ? data.group : group));
            });
            
            socket.on('group:joined', (data) => {
                setGroups(prevGroups => [...prevGroups, data.group]);
            });
            
            socket.on('group:left', (data) => {
                setGroups(prevGroups => prevGroups.filter(group => group._id !== data.groupId));
            });

            // User management listeners
            socket.on('role:updated', (data) => {
                setUsers(prevUsers => prevUsers.map(user => user._id === data.userId ? { ...user, role: data.role } : user));
            });

            socket.on('user:joined', (data) => {
                setUsers(prevUsers => [...prevUsers, data.user]);
            });
            
            socket.on('user:left', (data) => {
                setUsers(prevUsers => prevUsers.filter(user => user._id !== data.userId));
            });

            // Test listeners
            socket.on('test:online-status', () => {
                setUsers(prevUsers => prevUsers.map(user => ({ ...user, isOnline: true })));
            });
            
            socket.on('test:offline-status', () => {
                setUsers(prevUsers => prevUsers.map(user => ({ ...user, isOnline: false })));
            });
        };

        // Set up listeners immediately if socket is already connected
        if (socket.connected) {
            setupSocketListeners();
            socket.emit('join:admin');
        } else {
            // Set up listeners when socket connects
            socket.on('connect', () => {
                setupSocketListeners();
                socket.emit('join:admin');
            });
        }

        return () => {
            // Clean up admin socket listeners and disconnect
            adminSocketService.removeAllListeners();
            adminSocketService.disconnect();
        };
    }, [token]);

    return { groups, users, loading, loadData, setGroups, setUsers };
}
