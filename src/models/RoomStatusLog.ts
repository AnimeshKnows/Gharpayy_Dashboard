import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomStatusLog extends Document {
  roomId: mongoose.Types.ObjectId;
  status: string;
  confirmedBy?: mongoose.Types.ObjectId; // Member/User ID
  notes?: string;
  rentUpdated?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomStatusLogSchema: Schema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    status: { type: String, required: true },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    rentUpdated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.RoomStatusLog || mongoose.model<IRoomStatusLog>('RoomStatusLog', RoomStatusLogSchema);
