import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  leadId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  reminderDate: Date;
  note?: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema: Schema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    reminderDate: { type: Date, required: true },
    note: { type: String },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Reminder || mongoose.model<IReminder>('Reminder', ReminderSchema);
