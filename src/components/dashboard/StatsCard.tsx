import React from 'react';
import { Card } from '@/components/ui/Card';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor?: string;
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon,
  bgColor = 'var(--color-primary-light)',
  color = 'var(--color-primary)'
}) => {
  return (
    <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: bgColor,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <p className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </p>
        <h4 className="bold text-2xl" style={{ color: 'var(--color-black)', marginTop: '4px' }}>
          {value}
        </h4>
      </div>
    </Card>
  );
};
