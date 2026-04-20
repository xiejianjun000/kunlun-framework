import { Button } from 'antd';
import { cn } from '../../lib/utils';

interface TaijiButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  htmlType?: 'button' | 'submit' | 'reset';
}

export const TaijiButton: React.FC<TaijiButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  className,
  onClick,
  disabled,
  loading,
  icon,
  htmlType = 'button',
}) => {
  const baseStyles = 'font-medium transition-all duration-300 rounded-full';
  
  const variants = {
    primary: 'bg-gradient-to-r from-taiji-primary to-taiji-accent text-white hover:shadow-lg hover:-translate-y-0.5 border-0',
    secondary: 'bg-taiji-paper text-taiji-ink hover:bg-taiji-primary hover:text-white border border-taiji-primary/30',
    outline: 'bg-transparent border-2 border-taiji-primary text-taiji-primary hover:bg-taiji-primary hover:text-white',
    ghost: 'bg-transparent text-taiji-primary hover:bg-taiji-primary/10 border-0',
  };

  const sizes = {
    small: 'px-4 py-1.5 text-sm',
    medium: 'px-6 py-2.5 text-base',
    large: 'px-8 py-3.5 text-lg',
  };

  return (
    <Button
      type="text"
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      icon={icon}
      htmlType={htmlType}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
    >
      {children}
    </Button>
  );
};
