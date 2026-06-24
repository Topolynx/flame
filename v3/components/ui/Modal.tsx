'use client';

import { mdiClose } from '@mdi/js';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

import { Icon } from './Icon';
import styles from './Modal.module.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export const Modal = ({ isOpen, onClose, children }: Props) => {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === backdropRef.current) {
      onClose();
    }
  };

  const wrapperClassName = `${styles.modal} ${isOpen ? styles.open : styles.closed}`;

  return (
    <div
      className={wrapperClassName}
      onClick={handleBackdropClick}
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
    >
      <div className={styles.dialog}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          <Icon path={mdiClose} width={24} height={24} />
        </button>
        {children}
      </div>
    </div>
  );
};
