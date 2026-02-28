import { useState, useCallback, useEffect, type FC } from 'react';
import type { UEPin } from '../types/ue-graph';
import type { PinCategory } from '../types/pin-types';
import type React from 'react';

interface PinValueEditorProps {
  pin: UEPin;
}

function editorForCategory(
  category: PinCategory,
  value: string,
  onChange: (val: string) => void,
): React.ReactNode {
  switch (category) {
    case 'bool':
      return (
        <label className="ueflow-editor-bool">
          <input
            type="checkbox"
            checked={value.toLowerCase() === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            className="ueflow-editor-checkbox"
          />
        </label>
      );

    case 'int':
    case 'byte':
      return (
        <input
          type="number"
          value={value}
          step={1}
          onChange={(e) => onChange(e.target.value)}
          className="ueflow-editor-number"
        />
      );

    case 'real':
    case 'float':
      return (
        <input
          type="number"
          value={value}
          step={0.1}
          onChange={(e) => onChange(e.target.value)}
          className="ueflow-editor-number"
        />
      );

    case 'string':
    case 'name':
    case 'text':
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ueflow-editor-text"
        />
      );

    case 'struct': {
      // Check for vector/rotator patterns: (X=0,Y=0,Z=0)
      const vectorMatch = value.match(/^\(X=([\d.-]+),Y=([\d.-]+),Z=([\d.-]+)\)$/i);
      if (vectorMatch) {
        return (
          <div className="ueflow-editor-vector">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <input
                key={axis}
                type="number"
                value={vectorMatch[i + 1]}
                step={0.1}
                placeholder={axis}
                onChange={(e) => {
                  const vals = [vectorMatch[1], vectorMatch[2], vectorMatch[3]];
                  vals[i] = e.target.value;
                  onChange(`(X=${vals[0]},Y=${vals[1]},Z=${vals[2]})`);
                }}
                className="ueflow-editor-number ueflow-editor-vector-input"
              />
            ))}
          </div>
        );
      }
      // Check for color pattern: (R=0,G=0,B=0,A=1)
      const colorMatch = value.match(/^\(R=([\d.-]+),G=([\d.-]+),B=([\d.-]+),A=([\d.-]+)\)$/i);
      if (colorMatch) {
        const r = Math.round(parseFloat(colorMatch[1]) * 255);
        const g = Math.round(parseFloat(colorMatch[2]) * 255);
        const b = Math.round(parseFloat(colorMatch[3]) * 255);
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        return (
          <input
            type="color"
            value={hex}
            onChange={(e) => {
              const h = e.target.value;
              const nr = parseInt(h.slice(1, 3), 16) / 255;
              const ng = parseInt(h.slice(3, 5), 16) / 255;
              const nb = parseInt(h.slice(5, 7), 16) / 255;
              onChange(`(R=${nr.toFixed(6)},G=${ng.toFixed(6)},B=${nb.toFixed(6)},A=${colorMatch![4]})`);
            }}
            className="ueflow-editor-color"
          />
        );
      }
      // Fallback: text input for other structs
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ueflow-editor-text"
        />
      );
    }

    case 'enum':
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ueflow-editor-text"
        />
      );

    default:
      return (
        <span className="ueflow-pin-value">{value}</span>
      );
  }
}

export const PinValueEditor: FC<PinValueEditorProps> = ({ pin }) => {
  const [value, setValue] = useState(pin.defaultValue);

  // Sync local state when the pin prop changes (e.g., graph switch)
  useEffect(() => {
    setValue(pin.defaultValue);
  }, [pin.id, pin.defaultValue]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  if (!pin.defaultValue && !value) return null;

  return (
    <div className="ueflow-pin-editor" onClick={(e) => e.stopPropagation()}>
      {editorForCategory(pin.category, value, handleChange)}
    </div>
  );
};
