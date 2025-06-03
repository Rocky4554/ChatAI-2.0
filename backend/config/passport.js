import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import userModel from '../models/user.model.js';
import jwt from 'jsonwebtoken';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/users/auth/google/callback`,
    proxy: true
},
async function(accessToken, refreshToken, profile, done) {
    try {
        if (!profile.emails || !profile.emails[0]) {
            return done(new Error('No email provided by Google'), null);
        }

        // Check if user already exists
        let user = await userModel.findOne({ email: profile.emails[0].value });
        
        if (!user) {
            // Create new user if doesn't exist
            user = await userModel.create({
                email: profile.emails[0].value,
                name: profile.displayName,
                googleId: profile.id,
                password: Math.random().toString(36).slice(-8) // Random password for Google users
            });
        } else if (!user.googleId) {
            // Update existing user with Google ID if not already set
            user.googleId = profile.id;
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return done(null, { user, token });
    } catch (error) {
        console.error('Google Strategy Error:', error);
        return done(error, null);
    }
}));

export default passport; 