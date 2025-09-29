import { OrderStatus, PaymentStatus, PaymentMethod } from '../../src/types/order.types';

export const createValidOrderData = (overrides = {}) => ({
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

export const createMockOrder = (overrides = {}) => ({
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

export const createOrderServiceResponse = (overrides = {}) => ({
  orders: [createMockOrder()],
  total: 1,
  page: 1,
  totalPages: 1,
  ...overrides
});