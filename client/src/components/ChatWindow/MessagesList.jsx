import React, { useMemo } from "react";
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
    filteredTypingUsers,
    showScrollButton,
    newMessagesCount,
    onScrollToBottom,
    messagesContainerRef,
    messagesEndRef,
    handleScroll,
}) => {
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

    return (
        <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-8 lg:px-12 py-2 sm:py-3 md:py-4 space-y-3 relative min-h-0 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>

            {/* Loading More Messages Spinner */}
            {loadingMore && (
                <div className="flex justify-center py-3 text-gray-500 text-sm sm:text-base">
                    <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-blue-600"></div>
                        <span>Loading more messages...</span>
                    </div>
                </div>
            )}

            {/* Load More Button */}
            {hasMoreMessages && !loadingMore && messages.length > 0 && (
                <div className="flex justify-center py-3">
                    <button
                        onClick={onLoadMore}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-200 text-blue-700 rounded-lg text-xs sm:text-sm md:text-base font-medium hover:bg-blue-300 transition touch-manipulation"
                    >
                        Load More Messages
                    </button>
                </div>
            )}

            {/* Initial Loading (Skeleton) */}
            {loading && messages.length === 0 && <MessageSkeleton count={5} />}

            {/* Messages Grouped by Date */}
            {sortedDates.map((dateLabel) => (
                <div key={dateLabel}>
                    {/* Date Separator */}
                    <div className="flex justify-center my-3 sm:my-4 md:my-6">
                        <span className="px-3 sm:px-4 py-1 sm:py-1.5 md:py-2 bg-[#343a40] border border-[#495057] rounded-full text-[10px] sm:text-xs md:text-sm font-medium text-white">
                            {dateLabel}
                        </span>
                    </div>

                    {/* Messages for this date */}
                    {groupedMessages[dateLabel]
                        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                        .map((message) => (
                            <MessageItem
                                key={message._id}
                                message={message}
                                currentUser={currentUser}
                                isSelected={selectedMessages.has(message._id)}
                                onSelect={() => onToggleMessageSelection(message._id)}
                                onEdit={onSetEditingMessage}
                                onDelete={onDeleteMessage}
                            />
                        ))}
                </div>
            ))}

            {/* Typing Indicator */}
            {filteredTypingUsers.length > 0 && (
                <div className="mb-4 flex items-center">
                    <div className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 rounded-2xl px-3 py-2 max-w-fit shadow-sm">
                        {/* Animated dots */}
                        <div className="flex space-x-1">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-[#005f73] rounded-full animate-bounce"
                                    style={{ animationDelay: `${i * 0.15}s` }}
                                />
                            ))}
                        </div>
                        {/* Optional: show who is typing */}
                        {/* <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                            {filteredTypingUsers.length === 1
                                ? `${filteredTypingUsers[0][1]} is typing...`
                                : `${filteredTypingUsers.length} people typing...`}
                        </span> */}
                    </div>
                </div>
            )}


            {/* Scroll to Bottom Button */}
            {showScrollButton && (
                <div className="fixed bottom-14 sm:bottom-16 md:bottom-20 right-3 sm:right-5 md:right-6 z-50">
                    <button
                        onClick={onScrollToBottom}
                        className="relative p-2 sm:p-2.5 md:p-3 bg-[#005f73] text-white rounded-full shadow-xl border border-[#adb5bd] hover:scale-110 transition duration-200 touch-manipulation"
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
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                        {newMessagesCount > 0 && (
                            <span className="absolute -top-1.5 sm:-top-2 -right-1.5 sm:-right-2 bg-[#34a0a4] text-white text-[10px] sm:text-xs md:text-sm rounded-full h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 flex items-center justify-center font-medium animate-pulse">
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


