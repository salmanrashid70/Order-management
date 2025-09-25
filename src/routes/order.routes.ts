import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';

/**
 * Order routes definition
 */
export class OrderRoutes {
  private router: Router;
  private orderController: OrderController;

  constructor() {
    this.router = Router();
    this.orderController = new OrderController();
    this.initializeRoutes();
  }

  /**
   * Initialize all order routes
   */
  private initializeRoutes(): void {
    // Create a new order
    this.router.post('/', this.orderController.createOrder);

    // Get order by ID
    this.router.get('/:id', this.orderController.getOrder);

    // Get orders by user ID
    this.router.get('/user/:userId', this.orderController.getUserOrders);

    // Update order status
    this.router.patch('/:id/status', this.orderController.updateOrderStatus);

    // Process payment for an order
    this.router.post('/:id/payment', this.orderController.processPayment);

    // Cancel an order
    this.router.post('/:id/cancel', this.orderController.cancelOrder);
  }

  /**
   * Get the router instance
   */
  public getRouter(): Router {
    return this.router;
  }
}