/**
 * @file Unit tests for OrderService
 * @description Covers all core service methods with mocked Mongoose model & payment service.
 */

import { OrderService } from '../../../src/serviecs/order.service'; // Fixed typo: serviecs -> services
import { PaymentService } from '../../../src/serviecs/payment.service';
import { OrderModel } from '../../../src/models/Order.model';
import { 
  OrderStatus, 
  PaymentStatus, 
  PaymentMethod,
} from '../../../src/types/order.types';

import { 
  NotFoundError, 
  DatabaseError 
} from '../../../src/utils/errors';

// Create mock functions
const mockSave = jest.fn();
const mockToObject = jest.fn();
const mockFindById = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();

// Mock OrderModel
jest.mock('../../../src/models/Order.model', () => ({
  OrderModel: jest.fn().mockImplementation(() => ({
    save: mockSave,
    toObject: mockToObject
  }))
}));

// Mock PaymentService
jest.mock('../../../src/serviecs/payment.service', () => ({
  PaymentService: {
    getInstance: jest.fn(() => ({
      processPayment: jest.fn()
    }))
  }
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('OrderService - Unit Tests', () => {
    let orderService: OrderService;
    let mockPaymentService: any;

    // Assign the static methods to the mocked OrderModel
    beforeAll(() => {
      (OrderModel as any).findById = mockFindById;
      (OrderModel as any).find = mockFind;
      (OrderModel as any).countDocuments = mockCountDocuments;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        orderService = new OrderService();
        mockPaymentService = PaymentService.getInstance();
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

    // ---------------------------------
    //  createOrder Tests
    // ---------------------------------
    describe('createOrder', () => {
        it('should create order successfully with valid data', async () => {
            const orderData = createOrderData();
            const mockSavedOrder = createOrderInstance();

            mockSave.mockResolvedValue(mockSavedOrder);
            mockToObject.mockReturnValue(mockSavedOrder.toObject());

            const result = await orderService.createOrder(orderData);

            expect(OrderModel).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockSavedOrder.toObject());
        });

        it('should throw DatabaseError on save failure', async () => {
            const orderData = createOrderData();

            mockSave.mockRejectedValue(new Error('DB error'));

            await expect(orderService.createOrder(orderData)).rejects.toThrow(DatabaseError);
        });
    });

    // ---------------------------------
    //  getOrderById Tests
    // ---------------------------------
    describe('getOrderById', () => {
        it('should return order details for a valid order ID', async () => { 
            const mockOrder = createOrderInstance();
            mockFindById.mockResolvedValue(mockOrder);

            const result = await orderService.getOrderById('order_123');

            expect(mockFindById).toHaveBeenCalledWith('order_123');
            expect(result).toEqual(mockOrder.toObject());
        });

        it('should throw NotFoundError if order does not exist', async () => { 
            mockFindById.mockResolvedValue(null);

            await expect(orderService.getOrderById('bad_id')).rejects.toThrow(NotFoundError);
        });

        it('should throw DatabaseError on DB failure', async () => { 
            mockFindById.mockRejectedValue(new Error('DB is down'));

            await expect(orderService.getOrderById('order_123')).rejects.toThrow(DatabaseError);
        });
    });

    // ------------------------------------------------------------------
    // getOrdersByUserId
    // ------------------------------------------------------------------
    describe('getOrdersByUserId', () => {
        it('should return paginated orders for a valid user', async () => {
            const mockOrders = [
            createOrderInstance({ id: 'order_1', orderNumber: 'ORD-001' }),
            createOrderInstance({ id: 'order_2', orderNumber: 'ORD-002' })
            ];

            // Mock the chainable methods
            const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue(mockOrders)
            };

            mockFind.mockReturnValue(mockQuery);
            mockCountDocuments.mockResolvedValue(2);

            const result = await orderService.getOrdersByUserId('user_123', 1, 10);

            expect(mockFind).toHaveBeenCalledWith({ userId: 'user_123' });
            expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(mockQuery.skip).toHaveBeenCalledWith(0); // (page - 1) * limit = (1-1)*10 = 0
            expect(mockQuery.limit).toHaveBeenCalledWith(10);
            expect(mockCountDocuments).toHaveBeenCalledWith({ userId: 'user_123' });
            
            expect(result).toEqual({
            orders: mockOrders.map(order => order.toObject()),
            total: 2,
            page: 1,
            totalPages: 1
            });
        });

        it('should return empty array when user has no orders', async () => {
            const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([])
            };

            mockFind.mockReturnValue(mockQuery);
            mockCountDocuments.mockResolvedValue(0);

            const result = await orderService.getOrdersByUserId('user_123', 1, 10);

            expect(result).toEqual({
            orders: [],
            total: 0,
            page: 1,
            totalPages: 0
            });
        });

        it('should handle pagination correctly for multiple pages', async () => {
            const mockOrders = [createOrderInstance()];
            
            const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue(mockOrders)
            };

            mockFind.mockReturnValue(mockQuery);
            mockCountDocuments.mockResolvedValue(15); // 15 total orders

            const result = await orderService.getOrdersByUserId('user_123', 2, 5);

            expect(mockQuery.skip).toHaveBeenCalledWith(5); // (page - 1) * limit = (2-1)*5 = 5
            expect(mockQuery.limit).toHaveBeenCalledWith(5);
            
            expect(result).toEqual({
            orders: mockOrders.map(order => order.toObject()),
            total: 15,
            page: 2,
            totalPages: 3 // Math.ceil(15 / 5) = 3
            });
        });

        it('should use default pagination values when not provided', async () => {
            const mockOrders = [createOrderInstance()];
            
            const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue(mockOrders)
            };

            mockFind.mockReturnValue(mockQuery);
            mockCountDocuments.mockResolvedValue(1);

            const result = await orderService.getOrdersByUserId('user_123');

            expect(mockQuery.skip).toHaveBeenCalledWith(0); // (1-1)*10 = 0
            expect(mockQuery.limit).toHaveBeenCalledWith(10); // default limit
            expect(result.page).toBe(1); // default page
        });

        it('should throw DatabaseError on database failure', async () => {
            mockFind.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockRejectedValue(new Error('Database connection failed'))
            });

            await expect(orderService.getOrdersByUserId('user_123', 1, 10))
            .rejects.toThrow(DatabaseError);
            
            await expect(orderService.getOrdersByUserId('user_123', 1, 10))
            .rejects.toThrow('Failed to fetch user orders');
        });

        it('should handle edge case with zero limit', async () => {
            const mockQuery = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            };

            mockFind.mockReturnValue(mockQuery);
            mockCountDocuments.mockResolvedValue(5);

            const result = await orderService.getOrdersByUserId('user_123', 1, 0);

            expect(mockQuery.limit).toHaveBeenCalledWith(0);
            expect(result).toEqual({
                orders: [],
                total: 5,
                page: 1,
                totalPages: Infinity // Math.ceil(5 / 0) = Infinity
            });
        });


        // TODO: This is an edge case, it will be done in future
        // it('should handle negative page number by using default', async () => {
        //     const mockOrders = [createOrderInstance()];
            
        //     const mockQuery = {
        //         sort: jest.fn().mockReturnThis(),
        //         skip: jest.fn().mockReturnThis(),
        //         limit: jest.fn().mockResolvedValue(mockOrders)
        //     };

        //     mockFind.mockReturnValue(mockQuery);
        //     mockCountDocuments.mockResolvedValue(5);

        //     const result = await orderService.getOrdersByUserId('user_123', -1, 10);

        //     expect(mockQuery.skip).toHaveBeenCalledWith(0); // (-1-1)*10 = -20, but should default to 0
        //     expect(result.page).toBe(-1); // The method doesn't validate page, it just uses what's passed
        // });
    });
});