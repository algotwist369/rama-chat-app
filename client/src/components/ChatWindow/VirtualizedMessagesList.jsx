import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import MessageItem from '../MessageItem';
import MessageSkeleton from '../MessageSkeleton';

const VirtualizedMessagesList = React.memo(({
    messages,
    user,
    onReactToMessage,
    onReplyToMessage,
    onDeleteMessageSocket,
    onEditMessageSocket,
    multiSelectMode,
    onToggleMessageSelection,
    selectedMessages,
    onForward,
    loading,
    loadingMore,
    hasMoreMessages,
    onLoadMore,
    messagesContainerRef,
    handleScroll
}) => {
    const listRef = useRef(null);

    // Group messages by date for better organization
    const groupedMessages = useMemo(() => {
        const groups = [];
        let currentDate = null;
        let currentGroup = [];

        messages.forEach((message, index) => {
            const messageDate = new Date(message.createdAt).toDateString();
            
            if (currentDate !== messageDate) {
                if (currentGroup.length > 0) {
                    groups.push({
                        type: 'date',
                        date: currentDate,
                        key: `date-${currentDate}`
                    });
                    groups.push(...currentGroup);
                }
                currentDate = messageDate;
                currentGroup = [];
            }
            
            currentGroup.push({
                type: 'message',
                message,
                index,
                key: message._id
            });
        });

        // Add the last group
        if (currentGroup.length > 0) {
            groups.push({
                type: 'date',
                date: currentDate,
                key: `date-${currentDate}`
            });
            groups.push(...currentGroup);
        }

        return groups;
    }, [messages]);

    // Memoized item renderer
    const ItemRenderer = useCallback(({ index, style }) => {
        const item = groupedMessages[index];
        
        if (item.type === 'date') {
            return (
                <div style={style} className="flex justify-center py-2">
                    <div className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">
                        {new Date(item.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                </div>
            );
        }

        const { message } = item;
        const isSelected = selectedMessages.includes(message._id);

        return (
            <div style={style} className="px-2 sm:px-4 md:px-6 lg:px-8">
                <MessageItem
                    message={message}
                    user={user}
                    isOwnMessage={message.senderId._id === user._id || message.senderId._id === user.id}
                    onSelect={multiSelectMode ? () => onToggleMessageSelection(message._id) : null}
                    isSelected={isSelected}
                    onReactToMessage={onReactToMessage}
                    onReplyToMessage={onReplyToMessage}
                    onDeleteMessageSocket={onDeleteMessageSocket}
                    onEditMessageSocket={onEditMessageSocket}
                    onForward={onForward}
                />
            </div>
        );
    }, [groupedMessages, user, multiSelectMode, onToggleMessageSelection, selectedMessages, onReactToMessage, onReplyToMessage, onDeleteMessageSocket, onEditMessageSocket, onForward]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (listRef.current && messages.length > 0) {
            const isNearBottom = listRef.current.state.scrollOffset > 
                (listRef.current.props.itemCount * 50) - 200; // 50px per item estimate
            
            if (isNearBottom) {
                listRef.current.scrollToItem(groupedMessages.length - 1, 'end');
            }
        }
    }, [messages.length, groupedMessages.length]);

    // Handle scroll events
    const handleListScroll = useCallback(({ scrollOffset, scrollDirection }) => {
        // Load more messages when scrolling to top
        if (scrollOffset < 100 && hasMoreMessages && !loadingMore) {
            onLoadMore();
        }
        
        // Call the original scroll handler if provided
        if (handleScroll) {
            handleScroll({ scrollTop: scrollOffset });
        }
    }, [hasMoreMessages, loadingMore, onLoadMore, handleScroll]);

    if (loading && messages.length === 0) {
        return <MessageSkeleton count={5} />;
    }

    return (
        <div className="h-full relative">
            {/* Loading More Messages Spinner */}
            {loadingMore && (
                <div className="absolute top-0 left-0 right-0 z-10 flex justify-center py-4 text-slate-500 dark:text-slate-400 text-sm sm:text-base">
                    <div className="flex items-center space-x-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-slate-300 dark:border-slate-600 border-t-blue-500"></div>
                        <span className="font-medium">Loading more messages...</span>
                    </div>
                </div>
            )}

            {/* Load More Button */}
            {hasMoreMessages && !loadingMore && messages.length > 0 && (
                <div className="absolute top-0 left-0 right-0 z-10 flex justify-center py-4">
                    <button
                        onClick={onLoadMore}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                    >
                        Load More Messages
                    </button>
                </div>
            )}

            {/* Virtualized List */}
            <List
                ref={listRef}
                height={window.innerHeight - 200} // Adjust based on your layout
                itemCount={groupedMessages.length}
                itemSize={80} // Estimated item height
                onScroll={handleListScroll}
                className="scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {ItemRenderer}
            </List>
        </div>
    );
});

VirtualizedMessagesList.displayName = 'VirtualizedMessagesList';

export default VirtualizedMessagesList;
