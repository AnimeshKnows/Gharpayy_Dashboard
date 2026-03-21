import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  leadId: mongoose.Types.ObjectId;
  agentId?: mongoose.Types.ObjectId;
  message: string;
  source: 'whatsapp' | 'email' | 'phone' | 'manual';
  direction: 'inbound' | 'outbound';
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Member' },
    message: { type: String, required: true },
    source: { type: String, enum: ['whatsapp', 'email', 'phone', 'manual'], default: 'manual' },
    direction: { type: String, enum: ['inbound', 'outbound'], default: 'outbound' },
  },
  { timestamps: true }
);

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
