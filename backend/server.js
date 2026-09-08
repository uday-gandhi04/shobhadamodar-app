// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import syncRoutes from './src/routes/sync.routes.js';
import shiftRoutes from './src/routes/shift.routes.js';
import userRoutes from './src/routes/user.routes.js';
import customerRoutes from './src/routes/customer.routes.js';
import udhariRoutes from './src/routes/udhari.routes.js';
import fuelRateRoutes from './src/routes/fuelRate.routes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// Security & Utility Middlewares
app.use(helmet()); // Sets secure HTTP headers
app.use(cors()); // Enables Cross-Origin Resource Sharing
app.use(express.json()); // Parses incoming JSON payloads

app.use('/api/auth', authRoutes);

app.use('/api/sync', syncRoutes);

app.use('/api/shifts', shiftRoutes);

app.use('/api/users', userRoutes);

app.use('/api/customers',customerRoutes,);

app.use('/api/udhari',udhariRoutes,);

app.use('/api/fuel-rates', fuelRateRoutes);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Shobhadamodar Petroleum API is running normally.' 
  });
});

// Fallback for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});