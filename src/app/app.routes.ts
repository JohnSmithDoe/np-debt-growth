import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'board',
    loadComponent: () =>
      import('./stage/feature/stage/stage.component').then(
        (m) => m.StageComponent
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'board' },
];
