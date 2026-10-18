import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Session } from './services';
const guard = () => { const session = inject(Session), router = inject(Router); return session.active() || router.parseUrl('/login'); };
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', loadComponent: () => import('./views/auth').then(m => m.AuthView) },
  { path: 'register', loadComponent: () => import('./views/auth').then(m => m.AuthView) },
  { path: 'onboarding', canActivate: [guard], loadComponent: () => import('./views/onboarding').then(m => m.OnboardingView) },
  { path: 'dashboard', canActivate: [guard], loadComponent: () => import('./views/dashboard').then(m => m.DashboardView) },
  { path: 'projects', canActivate: [guard], loadComponent: () => import('./views/projects').then(m => m.ProjectsView) },
  { path: 'calendar', canActivate: [guard], loadComponent: () => import('./views/calendar').then(m => m.CalendarView) },
  { path: 'analytics', canActivate: [guard], loadComponent: () => import('./views/analytics').then(m => m.AnalyticsView) },
  { path: 'settings', canActivate: [guard], loadComponent: () => import('./views/settings').then(m => m.SettingsView) },
  { path: '**', redirectTo: 'dashboard' }
];
