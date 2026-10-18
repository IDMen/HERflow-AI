import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from './models.js';

export type AuthedRequest = Request & { userId: string };
const secret = () => { const value = process.env.JWT_SECRET; if (!value || value.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters'); return value; };
export function tokenFor(id: string, version = 0) { return jwt.sign({ sub: id, version }, secret(), { expiresIn: '7d' }); }
export async function auth(req: Request, res: Response, next: NextFunction) { try { const raw = req.headers.authorization?.replace(/^Bearer /, ''); if (!raw) return res.status(401).json({ error: 'Authentication required' }); const token = jwt.verify(raw, secret()) as jwt.JwtPayload; const user = await User.findById(token.sub).select('tokenVersion'); if (!user || user.tokenVersion !== token.version) return res.status(401).json({ error: 'Invalid session' }); (req as AuthedRequest).userId = String(token.sub); next(); } catch { res.status(401).json({ error: 'Invalid session' }); } }
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> { return schema.parse(data); }
function key() { const raw = process.env.SENSITIVE_DATA_KEY || ''; if (!/^[a-fA-F0-9]{64}$/.test(raw)) throw new Error('SENSITIVE_DATA_KEY must be 64 hex characters'); return Buffer.from(raw, 'hex'); }
export function encrypt(value: unknown) { const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv); const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64'); }
export function decrypt(value: string) { const bytes = Buffer.from(value, 'base64'); const decipher = crypto.createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12)); decipher.setAuthTag(bytes.subarray(12, 28)); return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString()); }
export function sha(value: unknown) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
