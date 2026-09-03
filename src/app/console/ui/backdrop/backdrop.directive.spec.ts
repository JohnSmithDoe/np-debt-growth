import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { BackdropDirective } from './backdrop.directive';

@Component({
  template: `<div class="scrim" (cbBackdrop)="left = left + 1">
    <p class="doc">prose</p>
  </div>`,
  imports: [BackdropDirective],
})
class HostComponent {
  left = 0;
}

describe('BackdropDirective', () => {
  let host: HostComponent;
  let scrim: HTMLElement;
  let doc: HTMLElement;

  const press = (from: HTMLElement, to: HTMLElement, detail = 1): void => {
    from.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    to.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    scrim = fixture.nativeElement.querySelector('.scrim');
    doc = fixture.nativeElement.querySelector('.doc');
  });

  it('leaves on a press that starts and ends on the backdrop', () => {
    press(scrim, scrim);
    expect(host.left).toBe(1);
  });

  it('stays when the press is on the document', () => {
    press(doc, doc);
    expect(host.left).toBe(0);
  });

  it('stays when a drag out of the document releases on the backdrop', () => {
    press(doc, scrim);
    expect(host.left).toBe(0);
  });

  it('stays on a keyboard-activated click', () => {
    press(scrim, scrim, 0);
    expect(host.left).toBe(0);
  });

  it('does not stay armed for a later click', () => {
    scrim.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    scrim.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    doc.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(host.left).toBe(1);
  });
});
