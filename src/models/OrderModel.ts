import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderDocument extends Document {
  orderId: string;
  ownerUserId?: string;
  giftId?: string;
  templateName: string;
  customerName: string;
  customerPhone?: string;
  orderType: 'vip_link' | 'buy_source' | 'custom_service';
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    ownerUserId: { type: String, index: true },
    giftId: { type: String, index: true },
    templateName: { type: String, required: true },
    customerName: { type: String, default: 'Khách hàng' },
    customerPhone: { type: String },
    orderType: {
      type: String,
      enum: ['vip_link', 'buy_source', 'custom_service'],
      default: 'vip_link'
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    paymentMethod: { type: String, default: 'VietQR_ACB' },
    note: { type: String }
  },
  {
    timestamps: true
  }
);

export const OrderModel: Model<IOrderDocument> =
  mongoose.models.Order || mongoose.model<IOrderDocument>('Order', OrderSchema);
