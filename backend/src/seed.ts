import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserPreferences, Project, Task } from './models.js';
import { replan } from './scheduling.js';

const date = (days: number) => new Date(Date.now() + days * 86400000);
async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/herflow');
  const email = 'demo@herflow.local';
  const existing = await User.findOne({ email });
  if (existing) { await replan(existing.id); console.log('Demo account already exists; schedule refreshed.'); await mongoose.disconnect(); return; }
  const user = await User.create({ email, name: 'Maya', timezone: 'Africa/Lagos', role: 'both', onboarded: true, privacyConsent: false, passwordHash: await bcrypt.hash('DemoPassword123!', 12) });
  await UserPreferences.create({ user: user.id, availability: [1, 4, 4, 4, 4, 4, 2], breakMinutes: 15, language: 'en' });
  const examples = [
    { title: 'Portfolio refresh', description: 'Update a professional portfolio with recent work.', category: 'Career', deadline: date(9), priority: 4 },
    { title: 'Research presentation', description: 'Prepare slides and rehearse for a class presentation.', category: 'Study', deadline: date(5), priority: 5 },
    { title: 'Community workshop', description: 'Plan a small community learning event.', category: 'Personal', deadline: date(17), priority: 3 }
  ];
  for (const item of examples) {
    const project = await Project.create({ ...item, user: user.id, estimatedMinutes: 240 });
    for (const [index, title] of ['Plan the work', 'Create the first draft', 'Review and finish'].entries()) await Task.create({ user: user.id, project: project.id, title: `${title}: ${item.title}`, estimatedMinutes: index === 1 ? 120 : 60, difficulty: index === 1 ? 3 : 2, approved: true });
  }
  await replan(user.id);
  console.log('Demo account: demo@herflow.local / DemoPassword123!');
  await mongoose.disconnect();
}
main().catch(error => { console.error(error.message); process.exit(1); });
