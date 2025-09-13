import { useState, useRef, useEffect } from 'react';

export const useTypingIndicator = (group, socketService) => {
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    const startTyping = () => {
        if (!isTyping && group?._id && socketService) {
            setIsTyping(true);
            console.log('Starting typing for group:', group._id);
            socketService.startTyping(group._id);
        }
        
        // Clear existing timeout and set new one
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            if (group?._id && socketService) {
                console.log('Stopping typing (timeout) for group:', group._id);
                socketService.stopTyping(group._id);
            }
        }, 2000);
    };

    const stopTyping = () => {
        if (isTyping && group?._id && socketService) {
            setIsTyping(false);
            console.log('Stopping typing (manual) for group:', group._id);
            socketService.stopTyping(group._id);
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleInputChange = (value) => {
        // Handle both string values and event objects
        let textValue = '';
        
        if (typeof value === 'string') {
            textValue = value;
        } else if (value && typeof value === 'object') {
            // Handle event objects
            if (value.target && value.target.value !== undefined) {
                textValue = value.target.value;
            } else if (value.value !== undefined) {
                textValue = value.value;
            }
        } else if (value !== null && value !== undefined) {
            // Convert other types to string
            textValue = String(value);
        }
        
        // Now safely check if the text has content
        if (textValue && textValue.trim()) {
            startTyping();
        } else {
            stopTyping();
        }
    };

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (isTyping && group?._id) {
                socketService.stopTyping(group._id);
            }
        };
    }, [isTyping, group?._id, socketService]);

    return {
        isTyping,
        handleInputChange,
        stopTyping
    };
};
