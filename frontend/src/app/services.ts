import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import en from './i18n/en.json';
import fr from './i18n/fr.json';
import tn from './i18n/tn.json';

export type RecordAny = Record<string, any>;
export const authInterceptor: HttpInterceptorFn = (request, next) => { const token = localStorage.getItem('herflow_token'); return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request); };
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  get<T = any>(path: string) { return firstValueFrom(this.http.get<{ data: T }>(`/api${path}`).pipe(timeout(20000))).then(r => r.data); }
  post<T = any>(path: string, body: unknown = {}, timeoutMs = 45000) { return firstValueFrom(this.http.post<{ data: T }>(`/api${path}`, body).pipe(timeout(timeoutMs))).then(r => r.data); }
  put<T = any>(path: string, body: unknown) { return firstValueFrom(this.http.put<{ data: T }>(`/api${path}`, body).pipe(timeout(30000))).then(r => r.data); }
  patch<T = any>(path: string, body: unknown) { return firstValueFrom(this.http.patch<{ data: T }>(`/api${path}`, body).pipe(timeout(30000))).then(r => r.data); }
  delete<T = any>(path: string) { return firstValueFrom(this.http.delete<{ data: T }>(`/api${path}`).pipe(timeout(30000))).then(r => r.data); }
}
@Injectable({ providedIn: 'root' })
export class Session {
  private router = inject(Router);
  user = signal<RecordAny | null>(null);
  token = signal(localStorage.getItem('herflow_token'));
  active = computed(() => !!this.token());
  async refresh(api: Api) { if (!this.active()) return; try { this.user.set(await api.get('/me')); } catch (error: any) { if (error.status === 401 || error.status === 403) this.logout(); } }
  accept(response: RecordAny) { localStorage.setItem('herflow_token', response.token); this.token.set(response.token); this.user.set(response.user); this.router.navigateByUrl(response.user.onboarded ? '/dashboard' : '/onboarding'); }
  replaceToken(token: string) { localStorage.setItem('herflow_token', token); this.token.set(token); }
  logout() { localStorage.removeItem('herflow_token'); this.token.set(null); this.user.set(null); this.router.navigateByUrl('/login'); }
}
@Injectable({ providedIn: 'root' })
export class Language {
  code = signal<'en' | 'fr' | 'tn'>(this.readSavedLanguage());
  private dictionaries: Record<string, Record<string, string>> = { en, fr, tn };
  private readSavedLanguage(): 'en' | 'fr' | 'tn' { const value = localStorage.getItem('herflow_lang'); return value === 'fr' || value === 'tn' ? value : 'en'; }
  set(value: 'en' | 'fr' | 'tn') { this.code.set(value); localStorage.setItem('herflow_lang', value); }
  t(key: string) { return this.dictionaries[this.code()]?.[key] || en[key as keyof typeof en] || key; }
}



