import mongoose, { Schema } from 'mongoose';

const opts = { timestamps: true };
const owned = { user: { type: Schema.Types.ObjectId, ref: 'User', required: true } };
const userSchema = new Schema({ email: { type: String, required: true, unique: true, lowercase: true, trim: true }, passwordHash: { type: String, required: true }, tokenVersion: { type: Number, default: 0 }, name: { type: String, required: true, maxlength: 80 }, timezone: { type: String, default: 'UTC' }, role: { type: String, enum: ['student', 'employee', 'both'], default: 'student' }, onboarded: { type: Boolean, default: false }, privacyConsent: { type: Boolean, default: false } }, opts);
export const User = mongoose.model('User', userSchema);
export const UserPreferences = mongoose.model('UserPreferences', new Schema({ ...owned, workHours: { type: [String], default: [] }, studyHours: { type: [String], default: [] }, availability: { type: [Number], default: [0, 4, 4, 4, 4, 4, 2] }, breakMinutes: { type: Number, default: 15, min: 0, max: 120 }, lowCapacityDays: { type: [Number], default: [] }, commitments: { type: [Schema.Types.Mixed], default: [] }, energyPreference: { type: String, default: 'flexible' }, language: { type: String, enum: ['en', 'fr', 'tn'], default: 'en' }, notificationsEnabled: { type: Boolean, default: true }, liliEnabled: { type: Boolean, default: true }, liliMuted: { type: Boolean, default: false }, academicInfo: String, professionalInfo: String }, opts));
UserPreferences.schema.index({ user: 1 }, { unique: true });
export const CyclePreferences = mongoose.model('CyclePreferences', new Schema({ 
  ...owned, 
  encrypted: { type: String, required: true }, 
  updatedAt: Date,
  lastPeriodDate: Date,
  typicalCycleDays: { type: Number, min: 20, max: 45, default: 28 },
  periodDuration: { type: Number, min: 2, max: 10, default: 5 },
  isRegular: { type: Boolean, default: true },
  notApplicable: { type: Boolean, default: false },
  cycleDataVersion: { type: Number, default: 1 }
}, opts));
CyclePreferences.schema.index({ user: 1 }, { unique: true });
const projectSchema = new Schema({ ...owned, title: { type: String, required: true, maxlength: 160 }, description: { type: String, default: '', maxlength: 4000 }, category: { type: String, default: 'Personal' }, startDate: Date, deadline: { type: Date, required: true }, priority: { type: Number, min: 1, max: 5, default: 3 }, complexity: { type: Number, min: 1, max: 5, default: 3 }, estimatedMinutes: { type: Number, min: 0, default: 0 }, contentHash: String, aiCache: Schema.Types.Mixed }, opts);
projectSchema.index({ user: 1, deadline: 1 });
export const Project = mongoose.model('Project', projectSchema);
export const Milestone = mongoose.model('Milestone', new Schema({ ...owned, project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true }, title: { type: String, required: true }, order: { type: Number, default: 0 }, approved: { type: Boolean, default: false } }, opts));
const taskSchema = new Schema({ ...owned, project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true }, milestone: { type: Schema.Types.ObjectId, ref: 'Milestone' }, title: { type: String, required: true }, description: String, estimatedMinutes: { type: Number, min: 15, max: 2880, default: 60 }, actualMinutes: { type: Number, min: 0, default: 0 }, difficulty: { type: Number, min: 1, max: 5, default: 3 }, status: { type: String, enum: ['todo', 'done', 'missed'], default: 'todo' }, approved: { type: Boolean, default: true }, dependencies: [{ type: Schema.Types.ObjectId, ref: 'Task' }], deadline: Date, completedAt: Date }, opts);
taskSchema.index({ user: 1, status: 1, approved: 1 });
export const Task = mongoose.model('Task', taskSchema);
const scheduleSchema = new Schema({ ...owned, task: { type: Schema.Types.ObjectId, ref: 'Task', index: true }, project: { type: Schema.Types.ObjectId, ref: 'Project' }, title: String, start: { type: Date, required: true }, end: { type: Date, required: true }, locked: { type: Boolean, default: false }, kind: { type: String, enum: ['task', 'commitment'], default: 'task' }, reason: String }, opts);
scheduleSchema.index({ user: 1, start: 1 });
export const Schedule = mongoose.model('Schedule', scheduleSchema);
const checkSchema = new Schema({ ...owned, date: { type: String, required: true }, capacity: { type: Number, required: true, min: 10, max: 100 }, mode: { type: String, enum: ['normal', 'low', 'rest', 'custom'], default: 'normal' } }, opts);
checkSchema.index({ user: 1, date: 1 }, { unique: true });
checkSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });
export const DailyCheckIn = mongoose.model('DailyCheckIn', checkSchema);
export const Notification = mongoose.model('Notification', new Schema({ 
  ...owned, 
  project: { type: Schema.Types.ObjectId, ref: 'Project' }, 
  title: String, 
  body: String, 
  read: { type: Boolean, default: false }, 
  dueAt: Date,
  type: { type: String, enum: ['replan', 'info', 'warning', 'error', 'success'], default: 'info' },
  comparison: Schema.Types.Mixed,
  metadata: Schema.Types.Mixed
}, opts));
Notification.schema.index({ user: 1, project: 1 }, { unique: true, partialFilterExpression: { project: { $exists: true } } });
Notification.schema.index({ user: 1, createdAt: -1 });
export const AIUsageLog = mongoose.model('AIUsageLog', new Schema({ ...owned, date: { type: String, required: true }, operation: String, inputTokens: Number, outputTokens: Number, thinkingTokens: Number, status: String }, opts));
AIUsageLog.schema.index({ user: 1, date: 1 });
AIUsageLog.schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

