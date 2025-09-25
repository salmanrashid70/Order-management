import { z } from 'zod';

/**
 * Order status enumeration
 */
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

/**
 * Payment status enumeration
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

/**
 * Payment method enumeration
 */
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  BANK_TRANSFER = 'bank_transfer'
}

/**
 * Zod schema for order item validation
 */
export const OrderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().min(1, 'Product name is required'),
  productSku: z.string().min(1, 'Product SKU is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  totalPrice: z.number().positive('Total price must be positive'),
  productImage: z.string().optional()
});

/**
 * Zod schema for address validation
 */
export const AddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().optional()
});

/**
 * Zod schema for creating an order
 */
export const CreateOrderSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema,
  paymentMethod: z.nativeEnum(PaymentMethod),
  currency: z.string().default('USD'),
  notes: z.string().optional()
});

/**
 * Zod schema for updating order status
 */
export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  reason: z.string().optional()
});

/**
 * Zod schema for payment processing
 */
export const ProcessPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD')
});

/**
 * Order item interface
 */
export interface IOrderItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productImage?: string;
}

/**
 * Address interface
 */
export interface IAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

/**
 * Order interface representing the business entity
 */
export interface IOrder {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  items: IOrderItem[];
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  shippingAddress: IAddress;
  billingAddress: IAddress;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create order DTO
 */
export type CreateOrderDTO = z.infer<typeof CreateOrderSchema>;

/**
 * Update order status DTO
 */
export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusSchema>;

/**
 * Process payment DTO
 */
export type ProcessPaymentDTO = z.infer<typeof ProcessPaymentSchema>;