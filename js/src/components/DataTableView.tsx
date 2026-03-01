import type { FC } from 'react';

interface DataTableViewProps {
  name: string;
  columns?: string[];
  sampleRows?: unknown[];
}

export const DataTableView: FC<DataTableViewProps> = ({ name, columns, sampleRows }) => {
  const rows = sampleRows ?? [];
  const cols = columns ?? (rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : []);

  return (
    <div className="ueflow-table-view">
      <div className="ueflow-table-header">
        <span>{name}</span>
        <span className="ueflow-table-header-count">{rows.length} rows</span>
      </div>
      <div className="ueflow-table-scroll">
        {cols.length > 0 ? (
          <table className="ueflow-table">
            <thead>
              <tr>
                {cols.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {cols.map((col) => (
                    <td key={col}>{String((row as Record<string, unknown>)[col] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: '#909090', padding: '16px', fontStyle: 'italic' }}>No data available</div>
        )}
      </div>
    </div>
  );
};
