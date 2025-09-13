const Joi = require('joi');

// Validation middleware
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Show all validation errors
            stripUnknown: true, // Remove unknown fields
            allowUnknown: false // Don't allow unknown fields
        });

        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            console.log('Validation error:', {
                schema: schema.describe().keys,
                body: req.body,
                errors: errorDetails
            });

            return res.status(400).json({
                error: 'Validation failed',
                details: errorDetails
            });
        }

        // Replace req.body with validated and sanitized data
        req.body = value;
        next();
    };
};

// Validation schemas
const authSchemas = {
    register: Joi.object({
        username: Joi.string()
            .min(3)
            .max(30)
            .pattern(/^[a-zA-Z0-9_]+$/)
            .required()
            .messages({
                'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
                'string.min': 'Username must be at least 3 characters long',
                'string.max': 'Username cannot exceed 30 characters'
            }),
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please provide a valid email address'
            }),
        password: Joi.string()
            .min(8)
            .max(128)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .required()
            .messages({
                'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
                'string.min': 'Password must be at least 8 characters long',
                'string.max': 'Password cannot exceed 128 characters'
            }),
        role: Joi.string()
            .valid('admin', 'manager', 'user')
            .default('user')
    }),

    login: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please provide a valid email address'
            }),
        password: Joi.string()
            .required()
            .messages({
                'any.required': 'Password is required'
            })
    }),

    loginWithPin: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please provide a valid email address'
            }),
        pin: Joi.string()
            .length(4)
            .pattern(/^\d{4}$/)
            .required()
            .messages({
                'string.length': 'PIN must be exactly 4 digits',
                'string.pattern.base': 'PIN must contain only numbers'
            })
    }),

    createUser: Joi.object({
        username: Joi.string()
            .min(3)
            .max(30)
            .pattern(/^[a-zA-Z0-9_]+$/)
            .required()
            .messages({
                'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
                'string.min': 'Username must be at least 3 characters long',
                'string.max': 'Username cannot exceed 30 characters'
            }),
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please provide a valid email address'
            }),
        password: Joi.string()
            .min(8)
            .max(128)
            .required()
            .messages({
                'string.min': 'Password must be at least 8 characters long',
                'string.max': 'Password cannot exceed 128 characters'
            }),
        pin: Joi.string()
            .length(4)
            .pattern(/^\d{4}$/)
            .optional()
            .messages({
                'string.length': 'PIN must be exactly 4 digits',
                'string.pattern.base': 'PIN must contain only numbers'
            }),
        role: Joi.string()
            .valid('user', 'manager')
            .default('user')
            .messages({
                'any.only': 'Only users and managers can be created by admin'
            }),
        isActive: Joi.boolean()
            .default(true)
            .optional(),
        profile: Joi.object({
            firstName: Joi.string()
                .max(50)
                .optional()
                .messages({
                    'string.max': 'First name cannot exceed 50 characters'
                }),
            lastName: Joi.string()
                .max(50)
                .optional()
                .messages({
                    'string.max': 'Last name cannot exceed 50 characters'
                }),
            bio: Joi.string()
                .max(200)
                .optional()
                .messages({
                    'string.max': 'Bio cannot exceed 200 characters'
                })
        }).optional()
    }),

    updateUser: Joi.object({
        username: Joi.string()
            .min(3)
            .max(30)
            .pattern(/^[a-zA-Z0-9_]+$/)
            .optional()
            .messages({
                'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
                'string.min': 'Username must be at least 3 characters long',
                'string.max': 'Username cannot exceed 30 characters'
            }),
        email: Joi.string()
            .email()
            .optional()
            .messages({
                'string.email': 'Please provide a valid email address'
            }),
        role: Joi.string()
            .valid('user', 'manager')
            .optional()
            .messages({
                'any.only': 'Only users and managers are allowed'
            }),
        isActive: Joi.boolean()
            .optional(),
        profile: Joi.object({
            firstName: Joi.string()
                .max(50)
                .optional()
                .messages({
                    'string.max': 'First name cannot exceed 50 characters'
                }),
            lastName: Joi.string()
                .max(50)
                .optional()
                .messages({
                    'string.max': 'Last name cannot exceed 50 characters'
                }),
            bio: Joi.string()
                .max(200)
                .optional()
                .messages({
                    'string.max': 'Bio cannot exceed 200 characters'
                })
        }).optional()
    }),

    refreshToken: Joi.object({
        refreshToken: Joi.string()
            .required()
            .messages({
                'any.required': 'Refresh token is required'
            })
    })
};

