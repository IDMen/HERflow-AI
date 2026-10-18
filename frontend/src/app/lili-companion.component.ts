import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Api, Language, Session } from './services';

type TipKind = 'period' | 'premenstrual' | 'energy' | 'general';
type Tip = { en: string; fr: string; tn: string; kind: TipKind };
const sessionGet=(key:string)=>{try{return typeof window==='undefined'?null:window.sessionStorage?.getItem(key)??null;}catch{return null;}};
const sessionSet=(key:string,value:string)=>{try{if(typeof window!=='undefined')window.sessionStorage?.setItem(key,value);}catch{}};
const sessionRemove=(key:string)=>{try{if(typeof window!=='undefined')window.sessionStorage?.removeItem(key);}catch{}};

const TIPS: Tip[] = [
  { kind: 'period', en: 'A little water break can be a kind reset 💜', fr: 'Une pause avec un peu d’eau peut faire du bien 💜', tn: 'Heyy 💜 Ma tensach techreb me lyoum!' },
  { kind: 'period', en: 'If you feel tired, a short pause is completely okay 🌸', fr: 'Si vous vous sentez fatiguée, une petite pause est tout à fait bienvenue 🌸', tn: 'Kenek t7essi b fatigue, khoudhi pause sghira 🌸' },
  { kind: 'period', en: 'Gentle movement is an option if it feels comfortable 🚶‍♀️', fr: 'Une marche douce est possible si vous en avez envie 🚶‍♀️', tn: 'Chwaya marche kenek merta7a tnajem t3awnek 🚶‍♀️' },
  { kind: 'period', en: 'A balanced meal and a little rest can help you care for yourself 🥗', fr: 'Un repas équilibré et un peu de repos, c’est aussi prendre soin de vous 🥗', tn: 'Koul mekla équilibrée w ma tensach ra7tek 🥗' },
  { kind: 'period', en: 'Feeling stressed? Try two quiet minutes of breathing 🌷', fr: 'Un peu de stress ? Essayez deux minutes de respiration calme 🌷', tn: '3andek barcha stress? Jarreb 2 minutes respiration 🌷' },
  { kind: 'period', en: 'Choose a comfortable routine and leave room for breaks 💜', fr: 'Choisissez un rythme confortable et gardez du temps pour les pauses 💜', tn: 'E5tar routine merta7a w 5alli wa9t lil pauses 💜' },
  { kind: 'premenstrual', en: 'You could make your upcoming routine a little more comfortable 🌸', fr: 'Vous pouvez préparer une routine un peu plus confortable 🌸', tn: 'Wajjed routine merta7a lel iyem ejjeyin 🌸' },
  { kind: 'premenstrual', en: 'Would adding a few breaks to your upcoming plans help?', fr: 'Ajouter quelques pauses à votre planning pourrait-il vous aider ?', tn: 'Y3awnek ken tzid chwaya pauses lel planning?' },
  { kind: 'premenstrual', en: 'Check the energy preferences you chose and plan at your pace 💜', fr: 'Pensez aux préférences d’énergie que vous avez choisies et avancez à votre rythme 💜', tn: 'Chouf préférences el énergie mte3ek w emchi b rythme mte3ek 💜' },
  { kind: 'premenstrual', en: 'A quick look at your deadlines can make the week feel clearer ✨', fr: 'Un coup d’œil à vos échéances peut clarifier la semaine ✨', tn: 'Chouf el délais mte3ek bech ywalli el planning awdha7 ✨' },
  { kind: 'energy', en: 'Your check-in says today is a lower-energy day. Keep the plan gentle 💜', fr: 'Votre bilan indique une énergie plus basse aujourd’hui. Gardez un rythme doux 💜', tn: 'El check-in mte3ek y9oul el énergie habta lyoum. Emchi b chwaya 💜' },
  { kind: 'general', en: 'A small, steady step still moves you forward ✨', fr: 'Un petit pas régulier vous fait avancer aussi ✨', tn: 'Bravo 3lik! Kol petit progrès yhem ✨' },
  { kind: 'general', en: 'A short screen break can give your mind a moment to reset 🌷', fr: 'Une courte pause d’écran peut vous offrir un moment pour souffler 🌷', tn: 'Pause sghira mel écran tnajem t3awnek ترتاح chwaya 🌷' },
  { kind: 'general', en: 'You do not have to do everything at once. Pick one next step 💜', fr: 'Vous n’avez pas à tout faire d’un coup. Choisissez une prochaine étape 💜', tn: 'Mouch lezem ta3mel kol chay dho9a. E5tar 5otwa wa7da 💜' },
];

