/**
 * File Download Utility
 */
export const downloadFile = async (fileUrl, fileName) => {
    try {
        // Create a temporary anchor element
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'download';
        link.target = '_blank';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
    } catch (error) {
        console.error('Error downloading file:', error);
        return false;
    }
};

/**
 * Download file with progress tracking
 */
export const downloadFileWithProgress = async (fileUrl, fileName, onProgress) => {
    try {
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentLength = response.headers.get('Content-Length');
        const total = parseInt(contentLength, 10);
        let loaded = 0;
        
        const reader = response.body.getReader();
        const chunks = [];
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            loaded += value.length;
            
            if (onProgress && total > 0) {
                const progress = (loaded / total) * 100;
                onProgress(progress);
            }
        }
        
        // Create blob from chunks
        const blob = new Blob(chunks);
        const url = window.URL.createObjectURL(blob);
        
        // Download the file
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        window.URL.revokeObjectURL(url);
        
        return true;
    } catch (error) {
        console.error('Error downloading file with progress:', error);
        return false;
    }
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
};

/**
 * Check if file is an image
 */
export const isImageFile = (filename) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const extension = getFileExtension(filename);
    return imageExtensions.includes(extension);
};

/**
 * Check if file is a video
 */
export const isVideoFile = (filename) => {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const extension = getFileExtension(filename);
    return videoExtensions.includes(extension);
};

/**
 * Check if file is an audio file
 */
export const isAudioFile = (filename) => {
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];
    const extension = getFileExtension(filename);
    return audioExtensions.includes(extension);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file icon based on file type
 */
export const getFileIcon = (filename) => {
    const extension = getFileExtension(filename);
    
    if (isImageFile(filename)) {
        return { type: 'image', color: 'text-green-500' };
    } else if (isVideoFile(filename)) {
        return { type: 'video', color: 'text-purple-500' };
    } else if (isAudioFile(filename)) {
        return { type: 'audio', color: 'text-pink-500' };
    } else if (extension === 'pdf') {
        return { type: 'pdf', color: 'text-red-500' };
    } else if (['doc', 'docx'].includes(extension)) {
        return { type: 'document', color: 'text-blue-500' };
    } else if (['xls', 'xlsx'].includes(extension)) {
        return { type: 'spreadsheet', color: 'text-green-600' };
    } else if (['zip', 'rar', '7z'].includes(extension)) {
        return { type: 'archive', color: 'text-yellow-500' };
    } else {
        return { type: 'file', color: 'text-gray-500' };
    }
};
