import { v4 as uuidv4 } from 'uuid';
import { PaymentMethod, PaymentStatus, ProcessPaymentDTO } from '../types/order.types';
import { PaymentError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Mock payment service that simulates payment processing
 * In a real application, this would integrate with payment gateways like Stripe, PayPal, etc.
 */
export class PaymentService {
  private static instance: PaymentService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Process a payment with the given details
   * Simulates various payment scenarios for testing
   */
  async processPayment(paymentData: ProcessPaymentDTO): Promise<{
    paymentId: string;
    status: PaymentStatus;
    transactionId: string;
    message: string;
  }> {
    logger.info(`Processing payment for order: ${paymentData.orderId}`, {
      amount: paymentData.amount,
      currency: paymentData.currency,
      method: paymentData.paymentMethod
    });

    // Simulate processing delay
    await this.simulateProcessingDelay();

    // Simulate different outcomes based on amount and payment method
    const result = this.simulatePaymentOutcome(paymentData);

    logger.info(`Payment processing completed for order: ${paymentData.orderId}`, {
      paymentId: result.paymentId,
      status: result.status
    });

    return result;
  }

  /**
   * Simulate payment processing delay (1-3 seconds)
   */
  private async simulateProcessingDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate various payment outcomes for testing
   */
  private simulatePaymentOutcome(paymentData: ProcessPaymentDTO): {
    paymentId: string;
    status: PaymentStatus;
    transactionId: string;
    message: string;
  } {
    const paymentId = uuidv4();
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate failure scenarios
    if (paymentData.amount > 10000) {
      throw new PaymentError('Payment amount exceeds limit');
    }

    if (paymentData.paymentMethod === PaymentMethod.CREDIT_CARD) {
      // Simulate credit card failure 10% of the time
      if (Math.random() < 0.1) {
        return {
          paymentId,
          status: PaymentStatus.FAILED,
          transactionId,
          message: 'Credit card declined'
        };
      }
    }

    if (paymentData.paymentMethod === PaymentMethod.PAYPAL) {
      // Simulate PayPal failure 5% of the time
      if (Math.random() < 0.05) {
        return {
          paymentId,
          status: PaymentStatus.FAILED,
          transactionId,
          message: 'PayPal payment failed'
        };
      }
    }

    // Default success case
    return {
      paymentId,
      status: PaymentStatus.COMPLETED,
      transactionId,
      message: 'Payment processed successfully'
    };
  }

  /**
   * Refund a payment
   */
  async processRefund(paymentId: string, amount: number): Promise<{
    refundId: string;
    status: PaymentStatus;
    message: string;
  }> {
    logger.info(`Processing refund for payment: ${paymentId}`, { amount });

    await this.simulateProcessingDelay();

    const refundId = uuidv4();

    // Simulate refund processing
    return {
      refundId,
      status: PaymentStatus.REFUNDED,
      message: 'Refund processed successfully'
    };
  }
}