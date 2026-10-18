// @vitest-environment jsdom
import '@angular/compiler';
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter } from '@angular/router';
import { DashboardView } from './dashboard';
import { Api } from '../services';

beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
beforeEach(() => TestBed.resetTestingModule());

it('renders a delayed dashboard response without user interaction', async () => {
  let resolveDashboard!: (value: any) => void;
  const response = new Promise<any>(resolve => { resolveDashboard = resolve; });
  const api = { get: vi.fn((path: string) => path === '/dashboard' ? response : Promise.resolve([])) };
  await TestBed.configureTestingModule({
    imports: [DashboardView],
    providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: Api, useValue: api }]
  }).compileComponents();
  const fixture = TestBed.createComponent(DashboardView);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
  resolveDashboard({ name: 'Amina', todayTasks: [], projects: [], deadlines: [], checkin: { capacity: 80 } });
  await Promise.resolve();
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).toContain('Good');
  expect(fixture.nativeElement.textContent).toContain('Amina');
});
