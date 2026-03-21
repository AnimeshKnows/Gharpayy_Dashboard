import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  name: string;
  phone: string;
  email?: string;
  status: 'new' | 'contacted' | 'qualified' | 'visit_scheduled' | 'visit_completed' | 'negotiation' | 'booked' | 'lost';
  source: string;
  firstResponseTimeMin?: number;
  assignedAgentId?: mongoose.Types.ObjectId;
  propertyId?: mongoose.Types.ObjectId;
  preferredLocation?: string;
  budget?: string;
  moveInDate?: string;
  profession?: string;
  roomType?: string;
  needPreference?: string;
  specialRequests?: string;
  notes?: string;
  leadScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    status: { 
      type: String, 
      enum: ['new', 'contacted', 'qualified', 'visit_scheduled', 'visit_completed', 'negotiation', 'booked', 'lost'],
      default: 'new' 
    },
    source: { type: String, required: true },
    firstResponseTimeMin: { type: Number },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User' },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    preferredLocation: { type: String },
    budget: { type: String },
    moveInDate: { type: String },
    profession: { type: String },
    roomType: { type: String },
    needPreference: { type: String },
    specialRequests: { type: String },
    notes: { type: String },
    leadScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);
