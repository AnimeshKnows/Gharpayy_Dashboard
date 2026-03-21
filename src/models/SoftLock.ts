import mongoose, { Schema, Document } from 'mongoose';

export interface ISoftLock extends Document {
  roomId: mongoose.Types.ObjectId;
  bedId?: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  lockedBy: mongoose.Types.ObjectId; // Member ID
  lockType: string;
  expiresAt: Date;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SoftLockSchema: Schema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed' },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    lockType: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.SoftLock || mongoose.model<ISoftLock>('SoftLock', SoftLockSchema);
