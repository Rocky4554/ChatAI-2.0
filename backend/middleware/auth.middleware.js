import jwt from "jsonwebtoken";
import redisClient from "../services/redis.service.js";

export const authUser = async (req, res, next) => {
    try {
        // Get token from various possible sources
        const token = req.cookies.token || 
                     (req.headers.authorization && req.headers.authorization.split(' ')[1]) ||
                     req.headers['x-access-token'];

        if (!token) {
            return res.status(401).json({ error: 'No token provided. Authorization required.' });
        }

        const isBlackListed = await redisClient.get(token);

        if (isBlackListed) {
            res.cookie('token', '');
            return res.status(401).json({ error: 'Token has been invalidated. Please login again.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token. Please login again.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        }
        res.status(401).json({ error: 'Authentication failed. Please login again.' });
    }
}