import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {githubRouter} from './routes/github';
import {lessonPlansRouter} from './routes/lessonPlans';
import {contributorsRouter} from './routes/contributors';
// Import from the JavaScript version of the auth router
const {authRouter} = require('./routes/auth');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/github', githubRouter);
app.use('/api/lesson-plans', lessonPlansRouter);
app.use('/api/contributors', contributorsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({status: 'ok', message: 'Server is running'});
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