// Group validation schemas
const groupSchemas = {
    createGroup: Joi.object({
        name: Joi.string()
            .min(3)
            .max(50)
            .required()
            .messages({
                'string.min': 'Group name must be at least 3 characters long',
                'string.max': 'Group name cannot exceed 50 characters'
            }),
        region: Joi.string()
            .min(2)
            .max(50)
            .required()
            .messages({
                'string.min': 'Region must be at least 2 characters long',
                'string.max': 'Region cannot exceed 50 characters'
            }),
        description: Joi.string()
            .max(200)
            .optional()
            .messages({
                'string.max': 'Description cannot exceed 200 characters'
            })
    }),

    updateGroup: Joi.object({
        name: Joi.string()
            .min(3)
            .max(50)
            .optional()
            .messages({
                'string.min': 'Group name must be at least 3 characters long',
                'string.max': 'Group name cannot exceed 50 characters'
            }),
        region: Joi.string()
            .min(2)
            .max(50)
            .optional()
            .messages({
                'string.min': 'Region must be at least 2 characters long',
                'string.max': 'Region cannot exceed 50 characters'
            }),
        description: Joi.string()
            .max(200)
            .optional()
            .messages({
                'string.max': 'Description cannot exceed 200 characters'
            })
    }),

    joinGroup: Joi.object({
        groupId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid group ID format'
            })
    }),

    addUserToGroup: Joi.object({
        groupId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid group ID format'
            }),
        userId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid user ID format'
            })
    }),

    removeUserFromGroup: Joi.object({
        groupId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid group ID format'
            }),
        userId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid user ID format'
            })
    }),

    addManager: Joi.object({
        groupId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid group ID format'
            }),
        userId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid user ID format'
            })
    }),

    removeManager: Joi.object({
        groupId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid group ID format'
            }),
        userId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid user ID format'
            })
    })
};

// Message validation schemas
const messageSchemas = {
    sendMessage: Joi.object({
        content: Joi.string()
            .min(1)
            .max(1000)
            .required()
            .messages({
                'string.min': 'Message cannot be empty',
                'string.max': 'Message cannot exceed 1000 characters'
            }),
        groupId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid group ID format'
            }),
        messageType: Joi.string()
            .valid('text', 'image', 'file')
            .default('text'),
        replyTo: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .optional()
            .allow(null)
            .messages({
                'string.pattern.base': 'Invalid reply message ID format'
            })
    }),

    updateMessage: Joi.object({
        content: Joi.string()
            .min(1)
            .max(1000)
            .required()
            .messages({
                'string.min': 'Message cannot be empty',
                'string.max': 'Message cannot exceed 1000 characters'
            })
    }),

    getMessages: Joi.object({
        groupId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid group ID format'
            }),
        page: Joi.number()
            .integer()
            .min(1)
            .default(1),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
    }),

    forwardMessage: Joi.object({
        groupIds: Joi.array()
            .items(
                Joi.string()
                    .pattern(/^[0-9a-fA-F]{24}$/)
                    .messages({
                        'string.pattern.base': 'Invalid group ID format'
                    })
            )
            .min(1)
            .max(10)
            .required()
            .messages({
                'array.min': 'At least one group ID is required',
                'array.max': 'Cannot forward to more than 10 groups at once'
            })
    }),

    markAsDelivered: Joi.object({
        messageIds: Joi.array()
            .items(
                Joi.string()
                    .pattern(/^[0-9a-fA-F]{24}$/)
                    .messages({
                        'string.pattern.base': 'Invalid message ID format'
                    })
            )
            .min(1)
            .max(100)
            .required()
            .messages({
                'array.min': 'At least one message ID is required',
                'array.max': 'Cannot mark more than 100 messages at once'
            })
    }),

    markAsSeen: Joi.object({
        messageIds: Joi.array()
            .items(
                Joi.string()
                    .pattern(/^[0-9a-fA-F]{24}$/)
                    .messages({
                        'string.pattern.base': 'Invalid message ID format'
                    })
            )
            .min(1)
            .max(100)
            .required()
            .messages({
                'array.min': 'At least one message ID is required',
                'array.max': 'Cannot mark more than 100 messages at once'
            })
    })
};

// Query parameter validation
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(400).json({
                error: 'Query validation failed',
                details: errorDetails
            });
        }

        req.query = value;
        next();
    };
};

module.exports = {
    validate,
    validateQuery,
    authSchemas,
    groupSchemas,
    messageSchemas
};
