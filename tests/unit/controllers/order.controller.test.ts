const mockCreateOrderSchema = {
  parse: jest.fn()
};

// Mock dependencies
jest.mock('../../../src/serviecs/order.service');
// jest.mock('../../../src/types/order.types');
// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../../src/types/order.types', () => ({
  ...jest.requireActual('../../../src/types/order.types'),
  CreateOrderSchema: mockCreateOrderSchema
}));

import { Request, Response } from 'express';
import { OrderController } from '../../../src/controllers/order.controller';
import { OrderService } from '../../../src/serviecs/order.service';
import { OrderStatus, PaymentStatus } from '../../../src/types/order.types';
import { ValidationError, NotFoundError, BusinessError, DatabaseError } from '../../../src/utils/errors';
import { PaymentMethod } from '../../../src/types/order.types';

describe('OrderController - createOrder Unit Tests', () => {
  let orderController: OrderController;
  let mockOrderService: jest.Mocked<OrderService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseStatus: jest.Mock;
  let responseJson: jest.Mock;

  // Test data factory - focused on unit test needs
  const createValidOrderData = (overrides = {}) => ({
    userId: 'user_123',
    items: [{
      productId: 'prod_1',
      productName: 'Test Product',
      productSku: 'SKU-1',
      quantity: 2,
      unitPrice: 10,
      totalPrice: 20,
      productImage: 'http://example.com/img.png'
    }],
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
    paymentMethod: PaymentMethod.CREDIT_CARD,
    currency: 'USD',
    ...overrides
  });

  const createMockOrder = (overrides = {}) => ({
    id: 'order_123',
    orderNumber: 'ORD-123456',
    ...createValidOrderData(),
    status: OrderStatus.PENDING,
    subtotal: 20,
    taxAmount: 2.5,
    shippingAmount: 5,
    discountAmount: 0,
    totalAmount: 27.5,
    paymentStatus: PaymentStatus.PENDING,
    paymentId: 'pay_123',
    notes: 'Test order',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset schema mock explicitly
    mockCreateOrderSchema.parse.mockClear();
    
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
  // SUCCESS CASES - Happy Path
  // ----------------------------------------------------------------------
  describe('Successful Order Creation', () => {
   it('should create order successfully with valid data', async () => {
      // Arrange
      const validOrderData = createValidOrderData();
      const mockOrder = createMockOrder();
      
      mockRequest = { body: validOrderData };
      mockCreateOrderSchema.parse.mockReturnValue(validOrderData);
      mockOrderService.createOrder.mockResolvedValue(mockOrder);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert - Use the mock reference consistently
      expect(mockCreateOrderSchema.parse).toHaveBeenCalledTimes(1);
      expect(mockCreateOrderSchema.parse).toHaveBeenCalledWith(validOrderData);
      
      expect(mockOrderService.createOrder).toHaveBeenCalledTimes(1);
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(validOrderData);
      
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
        message: 'Order created successfully'
      });
    });

    it.each([
        PaymentMethod.CREDIT_CARD,
        PaymentMethod.DEBIT_CARD,
        PaymentMethod.PAYPAL,
        PaymentMethod.BANK_TRANSFER
      ])('should handle payment method: %s', async (paymentMethod) => {
        // Arrange
        const orderData = createValidOrderData({ paymentMethod });
        const mockOrder = createMockOrder({ paymentMethod });
        
        mockRequest = { body: orderData };
        mockCreateOrderSchema.parse.mockReturnValue(orderData);
        mockOrderService.createOrder.mockResolvedValue(mockOrder);

        // Act
        await orderController.createOrder(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(mockOrderService.createOrder).toHaveBeenCalledWith(
          expect.objectContaining({ paymentMethod })
        );
      });

    it('should handle order with optional fields', async () => {
      // Arrange
      const orderData = createValidOrderData({
        notes: 'Special delivery instructions',
        items: [
          {
            productId: 'prod_1',
            productName: 'Test Product',
            productSku: 'SKU-1',
            quantity: 1,
            unitPrice: 10,
            totalPrice: 10
          },
          {
            productId: 'prod_2',
            productName: 'Another Product',
            productSku: 'SKU-2',
            quantity: 3,
            unitPrice: 5,
            totalPrice: 15,
            productImage: 'http://example.com/img2.png'
          }
        ]
      });
      
      const mockOrder = createMockOrder(orderData);
      mockRequest = { body: orderData };
      mockCreateOrderSchema.parse.mockReturnValue(orderData);
      mockOrderService.createOrder.mockResolvedValue(mockOrder);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(orderData);
      expect(responseStatus).toHaveBeenCalledWith(201);
    });
  });

  // ----------------------------------------------------------------------
  // VALIDATION ERROR CASES - Schema Validation
  // ----------------------------------------------------------------------
  describe('Schema Validation Errors', () => {
    it('should return 400 when schema validation fails with empty user ID', async () => {
      // Arrange
      const invalidData = createValidOrderData({ userId: '' });
      const validationError = new ValidationError([
        { message: 'User ID is required', field: 'userId' }
      ]);
      
      mockRequest = { body: invalidData };
      mockCreateOrderSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockCreateOrderSchema.parse).toHaveBeenCalledWith(invalidData);
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
      
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: validationError.errorCode,
          message: validationError.message,
          details: validationError.serializeErrors()
        }
      });
    });

    it('should return 400 when items array is empty', async () => {
      // Arrange
      const invalidData = { ...createValidOrderData(), items: [] };
      const validationError = new ValidationError([
        { message: 'At least one item is required', field: 'items' }
      ]);
      
      mockRequest = { body: invalidData };
      mockCreateOrderSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when required shipping address fields are missing', async () => {
      // Arrange
      const invalidData = {
        ...createValidOrderData(),
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe'
          // Missing required address fields
        }
      };

      const validationError = new ValidationError([
        { message: 'Address line 1 is required', field: 'shippingAddress.addressLine1' },
        { message: 'City is required', field: 'shippingAddress.city' }
      ]);
      
      mockRequest = { body: invalidData };

      mockCreateOrderSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when item quantity is invalid', async () => {
      // Arrange
      const invalidData = {
        ...createValidOrderData(),
        items: [{
          productId: 'prod_1',
          productName: 'Test Product',
          productSku: 'SKU-1',
          quantity: 0, // Invalid quantity
          unitPrice: 10,
          totalPrice: 0
        }]
      };
      const validationError = new ValidationError([
        { message: 'Quantity must be at least 1', field: 'items[0].quantity' }
      ]);
      
      mockRequest = { body: invalidData };
      mockCreateOrderSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(400);
    });
  });

  // ----------------------------------------------------------------------
  // BUSINESS LOGIC ERROR CASES - Service Layer Errors
  // ----------------------------------------------------------------------
  describe('Business Logic Errors from Service', () => {
    it('should return 422 when product is out of stock', async () => {
      // Arrange
      const validOrderData = createValidOrderData();
      const businessError = new BusinessError('Product SKU-1 is out of stock');
      
      mockRequest = { body: validOrderData };
      mockCreateOrderSchema.parse.mockReturnValue(validOrderData);
      mockOrderService.createOrder.mockRejectedValue(businessError);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(422);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: businessError.errorCode,
          message: businessError.message
        }
      });
    });

    it('should return 422 when user has insufficient funds', async () => {
      // Arrange
      const validOrderData = createValidOrderData();
      const businessError = new BusinessError('Insufficient funds for this transaction');
      
      mockRequest = { body: validOrderData };
      mockCreateOrderSchema.parse.mockReturnValue(validOrderData);
      mockOrderService.createOrder.mockRejectedValue(businessError);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(422);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: businessError.errorCode,
          message: businessError.message
        }
      });
    });

    it('should return 422 when product price has changed', async () => {
      // Arrange
      const validOrderData = createValidOrderData();
      const businessError = new BusinessError('Product price has been updated. Please review your order.');
      
      mockRequest = { body: validOrderData };
      mockCreateOrderSchema.parse.mockReturnValue(validOrderData);
      mockOrderService.createOrder.mockRejectedValue(businessError);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(422);
    });
  });

  // ----------------------------------------------------------------------
  // DATABASE & TECHNICAL ERROR CASES
  // ----------------------------------------------------------------------
  describe('Database and Technical Errors', () => {
    it('should return 500 when database connection fails', async () => {
      // Arrange
      const validOrderData = createValidOrderData();
      const dbError = new DatabaseError('Database connection timeout');
      
      mockRequest = { body: validOrderData };
      mockCreateOrderSchema.parse.mockReturnValue(validOrderData);
      mockOrderService.createOrder.mockRejectedValue(dbError);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

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

    it('should return 500 when unexpected error occurs', async () => {
      // Arrange
      const validOrderData = createValidOrderData();
      const unexpectedError = new Error('Unexpected system error');
      
      mockRequest = { body: validOrderData };
      mockCreateOrderSchema.parse.mockReturnValue(validOrderData);
      mockOrderService.createOrder.mockRejectedValue(unexpectedError);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

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

    it('should return 500 when database unique constraint fails', async () => {
      // Arrange
      const validOrderData = createValidOrderData();
      const dbError = new DatabaseError('Duplicate order number violation');
      
      mockRequest = { body: validOrderData };
      mockCreateOrderSchema.parse.mockReturnValue(validOrderData);
      mockOrderService.createOrder.mockRejectedValue(dbError);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(responseStatus).toHaveBeenCalledWith(500);
    });
  });

  // ----------------------------------------------------------------------
  // EDGE CASES & BOUNDARY CONDITIONS
  // ----------------------------------------------------------------------
  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very large quantity values', async () => {
      // Arrange
      const largeQuantityData = createValidOrderData({
        items: [{
          productId: 'prod_1',
          productName: 'Bulk Product',
          productSku: 'SKU-BULK',
          quantity: 10000, // Large quantity
          unitPrice: 0.01,
          totalPrice: 100
        }]
      });
      const mockOrder = createMockOrder(largeQuantityData);
      
      mockRequest = { body: largeQuantityData };
      mockCreateOrderSchema.parse.mockReturnValue(largeQuantityData);
      mockOrderService.createOrder.mockResolvedValue(mockOrder);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(largeQuantityData);
      expect(responseStatus).toHaveBeenCalledWith(201);
    });

    it('should handle decimal prices correctly', async () => {
      // Arrange
      const decimalPriceData = createValidOrderData({
        items: [{
          productId: 'prod_1',
          productName: 'Test Product',
          productSku: 'SKU-1',
          quantity: 3,
          unitPrice: 19.99,
          totalPrice: 59.97
        }]
      });
      const mockOrder = createMockOrder(decimalPriceData);
      
      mockRequest = { body: decimalPriceData };
      mockCreateOrderSchema.parse.mockReturnValue(decimalPriceData);
      mockOrderService.createOrder.mockResolvedValue(mockOrder);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(decimalPriceData);
      expect(responseStatus).toHaveBeenCalledWith(201);
    });

    it('should handle empty request body', async () => {
      // Arrange
      const validationError = new ValidationError([
        { message: 'Request body is required', field: 'body' }
      ]);
      
      mockRequest = { body: {} };
      mockCreateOrderSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(400);
    });
  });

  // ----------------------------------------------------------------------
  // SECURITY & VALIDATION EDGE CASES
  // ----------------------------------------------------------------------
  describe('Security and Validation Edge Cases', () => {
    it('should handle malformed JSON in request body', async () => {
      // This would typically be handled by Express middleware before reaching controller
      // But we test that our schema validation catches any malformed data that gets through
      
      // Arrange
      const malformedData = {
        userId: 'user_123',
        items: 'not-an-array' // Wrong type
      };
      const validationError = new ValidationError([
        { message: 'Items must be an array', field: 'items' }
      ]);
      
      mockRequest = { body: malformedData };
      mockCreateOrderSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(400);
    });

    it('should handle extremely long field values', async () => {
      // Arrange
      const longFieldData = createValidOrderData({
        notes: 'A'.repeat(5000) // Very long note
      });
      const mockOrder = createMockOrder(longFieldData);
      
      mockRequest = { body: longFieldData };
      mockCreateOrderSchema.parse.mockReturnValue(longFieldData);
      mockOrderService.createOrder.mockResolvedValue(mockOrder);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(longFieldData);
      expect(responseStatus).toHaveBeenCalledWith(201);
    });
  });

  // ----------------------------------------------------------------------
  // BEHAVIOR & INTEGRATION POINT TESTS
  // ----------------------------------------------------------------------
  describe('Behavior and Integration Points', () => {
    it('should not call service when validation fails', async () => {
      // Arrange
      const invalidData = { ...createValidOrderData(), userId: '' };
      const validationError = new ValidationError([
        { message: 'User ID is required', field: 'userId' }
      ]);
      
      mockRequest = { body: invalidData };
      mockCreateOrderSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
    });

    it('should call service with exact validated data', async () => {
      // Arrange
      const originalData = createValidOrderData();
      const validatedData = { ...originalData, notes: 'Validated notes' }; // Simulate schema transformation
      const mockOrder = createMockOrder(validatedData);
      
      mockRequest = { body: originalData };
      mockCreateOrderSchema.parse.mockReturnValue(validatedData);
      mockOrderService.createOrder.mockResolvedValue(mockOrder);

      // Act
      await orderController.createOrder(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(validatedData);
      expect(mockOrderService.createOrder).not.toHaveBeenCalledWith(originalData);
    });

    it('should maintain consistent response format across all scenarios', async () => {
      const testCases = [
        {
          name: 'success',
          setup: () => {
            mockCreateOrderSchema.parse.mockReturnValue(createValidOrderData());
            mockOrderService.createOrder.mockResolvedValue(createMockOrder());
          },
          expectedStatus: 201,
          expectedSuccess: true
        },
        {
          name: 'validation error',
          setup: () => {
            mockCreateOrderSchema.parse.mockImplementation(() => {
              throw new ValidationError([{ message: 'Test error', field: 'test' }]);
            });
          },
          expectedStatus: 400,
          expectedSuccess: false
        },
        {
          name: 'business error',
          setup: () => {
            mockCreateOrderSchema.parse.mockReturnValue(createValidOrderData());
            mockOrderService.createOrder.mockRejectedValue(new BusinessError('Test business error'));
          },
          expectedStatus: 422,
          expectedSuccess: false
        }
      ];

      for (const { name, setup, expectedStatus, expectedSuccess } of testCases) {
        // Arrange
        mockRequest = { body: createValidOrderData() };
        setup();

        // Act
        await orderController.createOrder(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(responseStatus).toHaveBeenCalledWith(expectedStatus);
        expect(responseJson).toHaveBeenCalledWith(
          expect.objectContaining({
            success: expectedSuccess
          })
        );

        // Reset for next iteration
        jest.clearAllMocks();
      }
    });
  });
});
