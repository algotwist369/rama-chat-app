/**
 * Sound Manager for notification sounds
 */
class SoundManager {
    constructor() {
        this.sounds = {};
        this.isEnabled = true;
        this.volume = 0.7;
        this.loadSounds();
    }

    /**
     * Load notification sounds
     */
    loadSounds() {
        // Create audio contexts for different notification types
        this.sounds = {
            message: this.createNotificationSound(800, 0.1), // High pitch for messages
            notification: this.createNotificationSound(600, 0.15), // Medium pitch for notifications
            error: this.createNotificationSound(400, 0.2), // Low pitch for errors
            success: this.createNotificationSound(1000, 0.1), // Very high pitch for success
            join: this.createNotificationSound(700, 0.1), // Join sound
            leave: this.createNotificationSound(500, 0.1) // Leave sound
        };
    }

    /**
     * Create a notification sound using Web Audio API
     */
    createNotificationSound(frequency, duration) {
        return () => {
            if (!this.isEnabled) return;

            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(this.volume, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            } catch (error) {
                console.warn('Could not play notification sound:', error);
            }
        };
    }

    /**
     * Play a specific notification sound
     */
    playSound(type = 'notification') {
        if (this.sounds[type]) {
            this.sounds[type]();
        } else {
            console.warn(`Sound type '${type}' not found`);
        }
    }

    /**
     * Play message notification sound
     */
    playMessageSound() {
        this.playSound('message');
    }

    /**
     * Play general notification sound
     */
    playNotificationSound() {
        this.playSound('notification');
    }

    /**
     * Play error sound
     */
    playErrorSound() {
        this.playSound('error');
    }

    /**
     * Play success sound
     */
    playSuccessSound() {
        this.playSound('success');
    }

    /**
     * Play user join sound
     */
    playJoinSound() {
        this.playSound('join');
    }

    /**
     * Play user leave sound
     */
    playLeaveSound() {
        this.playSound('leave');
    }

    /**
     * Enable/disable sounds
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('notificationSoundsEnabled', enabled.toString());
    }

    /**
     * Set volume (0.0 to 1.0)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('notificationVolume', this.volume.toString());
    }

    /**
     * Initialize from localStorage
     */
    initialize() {
        const soundsEnabled = localStorage.getItem('notificationSoundsEnabled');
        if (soundsEnabled !== null) {
            this.isEnabled = soundsEnabled === 'true';
        }

        const volume = localStorage.getItem('notificationVolume');
        if (volume !== null) {
            this.volume = parseFloat(volume);
        }
    }

    /**
     * Check if sounds are enabled
     */
    isSoundEnabled() {
        return this.isEnabled;
    }

    /**
     * Get current volume
     */
    getVolume() {
        return this.volume;
    }
}

// Create singleton instance
const soundManager = new SoundManager();
soundManager.initialize();

export default soundManager;
