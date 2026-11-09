import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface AnvAILogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'badge';
  className?: string;
  theme?: 'dark' | 'light' | 'auto';
}

export function AnvAILogo({ size = 'md', variant = 'full', className = '', theme = 'auto' }: AnvAILogoProps) {
  const dimensions = {
    sm: { iconBox: 'w-7 h-7', iconSize: 'w-4 h-4', textTitle: 'text-xs', textSub: 'text-[9px]', gap: 'gap-2' },
    md: { iconBox: 'w-9 h-9', iconSize: 'w-5 h-5', textTitle: 'text-sm font-black', textSub: 'text-[10px]', gap: 'gap-2.5' },
    lg: { iconBox: 'w-12 h-12', iconSize: 'w-6 h-6', textTitle: 'text-lg font-black', textSub: 'text-xs', gap: 'gap-3' },
    xl: { iconBox: 'w-16 h-16', iconSize: 'w-8 h-8', textTitle: 'text-2xl font-black', textSub: 'text-sm', gap: 'gap-3.5' },
  }[size];

  const LogoIcon = (
    <div
      className={`${dimensions.iconBox} rounded-xl bg-gradient-to-tr from-[#1E4B75] via-[#028DAA] to-[#22D3EE] text-white flex items-center justify-center font-black shadow-md border border-[#38BDF8]/40 shrink-0`}
    >
      <ShieldAlert className={dimensions.iconSize} />
    </div>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{LogoIcon}</div>;
  }

  return (
    <div className={`inline-flex items-center ${dimensions.gap} ${className} select-none`}>
      {LogoIcon}
      <div className="flex flex-col justify-center leading-tight">
        <div className="flex items-center gap-1.5">
          <span className={`tracking-tight font-black ${dimensions.textTitle} bg-gradient-to-r from-[#1E4B75] via-[#336799] to-[#028DAA] bg-clip-text text-transparent uppercase`}>
            Fraud
          </span>
          <span className={`font-black tracking-tight uppercase ${dimensions.textTitle} ${theme === 'dark' ? 'text-white' : 'text-[#0F2B48]'}`}>
            Detection
          </span>
        </div>
        <span className={`font-semibold tracking-wider uppercase text-[#028DAA] ${dimensions.textSub}`}>
          Banking Transaction Security &amp; Anomaly Hub
        </span>
      </div>
    </div>
  );
}
