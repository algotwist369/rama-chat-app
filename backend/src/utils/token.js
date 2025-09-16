const jwt = require('jsonwebtoken');
require('dotenv').config();

const signAccess = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required. Please set it in your .env file');
    }
    return jwt.sign(
        { sub: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

const verify = (token) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required. Please set it in your .env file');
    }
    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { signAccess, verify };
