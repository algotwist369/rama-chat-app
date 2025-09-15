import React, { useState, useEffect } from 'react';
import socketService from '../sockets/socket';

const SocketDebugger = ({ isVisible = false }) => {
  const [events, setEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (!isVisible) return;

    const handleConnect = () => {
      setConnectionStatus('connected');
      addEvent('connect', { status: 'connected', socketId: socketService.getSocket()?.id });
    };

    const handleDisconnect = () => {
      setConnectionStatus('disconnected');
      addEvent('disconnect', { status: 'disconnected' });
    };

    const handleMessage = (data) => {
      addEvent('message:new', data);
    };

    const handleTypingStart = (data) => {
      addEvent('typing:start', data);
    };

    const handleTypingStop = (data) => {
      addEvent('typing:stop', data);
    };

    const addEvent = (eventType, data) => {
      setEvents(prev => [{
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        type: eventType,
        data: data
      }, ...prev.slice(0, 49)]); // Keep last 50 events
    };

    // Set up event listeners
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('message:new', handleMessage);
    socketService.on('typing:start', handleTypingStart);
    socketService.on('typing:stop', handleTypingStop);

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('message:new', handleMessage);
      socketService.off('typing:start', handleTypingStart);
      socketService.off('typing:stop', handleTypingStop);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">Socket Debugger</h3>
        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
      </div>
      
      <div className="text-xs mb-2">
        Status: <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>
          {connectionStatus}
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-gray-400 text-xs">No events yet...</div>
        ) : (
          events.map(event => (
            <div key={event.id} className="mb-2 p-2 bg-gray-800 rounded text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-blue-400 font-mono">{event.type}</span>
                <span className="text-gray-400">{event.timestamp}</span>
              </div>
              <div className="text-gray-300 break-all">
                {JSON.stringify(event.data, null, 2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SocketDebugger;
