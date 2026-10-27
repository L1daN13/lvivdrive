import type { LatLon } from '../types/location';

export interface UserPosition extends LatLon {
  accuracy: number;
}

/** Запитує поточне місцезнаходження. Викликається лише після натискання кнопки. */
export function getCurrentPosition(): Promise<UserPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Ваш браузер не підтримує геолокацію.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        const messages: Record<number, string> = {
          1: 'Доступ до геолокації заборонено. Дозвольте його в налаштуваннях браузера.',
          2: 'Не вдалося визначити місцезнаходження.',
          3: 'Час очікування геолокації вичерпано. Спробуйте ще раз.',
        };
        reject(new Error(messages[err.code] ?? 'Помилка геолокації.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}
