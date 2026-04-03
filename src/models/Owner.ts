import mongoose, { Schema, Document } from 'mongoose';

export interface IOwner extends Document {
  name: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  exactPgName?: string;
  gharpayyPgName?: string;
  role: 'owner';
  companyName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OwnerSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    exactPgName: { type: String },
    gharpayyPgName: { type: String },
    role: { type: String, default: 'owner' },
    companyName: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Owner || mongoose.model<IOwner>('Owner', OwnerSchema);
