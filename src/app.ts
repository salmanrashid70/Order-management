import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { OrderRoutes } from './routes/order.routes';
import { requestLogger } from './middleware/request.logger';
import { errorHandler } from './middleware/errorHandler';

/**
 * Express application setup with middleware and routes
 */
export class App {
  private app: express.Application;
  private orderRoutes: OrderRoutes;

  constructor() {
    this.app = express();
    this.orderRoutes = new OrderRoutes();
    this.initializeMiddleware();
    this.initializeRoutes();
    // this.initializeEventHandlers();
    this.initializeErrorHandling();
  }

  /**
   * Initialize application middleware
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors());
    
    // JSON parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    
    // URL encoding middleware
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging middleware
    this.app.use(requestLogger);
  }

  /**
   * Initialize application routes
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Order management routes
    this.app.use('/api/orders', this.orderRoutes.getRouter());

    // 404 handler for undefined routes
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.originalUrl} not found`
        }
      });
    });
  }

  /**
   * Initialize event handlers for domain events
   */
//   private initializeEventHandlers(): void {
//     const eventBus = EventBus.getInstance();

//     // Register order event handlers
//     eventBus.subscribe('OrderCreated', new OrderCreatedHandler());
//     eventBus.subscribe('OrderStatusUpdated', new OrderStatusUpdatedHandler());
//     eventBus.subscribe('PaymentProcessed', new PaymentProcessedHandler());
//     eventBus.subscribe('OrderCancelled', new OrderCancelledHandler());

//     console.log('Event handlers initialized successfully');
//   }

  /**
   * Initialize error handling middleware
   */
  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Get the Express application instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}