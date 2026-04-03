import mongoose, { Schema, Document } from 'mongoose';

export interface IBed extends Document {
  roomId: mongoose.Types.ObjectId;
  bedNumber: string;
  status: 'available' | 'vacant' | 'occupied' | 'maintenance' | 'reserved';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BedSchema: Schema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    bedNumber: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['available', 'vacant', 'occupied', 'maintenance', 'reserved'],
      default: 'vacant'
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Bed || mongoose.model<IBed>('Bed', BedSchema);
