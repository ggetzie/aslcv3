import React from 'react';
import {View} from 'react-native';

export const RowView = ({
  style,
  children,
}: {
  style: any;
  children: React.ReactNode;
}) => {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'visible',
        },
        style ? style : {},
      ]}>
      {children}
    </View>
  );
};
