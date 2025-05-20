require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./src/routes/auth/authRoutes.js');
const eventRoutes = require('./src/routes/events/eventRoutes.js');
const profileRoutes = require('./src/routes/profile/profileRoutes.js');

const app = express();

// Middleware
app.use(
  cors({
      origin: [process.env.FRONTEND_URL, 'http://localhost:5173', "http://localhost:5174", "https://parthpanchal26.github.io"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/profile', profileRoutes);

// Database connection
mongoose.connect(process.env.MONGODB_URI, {dbName: 'campuspulse'})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});