import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <View className={`bg-gray-800 rounded-2xl p-4 ${className}`} {...props}>
      {children}
    </View>
  );
};
