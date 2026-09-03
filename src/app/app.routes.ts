import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'board',
    loadComponent: () =>
      import('./stage/feature/stage/stage.component').then(
        (m) => m.StageComponent
      ),
  },
  {
    path: 'demo',
    loadComponent: () =>
      import('./stage/feature/demo/demo.component').then(
        (m) => m.DemoComponent
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'board' },
];
