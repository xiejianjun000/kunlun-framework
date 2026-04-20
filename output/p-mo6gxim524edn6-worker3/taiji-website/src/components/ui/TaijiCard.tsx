import { Card } from 'antd';
import { cn } from '../../lib/utils';

interface TaijiCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  title?: React.ReactNode;
  extra?: React.ReactNode;
  onClick?: () => void;
}

export const TaijiCard: React.FC<TaijiCardProps> = ({
  children,
  className,
  hoverable = true,
  title,
  extra,
  onClick,
}) => {
  return (
    <Card
      title={title}
      extra={extra}
      hoverable={hoverable}
      onClick={onClick}
      className={cn(
        'bg-white/80 backdrop-blur-sm border-0 rounded-2xl',
        'shadow-[0_4px_20px_rgba(74,111,165,0.1),0_12px_40px_rgba(107,76,154,0.1)]',
        'transition-all duration-500',
        hoverable && 'hover:shadow-[0_8px_30px_rgba(74,111,165,0.15),0_20px_60px_rgba(107,76,154,0.15)] hover:-translate-y-1',
        className
      )}
      styles={{
        body: { padding: '24px' },
        header: { borderBottom: '1px solid rgba(74, 111, 165, 0.1)' },
      }}
    >
      {children}
    </Card>
  );
};
