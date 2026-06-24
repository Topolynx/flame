import { SelectField } from './SelectField';

export const NULL_VALUE = '__null__';

type Props = {
  id: string;
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  trueLabel: string;
  falseLabel: string;
  inheritLabel?: string;
  disabled?: boolean;
};

export const TernaryBooleanField = ({
  id,
  label,
  value,
  onChange,
  trueLabel,
  falseLabel,
  inheritLabel = 'Inherit global',
  disabled,
}: Props) => (
  <SelectField
    id={id}
    label={label}
    value={value === null ? NULL_VALUE : value ? 'true' : 'false'}
    onChange={raw => onChange(raw === NULL_VALUE ? null : raw === 'true')}
    options={[
      { value: NULL_VALUE, label: inheritLabel },
      { value: 'true', label: trueLabel },
      { value: 'false', label: falseLabel },
    ]}
    disabled={disabled}
  />
);
