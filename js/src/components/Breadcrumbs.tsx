import type { FC } from 'react';

export interface BreadcrumbItem {
  label: string;
  graphName: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}

export const Breadcrumbs: FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  return (
    <div className="ueflow-breadcrumbs">
      {items.map((item, i) => (
        <span key={item.graphName}>
          {i > 0 && <span className="ueflow-breadcrumb-sep">&rsaquo;</span>}
          {i < items.length - 1 ? (
            <button
              className="ueflow-breadcrumb-link"
              onClick={() => onNavigate(i)}
            >
              {item.label}
            </button>
          ) : (
            <span className="ueflow-breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
};
