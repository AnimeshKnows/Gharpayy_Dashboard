import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  name: string;
  email: string;
  phone?: string;
  username?: string;
  zoneName?: string;
  adminUsername?: string;
  adminName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    username: { type: String, required: false, unique: true, sparse: true, lowercase: true, trim: true },
    zoneName: { type: String, required: false, trim: true },
    adminUsername: { type: String, required: false, lowercase: true, trim: true },
    adminName: { type: String, required: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);
