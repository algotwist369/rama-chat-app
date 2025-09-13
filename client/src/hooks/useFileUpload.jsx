import { useState, useRef } from 'react';
import { File, Image as ImageIcon, FileText, Music, Video, Archive } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import toast from 'react-hot-toast';

export const useFileUpload = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const getFileIcon = (fileType) => {
        if (fileType?.startsWith('image/')) {
            return <ImageIcon className="h-4 w-4 text-green-500" />;
        } else if (fileType?.startsWith('video/')) {
            return <Video className="h-4 w-4 text-purple-500" />;
        } else if (fileType?.startsWith('audio/')) {
            return <Music className="h-4 w-4 text-pink-500" />;
        } else if (fileType?.includes('pdf') || fileType?.includes('document')) {
            return <FileText className="h-4 w-4 text-red-500" />;
        } else if (fileType?.includes('zip') || fileType?.includes('rar')) {
            return <Archive className="h-4 w-4 text-yellow-500" />;
        } else {
            return <File className="h-4 w-4 text-gray-500" />;
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (file) => {
        // Validate file size (50MB limit for large groups)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            toast.error('File size must be less than 50MB');
            return;
        }

        // Validate file type
        const allowedTypes = [
            'image/', 'video/', 'audio/', 'application/pdf',
            'text/', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip', 'application/x-rar-compressed'
        ];
        
        const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
        if (!isAllowed) {
            toast.error('File type not supported');
            return;
        }

        setSelectedFile(file);
    };

    const uploadFile = async (groupId, onSendMessage) => {
        if (!selectedFile) return;

        setUploadingFile(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await axiosInstance.post('/files/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(percentCompleted);
                },
            });

            const uploadedFile = response.data.file;
            
            const messageData = {
                content: `📎 ${uploadedFile.originalname}`, // Use 'content' field instead of 'text'
                file: uploadedFile,
                groupId: groupId,
                messageType: uploadedFile.type?.startsWith('image/') ? 'image' : 'file' // Set correct message type based on file type
            };

            onSendMessage(messageData, (response) => {
                if (response.ok) {
                    setSelectedFile(null);
                    toast.success('File sent successfully');
                }
            });
        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to upload file';
            toast.error(errorMessage);
        } finally {
            setUploadingFile(false);
            setUploadProgress(0);
        }
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
    };

    return {
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
    };
};
