const mongoose = require('mongoose');

/**
 * Production-Ready MongoDB Atlas Connection Module
 * Amazon Senior SDE Best Practices Implementation
 */

// Global connection event listeners for runtime health monitoring
mongoose.connection.on('connected', () => {
  console.log('ℹ️  [MongoDB] Connection pool established.');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 [MongoDB] Connection re-established after network interruption.');
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  [MongoDB] Connection lost. Driver attempting automatic reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('💥 [MongoDB] Driver runtime error:', err.message);
});

/**
 * Establishes connection to MongoDB Atlas / Local Instance.
 * 
 * @returns {Promise<typeof mongoose>} Mongoose instance
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    console.error('Probable Cause: Missing .env file or MONGODB_URI key is undefined.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      autoIndex: process.env.NODE_ENV !== 'production', // Disable expensive index creation in production
      maxPoolSize: 10, // Upper limit of socket connections in pool
      minPoolSize: 2,  // Maintain pre-warmed sockets ready for instant traffic bursts
      serverSelectionTimeoutMS: 5000, // Fail fast after 5s if cluster is unreachable
      socketTimeoutMS: 45000, // Close inactive sockets after 45s
      family: 4, // Enforce IPv4 lookups
    });

    const dbName = conn.connection.name;
    const host = conn.connection.host;

    console.log('✅ MongoDB Connected Successfully');
    console.log(`Database Name: ${dbName}`);
    console.log(`Host: ${host}`);

    return conn;
  } catch (error) {
    console.error('❌ Failed to Connect to MongoDB');
    console.error(`Error Details: ${error.message}`);

    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('Probable Cause: Incorrect database username or password in MONGODB_URI.');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('querySrv ESERVFAIL')) {
      console.error('Probable Cause: DNS resolution failed or cluster domain name in MONGODB_URI is incorrect.');
    } else if (error.message.includes('MongooseServerSelectionError') || error.message.includes('connect ETIMEDOUT')) {
      console.error('Probable Cause: IP Whitelist blocking access in MongoDB Atlas network security options.');
    } else {
      console.error('Probable Cause: Database server is offline or unreachable over the network.');
    }

    console.error('Shutting down server process due to critical database initialization failure.');
    process.exit(1);
  }
};

/**
 * Gracefully closes database connection pool on process termination.
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close(false);
    console.log('✅ [MongoDB] Connection pool closed cleanly.');
  } catch (err) {
    console.error('💥 [MongoDB] Error closing connection pool:', err.message);
  }
};

/**
 * Utility helper to inspect database readyState status.
 * readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 */
const getDbState = () => {
  return mongoose.connection.readyState;
};

module.exports = {
  connectDB,
  closeDB,
  getDbState,
};
