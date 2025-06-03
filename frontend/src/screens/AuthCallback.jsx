import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../context/user.context';

const AuthCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useContext(UserContext);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            const params = new URLSearchParams(location.search);
            const token = params.get('token');
            const userParam = params.get('user');
            const errorParam = params.get('error');

            if (errorParam) {
                setError(decodeURIComponent(errorParam));
                setTimeout(() => navigate('/login'), 3000);
                return;
            }

            if (!token || !userParam) {
                setError('Authentication failed: Missing token or user data');
                setTimeout(() => navigate('/login'), 3000);
                return;
            }

            try {
                const user = JSON.parse(decodeURIComponent(userParam));
                localStorage.setItem('token', token);
                setUser(user);
                navigate('/home');
            } catch (parseError) {
                console.error('Error parsing user data:', parseError);
                setError('Error processing user data');
                setTimeout(() => navigate('/login'), 3000);
            }
        } catch (error) {
            console.error('Auth callback error:', error);
            setError('An unexpected error occurred');
            setTimeout(() => navigate('/login'), 3000);
        }
    }, [location, navigate, setUser]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-white text-center">
                    <h2 className="text-2xl mb-4 text-red-500">Error</h2>
                    <p className="mb-4">{error}</p>
                    <p>Redirecting to login page...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="text-white text-center">
                <h2 className="text-2xl mb-4">Processing your login...</h2>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            </div>
        </div>
    );
};

export default AuthCallback; 