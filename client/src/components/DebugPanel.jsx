import React, { useState, useEffect } from 'react';
import socketService from '../sockets/socket';

const DebugPanel = ({ isVisible, onClose }) => {
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [lastEvent, setLastEvent] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!isVisible) return;

    const handleConnect = () => {
      setSocketStatus('connected');
      setLastEvent({ type: 'connect', timestamp: new Date() });
    };

    const handleDisconnect = () => {
      setSocketStatus('disconnected');
      setLastEvent({ type: 'disconnect', timestamp: new Date() });
    };

    const handleMessage = (eventName, data) => {
      setLastEvent({ type: eventName, data, timestamp: new Date() });
      setEvents(prev => [{ type: eventName, data, timestamp: new Date() }, ...prev.slice(0, 9)]);
    };

    // Listen to socket events
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('message:new', (data) => handleMessage('message:new', data));
    socketService.on('message:edited', (data) => handleMessage('message:edited', data));
    socketService.on('message:deleted', (data) => handleMessage('message:deleted', data));
    socketService.on('message:reaction', (data) => handleMessage('message:reaction', data));

    // Check initial status
    setSocketStatus(socketService.isConnected() ? 'connected' : 'disconnected');

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('message:new', handleMessage);
      socketService.off('message:edited', handleMessage);
      socketService.off('message:deleted', handleMessage);
      socketService.off('message:reaction', handleMessage);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-16 left-4 w-80 max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Debug Panel</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>
      
      <div className="p-3 space-y-3">
        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Socket Status: </span>
          <span className={`text-sm font-bold ${
            socketStatus === 'connected' ? 'text-green-600' : 'text-red-600'
          }`}>
            {socketStatus.toUpperCase()}
          </span>
        </div>
        
        {lastEvent && (
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Event: </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {lastEvent.type} at {lastEvent.timestamp.toLocaleTimeString()}
            </span>
          </div>
        )}
        
        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Events:</span>
          <div className="max-h-32 overflow-y-auto text-xs space-y-1 mt-1">
            {events.length === 0 ? (
              <p className="text-gray-500">No events yet</p>
            ) : (
              events.map((event, index) => (
                <div key={index} className="bg-gray-100 dark:bg-gray-700 p-1 rounded">
                  <div className="font-medium">{event.type}</div>
                  <div className="text-gray-500">{event.timestamp.toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
