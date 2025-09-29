import { Request, Response } from 'express';
import { 
  CreateOrderSchema, 
  UpdateOrderStatusSchema, 
  PaymentMethod 
} from '../types/order.types';
import { ValidationError, NotFoundError, BusinessError } from '../utils/errors';
import { logger } from '../utils/logger';
import { OrderService } from '../serviecs/order.service';

/**
 * Order controller handling HTTP requests and responses
 */
export class OrderController {
  private orderService: OrderService;

  constructor(orderService?: OrderService) {
    this.orderService = orderService ?? new OrderService();
  }

  /**
   * Create a new order
   */
  createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const validatedData = CreateOrderSchema.parse(req.body);
      
      const order = await this.orderService.createOrder(validatedData);
      
      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully'
      });

    } catch (error) {
      this.handleError(error, res, 'createOrder');
    }
  };

  /**
   * Get order by ID
   */
  getOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const order = await this.orderService.getOrderById(id);
      
      res.json({
        success: true,
        data: order
      });

    } catch (error) {
      this.handleError(error, res, 'getOrder');
    }
  };

  /**
   * Get orders by user ID with pagination
   */
  getUserOrders = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await this.orderService.getOrdersByUserId(userId, page, limit);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      this.handleError(error, res, 'getUserOrders');
    }
  };

  /**
   * Update order status
   */
  updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedData = UpdateOrderStatusSchema.parse(req.body);
      
      const order = await this.orderService.updateOrderStatus(id, validatedData);
      
      res.json({
        success: true,
        data: order,
        message: 'Order status updated successfully'
      });

    } catch (error) {
      this.handleError(error, res, 'updateOrderStatus');
    }
  };

  /**
   * Process payment for an order
   */
  processPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { paymentMethod } = req.body;

      if (!paymentMethod || !Object.values(PaymentMethod).includes(paymentMethod)) {
        throw new ValidationError([{ 
          message: 'Valid payment method is required',
          field: 'paymentMethod' 
        }]);
      }

      const order = await this.orderService.processPayment(id, paymentMethod);
      
      res.json({
        success: true,
        data: order,
        message: 'Payment processed successfully'
      });

    } catch (error) {
      this.handleError(error, res, 'processPayment');
    }
  };

  /**
   * Cancel an order
   */
  cancelOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason, cancelledBy } = req.body;

      if (!reason || !cancelledBy) {
        throw new ValidationError([{ 
          message: 'Reason and cancelledBy are required' 
        }]);
      }

      const order = await this.orderService.cancelOrder(id, reason, cancelledBy);
      
      res.json({
        success: true,
        data: order,
        message: 'Order cancelled successfully'
      });

    } catch (error) {
      this.handleError(error, res, 'cancelOrder');
    }
  };

  /**
   * Centralized error handling
   */
  private handleError(error: unknown, res: Response, method: string): void {
    logger.error(`Error in OrderController.${method}:`, error);

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.serializeErrors()
        }
      });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message
        }
      });
    } else if (error instanceof BusinessError) {
      res.status(422).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred'
        }
      });
    }
  }
}