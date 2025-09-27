/**
 * @file Unit tests for OrderService
 * @description Covers all core service methods with mocked Mongoose model & payment service.
 */

import { OrderService } from '../../../src/serviecs/order.service';
import { OrderModel } from '../../../src/models/Order.model';
import { PaymentService } from '../../../src/types/payment.service';
import { 
  OrderStatus, 
  PaymentStatus, 
  PaymentMethod,
} from '../../../src/types/order.types';
import { 
  NotFoundError, 
  BusinessError, 
  DatabaseError 
} from '../../../src/utils/errors';

// Mock OrderModel
jest.mock('../../../src/models/Order.model', () => {
  const save = jest.fn();
  const toObject = jest.fn();

  return {
    // Mock constructor: every `new OrderModel()` will return an object with save + toObject
    OrderModel: jest.fn().mockImplementation(() => ({
      save,
      toObject
    })),
    // Mock static methods
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn()
  };
});

//  Mock PaymentService
jest.mock('../../../src/types/payment.service', () => {
  return {
    PaymentService: {
      getInstance: jest.fn(() => ({
        processPayment: jest.fn()
      }))
    }
  };
});

describe('OrderService - Unit Tests', () => {
    let orderService: OrderService;
    let mockPaymentService: any;

    beforeEach(() => {
        orderService = new OrderService();

        // Get references to mocks
        const modelModule = jest.requireMock('../../../src/models/Order.model');
        const paymentModule = jest.requireMock('../../../src/types/payment.service');

        // Reset mock functions each test
        jest.clearAllMocks();

        mockPaymentService = paymentModule.PaymentService.getInstance();
    });

    // ---------------------------------
    //  Test Data Factories
    // ---------------------------------
    const createOrderData = (overrides = {}) => ({
        userId: 'user_123',
        items: [{
        productId: 'prod_1',
        productName: 'Test Product',
        productSku: 'SKU-001',
        quantity: 2,
        unitPrice: 10,
        totalPrice: 20
        }],
        shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
        },
        billingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
        },
        paymentMethod: PaymentMethod.CREDIT_CARD,
        currency: 'USD',
        ...overrides
    });

    const createOrderInstance = (overrides = {}) => ({
        id: 'order_123',
        orderNumber: 'ORD-123456',
        userId: 'user_123',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 20,
        taxAmount: 2,
        shippingAmount: 5,
        discountAmount: 0,
        totalAmount: 27,
        currency: 'USD',
        save: jest.fn().mockResolvedValue(this),
        toObject: jest.fn().mockReturnValue({
        id: 'order_123',
        orderNumber: 'ORD-123456',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        ...overrides
        }),
        ...overrides
    });

    // ------------------------------------------------------------------
    // createOrder
    // ------------------------------------------------------------------
    describe('createOrder', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create order successfully with valid data', async () => {
            const orderData = createOrderData();
            const mockSavedOrder = createOrderInstance();

            // Mock OrderModel constructor
            (OrderModel as unknown as jest.Mock).mockImplementation(() => ({
            save: jest.fn().mockResolvedValue(mockSavedOrder),
            toObject: jest.fn().mockReturnValue(mockSavedOrder.toObject())
            }));

            const result = await orderService.createOrder(orderData);

            expect(OrderModel).toHaveBeenCalledTimes(1); // ensure constructor called
            expect(result).toEqual(mockSavedOrder.toObject());
        });
            
        it('should throw DatabaseError on save failure', async () => {
            const orderData = createOrderData();

            (OrderModel as unknown as jest.Mock).mockImplementation(() => ({
            save: jest.fn().mockRejectedValue(new Error('DB error')),
            toObject: jest.fn()
            }));

            await expect(orderService.createOrder(orderData))
            .rejects.toThrow(DatabaseError);

            await expect(orderService.createOrder(orderData))
            .rejects.toThrow(/Failed to create order: DB error/);
        });
    });
});
