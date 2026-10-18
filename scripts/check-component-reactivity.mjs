import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
for (const key of ['window','document','navigator','location','Node','Element','HTMLElement','Event','MouseEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
await import('@angular/compiler');
const { Component, provideZonelessChangeDetection, signal } = await import('@angular/core');
const { TestBed } = await import('@angular/core/testing');
const { BrowserTestingModule, platformBrowserTesting } = await import('@angular/platform-browser/testing');
TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

async function check(useSignal) {
  let release;
  const response = new Promise(resolve => { release = resolve; });
  class View {
    value = useSignal ? signal('Loading') : 'Loading';
    async ngOnInit() {
      const result = await response;
      if (useSignal) this.value.set(result);
      else this.value = result;
    }
    touch() {}
  }
  Component({ standalone: true, template: `<button (click)="touch()">{{${useSignal ? 'value()' : 'value'}}}</button>` })(View);
  await TestBed.configureTestingModule({ imports: [View], providers: [provideZonelessChangeDetection()] }).compileComponents();
  const fixture = TestBed.createComponent(View);
  fixture.detectChanges();
  assert.equal(fixture.nativeElement.textContent, 'Loading');
  release('Ready');
  await Promise.resolve();
  await fixture.whenStable();
  if (useSignal) assert.equal(fixture.nativeElement.textContent, 'Ready');
  else {
    assert.equal(fixture.nativeElement.textContent, 'Loading');
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    assert.equal(fixture.nativeElement.textContent, 'Ready');
  }
  fixture.destroy();
  TestBed.resetTestingModule();
}
await check(false);
await check(true);
console.log('PASS reproduced stale plain-field view; signal view updated without interaction');
