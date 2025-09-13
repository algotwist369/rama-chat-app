
import React, { createContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize auth state from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        try {
            const response = await authApi.login(credentials);
            const { token, user } = response;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            setToken(token);
            setUser(user);
            
            return { success: true };
        } catch (error) {
            const errorData = error.response?.data;
            const errorMessage = errorData?.error || 'Login failed';
            
            // Don't show toast - errors will be displayed in form fields
            // Re-throw the error so useAuth can handle it properly
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            const response = await authApi.register(userData);
            const { token, user } = response;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            setToken(token);
            setUser(user);
            
            return { success: true };
        } catch (error) {
            const errorData = error.response?.data;
            const errorMessage = errorData?.error || 'Registration failed';
            
            // Don't show toast - errors will be displayed in form fields
            // Re-throw the error so useAuth can handle it properly
            throw error;
        }
    };

    const logout = async () => {
        try {
            if (token) {
                await authApi.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            toast.success('Logged out successfully');
        }
    };

    const updateUser = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const value = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!token && !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
