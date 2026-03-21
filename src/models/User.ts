import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  phone?: string;
  password?: string;
  fullName: string;
  role: 'ceo' | 'manager' | 'admin' | 'agent' | 'user';
  zones?: string[]; // for admins and agents
  managerIds?: mongoose.Types.ObjectId[]; // for CEOs and managers
  adminIds?: mongoose.Types.ObjectId[]; // for CEOs and managers
  managerId?: mongoose.Types.ObjectId; // for agents
  adminId?: mongoose.Types.ObjectId; // for agents
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: false },
    password: { type: String, required: false }, // optional for OAuth users
    fullName: { type: String, required: true },
    role: { type: String, enum: ['ceo', 'manager', 'admin', 'agent', 'user'], default: 'user' },
    zones: { type: [String], default: [] }, // zones assigned to admin/agent
    managerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }], // admins managed by this manager
    adminIds: [{ type: Schema.Types.ObjectId, ref: 'User' }], // agents managed by this admin
    managerId: { type: Schema.Types.ObjectId, ref: 'User' }, // parent manager for this admin
    adminId: { type: Schema.Types.ObjectId, ref: 'User' }, // parent admin for this agent
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
