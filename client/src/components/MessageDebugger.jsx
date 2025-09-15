import React, { useState, useEffect } from 'react';
import { Bug, MessageSquare, Wifi, WifiOff, Database, Activity } from 'lucide-react';
import socketService from '../sockets/socket';

const MessageDebugger = ({ isVisible, onClose, messages, selectedGroup, currentUser }) => {
    const [debugInfo, setDebugInfo] = useState({
        socketStatus: 'disconnected',
        lastMessage: null,
        messageCount: 0,
        groupInfo: null,
        connectionDetails: null
    });

    const [messageLog, setMessageLog] = useState([]);

    useEffect(() => {
        if (!isVisible) return;

        const updateDebugInfo = () => {
            const socket = socketService.getSocket();
            const connectionStatus = socketService.getConnectionStatus();
            
            setDebugInfo({
                socketStatus: connectionStatus.connected ? 'connected' : 'disconnected',
                lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
                messageCount: messages.length,
                groupInfo: selectedGroup,
                connectionDetails: connectionStatus
            });
        };

        // Update immediately
        updateDebugInfo();

        // Update every 2 seconds
        const interval = setInterval(updateDebugInfo, 2000);

        return () => clearInterval(interval);
    }, [isVisible, messages, selectedGroup]);

    // Log socket events
    useEffect(() => {
        if (!isVisible) return;

        const logEvent = (event, data) => {
            setMessageLog(prev => [...prev.slice(-19), {
                timestamp: new Date().toLocaleTimeString(),
                event,
                data: JSON.stringify(data, null, 2)
            }]);
        };

        // Set up socket event listeners
        socketService.on('message:new', (data) => logEvent('message:new', data));
        socketService.on('message:edited', (data) => logEvent('message:edited', data));
        socketService.on('message:deleted', (data) => logEvent('message:deleted', data));
        socketService.on('connect', () => logEvent('connect', { id: socketService.getSocket()?.id }));
        socketService.on('disconnect', (reason) => logEvent('disconnect', { reason }));

        return () => {
            // Cleanup listeners
            socketService.off('message:new');
            socketService.off('message:edited');
            socketService.off('message:deleted');
            socketService.off('connect');
            socketService.off('disconnect');
        };
    }, [isVisible]);

    const testMessage = () => {
        if (!selectedGroup) {
            alert('No group selected');
            return;
        }

        const testData = {
            content: `Debug test message - ${new Date().toISOString()}`,
            groupId: selectedGroup._id,
            messageType: 'text'
        };

        console.log('🧪 Sending test message:', testData);
        socketService.sendMessage(testData, (response) => {
            console.log('🧪 Test message response:', response);
            setMessageLog(prev => [...prev.slice(-19), {
                timestamp: new Date().toLocaleTimeString(),
                event: 'test:message:response',
                data: JSON.stringify(response, null, 2)
            }]);
        });
    };

    const reconnectSocket = () => {
        console.log('🔄 Reconnecting socket...');
        socketService.reconnect();
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                            <Bug className="h-6 w-6 mr-2" />
                            Message Debugger
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Connection Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Socket Status</p>
                                    <p className={`text-2xl font-bold ${
                                        debugInfo.socketStatus === 'connected' ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                        {debugInfo.socketStatus}
                                    </p>
                                </div>
                                {debugInfo.socketStatus === 'connected' ? (
                                    <Wifi className="h-8 w-8 text-green-500" />
                                ) : (
                                    <WifiOff className="h-8 w-8 text-red-500" />
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Messages Count</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                        {debugInfo.messageCount}
                                    </p>
                                </div>
                                <MessageSquare className="h-8 w-8 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Group Information */}
                    {debugInfo.groupInfo && (
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                                Current Group
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Group ID</p>
                                    <p className="text-sm font-mono text-slate-900 dark:text-slate-100">
                                        {debugInfo.groupInfo._id}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Group Name</p>
                                    <p className="text-sm text-slate-900 dark:text-slate-100">
                                        {debugInfo.groupInfo.name}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Connection Details */}
                    {debugInfo.connectionDetails && (
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                                Connection Details
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Socket ID</p>
                                    <p className="text-sm font-mono text-slate-900 dark:text-slate-100">
                                        {debugInfo.connectionDetails.socketId || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Transport</p>
                                    <p className="text-sm text-slate-900 dark:text-slate-100">
                                        {debugInfo.connectionDetails.transport || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Last Message */}
                    {debugInfo.lastMessage && (
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                                Last Message
                            </h3>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">ID</p>
                                    <p className="text-sm font-mono text-slate-900 dark:text-slate-100">
                                        {debugInfo.lastMessage._id}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Content</p>
                                    <p className="text-sm text-slate-900 dark:text-slate-100">
                                        {debugInfo.lastMessage.content?.substring(0, 100)}...
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Sender</p>
                                    <p className="text-sm text-slate-900 dark:text-slate-100">
                                        {debugInfo.lastMessage.senderId?.username}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Event Log */}
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                            Event Log
                        </h3>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {messageLog.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">No events yet</p>
                            ) : (
                                messageLog.map((log, index) => (
                                    <div key={index} className="bg-white dark:bg-slate-600 rounded p-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                                {log.timestamp}
                                            </span>
                                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                {log.event}
                                            </span>
                                        </div>
                                        <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                            {log.data}
                                        </pre>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={reconnectSocket}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                            Reconnect Socket
                        </button>
                        <button
                            onClick={testMessage}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Send Test Message
                        </button>
                        <button
                            onClick={() => setMessageLog([])}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                        >
                            Clear Log
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageDebugger;
