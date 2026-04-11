import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentBooking extends Document {
  tenantName: string;
  tenantPhone: string;
  tenantEmail?: string;
  propertyName: string;
  roomNumber?: string;
  actualRent: number;
  discountedRent: number;
  deposit: number;
  maintenanceFee: number;
  tokenAmount: number;
  stayDurationMonths: number;
  noticePeriodMonths: number;
  upiId?: string;
  adminPhone?: string;
  source: 'admin' | 'tenant' | 'walkin';
  status: 'pending' | 'approved' | 'paid' | 'expired' | 'cancelled';
  zoneId?: string;
  assignedToId?: string;
  notes?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  extensionUsed: boolean;
  adminUnread: boolean;
  viewedAt?: Date;
  approvedAt?: Date;
  paidAt?: Date;
  offerExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentBookingSchema: Schema = new Schema(
  {
    tenantName:         { type: String, required: true },
    tenantPhone:        { type: String, required: true },
    tenantEmail:        { type: String },
    propertyName:       { type: String, required: true },
    roomNumber:         { type: String },
    actualRent:         { type: Number, default: 0 },
    discountedRent:     { type: Number, default: 0 },
    deposit:            { type: Number, default: 0 },
    maintenanceFee:     { type: Number, default: 0 },
    tokenAmount:        { type: Number, default: 0 },
    stayDurationMonths: { type: Number, default: 11 },
    noticePeriodMonths: { type: Number, default: 1 },
    upiId:              { type: String },
    adminPhone:         { type: String },
    source:             { type: String, enum: ['admin', 'tenant', 'walkin'], default: 'admin' },
    status:             { type: String, enum: ['pending', 'approved', 'paid', 'expired', 'cancelled'], default: 'pending' },
    zoneId:             { type: String },
    assignedToId:       { type: String },
    notes:              { type: String },
    razorpayOrderId:    { type: String },
    razorpayPaymentId:  { type: String },
    extensionUsed:      { type: Boolean, default: false },
    adminUnread:        { type: Boolean, default: false },
    viewedAt:           { type: Date },
    approvedAt:         { type: Date },
    paidAt:             { type: Date },
    offerExpiresAt:     { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.PaymentBooking ||
  mongoose.model<IPaymentBooking>('PaymentBooking', PaymentBookingSchema);