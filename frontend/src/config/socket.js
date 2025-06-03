import { io } from 'socket.io-client';

let socketInstance = null;

export const initializeSocket = (projectId) => {
    if (socketInstance) {
        socketInstance.disconnect();
    }

    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No authentication token found');
    }

    socketInstance = io(import.meta.env.VITE_API_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        auth: {
            token: token
        },
        query: {
            projectId,
            token // Also send token in query for redundancy
        },
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000
    });

    socketInstance.on('connect', () => {
        console.log('Socket connected');
    });

    socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
    });

    return socketInstance;
};

export const receiveMessage = (eventName, cb) => {
    if (!socketInstance) {
        console.error('Socket not initialized');
        return;
    }
    socketInstance.on(eventName, cb);
};

export const sendMessage = (eventName, data) => {
    if (!socketInstance) {
        console.error('Socket not initialized');
        return;
    }
    socketInstance.emit(eventName, data);
};

export const disconnectSocket = () => {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
};