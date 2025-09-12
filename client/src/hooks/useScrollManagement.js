import { useState, useRef, useEffect, useCallback } from 'react';

export const useScrollManagement = (messages, currentUser, hasMoreMessages, loadingMore, onLoadMore) => {
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [newMessagesCount, setNewMessagesCount] = useState(0);
    const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const lastMessageIdRef = useRef(null);
    const isInitialLoadRef = useRef(true);
    const lastScrollPosition = useRef(0);

    // Helper function to check if user is at bottom
    const isUserAtBottom = useCallback(() => {
        if (!messagesContainerRef.current) return false;

        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const threshold = 100;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        return distanceFromBottom <= threshold;
    }, []);

    // Simple auto-scroll logic: only on first load and when current user sends message
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const isLastMessageFromCurrentUser = lastMessage?.senderId?._id === currentUser.id ||
                lastMessage?.senderId === currentUser.id;

            // Auto-scroll on initial load only
            if (isInitialLoadRef.current) {
                setTimeout(() => {
                    scrollToBottom();
                    isInitialLoadRef.current = false;
                    setUserHasScrolledUp(false);
                }, 100);
                return;
            }

            // Check for new messages
            const isNewMessage = lastMessageIdRef.current !== lastMessage._id;

            if (isNewMessage) {
                console.log('New message detected:', {
                    isNewMessage,
                    userHasScrolledUp,
                    isLastMessageFromCurrentUser
                });

                // Only auto-scroll if it's the current user's message (they're actively chatting)
                if (isLastMessageFromCurrentUser) {
                    console.log('Auto-scrolling because current user sent message', { userHasScrolledUp });
                    setTimeout(() => {
                        scrollToBottom();
                        setNewMessagesCount(0);
                        setUserHasScrolledUp(false); // Reset since user sent message
                    }, 50);
                } else {
                    // For other users' messages, just increment counter if user has scrolled up
                    if (userHasScrolledUp) {
                        console.log('Incrementing new messages count because user has scrolled up');
                        setNewMessagesCount(prev => prev + 1);
                    } else {
                        console.log('NOT auto-scrolling for other user message because userHasScrolledUp is false');
                    }
                }

                // Update the last message ID
                lastMessageIdRef.current = lastMessage._id;
            }
        }
    }, [messages, currentUser.id, userHasScrolledUp]);

    // Check if user is at bottom of messages
    const checkIfAtBottom = useCallback(() => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const threshold = 100;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            const atBottom = distanceFromBottom <= threshold;

            // Only update state if the value actually changed
            setIsAtBottom(prev => {
                if (prev !== atBottom) {
                    return atBottom;
                }
                return prev;
            });

            // Show scroll button when not at bottom and there are messages
            setShowScrollButton(!atBottom && messages.length > 0);

            // Reset new messages count when user reaches bottom
            if (atBottom) {
                setNewMessagesCount(0);
            }
        }
    }, [messages.length]);

    // Scroll to bottom function
    const scrollToBottom = () => {
        console.log('scrollToBottom called', { userHasScrolledUp });
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Simple scroll handler: detect when user manually scrolls up
    const handleScroll = useCallback(async () => {
        if (!messagesContainerRef.current) return;

        const container = messagesContainerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;

        // Detect scroll direction
        const isScrollingUp = scrollTop < lastScrollPosition.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // If user scrolls up significantly from bottom, disable auto-scroll
        if (isScrollingUp && distanceFromBottom > 150) {
            console.log('User scrolled up - disabling auto-scroll', {
                distanceFromBottom,
                scrollTop,
                lastScrollPosition: lastScrollPosition.current
            });
            setUserHasScrolledUp(true);
        }

        // Always check if at bottom
        checkIfAtBottom();

        // Load more messages when scrolling to top
        if (hasMoreMessages && !loadingMore) {
            if (scrollTop < 100) {
                const prevScrollHeight = container.scrollHeight;
                const prevScrollTop = container.scrollTop;

                try {
                    const maybePromise = onLoadMore?.();
                    if (maybePromise && typeof maybePromise.then === 'function') {
                        await maybePromise;
                    }
                } finally {
                    // Restore viewport position after loading more messages
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            if (messagesContainerRef.current) {
                                const newScrollHeight = messagesContainerRef.current.scrollHeight;
                                const heightDelta = newScrollHeight - prevScrollHeight;
                                messagesContainerRef.current.scrollTop = prevScrollTop + heightDelta;
                            }
                        });
                    });
                }
            }
        }

        // Update last scroll position
        lastScrollPosition.current = scrollTop;
    }, [checkIfAtBottom, hasMoreMessages, loadingMore, onLoadMore]);

    // Reset scroll when group changes or component mounts
    const resetScroll = useCallback(() => {
        console.log('resetScroll called', { messagesLength: messages.length, userHasScrolledUp });
        if (messages.length > 0) {
            setIsAtBottom(true);
            setUserHasScrolledUp(false);
            setNewMessagesCount(0);
            isInitialLoadRef.current = true;
            setTimeout(scrollToBottom, 100);
        }
    }, [messages.length]);

    // Force reset scroll (for group changes) - always resets regardless of user scroll state
    const forceResetScroll = useCallback(() => {
        console.log('forceResetScroll called - forcing scroll reset for group change');
        if (messages.length > 0) {
            setIsAtBottom(true);
            setUserHasScrolledUp(false);
            setNewMessagesCount(0);
            isInitialLoadRef.current = true;
            // Immediate scroll to bottom without animation
            setTimeout(() => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ 
                        behavior: 'auto',
                        block: 'end'
                    });
                }
            }, 50);
        }
    }, [messages.length]);

    // Handle manual scroll to bottom button click
    const handleScrollToBottom = () => {
        scrollToBottom();
        setNewMessagesCount(0);
        setIsAtBottom(true);
        setUserHasScrolledUp(false); // Re-enable auto-scroll when user clicks scroll button
    };

    return {
        showScrollButton,
        isAtBottom,
        newMessagesCount,
        messagesEndRef,
        messagesContainerRef,
        handleScroll,
        resetScroll,
        forceResetScroll,
        handleScrollToBottom
    };
};