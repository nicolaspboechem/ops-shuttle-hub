import { APP_VERSION, APP_NAME } from '@/lib/version';
import { cn } from '@/lib/utils';

interface VersionBadgeProps {
  className?: string;
  variant?: 'default' | 'subtle' | 'footer';
  showAppName?: boolean;
}

export function VersionBadge({ 
  className, 
  variant = 'default',
  showAppName = false 
}: VersionBadgeProps) {
  if (variant === 'footer') {
    return (
      <span className={cn("text-[10px] text-muted-foreground/50", className)}>
        {showAppName ? `${APP_NAME} · ` : ''}V{APP_VERSION}
      </span>
    );
  }

  if (variant === 'subtle') {
    return (
      <span className={cn("text-[10px] text-muted-foreground/50", className)}>
        V{APP_VERSION}
      </span>
    );
  }
  
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      V{APP_VERSION}
    </span>
  );
}
