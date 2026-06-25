'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import { useToast } from '@/components/toast/ToastProvider';
import { Button } from '@/components/ui/Button';
import { acceptedUploadExtensions } from '@/lib/uploads';
import styles from './UploadField.module.css';

type UploadResponse = {
  success: boolean;
  message?: string;
  path?: string;
};

type Props = {
  value: string;
  onUploaded: (publicPath: string) => void;
  label?: string;
  id?: string;
};

export const UploadField = ({ value, onUploaded, label = 'Upload icon', id }: Props) => {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
      const body = new FormData();

      body.append('file', file);

      const response = await fetch('/api/uploads', { method: 'POST', body });
      const payload = (await response.json()) as UploadResponse;

      if (!response.ok || !payload.success || !payload.path) {
        toast.error(payload.message ?? 'Upload failed');

        return;
      }

      onUploaded(payload.path);

      toast.success('Upload saved');
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={styles.uploadField}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={acceptedUploadExtensions}
        className={styles.fileInput}
        onChange={handleChange}
      />
      <Button onClick={handleClick} disabled={isUploading}>
        {isUploading ? 'Uploading…' : label}
      </Button>
      {value && <span className={styles.currentValue}>{value}</span>}
    </div>
  );
};
