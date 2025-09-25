import 'dotenv/config';
import { App } from './app';
import { Database } from './utils/database';
import { logger } from './utils/logger';
import { env } from './config/env';

/**
 * Server startup and shutdown management
 */
class Server {
  private app: App;
  private database: Database;
  private port: number;

  constructor() {
    this.app = new App();
    this.database = Database.getInstance();
    this.port = parseInt(process.env.PORT || env.PORT);
  }

  /**
   * Start the server and initialize dependencies
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting e-commerce order management server...');

      // Initialize database connection
      await this.database.connect();
      logger.info('Database connection established');

      // Start Express server
      const expressApp = this.app.getApp();
      const server = expressApp.listen(this.port, () => {
        logger.info(`Server running on port ${this.port}`);
        logger.info(`Health check available at http://localhost:${this.port}/health`);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown(server);

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(server: any): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      server.close(async (err: any) => {
        if (err) {
          logger.error('Error during server close:', err);
          process.exit(1);
        }

        try {
          await this.database.disconnect();
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during database disconnect:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle termination signal (Ctrl+C)
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    // Handle termination signal (system shutdown/container stop)
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }
}

// Start the server
const server = new Server();

server.start().catch(error => {
  logger.error('Fatal error during server startup:', error);
  process.exit(1);
});