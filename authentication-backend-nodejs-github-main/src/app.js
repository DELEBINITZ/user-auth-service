import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
    })
);

app.use(express.json({limit: '16kb'}));
app.use(express.urlencoded({extended: true, limit: '16kb'}));
app.use(express.static('public'));
app.use(cookieParser());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {secure: process.env.NODE_ENV === 'production'},
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Routes import
import userRoutes from './routes/user.routes.js';

// Routes
app.use('/api/v1/users', userRoutes);

export {app};
