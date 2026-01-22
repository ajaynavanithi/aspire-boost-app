import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle } from 'lucide-react';

interface SkillBadgeProps {
  skill: string;
  variant?: 'default' | 'matched' | 'missing' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const SkillBadge: React.FC<SkillBadgeProps> = ({
  skill,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const variantClasses = {
    default: 'bg-secondary text-secondary-foreground',
    matched: 'bg-success/10 text-success border border-success/20',
    missing: 'bg-destructive/10 text-destructive border border-destructive/20',
    neutral: 'bg-muted text-muted-foreground',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  const icons = {
    default: null,
    matched: <Check className="w-3 h-3" />,
    missing: <X className="w-3 h-3" />,
    neutral: <AlertCircle className="w-3 h-3" />,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {icons[variant]}
      {skill}
    </span>
  );
};
