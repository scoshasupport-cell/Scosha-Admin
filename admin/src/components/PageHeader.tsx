import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from './ui/Button';

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, backTo, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {backTo && (
          <Link to={backTo} className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeaderAction({
  to,
  children,
  onClick,
}: {
  to?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  if (to) {
    return (
      <Link to={to}>
        <Button>{children}</Button>
      </Link>
    );
  }
  return <Button onClick={onClick}>{children}</Button>;
}
