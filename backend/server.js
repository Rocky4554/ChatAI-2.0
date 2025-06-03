// Import required modules
import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from './app.js';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';
import { fixJsonWithCodeContent } from './utils/fixjsonfunction.js';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        transports: ['websocket', 'polling']
    },
    allowEIO3: true,
    path: '/socket.io/'
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || 
                     socket.handshake.headers.authorization?.split(' ')[1] ||
                     socket.handshake.query.token;

        const projectId = socket.handshake.query.projectId;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }

        const project = await projectModel.findById(projectId);
        if (!project) {
            return next(new Error('Project not found'));
        }

        if (!token) {
            return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return next(new Error('Authentication error'));
        }

        socket.user = decoded;
        socket.project = project;
        next();
    } catch (error) {
        console.error('Socket.IO Auth Error:', error);
        next(error);
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    socket.roomId = socket.project._id.toString();
    console.log(`User connected to project ${socket.roomId}`);

    socket.join(socket.roomId);

    socket.on('project-message', async (data) => {
        try {
            const message = data.message;
            const aiIsPresentInMessage = message.includes('@ai');
            socket.broadcast.to(socket.roomId).emit('project-message', data);

            if (aiIsPresentInMessage) {
                const prompt = message.replace('@ai', '');
                const result = await generateResult(prompt);
                console.log('AI response:', result);

                io.to(socket.roomId).emit('project-message', {
                    message: result,
                    sender: {
                        _id: 'ai',
                        email: 'AI'
                    }
                });
            }
        } catch (error) {
            console.error('Error in project-message:', error);
            socket.emit('error', { message: 'Error processing message' });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        socket.leave(socket.roomId);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Start server
const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});