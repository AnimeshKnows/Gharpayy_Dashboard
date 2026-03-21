import mongoose, { Schema, Document } from 'mongoose';

export interface IZone extends Document {
  name: string;
  city?: string;
  areas?: string[];
  color?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ZoneSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    city: { type: String, default: '' },
    areas: { type: [String], default: [] },
    color: { type: String, default: '' },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Zone || mongoose.model<IZone>('Zone', ZoneSchema);
