import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const orderItemSchema = new Schema(
  {
    variantId: { type: String, required: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    color: { type: String, required: true },
    storage: { type: String, required: true },
    unitPriceCents: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    idempotencyKey: { type: String, required: true },
    status: { type: String, required: true, enum: ['placed'] },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(value: unknown[]) {
          return value.length > 0;
        },
        message: 'An order needs at least one item.',
      },
    },
    totalCents: { type: Number, required: true, min: 0 },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
    },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

export type OrderDocument = InferSchemaType<typeof orderSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const Order = mongoose.model('Order', orderSchema);

export type PublicOrderItem = {
  variantId: string;
  productId: string;
  productName: string;
  color: string;
  storage: string;
  unitPriceCents: number;
  quantity: number;
  image: string;
};

export type PublicOrder = {
  id: string;
  status: 'placed';
  createdAt: string;
  totalCents: number;
  items: PublicOrderItem[];
  customer: {
    name: string;
    email: string;
  };
};

export function toPublicOrder(order: {
  orderNumber: string;
  status: string;
  createdAt?: Date;
  totalCents: number;
  items: Iterable<{
    variantId: string;
    productId: string;
    productName: string;
    color: string;
    storage: string;
    unitPriceCents: number;
    quantity: number;
    image: string;
  }>;
  customer?: { name?: string; email?: string } | null;
}): PublicOrder {
  const name = order.customer?.name;
  const email = order.customer?.email;
  if (!name || !email) {
    throw new Error('Order is missing customer details.');
  }

  return {
    id: order.orderNumber,
    status: 'placed',
    createdAt: (order.createdAt ?? new Date()).toISOString(),
    totalCents: order.totalCents,
    items: [...order.items].map((item) => ({
      variantId: item.variantId,
      productId: item.productId,
      productName: item.productName,
      color: item.color,
      storage: item.storage,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      image: item.image,
    })),
    customer: { name, email },
  };
}
