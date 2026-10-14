import { useState } from 'react';
import { Button } from './Button';

/**
 * Кнопка «Копіювати посилання»: копіює адресу поточного екрана в буфер обміну
 * й повідомляє результат через aria-live, щоб підтвердження озвучувалось і
 * екранним читачем.
 */
export function CopyLinkButton({ label = 'Копіювати посилання' }: { label?: string }) {
  const [message, setMessage] = useState('');

  const copy = async (): Promise<void> => {
    const url = window.location.href;

    try {
      if (navigator.clipboard !== undefined) {
        await navigator.clipboard.writeText(url);
      } else {
        const area = document.createElement('textarea');
        area.value = url;
        area.setAttribute('readonly', '');
        document.body.append(area);
        try {
          area.select();
          if (!document.execCommand('copy')) throw new Error('Копіювання відхилено');
        } finally {
          area.remove();
        }
      }
      setMessage('Посилання скопійовано в буфер обміну.');
    } catch {
      setMessage('Не вдалося скопіювати автоматично - скопіюйте адресу з рядка браузера.');
    }
  };

  return (
    <div>
      <Button variant="ghost" onClick={() => void copy()}>
        {label}
      </Button>
      <p role="status" aria-live="polite" style={{ marginTop: 8, fontSize: 13 }}>
        {message}
      </p>
    </div>
  );
}
