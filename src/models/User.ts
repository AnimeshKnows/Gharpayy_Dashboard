import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  phone?: string;
  password?: string;
  fullName: string;
  role: 'super_admin' | 'manager' | 'admin' | 'member' | 'user';
  status: 'active' | 'inactive' | 'invited' | 'deleted';
  zones?: string[]; // for admins and members
  managerIds?: mongoose.Types.ObjectId[]; // for super_admins and managers
  adminIds?: mongoose.Types.ObjectId[]; // for super_admins and managers
  managerId?: mongoose.Types.ObjectId; // for members
  adminId?: mongoose.Types.ObjectId; // for members
  invitedAt?: Date;
  deletedAt?: Date;
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
    role: { type: String, enum: ['super_admin', 'manager', 'admin', 'member', 'user'], default: 'user' },
    status: { type: String, enum: ['active', 'inactive', 'invited', 'deleted'], default: 'active' },
    zones: { type: [String], default: [] }, // zones assigned to admin/member
    managerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }], // admins managed by this manager
    adminIds: [{ type: Schema.Types.ObjectId, ref: 'User' }], // members managed by this admin
    managerId: { type: Schema.Types.ObjectId, ref: 'User' }, // parent manager for this admin
    adminId: { type: Schema.Types.ObjectId, ref: 'User' }, // parent admin for this member
    invitedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
