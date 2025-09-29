import { v4 as uuidv4 } from 'uuid';
import { OrderModel } from '../models/Order.model';
import { 
  IOrder, 
  CreateOrderDTO, 
  UpdateOrderStatusDTO, 
  OrderStatus, 
  PaymentStatus,
  PaymentMethod 
} from '../types/order.types';
import {
  NotFoundError, 
  BusinessError, 
  DatabaseError, 
  CustomError
} from '../utils/errors';
import { logger } from '../utils/logger';
import { PaymentService } from './payment.service';

/**
 * Order service handling business logic for order operations
 */
export class OrderService {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = PaymentService.getInstance();
  }

  /**
   * Create a new order with validation and event publishing
   */
  async createOrder(orderData: CreateOrderDTO): Promise<IOrder> {
    try {
      logger.info('Creating new order', { userId: orderData.userId });

      // Calculate order totals
      const totals = this.calculateOrderTotals(orderData.items);
      
      // Create order document
      const order = new OrderModel({
        id: uuidv4(),
        userId: orderData.userId,
        status: OrderStatus.PENDING,
        items: orderData.items,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        shippingAmount: totals.shippingAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        currency: orderData.currency,
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        notes: orderData.notes
      });

      // Save order to database
      const savedOrder = await order.save();

      logger.info('Order created successfully', { 
        orderId: savedOrder.id, 
        orderNumber: savedOrder.orderNumber 
      });

      return savedOrder.toObject() as IOrder;

    } catch (error) {
      logger.error('Error creating order:', error);
      if (error instanceof Error) {
        throw new DatabaseError(`Failed to create order: ${error.message}`);
      }
      throw new DatabaseError('Failed to create order');
    }
  }

  /**
   * Get order by ID with proper error handling
   */
  async getOrderById(orderId: string): Promise<IOrder> {
    try {
      logger.info('Fetching order by ID', { orderId });

      const order = await OrderModel.findById(orderId);
      
      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      return order.toObject() as IOrder;

    } catch (error) {
      logger.error('Error fetching order:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new DatabaseError(`Failed to fetch order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get orders by user ID with pagination
   */
  async getOrdersByUserId(userId: string, page: number = 1, limit: number = 10): Promise<{
    orders: IOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      logger.info('Fetching orders by user ID', { userId, page, limit });

      const skip = (page - 1) * limit;
      
      const [orders, total] = await Promise.all([
        OrderModel.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        OrderModel.countDocuments({ userId })
      ]);

      return {
        orders: orders.map(order => order.toObject() as IOrder),
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      logger.error('Error fetching user orders:', error);
      throw new DatabaseError('Failed to fetch user orders');
    }
  }

  /**
   * Update order status with validation and event publishing
   */
  async updateOrderStatus(orderId: string, statusData: UpdateOrderStatusDTO): Promise<IOrder> {
    try {
      logger.info('Updating order status', { orderId, newStatus: statusData.status });

      const order = await OrderModel.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      const previousStatus = order.status;
      
      // Validate status transition
      this.validateStatusTransition(previousStatus, statusData.status);

      // Update order status
      order.status = statusData.status;
      order.updatedAt = new Date();

      const updatedOrder = await order.save();
      logger.info('Order status updated successfully', { 
        orderId, 
        previousStatus, 
        newStatus: statusData.status 
      });

      return updatedOrder.toObject() as IOrder;

    } catch (error) {
      logger.error('Error updating order status:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new DatabaseError('Failed to update order status');
    }
  }

  /**
   * Process payment for an order
   */
  async processPayment(orderId: string, paymentMethod: PaymentMethod): Promise<IOrder> {
    try {
      logger.info('Processing payment for order', { orderId, paymentMethod });

      const order = await OrderModel.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // Validate order can accept payment
      if (order.paymentStatus === PaymentStatus.COMPLETED) {
        throw new BusinessError('Payment already completed for this order');
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new BusinessError('Cannot process payment for cancelled order');
      }

      // Process payment through payment service
      const paymentResult = await this.paymentService.processPayment({
        orderId,
        paymentMethod,
        amount: order.totalAmount,
        currency: order.currency
      });

      // Update order payment status
      order.paymentStatus = paymentResult.status;
      order.paymentId = paymentResult.paymentId;
      order.updatedAt = new Date();

      // If payment completed, update order status to confirmed
      if (paymentResult.status === PaymentStatus.COMPLETED) {
        order.status = OrderStatus.CONFIRMED;
      }

      const updatedOrder = await order.save();
      logger.info('Payment processed successfully', { 
        orderId, 
        paymentStatus: paymentResult.status 
      });

      return updatedOrder.toObject() as IOrder;

    } catch (error) {
      logger.error('Error processing payment:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new DatabaseError('Failed to process payment');
    }
  }

  /**
   * Cancel an order with reason and event publishing
   */
  async cancelOrder(orderId: string, reason: string, cancelledBy: string): Promise<IOrder> {
    try {
      logger.info('Cancelling order', { orderId, reason, cancelledBy });

      const order = await OrderModel.findById(orderId);
      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // Validate order can be cancelled
      if (order.status === OrderStatus.CANCELLED) {
        throw new BusinessError('Order is already cancelled');
      }

      if ([OrderStatus.DELIVERED, OrderStatus.SHIPPED].includes(order.status)) {
        throw new BusinessError('Cannot cancel order that has already been shipped or delivered');
      }

      // Update order status
      const previousStatus = order.status;
      order.status = OrderStatus.CANCELLED;
      order.updatedAt = new Date();

      const updatedOrder = await order.save();
      logger.info('Order cancelled successfully', { orderId, previousStatus });

      return updatedOrder.toObject() as IOrder;

    } catch (error) {
      logger.error('Error cancelling order:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new DatabaseError('Failed to cancel order');
    }
  }

  /**
   * Calculate order totals including tax, shipping, and discounts
   */
  private calculateOrderTotals(items: any[]): {
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    totalAmount: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Simple tax calculation (10%)
    const taxAmount = subtotal * 0.1;
    
    // Simple shipping calculation
    const shippingAmount = subtotal > 50 ? 0 : 10; // Free shipping over $50
    
    // Simple discount calculation
    const discountAmount = subtotal > 100 ? subtotal * 0.1 : 0; // 10% discount over $100
    
    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      shippingAmount: Number(shippingAmount.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2))
    };
  }

  /**
   * Validate order status transitions
   */
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: []
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BusinessError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}