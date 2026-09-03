import 'vitest-canvas-mock';

import {
  provideZonelessChangeDetection,
  NgModule,
  type Provider,
} from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import {
  platformBrowserTesting,
  BrowserTestingModule,
} from '@angular/platform-browser/testing';

@NgModule({
  providers: [provideZonelessChangeDetection() as unknown as Provider],
  exports: [BrowserTestingModule],
})
class TestingModule {}

getTestBed().initTestEnvironment(TestingModule, platformBrowserTesting());
