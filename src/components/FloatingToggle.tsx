import React from 'react';

interface FloatingToggleProps {
  onToggle: () => void;
}

export const FloatingToggle: React.FC<FloatingToggleProps> = ({ onToggle }) => {
  return (
    <button
      type="button"
      className="floating-toggle"
      onClick={onToggle}
      title="إظهار / إخفاء شريط الأدوات العلوي"
    >
      👁
    </button>
  );
};
