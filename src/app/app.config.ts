import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection, isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'invitacion-reuniones',
        appId: '1:870966049558:web:6f5e4773c6593eee61ee37',
        storageBucket: 'invitacion-reuniones.firebasestorage.app',
        apiKey: 'AIzaSyCGGAiDBqZut6BUjOkkDt8_XzW-VeW74h4',
        authDomain: 'invitacion-reuniones.firebaseapp.com',
        messagingSenderId: '870966049558',
      })
    ),
    provideFirestore(() => getFirestore()), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }),
  ],
};
