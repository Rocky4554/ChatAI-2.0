import React, { Suspense, lazy } from 'react'
import { Route, BrowserRouter, Routes } from 'react-router-dom'
import UserAuth from '../auth/UserAuth'

// Lazy load all components
const Login = lazy(() => import('../screens/Login'))
const Register = lazy(() => import('../screens/Register'))
const Home = lazy(() => import('../screens/Home'))
const Project = lazy(() => import('../screens/Project'))
const LandingPage = lazy(() => import('../screens/landingpage.jsx'))
const AuthCallback = lazy(() => import('../screens/AuthCallback'))

// Loading component
const Loading = () => (
    <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
    }}>
        Loading...
    </div>
)

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<Loading />}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/home" element={<UserAuth><Home /></UserAuth>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/project" element={<UserAuth><Project /></UserAuth>} />
                    <Route path="/auth-callback" element={<AuthCallback />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}

export default AppRoutes;