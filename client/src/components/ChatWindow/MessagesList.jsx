import React, { useMemo, useCallback, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import MessageItem from "../MessageItem";
import MessageSkeleton from "../MessageSkeleton";
import { groupMessagesByDate } from "../../utils/formatDate";

const MessagesList = React.memo(({
    messages,
    currentUser,
    loading,
    loadingMore,
    hasMoreMessages,
    onLoadMore,
    selectedMessages,
    onToggleMessageSelection,
    onDeleteMessage,
    onSetEditingMessage,
    onForwardMessage,
    availableGroups,
    filteredTypingUsers,
    showScrollButton,
    newMessagesCount,
    onScrollToBottom,
    messagesContainerRef,
    messagesEndRef,
    handleScroll,
    onReactToMessage,
    onReplyToMessage,
    onDeleteMessageSocket,
    onEditMessageSocket,
    multiSelectMode,
}) => {
    const scrollTimeoutRef = useRef(null);
    const isScrollingRef = useRef(false);

    // Optimized scroll handler with debouncing
    const optimizedHandleScroll = useCallback((e) => {
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        isScrollingRef.current = true;
        handleScroll?.(e);

        scrollTimeoutRef.current = setTimeout(() => {
            isScrollingRef.current = false;
        }, 150);
    }, [handleScroll]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    /** Group messages by date */
    const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

    /** Sort dates so "Today" & "Yesterday" appear at the end */
    const sortedDates = useMemo(() => {
        const datePriority = ["Today", "Yesterday"];
        return Object.keys(groupedMessages).sort((a, b) => {
            const aIndex = datePriority.indexOf(a);
            const bIndex = datePriority.indexOf(b);

            if (aIndex !== -1 && bIndex !== -1) return bIndex - aIndex;
            if (aIndex !== -1) return 1;
            if (bIndex !== -1) return -1;

            return new Date(a) - new Date(b); // Older dates first
        });
    }, [groupedMessages]);

    // Memoized message renderer for better performance
    const renderMessage = useCallback((message) => (
        <MessageItem
            key={message._id}
            message={message}
            currentUser={currentUser}
            isSelected={selectedMessages.has(message._id)}
            onSelect={multiSelectMode ? () => onToggleMessageSelection(message._id) : null}
            onEdit={onSetEditingMessage}
            onDelete={onDeleteMessage}
            onForward={onForwardMessage}
            availableGroups={availableGroups}
            onReactToMessage={onReactToMessage}
            onReplyToMessage={onReplyToMessage}
            onDeleteMessageSocket={onDeleteMessageSocket}
            onEditMessageSocket={onEditMessageSocket}
        />
    ), [
        currentUser,
        selectedMessages,
        multiSelectMode,
        onToggleMessageSelection,
        onSetEditingMessage,
        onDeleteMessage,
        onForwardMessage,
        availableGroups,
        onReactToMessage,
        onReplyToMessage,
        onDeleteMessageSocket,
        onEditMessageSocket
    ]);

    return (
        <div
            ref={messagesContainerRef}
            onScroll={optimizedHandleScroll}
            className="h-full overflow-y-auto px-1 sm:px-2 md:px-4 lg:px-6 xl:px-8 py-1 sm:py-2 md:py-3 lg:py-4 space-y-2 sm:space-y-3 relative scrollbar-hide"
            style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                scrollBehavior: "smooth",
                WebkitOverflowScrolling: "touch"
            }}
        >
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { 
                    display: none; 
                }
                .scrollbar-hide {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
            `}</style>

            {/* Loading More Messages Spinner */}
            {loadingMore && (
                <div className="flex justify-center py-3 sm:py-4 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center space-x-2 sm:space-x-3 bg-white dark:bg-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-slate-300 dark:border-slate-600 border-t-blue-500"></div>
                        <span className="text-xs sm:text-sm font-medium">Loading more messages...</span>
                    </div>
                </div>
            )}

            {/* Load More Button */}
            {hasMoreMessages && !loadingMore && messages.length > 0 && (
                <div className="flex justify-center py-3 sm:py-4">
                    <button
                        onClick={onLoadMore}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-xs sm:text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 touch-manipulation"
                    >
                        Load More Messages
                    </button>
                </div>
            )}

            {/* Initial Loading (Skeleton) */}
            {loading && messages.length === 0 && <MessageSkeleton count={5} />}

            {/* Messages Grouped by Date */}
            {sortedDates.map((dateLabel) => (
                <div key={dateLabel} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    {/* Date Separator */}
                    <div className="flex justify-center my-2 sm:my-3 md:my-4 lg:my-6">
                        <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-gradient-to-r from-[#343a40] to-[#495057] border border-[#495057] rounded-full text-[10px] sm:text-xs md:text-sm font-medium text-white shadow-sm backdrop-blur-sm">
                            {dateLabel}
                        </span>
                    </div>

                    {/* Messages for this date */}
                    <div className="space-y-1 sm:space-y-2">
                        {groupedMessages[dateLabel]
                            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                            .map((message) => renderMessage(message))}
                    </div>
                </div>
            ))}

            {/* Typing Indicator */}
            {filteredTypingUsers.length > 0 && (
                <div className="mb-3 sm:mb-4 flex items-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center space-x-2 sm:space-x-3 bg-white dark:bg-slate-800 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 max-w-fit shadow-lg border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                        {/* Animated dots */}
                        <div className="flex space-x-1">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-bounce"
                                    style={{ animationDelay: `${i * 0.15}s` }}
                                />
                            ))}
                        </div>
                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                            {filteredTypingUsers.length === 1
                                ? `${filteredTypingUsers[0][1]} is typing...`
                                : `${filteredTypingUsers.length} people typing...`}
                        </span>
                    </div>
                </div>
            )}


            {/* Scroll to Bottom Button */}
            {showScrollButton && (
                <div className="fixed bottom-16 sm:bottom-20 md:bottom-24 right-2 sm:right-4 md:right-6 z-50">
                    <button
                        onClick={onScrollToBottom}
                        className="relative p-2.5 sm:p-3 md:p-3.5 bg-gradient-to-r from-[#005f73] to-[#34a0a4] text-white rounded-full shadow-2xl border border-white/20 hover:scale-110 active:scale-95 transition-all duration-200 touch-manipulation backdrop-blur-sm"
                        title={
                            newMessagesCount > 0
                                ? `${newMessagesCount} new message${newMessagesCount > 1 ? "s" : ""}`
                                : "Scroll to bottom"
                        }
                        aria-label={
                            newMessagesCount > 0
                                ? `Scroll to bottom - ${newMessagesCount} new messages`
                                : "Scroll to bottom"
                        }
                    >
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                        {newMessagesCount > 0 && (
                            <span className="absolute -top-1 sm:-top-1.5 md:-top-2 -right-1 sm:-right-1.5 md:-right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] sm:text-xs md:text-sm rounded-full h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 flex items-center justify-center font-bold animate-pulse shadow-lg">
                                {newMessagesCount > 99 ? "99+" : newMessagesCount}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {/* Invisible element to scroll into view */}
            <div ref={messagesEndRef} />
        </div>
    );
});

MessagesList.displayName = "MessagesList";
export default MessagesList;


