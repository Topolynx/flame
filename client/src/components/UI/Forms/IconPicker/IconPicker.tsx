import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

import classes from './IconPicker.module.css';

import { ApiResponse, IconFile } from '../../../../interfaces';
import { applyAuth } from '../../../../utility';

interface Props {
  value: string;
  onChange: (icon: string) => void;
}

export const IconPicker = ({ value, onChange }: Props): JSX.Element | null => {
  const [icons, setIcons] = useState<IconFile[]>([]);

  useEffect(() => {
    axios
      .get<ApiResponse<IconFile[]>>('/api/icons', {
        headers: applyAuth(),
      })
      .then((res) => setIcons(res.data.data))
      .catch((err) => console.log(err));
  }, []);

  const selectedIcon = useMemo(
    () => icons.find((icon) => icon.name === value),
    [icons, value]
  );

  if (!icons.length) {
    return null;
  }

  return (
    <div className={classes.IconPicker}>
      {selectedIcon ? (
        <img
          src={`${selectedIcon.url}?v=${selectedIcon.modifiedAt || selectedIcon.size}`}
          alt={selectedIcon.name}
          className={classes.Preview}
        />
      ) : (
        <span className={classes.EmptyPreview}></span>
      )}
      <select
        value={selectedIcon?.name || ''}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
          }
        }}
      >
        <option value="">Select existing icon</option>
        {icons.map((icon) => (
          <option value={icon.name} key={icon.name}>
            {icon.name}
          </option>
        ))}
      </select>
    </div>
  );
};
