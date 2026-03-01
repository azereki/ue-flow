import type { FC } from 'react';
import { PIN_COLORS, classifyPinType } from '../types/pin-types';

interface StructViewProps {
  name: string;
  fields: Array<{ name: string; type: string; default?: string }>;
}

export const StructView: FC<StructViewProps> = ({ name, fields }) => {
  return (
    <div className="ueflow-table-view">
      <div className="ueflow-table-header">
        <span>{name}</span>
        <span className="ueflow-table-header-count">{fields.length} fields</span>
      </div>
      <div className="ueflow-table-scroll">
        <table className="ueflow-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={i}>
                <td>{f.name}</td>
                <td>
                  <span
                    className="ueflow-table-type-dot"
                    style={{ background: PIN_COLORS[classifyPinType(f.type)] ?? '#808080' }}
                  />
                  {f.type}
                </td>
                <td>{f.default ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
