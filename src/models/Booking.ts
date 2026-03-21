import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  leadId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  visitId?: mongoose.Types.ObjectId;
  monthlyRent: number;
  securityDeposit?: number;
  moveInDate?: Date;
  bookingStatus: 'pending' | 'confirmed' | 'checked_in' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid';
  bookedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    visitId: { type: Schema.Types.ObjectId, ref: 'Visit' },
    monthlyRent: { type: Number, required: true },
    securityDeposit: { type: Number },
    moveInDate: { type: Date },
    bookingStatus: { type: String, enum: ['pending', 'confirmed', 'checked_in', 'cancelled'], default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
    bookedBy: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);
