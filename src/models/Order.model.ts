// src/models/Order.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { IOrder, OrderStatus, PaymentStatus, PaymentMethod } from '../types/order.types';

/**
 * MongoDB document interface for Order
 */
export interface IOrderDocument extends IOrder, Document {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for OrderItem subdocument
 */
const OrderItemSchema = new Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productSku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  productImage: { type: String }
}, { _id: false });

/**
 * Mongoose schema for Address subdocument
 */
const AddressSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String }
}, { _id: false });

/**
 * Mongoose schema for Order collection
 */
const OrderSchema = new Schema({
  orderNumber: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  status: { 
    type: String, 
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
    index: true
  },
  items: [OrderItemSchema],
  subtotal: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  taxAmount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  shippingAmount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  discountAmount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  totalAmount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  shippingAddress: { 
    type: AddressSchema, 
    required: true 
  },
  billingAddress: { 
    type: AddressSchema, 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true
  },
  paymentMethod: { 
    type: String, 
    enum: Object.values(PaymentMethod) 
  },
  paymentId: { 
    type: String 
  },
  notes: { 
    type: String 
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Generate order number before saving
 */
OrderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

/**
 * Order model
 */
export const OrderModel = mongoose.model<IOrderDocument>('Order', OrderSchema);