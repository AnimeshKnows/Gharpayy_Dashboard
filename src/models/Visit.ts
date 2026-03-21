import mongoose, { Schema, Document } from 'mongoose';

export interface IVisit extends Document {
  leadId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  assignedStaffId: mongoose.Types.ObjectId;
  scheduledAt: Date;
  outcome?: 'completed' | 'no_show' | 'rescheduled' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VisitSchema: Schema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    scheduledAt: { type: Date, required: true },
    outcome: { type: String, enum: ['completed', 'no_show', 'rescheduled', 'cancelled'] },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Visit || mongoose.model<IVisit>('Visit', VisitSchema);
