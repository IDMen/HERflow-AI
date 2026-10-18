import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/routes';
import { authInterceptor } from './app/services';
import { LucideAngularModule, LayoutDashboard, FolderKanban, CalendarDays, ChartNoAxesColumn, Settings, Sparkles, LogOut } from 'lucide-angular';

bootstrapApplication(AppComponent, { providers: [provideHttpClient(withFetch(), withInterceptors([authInterceptor])), provideRouter(routes, withComponentInputBinding()), importProvidersFrom(LucideAngularModule.pick({ LayoutDashboard, FolderKanban, CalendarDays, ChartNoAxesColumn, Settings, Sparkles, LogOut }))] }).catch(console.error);
