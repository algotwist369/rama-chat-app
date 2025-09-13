const express = require('express');
const { uploadToLocal, getFileUrl } = require('../services/fileStorageService');
const auth = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const { messageLimiter } = require('../middleware/rateLimiter');
const { FileUploadError } = require('../utils/errors');
const { logger } = require('../utils/logger');

const router = express.Router();

router.post('/upload', 
    auth, 
    messageLimiter, 
    asyncHandler(async (req, res) => {
        uploadToLocal.single('file')(req, res, async (err) => {
            try {
                // Handle multer errors
                if (err) {
                    logger.error(err, { userId: req.user._id, action: 'file_upload' });
                    
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        throw new FileUploadError('File too large. Maximum size is 10MB.', {
                            maxSize: err.limit,
                            receivedSize: err.received
                        });
                    }
                    
                    if (err.message === 'Invalid file type. Allowed types: images (jpeg, jpg, png, gif), documents (pdf, doc, docx, txt), videos (mp4, avi, mkv)') {
                        throw new FileUploadError(err.message, {
                            receivedType: err.field
                        });
                    }
                    
                    throw new FileUploadError(err.message || 'File upload failed', err);
                }

                if (!req.file) {
                    throw new FileUploadError('No file uploaded');
                }

                const fileUrl = getFileUrl(req.file.filename);

                logger.business('File uploaded', {
                    userId: req.user._id,
                    fileName: req.file.originalname,
                    fileSize: req.file.size,
                    fileType: req.file.mimetype
                });

                res.json({
                    message: 'File uploaded successfully',
                    file: {
                        url: fileUrl,
                        key: req.file.filename,
                        size: req.file.size,
                        mimetype: req.file.mimetype,
                        originalname: req.file.originalname
                    }
                });
            } catch (error) {
                logger.error(error, { userId: req.user._id, action: 'file_upload' });
                throw error;
            }
        });
    })
);

module.exports = router;
