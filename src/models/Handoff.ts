import mongoose, { Schema, Document } from 'mongoose';

export interface IHandoff extends Document {
  leadId: mongoose.Types.ObjectId;
  fromAgentId?: mongoose.Types.ObjectId;
  toAgentId?: mongoose.Types.ObjectId;
  zoneId?: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HandoffSchema: Schema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    fromAgentId: { type: Schema.Types.ObjectId, ref: 'Member' },
    toAgentId: { type: Schema.Types.ObjectId, ref: 'Member' },
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone' },
    reason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Handoff || mongoose.model<IHandoff>('Handoff', HandoffSchema);
