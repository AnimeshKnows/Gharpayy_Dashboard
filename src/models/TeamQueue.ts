import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamQueue extends Document {
  zoneId: mongoose.Types.ObjectId;
  teamName: string;
  ownerAgentId?: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  dispatchRule?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamQueueSchema: Schema = new Schema(
  {
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone', required: true },
    teamName: { type: String, required: true },
    ownerAgentId: { type: Schema.Types.ObjectId, ref: 'Member' },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'Member' }],
    dispatchRule: { type: String, default: 'round_robin' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.TeamQueue || mongoose.model<ITeamQueue>('TeamQueue', TeamQueueSchema);