@Component({
  selector: 'app-lili-companion', standalone: true, imports: [CommonModule],
  template: `@if(available() && !closed()){<aside class="lili" [class.minimized]="minimized()" aria-label="Lili wellness companion">
    @if(!minimized() && bubble() && !muted()){<div class="bubble" role="status" aria-live="polite"><p>{{bubble()}}</p><div class="bubble-actions"><button type="button" (click)="another()">{{lang.t('liliAnother')}}</button><button type="button" class="icon" [attr.aria-label]="lang.t('liliMute')" (click)="toggleMute()">{{muted() ? '🔈' : '🔇'}}</button><button type="button" class="icon" [attr.aria-label]="lang.t('liliMinimize')" (click)="minimized.set(true)">−</button><button type="button" class="icon close" [attr.aria-label]="lang.t('liliClose')" (click)="close()">×</button></div></div>}
    <button class="mascot-button" type="button" (click)="tap()" [attr.aria-label]="lang.t('liliOpen')" [attr.title]="lang.t('liliOpen')">
      @if(minimized()){<span class="restore">✦</span>}
      <svg class="mascot" viewBox="0 0 100 112" role="img" aria-label="Lili"><defs><linearGradient id="liliBody" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#e9d7ff"/><stop offset="1" stop-color="#b58be5"/></linearGradient><radialGradient id="liliGlow"><stop stop-color="#fff"/><stop offset="1" stop-color="#e7d7ff"/></radialGradient></defs><path class="wing" d="M26 62 Q5 43 12 32 Q29 39 34 56 M74 62 Q95 43 88 32 Q71 39 66 56"/><ellipse cx="50" cy="66" rx="29" ry="35" fill="url(#liliBody)"/><path d="M30 43 Q28 13 50 20 Q72 13 70 43 Q62 31 50 34 Q38 31 30 43" fill="#8d63bd"/><path d="M48 21 Q49 8 62 9 Q54 14 59 18" fill="none" stroke="#8d63bd" stroke-width="5" stroke-linecap="round"/><ellipse cx="39" cy="62" rx="5" ry="7" fill="#603b91"/><ellipse cx="61" cy="62" rx="5" ry="7" fill="#603b91"/><circle cx="40" cy="60" r="1.7" fill="#fff"/><circle cx="62" cy="60" r="1.7" fill="#fff"/><path d="M46 75 Q50 80 54 75" fill="none" stroke="#a755a9" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="31" cy="70" rx="6" ry="3" fill="#efa7cc" opacity=".7"/><ellipse cx="69" cy="70" rx="6" ry="3" fill="#efa7cc" opacity=".7"/><path d="M42 98 Q50 89 58 98 L50 105Z" fill="#66d8c3" stroke="#fff" stroke-width="2"/><circle cx="50" cy="53" r="3" fill="url(#liliGlow)"/></svg>
    </button>
  </aside>}`,
  styles: [`:host{position:fixed;right:18px;bottom:20px;z-index:30;pointer-events:none}.lili{position:relative;display:grid;justify-items:end;gap:8px;pointer-events:none}.lili>*{pointer-events:auto}.mascot-button{border:0;background:transparent;width:88px;height:105px;padding:5px;cursor:pointer;filter:drop-shadow(0 7px 12px #68458b30);animation:lili-float 3.8s ease-in-out infinite;touch-action:manipulation}.mascot{width:100%;height:100%;overflow:visible}.wing{fill:#c7a5e9;stroke:#a57bce;stroke-width:2;transform-origin:center;animation:lili-wave 4s ease-in-out infinite}.bubble{width:min(280px,calc(100vw - 38px));background:#fff;border:1px solid #eadcf1;border-radius:16px 16px 4px 16px;padding:13px 14px;box-shadow:0 8px 28px #40255520;color:#514058}.bubble p{font-size:13px;line-height:1.5;margin:0 0 7px}.bubble-actions{display:flex;justify-content:flex-end;align-items:center;gap:5px}.bubble-actions button{border:0;background:#f3ebf8;color:#66447b;border-radius:8px;min-height:32px;padding:5px 9px;font-size:11px;cursor:pointer}.bubble-actions .icon{min-width:32px;padding:4px;font-size:16px}.bubble-actions .close{color:#885578}.minimized .mascot-button{width:53px;height:60px;background:#f1e6fb;border-radius:50%;padding:8px}.restore{position:absolute;right:17px;top:12px;color:#755090}.lili.minimized{display:block}@keyframes lili-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes lili-wave{0%,80%,100%{transform:rotate(0)}86%{transform:rotate(-9deg)}92%{transform:rotate(7deg)}}@media(max-width:767px){:host{right:8px;bottom:82px}.mascot-button{width:68px;height:82px}.bubble{width:min(250px,calc(100vw - 24px))}}@media(prefers-reduced-motion:reduce){.mascot-button,.wing{animation:none!important}}`]
})
export class LiliCompanionComponent implements OnInit, OnDestroy {
  private api=inject(Api); private session=inject(Session); private router=inject(Router); lang=inject(Language);
  available=signal(false); bubble=signal(''); minimized=signal(false); muted=signal(false); closed=signal(sessionGet('herflow_lili_closed')==='true');
  private currentTip=signal<Tip|null>(null);
  private cycle:any=null; private capacity:number|null=null; private route=this.router.url; private navSub:any;
  private languageEffect=effect(()=>{const tip=this.currentTip();if(tip)this.bubble.set(tip[this.lang.code()]);});
  async ngOnInit(){
    this.navSub=this.router.events.pipe(filter(e=>e instanceof NavigationEnd)).subscribe(e=>{this.route=(e as NavigationEnd).urlAfterRedirects;this.refreshAvailability();});
    this.refreshAvailability();
    if(!this.session.active())return;
    try{
      const [prefs,user]=await Promise.all([this.api.get('/preferences'),Promise.resolve(this.session.user())]);
      if(prefs?.liliEnabled===false||localStorage.getItem('herflow_lili_disabled')==='true'){this.available.set(false);return;}
      this.muted.set(prefs?.liliMuted===true||sessionGet('herflow_lili_muted')==='true');
      const consent=!!user?.['privacyConsent'];
      if(consent){try{this.cycle=await this.api.get('/cycle');}catch{this.cycle=null;}}
      try{const checkins=await this.api.get('/checkins');const today=new Date().toISOString().slice(0,10);const checkin=checkins?.find((x:any)=>x.date===today);this.capacity=typeof checkin?.capacity==='number'?checkin.capacity:null;}catch{}
      if(!sessionGet('herflow_lili_auto_seen')){sessionSet('herflow_lili_auto_seen','1');this.showTip(this.chooseTip(consent));}
    }catch{}
  }
  ngOnDestroy(){this.navSub?.unsubscribe();}
  private refreshAvailability(){const path=this.route.split('?')[0];this.available.set(this.session.active()&&!['/login','/register','/onboarding','/settings'].includes(path)&&localStorage.getItem('herflow_lili_disabled')!=='true');}
  private chooseTip(consent:boolean):Tip{
    const today=new Date();const key=this.dateKey(today);let kind:TipKind='general';
    if(this.capacity!==null&&this.capacity<40)kind='energy';
    else if(consent&&this.cycle?.lastPeriodDate){
      const start=this.dateKey(new Date(this.cycle.lastPeriodDate));const elapsed=Math.floor((Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())-Date.UTC(start.getFullYear(),start.getMonth(),start.getDate()))/86400000);
      const duration=Number(this.cycle.periodDuration)||5;const length=Number(this.cycle.typicalCycleDays)||28;
      if(elapsed>=0&&elapsed<duration)kind='period';else if(this.cycle.isRegular!==false&&elapsed>=Math.max(0,length-5)&&elapsed<length)kind='premenstrual';
    }
    const pool=TIPS.filter(t=>t.kind===kind);let recent:string[]=[];try{recent=JSON.parse(sessionGet('herflow_lili_recent')||'[]');}catch{}const unseen=pool.filter(t=>!recent.includes(t.en));const tip=(unseen.length?unseen:pool)[Math.floor(Math.random()*(unseen.length||pool.length))];
    const chosen=tip||TIPS.find(t=>t.kind==='general')!;sessionSet('herflow_lili_recent',JSON.stringify([...recent,chosen.en].slice(-5)));return chosen;
  }
  private dateKey(value:Date){return new Date(value.getFullYear(),value.getMonth(),value.getDate());}
  private showTip(tip:Tip){this.currentTip.set(tip);this.bubble.set(tip[this.lang.code()]);this.minimized.set(false);}
  another(){this.showTip(this.chooseTip(!!this.session.user()?.['privacyConsent']));}
  tap(){if(this.minimized()){this.minimized.set(false);if(!this.bubble())this.another();return;}if(this.muted()){this.muted.set(false);sessionRemove('herflow_lili_muted');}this.another();}
  async toggleMute(){const value=!this.muted();this.muted.set(value);if(value)sessionSet('herflow_lili_muted','true');else sessionRemove('herflow_lili_muted');try{await this.api.patch('/preferences/wellness',{liliMuted:value});}catch{}}
  close(){this.closed.set(true);sessionSet('herflow_lili_closed','true');}
}
