import React from 'react';
import {View} from 'react-native';

interface Props {
  style?: any;
}

export const RowView: React.FC<Props> = (props) => {
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
        props.style ? props.style : {},
      ]}>
      {props.children}
    </View>
  );
};
