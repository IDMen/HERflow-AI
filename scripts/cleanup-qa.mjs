import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Project, User } from '../backend/dist/models.js';
import { tokenFor } from '../backend/dist/security.js';
dotenv.config({ path: '.env', quiet: true });
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/herflow');
const user = await User.findOne({ email: 'demo@herflow.local' });
const projects = await Project.find({ user: user.id, title: /^QA Reactivity / });
const token = tokenFor(user.id, user.tokenVersion);
for (const project of projects) {
  const response = await fetch(`http://127.0.0.1:4200/api/projects/${project.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`QA cleanup failed: ${response.status}`);
}
if (process.argv.includes('--cycle')) {
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const cycle = await fetch('http://127.0.0.1:4200/api/cycle', { method: 'DELETE', headers });
  const profile = await fetch('http://127.0.0.1:4200/api/me', { method: 'PATCH', headers, body: JSON.stringify({ privacyConsent: false }) });
  if (!cycle.ok || !profile.ok) throw new Error('QA cycle cleanup failed');
}
await mongoose.disconnect();
console.log(`Removed ${projects.length} QA projects`);
