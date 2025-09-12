import React, { useState, useRef, useCallback, useMemo } from "react";
import { Send, Paperclip, Smile, X } from "lucide-react";

const MessageInput = React.memo(({
    group,
    messageText,
    setMessageText,
    editingMessage,
    localEditingMessage,
    onSetEditingMessage,
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
    removeSelectedFile,
    handleInputChange,
    handleSubmit,
    handleKeyDown,
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const messageInputRef = useRef(null);

    const EMOJIS = useMemo(
        () => [
            "😀", "😂", "😊", "😍", "🥰", "😘", "😎", "🤔", "😮", "😢",
            "😭", "😡", "🤯", "😱", "🥺", "😴", "👍", "👎", "❤️", "🔥",
            "💯", "🎉", "👏", "🙏", "💪", "🤝", "🎯", "🚀", "⭐", "💡",
            "🎊", "🎈"
        ],
        []
    );

    const isEditing = editingMessage || localEditingMessage;
    const canSend = (messageText.trim() || selectedFile) && !uploadingFile;
    const placeholder = selectedFile
        ? "Add a message (optional)..."
        : `Message ${group.name}...`;

    const handleEmojiSelect = useCallback(
        (emoji) => {
            setMessageText((prev) => prev + emoji);
            setShowEmojiPicker(false);
        },
        [setMessageText]
    );

    const handleCancelEdit = useCallback(() => {
        onSetEditingMessage?.(null);
        setMessageText("");
    }, [onSetEditingMessage, setMessageText]);

    const handleTextChange = useCallback(
        (e) => {
            const value = e.target.value;
            setMessageText(value);
            handleInputChange(value);
        },
        [setMessageText, handleInputChange]
    );

    const toggleEmojiPicker = useCallback(
        () => setShowEmojiPicker((prev) => !prev),
        []
    );

    const triggerFileSelect = useCallback(
        () => fileInputRef.current?.click(),
        [fileInputRef]
    );

    const getInputContainerClasses = useCallback(() => {
        const base =
            "relative bg-[#343a40] rounded-2xl shadow-sm border transition-all duration-200";
        const focus = isFocused
            ? "border-[#34a0a4] shadow-lg ring-2 ring-[#34a0a4]/20"
            : "border-[#495057]";
        const send = canSend ? "border-[#34a0a4]" : "";

        return `${base} ${focus} ${send}`;
    }, [isFocused, canSend]);

    const getSendButtonClasses = useCallback(() => {
        const base =
            "w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl transition-all duration-200";
        const state = canSend
            ? "bg-[#34a0a4] text-white shadow-md hover:bg-[#34a0a4]/90 hover:scale-105 active:scale-95"
            : "bg-[#005f73] text-[#f8f9fa] cursor-not-allowed";
        return `${base} ${state}`;
    }, [canSend]);

    /** File preview */
    const renderFilePreview = () =>
        selectedFile && (
            <div className="px-2 sm:px-4 mb-2 sm:mb-3 p-2 bg-[#343a40]/80 border border-[#495057] rounded-xl">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 bg-[#34a0a4]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            {getFileIcon(selectedFile.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#f8f9fa] truncate">
                                {selectedFile.name}
                            </p>
                            <p className="text-xs text-[#f8f9fa]/70">
                                {formatFileSize(selectedFile.size)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={removeSelectedFile}
                        className="p-1.5 text-[#f8f9fa] hover:text-[#34a0a4] hover:bg-[#34a0a4]/20 rounded-lg transition-all"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {uploadingFile && (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-[#f8f9fa]/70 mb-1">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-[#495057] rounded-full h-2">
                            <div
                                className="bg-[#34a0a4] h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        );

    /** Emoji picker */
    const renderEmojiPicker = () =>
        showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 p-2 sm:p-3 bg-[#343a40] border border-[#495057] rounded-2xl z-50 max-w-[90vw] sm:max-w-xs shadow-lg">
                <div className="max-h-[100px] sm:max-h-[150px] overflow-y-auto grid grid-cols-7 sm:grid-cols-8 gap-1 text-lg">
                    {EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() => handleEmojiSelect(emoji)}
                            className="p-1 sm:p-2 rounded-lg hover:bg-[#34a0a4]/20 transition-colors"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        );

    return (
        <div className="relative">
            {/* File preview */}
            {renderFilePreview()}

            {/* Input */}
            <div
                className="px-2 sm:px-4 md:px-8 mb-2 sm:mb-3"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <form onSubmit={handleSubmit} className="relative">
                    {/* Input field container */}
                    <div className={getInputContainerClasses()}>
                        {/* Left icons */}
                        <div className="flex items-center p-1">
                            <div className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                                <button
                                    type="button"
                                    onClick={triggerFileSelect}
                                    className="p-1 sm:p-1.5 text-[#f8f9fa] hover:text-[#34a0a4] hover:bg-[#34a0a4]/20 rounded-lg transition"
                                >
                                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleEmojiPicker}
                                    className="p-1 sm:p-1.5 text-[#f8f9fa] hover:text-[#34a0a4] hover:bg-[#34a0a4]/20 rounded-lg transition"
                                >
                                    <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            </div>

                            {/* Textarea */}
                            <textarea
                                ref={messageInputRef}
                                value={messageText}
                                onChange={handleTextChange}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={placeholder}
                                rows={1}
                                className="ml-4 w-full pl-12 sm:pl-16 pr-10 py-2 sm:py-3 rounded-2xl focus:outline-none resize-none bg-transparent text-[#f8f9fa] placeholder-[#f8f9fa]/70 text-sm sm:text-base"
                                style={{ minHeight: "44px", maxHeight: "120px", lineHeight: "1.5" }}
                            />
                        </div>

                        {/* Send */}
                        <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2">
                            <button
                                type="submit"
                                disabled={!canSend}
                                className={getSendButtonClasses()}
                            >
                                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        </div>
                    </div>

                    {renderEmojiPicker()}
                </form>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                onChange={(e) =>
                    e.target.files?.[0] && handleFileSelect(e.target.files[0])
                }
                className="hidden"
                accept="*/*"
            />
        </div>
    );
});

MessageInput.displayName = "MessageInput";
export default MessageInput;
