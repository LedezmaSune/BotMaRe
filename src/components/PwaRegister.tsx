'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('PWA Service Worker registrado con éxito:', registration.scope);
          })
          .catch(error => {
            console.error('Error al registrar el Service Worker de la PWA:', error);
          });
      });
    }
  }, []);

  return null;
}
