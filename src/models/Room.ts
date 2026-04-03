import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  propertyId: mongoose.Types.ObjectId;
  roomNumber: string;
  floor?: string;
  bedCount?: number;
  status: 'available' | 'vacant' | 'vacating' | 'occupied' | 'blocked' | 'partially_available' | 'maintenance' | 'reserved';
  actualRent?: number;
  expectedRent?: number;
  roomType?: string;
  notes?: string;
  rentPerBed?: number;
  bathroomType?: 'attached' | 'common';
  furnishing?: 'unfurnished' | 'semi-furnished' | 'fully-furnished';
  autoLocked?: boolean;
  lastConfirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema: Schema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    roomNumber: { type: String, required: true },
    floor: { type: String },
    bedCount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['available', 'vacant', 'vacating', 'occupied', 'blocked', 'partially_available', 'maintenance', 'reserved'],
      default: 'vacant'
    },
    actualRent: { type: Number },
    expectedRent: { type: Number },
    roomType: { type: String },
    notes: { type: String },
    rentPerBed: { type: Number },
    bathroomType: { type: String, enum: ['attached', 'common'], default: 'common' },
    furnishing: { type: String, enum: ['unfurnished', 'semi-furnished', 'fully-furnished'], default: 'unfurnished' },
    autoLocked: { type: Boolean, default: false },
    lastConfirmedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
