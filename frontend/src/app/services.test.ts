import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { Language } from './services';

describe('English, French and Tunisian labels', () => { it('switches immediately and falls back to English', () => { vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} }); const lang = new Language(); expect(lang.t('dashboard')).toBe('Dashboard'); lang.set('fr'); expect(lang.t('dashboard')).toBe('Tableau de bord'); lang.set('tn'); expect(lang.t('dashboard')).toBe('El dashboard mte3ek'); expect(lang.t('missing.key')).toBe('missing.key'); }); });
