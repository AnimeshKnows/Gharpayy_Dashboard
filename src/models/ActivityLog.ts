import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  leadId: mongoose.Types.ObjectId;
  agentId?: mongoose.Types.ObjectId;
  activityType: string;
  description: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema: Schema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Member' },
    activityType: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
