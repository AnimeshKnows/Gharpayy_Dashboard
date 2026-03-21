import mongoose, { Schema, Document } from 'mongoose';

export interface IEscalation extends Document {
  type?: string;
  entityType: string;
  entityId: string;
  zoneId?: mongoose.Types.ObjectId;
  raisedBy?: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  priority: string;
  status: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EscalationSchema: Schema = new Schema(
  {
    type: { type: String },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone' },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'Member' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Member' },
    priority: { type: String, default: 'medium' },
    status: { type: String, default: 'open' },
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Escalation || mongoose.model<IEscalation>('Escalation', EscalationSchema);
