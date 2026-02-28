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
  if (items.length <= 1) return null;

  return (
    <div className="ueflow-breadcrumbs">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="ueflow-breadcrumb-sep">&rsaquo;</span>}
          {i < items.length - 1 ? (
            <a
              className="ueflow-breadcrumb-link"
              onClick={() => onNavigate(i)}
            >
              {item.label}
            </a>
          ) : (
            <span className="ueflow-breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
};
