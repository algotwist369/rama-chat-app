import React, { useState, useRef, useCallback, useMemo } from "react";
import { Send, Paperclip, Smile, X, Image, File, Mic, StopCircle } from "lucide-react";

const EnhancedMessageInput = React.memo(({
    group,
    messageText,
    setMessageText,
    editingMessage,
    localEditingMessage,
    replyingMessage,
    onSetEditingMessage,
    onSetReplyingMessage,
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
    const [isRecording, setIsRecording] = useState(false);
    const messageInputRef = useRef(null);

    const EMOJIS = useMemo(
        () => [
            "😀", "😂", "😊", "😍", "🥰", "😘", "😎", "🤔", "😮", "😢",
            "😭", "😡", "🤯", "😱", "🥺", "😴", "👍", "👎", "❤️", "🔥",
            "💯", "🎉", "👏", "🙏", "💪", "🤝", "🎯", "🚀", "⭐", "💡",
            "🎊", "🎈", "😇", "🤗", "🤩", "😋", "🤤", "😏", "😒", "🙄",
            "🤑", "🤠", "🤡", "🤢", "🤮", "🤧", "🤒", "🤓", "🤔", "🤕",
            "🤖", "🤗", "🤘", "🤙", "🤚", "🤛", "🤜", "🤝", "🤞", "🤟",
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
            messageInputRef.current?.focus();
        },
        [setMessageText]
    );

    const handleCancelEdit = useCallback(() => {
        onSetEditingMessage?.(null);
        setMessageText("");
    }, [onSetEditingMessage, setMessageText]);

    const handleVoiceRecord = useCallback(() => {
        // Voice recording functionality would go here
        setIsRecording(!isRecording);
    }, [isRecording]);

    return (
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm w-full p-4 border-t border-slate-200/60 dark:border-slate-700/60">
            {/* Editing Indicator */}
            {isEditing && (
                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                                Editing message
                            </span>
                        </div>
                        <button
                            onClick={handleCancelEdit}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-all duration-200 hover:scale-110 p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Reply Indicator */}
            {replyingMessage && (
                <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-green-900 dark:text-green-300">
                                Replying to {replyingMessage.senderId?.username || 
                                           replyingMessage.senderId?.profile?.firstName || 
                                           replyingMessage.senderId?.email?.split('@')[0] || 
                                           'Unknown'}
                            </span>
                        </div>
                        <button
                            onClick={() => onSetReplyingMessage?.(null)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-all duration-200 hover:scale-110 p-1 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-2 text-xs text-green-700 dark:text-green-400 truncate">
                        {replyingMessage.messageType === 'file' || replyingMessage.messageType === 'image'
                            ? `📎 ${replyingMessage.file?.originalname || 'File'}`
                            : replyingMessage.content || 'Message'
                        }
                    </div>
                </div>
            )}

            {/* File Preview */}
            {selectedFile && (
                <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                                {getFileIcon(selectedFile.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={removeSelectedFile}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Progress */}
            {uploadingFile && (
                <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                <File className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                                Uploading file...
                            </p>
                            <div className="mt-1 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                                <div
                                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Input Area */}
            <div
                className={`relative border-2 rounded-2xl transition-all duration-300 bg-white dark:bg-slate-800 ${isFocused
                        ? "border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20 ring-2 ring-blue-200 dark:ring-blue-800"
                        : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md"
                    } ${dragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="flex items-end space-x-2 p-2 sm:p-3">
                    {/* File Upload Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 group hover:shadow-md"
                        title="Attach file"
                    >
                        <Paperclip className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </button>

                    {/* Text Input */}
                    <div className="flex-1 relative">
                        <textarea
                            ref={messageInputRef}
                            value={messageText}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={placeholder}
                            className="w-full resize-none border-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-0 text-sm sm:text-base leading-6 max-h-32 min-h-[24px]"
                            rows={1}
                            style={{
                                height: "auto",
                                minHeight: "24px",
                                maxHeight: "128px",
                            }}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1">
                        {/* Voice Recording Button */}
                        <button
                            onClick={handleVoiceRecord}
                            className={`p-2 rounded-lg transition-all duration-200 group ${isRecording
                                    ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                }`}
                            title={isRecording ? "Stop recording" : "Voice message"}
                        >
                            {isRecording ? (
                                <StopCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            ) : (
                                <Mic className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            )}
                        </button>

                        {/* Emoji Picker Button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 group hover:shadow-md"
                                title="Add emoji"
                            >
                                <Smile className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            </button>

                            {/* Emoji Picker */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-full right-0 mb-2 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 backdrop-blur-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                                    <div className="grid grid-cols-8 gap-2 max-w-64">
                                        {EMOJIS.map((emoji, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleEmojiSelect(emoji)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 text-lg hover:scale-125"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Send Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!canSend}
                            className={`p-2.5 rounded-xl transition-all duration-200 ${canSend
                                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 ring-2 ring-blue-200 dark:ring-blue-800"
                                    : "bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                }`}
                            title="Send message"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Drag and Drop Overlay */}
                {dragActive && (
                    <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-2xl flex items-center justify-center">
                        <div className="text-center">
                            <Image className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                Drop file here to upload
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                multiple={false}
            />
        </div>
    );
});

EnhancedMessageInput.displayName = "EnhancedMessageInput";

export default EnhancedMessageInput;
