import mongoose from 'mongoose';

export const LEAD_SOURCES = ['Referral', 'Website', 'LinkedIn', 'Event', 'Cold outreach', 'Other'];
export const CLIENT_STATUSES = ['Lead', 'Active', 'Inactive'];

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['created', 'updated', 'note', 'status', 'follow-up'], required: true },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const clientSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    company: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    status: { type: String, enum: CLIENT_STATUSES, default: 'Lead' },
    source: { type: String, enum: LEAD_SOURCES, default: 'Other' },
    dealValue: { type: Number, min: 0, max: 100000000000, default: 0 },
    expectedCloseDate: { type: Date, default: null },
    followUpDate: { type: Date, default: null },
    followUpCompleted: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    activity: { type: [activitySchema], default: [] },
  },
  { timestamps: true },
);

clientSchema.index({ owner: 1, updatedAt: -1 });
clientSchema.index({ owner: 1, status: 1, updatedAt: -1 });
clientSchema.index({ owner: 1, name: 'text', company: 'text', email: 'text' });

export default mongoose.model('Client', clientSchema);
