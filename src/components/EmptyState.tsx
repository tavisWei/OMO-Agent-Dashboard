import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-[var(--color-bg-secondary)] rounded-xl border border-dashed border-[var(--color-border)] ${className}`}>
      <div className="w-16 h-16 mb-6 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[var(--color-text-secondary)]">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">
        {title}
      </h3>
      <p className="text-[var(--color-text-secondary)] max-w-md mb-8">
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
