import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Api, Language, Session } from './services';
import { LiliCompanionComponent } from './lili-companion.component';


@Component({ selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, LucideAngularModule, LiliCompanionComponent], template: `
  <div class="app-frame" [class.signed-out]="!session.active()">
    <aside class="sidebar" *ngIf="session.active()">
      <a class="brand" routerLink="/dashboard"><span class="brand-mark"><lucide-icon name="sparkles" size="22" /></span><span>HERflow <em>AI</em></span></a>
      <p class="sidebar-label">{{lang.t('workspace')}}</p>
      <label class="language-picker" aria-label="Language"><select [value]="lang.code()" (change)="changeLanguage($event)"><option value="en">🇬🇧 English</option><option value="fr">🇫🇷 Français</option><option value="tn">🇹🇳 Tounsi / Derja</option></select></label>
      <nav aria-label="Main navigation">
        <a routerLink="/dashboard" routerLinkActive="active"><lucide-icon name="layout-dashboard" />{{lang.t('dashboard')}}</a>
        <a routerLink="/projects" routerLinkActive="active"><lucide-icon name="folder-kanban" />{{lang.t('projects')}}</a>
        <a routerLink="/calendar" routerLinkActive="active"><lucide-icon name="calendar-days" />{{lang.t('calendar')}}</a>
        <a routerLink="/analytics" routerLinkActive="active"><lucide-icon name="chart-no-axes-column" />{{lang.t('analytics')}}</a>
        <a routerLink="/settings" routerLinkActive="active"><lucide-icon name="settings" />{{lang.t('settings')}}</a>
      </nav>
      <div class="sidebar-bottom"><p>{{lang.t('tagline')}}</p><button class="link-button" (click)="session.logout()"><lucide-icon name="log-out" />{{lang.t('logout')}}</button></div>
    </aside>
    <div class="mobile-header" *ngIf="session.active()"><a class="brand" routerLink="/dashboard"><span class="brand-mark"><lucide-icon name="sparkles" size="20" /></span>HERflow <em>AI</em></a><select class="mobile-language" aria-label="Language" [value]="lang.code()" (change)="changeLanguage($event)"><option value="en">🇬🇧 EN</option><option value="fr">🇫🇷 FR</option><option value="tn">🇹🇳 TN</option></select><span class="avatar">{{(session.user()?.['name'] || 'H').slice(0,1).toUpperCase()}}</span></div>
    <main class="page"><router-outlet /></main>
    <nav class="bottom-nav" *ngIf="session.active()" aria-label="Mobile navigation">
      <a routerLink="/dashboard" routerLinkActive="active"><lucide-icon name="layout-dashboard" /><span>{{lang.t('dashboard')}}</span></a>
      <a routerLink="/projects" routerLinkActive="active"><lucide-icon name="folder-kanban" /><span>{{lang.t('projects')}}</span></a>
      <a routerLink="/calendar" routerLinkActive="active"><lucide-icon name="calendar-days" /><span>{{lang.t('calendar')}}</span></a>
      <a routerLink="/analytics" routerLinkActive="active"><lucide-icon name="chart-no-axes-column" /><span>{{lang.t('analytics')}}</span></a>
      <a routerLink="/settings" routerLinkActive="active"><lucide-icon name="settings" /><span>{{lang.t('settings')}}</span></a>
    </nav>
    <app-lili-companion />
  </div>`, styles: [`:host{display:block;min-height:100vh}.app-frame{display:flex;min-height:100vh}.sidebar{width:242px;flex:none;background:#fff;border-right:1px solid #eee8f0;display:flex;flex-direction:column;padding:28px 16px;position:sticky;top:0;height:100vh}.brand{display:flex;align-items:center;gap:10px;color:var(--plum);font-size:20px;font-weight:800;letter-spacing:-.6px;text-decoration:none;padding:0 12px}.brand em{font-style:normal;color:var(--rose)}.brand-mark{height:34px;width:34px;display:grid;place-items:center;color:#fff;background:var(--plum);border-radius:11px}.sidebar-label{font-size:10px;font-weight:800;letter-spacing:1.4px;color:#ae9aaf;margin:49px 13px 17px}.sidebar nav{display:grid;gap:5px}.sidebar nav a{display:flex;align-items:center;gap:13px;padding:12px 14px;border-radius:11px;color:#756d79;text-decoration:none;font-size:13px;font-weight:650}.sidebar nav a.active,.sidebar nav a:hover{background:#f2eafa;color:var(--plum)}.sidebar nav lucide-icon{width:19px;height:19px}.sidebar-bottom{margin-top:auto;padding:15px 12px;color:#9c8ba0;font-size:12px;line-height:1.6}.link-button{border:0;background:none;display:flex;align-items:center;gap:10px;color:#75546d;padding:10px 0;cursor:pointer}.page{flex:1;min-width:0}.signed-out .page{width:100%}.mobile-header,.bottom-nav{display:none}.avatar{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#edddeb;color:var(--plum);font-weight:750}@media(max-width:1023px){.sidebar{width:72px;padding:22px 10px}.sidebar .brand span:not(.brand-mark),.sidebar-label,.sidebar nav a:not(.active) span,.sidebar-bottom{display:none}.sidebar .brand{padding:0 8px}.sidebar nav{margin-top:55px}.sidebar nav a{font-size:0;justify-content:center;padding:13px}.sidebar nav lucide-icon{width:22px;height:22px}}@media(max-width:767px){.sidebar{display:none}.app-frame{display:block}.mobile-header{display:flex;justify-content:space-between;align-items:center;padding:13px 18px;background:#fff;border-bottom:1px solid #eee8f0}.page{padding-bottom:76px}.bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:20;display:grid;grid-template-columns:repeat(5,1fr);background:#fff;border-top:1px solid #eee8f0;padding:7px 3px max(7px,env(safe-area-inset-bottom))}.bottom-nav a{min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#8b818e;text-decoration:none;font-size:10px}.bottom-nav a.active{color:var(--plum);font-weight:800}.bottom-nav lucide-icon{height:21px;width:21px}}`] })
export class AppComponent implements OnInit { session = inject(Session); lang = inject(Language); private api = inject(Api); async ngOnInit() { await this.session.refresh(this.api); if (this.session.active()) { try { const saved = (await this.api.get('/preferences'))?.language; if (saved === 'en' || saved === 'fr' || saved === 'tn') this.lang.set(saved); } catch {} } } async changeLanguage(event: Event) { const value = (event.target as HTMLSelectElement).value as 'en' | 'fr' | 'tn'; this.lang.set(value); if (this.session.active()) { try { const preferences = await this.api.get('/preferences') || {}; await this.api.put('/preferences', { ...preferences, language: value }); } catch {} } } }



