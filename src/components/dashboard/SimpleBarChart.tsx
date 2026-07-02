import React from 'react';
import { Card } from '@/components/ui/Card';

interface BarData {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  title: string;
  data: BarData[];
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ title, data }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <Card style={{ padding: '24px' }}>
      <h3 className="semibold text-base" style={{ color: 'var(--color-black)', marginBottom: '24px' }}>
        {title}
      </h3>
      
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: '200px',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--color-border)'
      }}>
        {data.map((item) => {
          const percentage = (item.value / maxValue) * 100;
          return (
            <div key={item.label} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '40px',
              gap: '8px'
            }}>
              {/* Altura de la barra con animación de entrada */}
              <div style={{
                height: `${percentage * 1.5}px`, // Escalado para visualización
                maxHeight: '150px',
                minHeight: item.value > 0 ? '4px' : '0px',
                width: '24px',
                backgroundColor: 'var(--color-primary)',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.5s ease',
                position: 'relative'
              }} title={`${item.value} tickets`}>
                <span className="semibold text-xs" style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'var(--color-black)'
                }}>
                  {item.value}
                </span>
              </div>
              <span className="text-muted text-xs truncate" style={{ maxWidth: '60px' }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
