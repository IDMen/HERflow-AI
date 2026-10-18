import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { AIUsageLog, Project } from './models.js';
import { sha } from './security.js';

type Suggestion = { milestones: { title: string; tasks: { title: string; description: string; estimatedMinutes: number; difficulty: number; dependencies: number[] }[] }[] };
export function fallback(title: string, estimatedMinutes: number): Suggestion { const each = Math.max(30, Math.ceil((estimatedMinutes || 240) / 4 / 15) * 15); return { milestones: [{ title: 'Plan', tasks: [{ title: `Define scope for ${title}`, description: 'Clarify the deliverable and next steps.', estimatedMinutes: each, difficulty: 2, dependencies: [] }, { title: 'Prepare resources', description: 'Gather what is needed to begin.', estimatedMinutes: each, difficulty: 2, dependencies: [0] }] }, { title: 'Deliver', tasks: [{ title: `Work on ${title}`, description: 'Complete the main work.', estimatedMinutes: each, difficulty: 3, dependencies: [1] }, { title: 'Review and finish', description: 'Check quality and submit.', estimatedMinutes: each, difficulty: 2, dependencies: [2] }] }] }; }
const schema = { type: Type.OBJECT, required: ['milestones'], properties: { milestones: { type: Type.ARRAY, items: { type: Type.OBJECT, required: ['title', 'tasks'], properties: { title: { type: Type.STRING }, tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, required: ['title', 'description', 'estimatedMinutes', 'difficulty', 'dependencies'], properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, estimatedMinutes: { type: Type.INTEGER }, difficulty: { type: Type.INTEGER }, dependencies: { type: Type.ARRAY, items: { type: Type.INTEGER } } } } } } } } } };
export async function breakdown(project: InstanceType<typeof Project>, userId: string) {
  const details = { title: project.title, description: project.description, category: project.category, deadline: project.deadline, complexity: project.complexity, estimatedMinutes: project.estimatedMinutes };
  const hash = sha(details);
  if (project.contentHash === hash && project.aiCache) return { ...project.aiCache, source: 'cache' };
  const date = new Date().toISOString().slice(0, 10);
  const limit = Number(process.env.GEMINI_DAILY_REQUEST_LIMIT || 20);
  const used = await AIUsageLog.countDocuments({ user: userId, date });
  if (!process.env.GEMINI_API_KEY || used >= limit) return { ...fallback(project.title, project.estimatedMinutes), source: !process.env.GEMINI_API_KEY ? 'fallback-no-key' : 'fallback-limit' };
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const requestTimeout = Math.min(30000, Math.max(5000, Number(process.env.GEMINI_REQUEST_TIMEOUT_MS) || 18000));
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const thinking = process.env.GEMINI_THINKING_LEVEL === 'high' ? ThinkingLevel.HIGH : process.env.GEMINI_THINKING_LEVEL === 'medium' ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW;
      const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-3.8-flash', contents: `Break this project into concise, executable tasks. Dependency indices refer to the flattened task list, starting at 0. Keep total tasks <= 12. Project: ${JSON.stringify(details)}`, config: { responseMimeType: 'application/json', responseSchema: schema, thinkingConfig: { thinkingLevel: thinking }, maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 2048), httpOptions: { timeout: requestTimeout, retryOptions: { attempts: 1 } } } });
      const value = JSON.parse(response.text || '{}') as Suggestion;
      if (!Array.isArray(value.milestones) || !value.milestones.length) throw new Error('Empty AI response');
      const usage = response.usageMetadata;
      await AIUsageLog.create({ user: userId, date, operation: 'breakdown', inputTokens: usage?.promptTokenCount || 0, outputTokens: usage?.candidatesTokenCount || 0, thinkingTokens: usage?.thoughtsTokenCount || 0, status: 'success' });
      project.contentHash = hash; project.aiCache = value; await project.save();
      return { ...value, source: 'gemini' };
    } catch (error) {
      const status = (error as { status?: number }).status;
      const retryable = status === 429 || (typeof status === 'number' && status >= 500) || status === undefined;
      if (attempt === 1 || !retryable) break;
      await new Promise(resolve => setTimeout(resolve, 400 * 2 ** attempt));
    }
  }
  await AIUsageLog.create({ user: userId, date, operation: 'breakdown', status: 'fallback' });
  return { ...fallback(project.title, project.estimatedMinutes), source: 'fallback-error' };
}

