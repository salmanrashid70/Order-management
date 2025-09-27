import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { OrderModel } from '../../../src/models/Order.model';
import { 
  OrderStatus, 
  PaymentStatus, 
} from '../../../src/types/order.types';

describe('OrderModel - Schema Validation', () => {
    let mongo: MongoMemoryServer;

    beforeAll(async () => { 
        mongo = await MongoMemoryServer.create();
        await mongoose.connect(mongo.getUri());
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongo.stop();
    });

    afterEach(async () => {
        await OrderModel.deleteMany({});
    });

    const baseOrderData = {
        orderNumber: 'ORD-TEST-001',
        userId: 'user_123',
        subtotal: 100,
        totalAmount: 110,
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
        items: [{
            productId: 'prod_1',
            productName: 'Test Product',
            productSku: 'SKU-001',
            quantity: 2,
            unitPrice: 50,
            totalPrice: 100
        }]
    };

    describe('Schema Defaults', () => {
        it('should apply default values correctly', async () => {
            const order = new OrderModel(baseOrderData);
            const savedOrder = await order.save();

            expect(savedOrder.status).toBe(OrderStatus.PENDING);
            expect(savedOrder.paymentStatus).toBe(PaymentStatus.PENDING);
            expect(savedOrder.currency).toBe('USD');
            expect(savedOrder.taxAmount).toBe(0);
            expect(savedOrder.shippingAmount).toBe(0);
            expect(savedOrder.discountAmount).toBe(0);
        });

        it('should auto-generate order number', async () => {
            const orderData = { ...baseOrderData };
            
            const order = new OrderModel(orderData);
            const savedOrder = await order.save();

            expect(savedOrder.orderNumber).toBeDefined();
            expect(savedOrder.orderNumber).toMatch(/^ORD-\d+-\d{6}$/);
        });
    });

    describe('Schema Validation', () => {
        it('should require essential fields', async () => { 
            const order = new OrderModel({});

            await expect(order.save()).rejects.toThrow();
        });

        it('should validate item quantity is positive', async () => {
            const invalidateOrder = {
                ...baseOrderData,
                items: [{
                    ...baseOrderData.items[0],
                    quantity: 0 // Invalidate quantity
                }]
            };

            const order = new OrderModel(invalidateOrder);
            await expect(order.save()).rejects.toThrow();
        });

        it('should validate prices are non-negative', async () => { 
            const invalidateOrder = {
                ...baseOrderData,
                subtotal: -10, // Invalidate subtotal
                totalAmount: -5 // Invalidate totalAmount
            };

            const order = new OrderModel(invalidateOrder);
            await expect(order.save()).rejects.toThrow();
        });

        it('should validate enum values', async () => {
            const invalidOrder = {
                ...baseOrderData,
                status: 'INVALID_STATUS', // Not in enum
                paymentMethod: 'INVALID_METHOD'
            };

            const order = new OrderModel(invalidOrder);
            await expect(order.save()).rejects.toThrow();
        });   
    });

    describe('toJSON Transformation', () => {
        it('should transform document correctly', async () => {
            const order = new OrderModel(baseOrderData);
            const savedOrder = await order.save();
            const jsonOrder = savedOrder.toJSON();

            expect(jsonOrder.id).toBeDefined();
            expect(jsonOrder._id).toBeUndefined();
            expect(jsonOrder.__v).toBeUndefined();
        });
    });
});