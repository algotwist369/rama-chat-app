import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Settings } from 'lucide-react';
import soundManager from '../utils/soundManager';

const SoundSettings = ({ isOpen, onClose }) => {
    const [isEnabled, setIsEnabled] = useState(soundManager.isSoundEnabled());
    const [volume, setVolume] = useState(soundManager.getVolume());

    useEffect(() => {
        setIsEnabled(soundManager.isSoundEnabled());
        setVolume(soundManager.getVolume());
    }, []);

    const handleToggleSound = () => {
        const newEnabled = !isEnabled;
        setIsEnabled(newEnabled);
        soundManager.setEnabled(newEnabled);
        
        // Play test sound if enabling
        if (newEnabled) {
            soundManager.playNotificationSound();
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        soundManager.setVolume(newVolume);
        
        // Play test sound
        soundManager.playNotificationSound();
    };

    const playTestSound = () => {
        soundManager.playNotificationSound();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Settings className="h-6 w-6 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-800">Sound Settings</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isEnabled ? (
                                <Volume2 className="h-5 w-5 text-green-600" />
                            ) : (
                                <VolumeX className="h-5 w-5 text-gray-400" />
                            )}
                            <span className="text-gray-700 font-medium">Notification Sounds</span>
                        </div>
                        <button
                            onClick={handleToggleSound}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Volume Control */}
                    {isEnabled && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 font-medium">Volume</span>
                                <span className="text-sm text-gray-500">{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                        </div>
                    )}

                    {/* Test Sound Button */}
                    {isEnabled && (
                        <div className="pt-4 border-t border-gray-200">
                            <button
                                onClick={playTestSound}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Test Sound
                            </button>
                        </div>
                    )}

                    {/* Sound Types Info */}
                    <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Sound Types</h3>
                        <div className="space-y-1 text-xs text-gray-500">
                            <div>• <strong>Messages:</strong> High pitch for new messages</div>
                            <div>• <strong>Notifications:</strong> Medium pitch for other notifications</div>
                            <div>• <strong>User Actions:</strong> Different tones for join/leave</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SoundSettings;
