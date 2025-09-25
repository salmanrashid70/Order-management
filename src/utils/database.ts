import mongoose from 'mongoose';
import { logger } from './logger';

/**
 * Database connection manager
 */
export class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Connect to MongoDB database
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';

    try {
      await mongoose.connect(mongoUri, {
        // Remove deprecated options for newer MongoDB driver
      });

      this.isConnected = true;
      logger.info('Successfully connected to MongoDB database');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB database');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }
}