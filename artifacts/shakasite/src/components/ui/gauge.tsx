import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GaugeProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export function Gauge({ value, size = 120, strokeWidth = 10, className, label }: GaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  // We only draw 75% of the circle to make it look like a dashboard gauge
  const arcLength = circumference * 0.75; 
  const dashOffset = arcLength - (clampedValue / 100) * arcLength;
  
  // Color calculation based on value
  let colorClass = "text-success";
  if (value >= 70) colorClass = "text-warning";
  if (value >= 100) colorClass = "text-destructive";

  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-225" // Rotate to start from bottom left
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          className="text-secondary"
        />
        {/* Value arc */}
        <motion.circle
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          className={colorClass}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="text-2xl font-bold font-display">{Math.round(value)}%</span>
        {label && <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>}
      </div>
    </div>
  );
}
