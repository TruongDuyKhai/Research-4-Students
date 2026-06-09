const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { db, initDb } = require('./config/db');
const { initSchema } = require('./models/schema');

// Run schema and database setup on startup
initSchema();
initDb();

// Start Discord bot for image storage
const { startBot } = require('./bot/discordBot');
startBot();


const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const applicationRoutes = require('./routes/applications');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const postRoutes = require('./routes/posts');
const documentRoutes = require('./routes/documents');
const qaRoutes = require('./routes/qa');
const reviewsRoutes = require('./routes/reviews');
const chatRoutes = require('./routes/chat');

const app = express();

// Middleware
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow other origins for local testing, or change to error in prod
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  try {
    const users = db.prepare("SELECT COUNT(*) as count FROM users WHERE role != 'admin'").get().count;
    const documents = db.prepare("SELECT COUNT(*) as count FROM documents").get().count;
    const questions = db.prepare("SELECT COUNT(*) as count FROM qa_questions").get().count;
    const reviews = db.prepare("SELECT COUNT(*) as count FROM reviews").get().count;
    res.json({ users, documents, questions, reviews });
  } catch (err) {
    console.error('Error fetching platform stats:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
