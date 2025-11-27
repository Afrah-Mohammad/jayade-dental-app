const appointmentRoutes = require('./routes/appointmentRoutes');

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Middleware
app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
  })
);

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/jayade_dental';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err.message));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/appointments', appointmentRoutes);


// Optional: serve frontend if you put it inside backend/public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Jayade Dental Backend is running.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
