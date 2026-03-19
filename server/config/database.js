import mongoose from 'mongoose';
import environment from './environment.js';
import logger from './logger.js';

const connectDB = async () => {
  try {
    const mongooseOptions = {
      maxPoolSize: 50, // ✅ INCREASED from 10 to support 50+ concurrent connections
      minPoolSize: 10, // ✅ INCREASED from 5 - keep 10 always warm
      maxIdleTimeMS: 45000, // Close idle connections
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
      journal: true,
    };

    await mongoose.connect(environment.MONGO_URI, mongooseOptions);

    logger.info('MongoDB connected successfully', {
      uri: environment.MONGO_URI.replace(/:[^:]*@/, ':****@'), // Hide password
    });

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', { error: error.message });
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed:', { error: error.message });
    process.exit(1);
  }
};

export default connectDB;
