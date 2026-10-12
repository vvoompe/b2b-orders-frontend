import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'medium' | 'small';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

/** Базова кнопка застосунку: однакові стани hover/active/disabled і видимий фокус. */
export function Button({
  variant = 'primary',
  size = 'medium',
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'small' ? styles.small : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={className === undefined ? classes : `${classes} ${className}`} {...rest}>
      {children}
    </button>
  );
}
