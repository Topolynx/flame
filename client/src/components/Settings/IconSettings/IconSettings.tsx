import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import axios from 'axios';

import classes from './IconSettings.module.css';

import { ApiResponse, IconFile } from '../../../interfaces';
import { applyAuth } from '../../../utility';
import { InputGroup, SettingsHeadline } from '../../UI';

const formatSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
};

export const IconSettings = (): JSX.Element => {
  const [icons, setIcons] = useState<IconFile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const loadIcons = async () => {
    const res = await axios.get<ApiResponse<IconFile[]>>('/api/icons', {
      headers: applyAuth(),
    });

    setIcons(res.data.data);
    setRenames(
      res.data.data.reduce<Record<string, string>>((acc, icon) => {
        acc[icon.name] = icon.name;
        return acc;
      }, {})
    );
  };

  useEffect(() => {
    loadIcons().catch((err) => {
      console.log(err);
      setMessage('Unable to load icons');
    });
  }, []);

  const uploadHandler = async (e: FormEvent) => {
    e.preventDefault();

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('icon', file);

    try {
      await axios.post<ApiResponse<IconFile>>('/api/icons', formData, {
        headers: applyAuth(),
      });
      setFile(null);
      setMessage(`Uploaded ${file.name}`);
      await loadIcons();
    } catch (err) {
      console.log(err);
      setMessage('Upload failed');
    }
  };

  const renameHandler = async (icon: IconFile) => {
    const nextName = renames[icon.name]?.trim();

    if (!nextName || nextName === icon.name) {
      return;
    }

    try {
      await axios.put<ApiResponse<IconFile>>(
        `/api/icons/${encodeURIComponent(icon.name)}`,
        { name: nextName },
        { headers: applyAuth() }
      );
      setMessage(`Renamed ${icon.name}`);
      await loadIcons();
    } catch (err) {
      console.log(err);
      setMessage('Rename failed');
    }
  };

  const deleteHandler = async (icon: IconFile) => {
    if (!window.confirm(`Delete ${icon.name}?`)) {
      return;
    }

    try {
      await axios.delete<ApiResponse<{}>>(
        `/api/icons/${encodeURIComponent(icon.name)}`,
        { headers: applyAuth() }
      );
      setMessage(`Deleted ${icon.name}`);
      await loadIcons();
    } catch (err) {
      console.log(err);
      setMessage('Delete failed');
    }
  };

  const fileChangeHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  return (
    <div>
      <SettingsHeadline text="Icons" />

      <form className={classes.IconActions} onSubmit={uploadHandler}>
        <InputGroup>
          <label htmlFor="iconUpload">Upload icon</label>
          <div className={classes.UploadRow}>
            <input
              type="file"
              id="iconUpload"
              accept=".jpg,.jpeg,.png,.svg,.webp,.ico,image/*"
              onChange={fileChangeHandler}
            />
            <button className={classes.SmallButton} type="submit">
              Upload
            </button>
          </div>
          <span>File names are preserved.</span>
        </InputGroup>
      </form>

      {message ? <p className={classes.Message}>{message}</p> : null}

      <div className={classes.IconGrid}>
        {icons.map((icon) => (
          <div className={classes.IconItem} key={icon.name}>
            <img
              src={`${icon.url}?v=${icon.modifiedAt || icon.size}`}
              alt={icon.name}
              className={classes.Preview}
            />
            <div className={classes.IconMeta}>
              <strong className={classes.IconName}>{icon.name}</strong>
              <span className={classes.IconSize}>{formatSize(icon.size)}</span>
              <div className={classes.EditRow}>
                <input
                  type="text"
                  value={renames[icon.name] || icon.name}
                  onChange={(e) =>
                    setRenames({
                      ...renames,
                      [icon.name]: e.target.value,
                    })
                  }
                />
                <button
                  className={classes.SmallButton}
                  type="button"
                  onClick={() => renameHandler(icon)}
                >
                  Rename
                </button>
                <button
                  className={classes.DangerButton}
                  type="button"
                  onClick={() => deleteHandler(icon)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
