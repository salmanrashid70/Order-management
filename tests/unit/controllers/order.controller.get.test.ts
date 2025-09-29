// Mock dependencies
jest.mock('../../../src/serviecs/order.service');
// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { Request, Response } from 'express';
import { OrderController } from '../../../src/controllers/order.controller';
import { OrderService } from '../../../src/serviecs/order.service';
import { OrderStatus, PaymentStatus } from '../../../src/types/order.types';
import { NotFoundError, DatabaseError } from '../../../src/utils/errors';
import { PaymentMethod } from '../../../src/types/order.types';



describe('OrderController - getOrder Unit Tests', () => {
  let orderController: OrderController;
  let mockOrderService: jest.Mocked<OrderService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseStatus: jest.Mock;
  let responseJson: jest.Mock;

  // Test data factory
  const createMockOrder = (overrides = {}) => ({
    id: 'order_123',
    orderNumber: 'ORD-123456',
    userId: 'user_123',
    status: OrderStatus.PENDING,
    items: [{
      productId: 'prod_1',
      productName: 'Test Product',
      productSku: 'SKU-1',
      quantity: 2,
      unitPrice: 10,
      totalPrice: 20,
      productImage: 'http://example.com/img.png'
    }],
    subtotal: 20,
    taxAmount: 2.5,
    shippingAmount: 5,
    discountAmount: 0,
    totalAmount: 27.5,
    currency: 'USD',
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
      phone: '1234567890'
    },
    billingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
      phone: '1234567890'
    },
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.CREDIT_CARD,
    paymentId: 'pay_123',
    notes: 'Test order',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock response
    responseStatus = jest.fn().mockReturnThis();
    responseJson = jest.fn();
    mockResponse = {
      status: responseStatus,
      json: responseJson
    };

    // Setup mock service
    mockOrderService = new OrderService() as jest.Mocked<OrderService>;
    orderController = new OrderController(mockOrderService);
  });

  // ----------------------------------------------------------------------
  // SUCCESS CASES
  // ----------------------------------------------------------------------
  describe('Successful Order Retrieval', () => {
    it('should return order successfully with valid order ID', async () => {
      // Arrange
      const mockOrder = createMockOrder();
      const orderId = 'order_123';
      
      mockRequest = { 
        params: { id: orderId } 
      };
      
      mockOrderService.getOrderById.mockResolvedValue(mockOrder);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.getOrderById).toHaveBeenCalledTimes(1);
      expect(mockOrderService.getOrderById).toHaveBeenCalledWith(orderId);
      
      expect(responseStatus).not.toHaveBeenCalled(); // Default status is 200
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockOrder
      });
    });

    it('should return order with different statuses', async () => {
      // Test various order statuses to ensure they're handled correctly
      const statusTestCases = [
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED
      ];

      for (const status of statusTestCases) {
        // Arrange
        const mockOrder = createMockOrder({ status });
        const orderId = `order_${status.toLowerCase()}`;
        
        mockRequest = { params: { id: orderId } };
        mockOrderService.getOrderById.mockResolvedValue(mockOrder);

        // Act
        await orderController.getOrder(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(mockOrderService.getOrderById).toHaveBeenCalledWith(orderId);
        expect(responseJson).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({ status })
        });

        // Clear mocks for next iteration
        jest.clearAllMocks();
      }
    });

    it('should handle order with completed payment status', async () => {
      // Arrange
      const mockOrder = createMockOrder({
        paymentStatus: PaymentStatus.COMPLETED,
        status: OrderStatus.CONFIRMED
      });
      
      mockRequest = { params: { id: 'order_123' } };
      mockOrderService.getOrderById.mockResolvedValue(mockOrder);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          paymentStatus: PaymentStatus.COMPLETED,
          status: OrderStatus.CONFIRMED
        })
      });
    });
  });

  // ----------------------------------------------------------------------
  // ERROR CASES - NOT FOUND
  // ----------------------------------------------------------------------
  describe('Order Not Found Scenarios', () => {
    it('should return 404 when order does not exist', async () => {
      // Arrange
      const nonExistentOrderId = 'non_existent_order';
      const notFoundError = new NotFoundError('Order', nonExistentOrderId);
      
      mockRequest = { params: { id: nonExistentOrderId } };
      mockOrderService.getOrderById.mockRejectedValue(notFoundError);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.getOrderById).toHaveBeenCalledWith(nonExistentOrderId);
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Order with id ${nonExistentOrderId} not found`
        }
      });
    });

    it('should handle various invalid order ID formats', async () => {
      const invalidOrderIds = [
        'invalid-id',
        '123', // numeric string
        'order_', // incomplete
        '', // empty string
        'order_with_special_chars!@#$' // special characters
      ];

      for (const invalidId of invalidOrderIds) {
        // Arrange
        const notFoundError = new NotFoundError('Order', invalidId);
        mockRequest = { params: { id: invalidId } };
        mockOrderService.getOrderById.mockRejectedValue(notFoundError);

        // Act
        await orderController.getOrder(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(mockOrderService.getOrderById).toHaveBeenCalledWith(invalidId);
        expect(responseStatus).toHaveBeenCalledWith(404);

        // Clear mocks for next iteration
        jest.clearAllMocks();
      }
    });
  });

  // ----------------------------------------------------------------------
  // ERROR CASES - DATABASE & TECHNICAL ERRORS
  // ----------------------------------------------------------------------
  describe('Database and Technical Errors', () => {
    it('should handle database connection errors', async () => {
      // Arrange
      const orderId = 'order_123';
      const dbError = new DatabaseError('Database connection timeout');
      
      mockRequest = { params: { id: orderId } };
      mockOrderService.getOrderById.mockRejectedValue(dbError);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred'
        }
      });
    });

    it('should handle database query errors', async () => {
      // Arrange
      const orderId = 'order_123';
      const dbError = new DatabaseError('Query execution failed: timeout');
      
      mockRequest = { params: { id: orderId } };
      mockOrderService.getOrderById.mockRejectedValue(dbError);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred'
        }
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const orderId = 'order_123';
      const unexpectedError = new Error('Unexpected system error');
      
      mockRequest = { params: { id: orderId } };
      mockOrderService.getOrderById.mockRejectedValue(unexpectedError);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred'
        }
      });
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      const orderId = 'order_123';
      const timeoutError = new Error('Network request timeout');
      
      mockRequest = { params: { id: orderId } };
      mockOrderService.getOrderById.mockRejectedValue(timeoutError);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred'
        }
      });
    });
  });

  // ----------------------------------------------------------------------
  // EDGE CASES & BOUNDARY CONDITIONS
  // ----------------------------------------------------------------------
  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very long order IDs', async () => {
      // Arrange
      const longOrderId = 'order_' + 'x'.repeat(100);
      const mockOrder = createMockOrder({ id: longOrderId });
      
      mockRequest = { params: { id: longOrderId } };
      mockOrderService.getOrderById.mockResolvedValue(mockOrder);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.getOrderById).toHaveBeenCalledWith(longOrderId);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: longOrderId })
      });
    });

    it('should handle order with maximum allowed data size', async () => {
      // Arrange - Create order with many items
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        productId: `prod_${i}`,
        productName: `Product ${i}`,
        productSku: `SKU-${i}`,
        quantity: 1,
        unitPrice: 10,
        totalPrice: 10,
        productImage: `http://example.com/img${i}.png`
      }));

      const largeOrder = createMockOrder({
        items: manyItems,
        notes: 'A'.repeat(1000) // Large note field
      });
      
      mockRequest = { params: { id: 'order_large' } };
      mockOrderService.getOrderById.mockResolvedValue(largeOrder);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ productId: 'prod_0' })
          ])
        })
      });
    });

    it('should handle concurrent requests for same order ID', async () => {
      // Arrange
      const orderId = 'order_123';
      const mockOrder = createMockOrder();
      
      mockRequest = { params: { id: orderId } };
      mockOrderService.getOrderById.mockResolvedValue(mockOrder);

      // Act - Make multiple concurrent calls
      const promises = Array.from({ length: 5 }, () =>
        orderController.getOrder(mockRequest as Request, { ...mockResponse } as Response)
      );

      await Promise.all(promises);

      // Assert - Should be called 5 times with same ID
      expect(mockOrderService.getOrderById).toHaveBeenCalledTimes(5);
      expect(mockOrderService.getOrderById).toHaveBeenCalledWith(orderId);
    });
  });

  // ----------------------------------------------------------------------
  // SECURITY & VALIDATION EDGE CASES
  // ----------------------------------------------------------------------
  describe('Security and Validation Edge Cases', () => {
    it('should handle SQL injection attempts in order ID', async () => {
      // Arrange
      const maliciousId = "order_123'; DROP TABLE orders; --";
      const notFoundError = new NotFoundError('Order', maliciousId);
      
      mockRequest = { params: { id: maliciousId } };
      mockOrderService.getOrderById.mockRejectedValue(notFoundError);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert - Should handle gracefully without crashing
      expect(mockOrderService.getOrderById).toHaveBeenCalledWith(maliciousId);
      expect(responseStatus).toHaveBeenCalledWith(404);
    });

    it('should handle order IDs with special characters', async () => {
      // Arrange
      const specialId = 'order-123.456_789@special';
      const mockOrder = createMockOrder({ id: specialId });
      
      mockRequest = { params: { id: specialId } };
      mockOrderService.getOrderById.mockResolvedValue(mockOrder);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.getOrderById).toHaveBeenCalledWith(specialId);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: specialId })
      });
    });

    it('should handle undefined or null order ID', async () => {
      // Arrange
      const undefinedId = undefined as any;
      const notFoundError = new NotFoundError('Order', undefinedId);
      
      mockRequest = { params: { id: undefinedId } };
      mockOrderService.getOrderById.mockRejectedValue(notFoundError);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.getOrderById).toHaveBeenCalledWith(undefinedId);
      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });

  // ----------------------------------------------------------------------
  // PERFORMANCE & BEHAVIOR CASES
  // ----------------------------------------------------------------------
  describe('Performance and Behavior Cases', () => {
    it('should call service exactly once per request', async () => {
      // Arrange
      const orderId = 'order_123';
      const mockOrder = createMockOrder();
      
      mockRequest = { params: { id: orderId } };
      mockOrderService.getOrderById.mockResolvedValue(mockOrder);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.getOrderById).toHaveBeenCalledTimes(1);
    });

    it('should not modify the original request object', async () => {
      // Arrange
      const originalParams = { id: 'order_123' };
      mockRequest = { params: { ...originalParams } };
      
      const mockOrder = createMockOrder();
      mockOrderService.getOrderById.mockResolvedValue(mockOrder);

      // Act
      await orderController.getOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockRequest.params).toEqual(originalParams);
    });

    // it('should return consistent response format for all cases', async () => {
    //   // Test both success and error cases for consistent format
    //   const testCases = [
    //     {
    //       scenario: 'success',
    //       mockImplementation: () => mockOrderService.getOrderById.mockResolvedValue(createMockOrder()),
    //       expectedFormat: {
    //         success: true,
    //         data: expect.any(Object)
    //       }
    //     },
    //     {
    //       scenario: 'not found',
    //       mockImplementation: () => mockOrderService.getOrderById.mockRejectedValue(
    //         new NotFoundError('Order', 'missing_order')
    //       ),
    //       expectedFormat: {
    //         success: false,
    //         error: expect.objectContaining({
    //           code: expect.any(String),
    //           message: expect.any(String)
    //         })
    //       }
    //     }
    //   ];

    //   for (const { scenario, mockImplementation, expectedFormat } of testCases) {
    //     // Arrange
    //     mockRequest = { params: { id: 'order_123' } };
    //     mockImplementation();

    //     // Act
    //     await orderController.getOrder(mockRequest as Request, mockResponse as Response);

    //     // Assert
    //     expect(responseJson).toHaveBeenCalledWith(expect.objectContaining(expectedFormat));

    //     // Clear mocks for next iteration
    //     jest.clearAllMocks();
    //   }
    // });
  });
});