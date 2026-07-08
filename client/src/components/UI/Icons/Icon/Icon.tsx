import classes from './Icon.module.css';

import { useEffect, useState } from 'react';
import { Icon as MDIcon } from '@mdi/react';

interface Props {
  icon: string;
  color?: string;
}

type MDIcons = typeof import('@mdi/js');

let iconsPromise: Promise<MDIcons> | null = null;

const loadIcons = () => {
  if (!iconsPromise) {
    iconsPromise = import('@mdi/js');
  }

  return iconsPromise;
};

export const Icon = (props: Props): JSX.Element => {
  const [iconPath, setIconPath] = useState('');

  useEffect(() => {
    let isMounted = true;

    loadIcons().then((MDIcons) => {
      let path = MDIcons[props.icon as keyof MDIcons];

      if (!path) {
        console.log(`Icon ${props.icon} not found`);
        path = MDIcons.mdiCancel;
      }

      if (isMounted) {
        setIconPath(path);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [props.icon]);

  if (!iconPath) {
    return <span className={classes.Icon}></span>;
  }

  return (
    <MDIcon
      className={classes.Icon}
      path={iconPath}
      color={props.color ? props.color : 'var(--color-primary)'}
    />
  );
};
