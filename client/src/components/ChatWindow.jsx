import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import toast from 'react-hot-toast';
import ForwardMessageModal from './ForwardMessageModal';

// Custom hooks
import {
    useSocketListeners,
    useTypingIndicator,
    useFileUpload,
    useScrollManagement,
    useMessageSelection
} from '../hooks';

// Sub-components
import ChatHeader from './ChatWindow/EnhancedChatHeader';
import MessageSelectionBar from './ChatWindow/MessageSelectionBar';
import MessagesList from './ChatWindow/MessagesList';
import MessageInput from './ChatWindow/EnhancedMessageInput';

const ChatWindow = ({
    group,
    messages,
    currentUser,
    editingMessage,
    replyingMessage,
    onSendMessage,
    onEditMessage,
    onDeleteMessage,
    onDeleteMultipleMessages,
    onSetEditingMessage,
    onSetReplyingMessage,
    onLoadMore,
    loading,
    loadingMore,
    hasMoreMessages,
    socketService,
    availableGroups = [],
    onReactToMessage,
    onReplyToMessage,
    onDeleteMessageSocket,
    onEditMessageSocket,
    messagePrivacy = null
}) => {
    // Refs for performance optimization
    const chatContainerRef = useRef(null);
    const resizeObserverRef = useRef(null);
    
    // State
    const [messageText, setMessageText] = useState('');
    const [localEditingMessage, setLocalEditingMessage] = useState(null);
    const [forwardingMessage, setForwardingMessage] = useState(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    // Custom hooks
    const {
        onlineMembers,
        onlineCount,
        isRefreshingStatus,
        localTypingUsers,
        refreshMembers
    } = useSocketListeners(group, socketService);

    const { isTyping, handleInputChange: handleTypingChange, stopTyping } = useTypingIndicator(group, socketService);

    // Handle input change for both message text and typing indicator
    const handleInputChange = useCallback((e) => {
        const value = e.target.value;
        setMessageText(value);
        handleTypingChange(value);
    }, [handleTypingChange]);

    const {
        selectedFile,
        uploadingFile,
        uploadProgress,
        dragActive,
        fileInputRef,
        getFileIcon,
        formatFileSize,
        handleDrag,
        handleDrop,
        handleFileSelect,
        uploadFile,
        removeSelectedFile
    } = useFileUpload();

    const {
        showScrollButton,
        newMessagesCount,
        messagesEndRef,
        messagesContainerRef,
        handleScroll,
        resetScroll,
        forceResetScroll,
        handleScrollToBottom
    } = useScrollManagement(messages, currentUser, hasMoreMessages, loadingMore, onLoadMore);

    const {
        selectedMessages,
        toggleMessageSelection,
        clearSelection,
        getSelectedCount,
        getSelectedMessageIds
    } = useMessageSelection();

    // Filter typing users to exclude current user
    const filteredTypingUsers = useMemo(() => {
        return Array.from(localTypingUsers.entries()).filter(([userId, username]) =>
            userId !== currentUser.id && userId !== currentUser._id &&
            userId.toString() !== currentUser.id?.toString() &&
            userId.toString() !== currentUser._id?.toString()
        );
    }, [localTypingUsers, currentUser.id, currentUser._id]);

    // Performance optimization: Throttle resize handler
    const handleResize = useCallback(
        (() => {
            let timeoutId;
            return () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    // Handle responsive layout changes
                    if (window.innerWidth < 768) {
                        // Mobile optimizations
                        setIsVisible(true);
                    } else {
                        // Desktop optimizations
                        setIsVisible(true);
                    }
                }, 100);
            };
        })(),
        []
    );

    // Setup resize observer for better performance
    useEffect(() => {
        if (typeof ResizeObserver !== 'undefined' && chatContainerRef.current) {
            resizeObserverRef.current = new ResizeObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        // Optimize layout based on container size
                        if (entry.contentRect.width < 768) {
                            // Mobile optimizations
                        } else if (entry.contentRect.width < 1024) {
                            // Tablet optimizations
                        } else {
                            // Desktop optimizations
                        }
                    });
                }
            );
            resizeObserverRef.current.observe(chatContainerRef.current);
        }

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
        };
    }, [handleResize]);

    // Set message text when editing
    useEffect(() => {
        if (editingMessage) {
            setMessageText(editingMessage.content); // Use 'content' field instead of 'text'
        }
    }, [editingMessage]);

    // Reset scroll when group changes (only when actually switching groups)
    useEffect(() => {
        if (messages.length > 0) {
            console.log('ChatWindow: Group changed, resetting scroll', { groupId: group._id });
            // Immediate scroll reset for group changes
            forceResetScroll();
        }
    }, [group._id, forceResetScroll]);

    // Optimized message submission handler
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        // If there's a selected file, upload it first
        if (selectedFile && !uploadingFile) {
            await uploadFile(group._id, onSendMessage);
            return;
        }

        // Enhanced validation - ensure we have either text content or a file
        const hasTextContent = messageText && messageText.trim().length > 0;
        const hasFile = selectedFile && selectedFile.name;
        
        if (!hasTextContent && !hasFile) {
            console.warn('Cannot send empty message');
            return;
        }

        if (editingMessage || localEditingMessage) {
            // Handle edit
            const messageToEdit = editingMessage || localEditingMessage;
            
            // Validate edit content
            if (!messageText || messageText.trim().length === 0) {
                toast.error('Message cannot be empty');
                return;
            }
            
            if (messageText.trim().length > 1000) {
                toast.error('Message cannot exceed 1000 characters');
                return;
            }
            
            try {
                await onEditMessage(messageToEdit._id, messageText.trim());
                setLocalEditingMessage(null);
                onSetEditingMessage?.(null);
                setMessageText('');
                if (isTyping) {
                    stopTyping();
                }
                toast.success('Message updated');
            } catch (error) {
                console.error('Edit message error:', error);
                console.error('Error response:', error.response?.data);
                const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to update message';
                toast.error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
            }
        } else {
            // Handle new message
            const messageData = {
                content: hasTextContent ? messageText.trim() : '', // Use 'content' field instead of 'text'
                groupId: group._id,
                messageType: 'text', // Explicitly set message type
                replyTo: replyingMessage?._id || null // Include replyTo if replying
            };

            // Final validation before sending
            if (!messageData.content && !hasFile) {
                console.warn('Cannot send message without content');
                return;
            }

            // Pre-clear the message text for better UX
            const originalText = messageText;
            setMessageText('');
            if (isTyping) {
                stopTyping();
            }

            onSendMessage(messageData, (response) => {
                console.log('Message send response:', response);
                if (response && response.ok) {
                    // Message sent successfully - clear reply state
                    if (replyingMessage) {
                        onSetReplyingMessage?.(null);
                    }
                    // Message sent successfully - scroll management will handle auto-scroll
                    // No need to force scroll here as the hook will handle it
                } else if (response && response.error) {
                    // Restore message text if sending failed
                    setMessageText(originalText);
                    toast.error('Failed to send message: ' + response.error);
                } else {
                    // Restore message text if sending failed
                    setMessageText(originalText);
                    toast.error('Failed to send message');
                }
            });
        }
    }, [selectedFile, uploadingFile, uploadFile, group._id, onSendMessage, messageText, editingMessage, localEditingMessage, onEditMessage, onSetEditingMessage, isTyping, stopTyping, replyingMessage, onSetReplyingMessage]);

    // Handle key down events
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    }, [handleSubmit]);


    // Handle delete selected messages
    const handleDeleteSelected = useCallback(() => {
        const messageIds = getSelectedMessageIds();
        onDeleteMultipleMessages(messageIds);
        clearSelection();
    }, [getSelectedMessageIds, onDeleteMultipleMessages, clearSelection]);

    // Handle forward message
    const handleForwardMessage = useCallback((message) => {
        setForwardingMessage(message);
        setShowForwardModal(true);
    }, []);


    // Handle multi-select toggle
    const handleToggleMultiSelect = useCallback(() => {
        setMultiSelectMode(!multiSelectMode);
        if (multiSelectMode) {
            clearSelection();
        }
    }, [multiSelectMode, clearSelection]);


    const handleForwardSuccess = useCallback(() => {
        setForwardingMessage(null);
        setShowForwardModal(false);
    }, []);

    const handleCloseForwardModal = useCallback(() => {
        setForwardingMessage(null);
        setShowForwardModal(false);
    }, []);

    // Debug logging for typing users
    if (localTypingUsers.size > 0) {
        console.log('ChatWindow - localTypingUsers:', Array.from(localTypingUsers.entries()));
        console.log('ChatWindow - filteredTypingUsers:', filteredTypingUsers);
    }

    return (
        <div 
            ref={chatContainerRef}
            className="h-full flex flex-col bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 overflow-hidden min-h-0 transition-all duration-300"
        >
            {/* Header - Fixed height */}
            <div className="flex-shrink-0 animate-in slide-in-from-top-2 duration-300">
                <ChatHeader
                    group={group}
                    onlineCount={onlineCount}
                    onlineMembers={onlineMembers}
                    isRefreshingStatus={isRefreshingStatus}
                    filteredTypingUsers={filteredTypingUsers}
                    onRefreshMembers={refreshMembers}
                    currentUser={currentUser}
                    multiSelectMode={multiSelectMode}
                    onToggleMultiSelect={handleToggleMultiSelect}
                    messagePrivacy={messagePrivacy}
                />
            </div>

            {/* Message Selection Bar - Fixed height */}
            {getSelectedCount() > 0 && (
                <div className="flex-shrink-0">
                    <MessageSelectionBar
                        selectedCount={getSelectedCount()}
                        onDeleteSelected={handleDeleteSelected}
                        onClearSelection={clearSelection}
                    />
                </div>
            )}

            {/* Messages Area - Flexible height */}
            <div className="flex-1 min-h-0 relative">
                <MessagesList
                    messages={messages}
                    currentUser={currentUser}
                    loading={loading}
                    loadingMore={loadingMore}
                    hasMoreMessages={hasMoreMessages}
                    onLoadMore={onLoadMore}
                    selectedMessages={selectedMessages}
                    onToggleMessageSelection={toggleMessageSelection}
                    onDeleteMessage={onDeleteMessage}
                    onSetEditingMessage={onSetEditingMessage}
                    onForwardMessage={handleForwardMessage}
                    availableGroups={availableGroups}
                    filteredTypingUsers={filteredTypingUsers}
                    showScrollButton={showScrollButton}
                    newMessagesCount={newMessagesCount}
                    onScrollToBottom={handleScrollToBottom}
                    messagesContainerRef={messagesContainerRef}
                    messagesEndRef={messagesEndRef}
                    handleScroll={handleScroll}
                    onReactToMessage={onReactToMessage}
                    onReplyToMessage={onReplyToMessage}
                    onDeleteMessageSocket={onDeleteMessageSocket}
                    onEditMessageSocket={onEditMessageSocket}
                    multiSelectMode={multiSelectMode}
                />
            </div>

            {/* Input Area - Fixed height */}
            <div className="flex-shrink-0 chat-input-container bg-white dark:bg-slate-800">
                <MessageInput
                    group={group}
                    messageText={messageText}
                    setMessageText={setMessageText}
                    editingMessage={editingMessage}
                    localEditingMessage={localEditingMessage}
                    replyingMessage={replyingMessage}
                    onSetEditingMessage={onSetEditingMessage}
                    onSetReplyingMessage={onSetReplyingMessage}
                    selectedFile={selectedFile}
                    uploadingFile={uploadingFile}
                    uploadProgress={uploadProgress}
                    dragActive={dragActive}
                    fileInputRef={fileInputRef}
                    getFileIcon={getFileIcon}
                    formatFileSize={formatFileSize}
                    handleDrag={handleDrag}
                    handleDrop={handleDrop}
                    handleFileSelect={handleFileSelect}
                    removeSelectedFile={removeSelectedFile}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    handleKeyDown={handleKeyDown}
                />
            </div>

            {/* Forward Message Modal */}
            <ForwardMessageModal
                isOpen={showForwardModal}
                onClose={handleCloseForwardModal}
                message={forwardingMessage}
                availableGroups={availableGroups.filter(g => g._id !== group._id)}
                onSuccess={handleForwardSuccess}
            />
        </div>
    );
};

// Memoize the ChatWindow component to prevent unnecessary re-renders
export default memo(ChatWindow);