import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Dimensions, FlatList,
  Image, Keyboard, Modal,
  Text, TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
  KeyboardEvent,
  I18nManager
} from 'react-native';
import CInput from '../TextInput';
import { useDeviceOrientation } from '../../useDeviceOrientation';
import { useDetectDevice } from '../../toolkits';
import { styles } from './styles';
import { DropdownProps } from './model';
import _ from 'lodash';
import Search from '../../assets/Search';

const { isTablet, isIOS } = useDetectDevice;
const ic_down = require('../../assets/down.png');

const DropdownComponent = React.forwardRef<any, DropdownProps>(({
  placeholder = 'Select item',
  activeColor = '#F6F7F8',
  data = [],
  style = {},
  selectedTextProps = {},
  onChange,
  containerStyle,
  placeholderStyle,
  selectedTextStyle,
  inputSearchStyle,
  iconStyle,
  labelField,
  valueField,
  value,
  fontFamily,
  iconColor = "gray",
  searchPlaceholder,
  autoSearchFoundOnly,
  search = false,
  maxHeight = 340,
  disable = false,
  keyboardAvoiding = true,
  renderLeftIcon,
  renderRightIcon,
  renderItem,
  renderInputSearch,
  onFocus,
  onBlur,
  autoScroll = true,
  showsVerticalScrollIndicator = true,
  dropdownPosition = 'auto',
  flatListProps,
  searchQuery,
}, currentRef) => {
  const orientation = useDeviceOrientation();
  const ref = useRef<View>(null);
  const refList = useRef<FlatList>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const [currentValue, setCurrentValue] = useState<any>(null);
  const [listData, setListData] = useState<any[]>(data);
  const [position, setPosition] = useState<any>();
  const [focus, setFocus] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  const { width: W, height: H } = Dimensions.get('window');
  const styleContainerVertical: ViewStyle = { backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center' };
  const styleHorizontal: ViewStyle = { marginBottom: 20, width: W / 2, alignSelf: 'center' };

  useImperativeHandle(currentRef, () => ({
    open: eventOpen,
    close: eventClose,
  }));

  useEffect(() => {
    setListData([...data]);
  }, [data]);

  const eventOpen = () => {
    if (!disable) {
      setVisible(true);
      onFocus?.();
    }
  };

  const eventClose = () => {
    if (!disable) {
      setVisible(false);
      onBlur?.();
    }
  };

  const font = () => (fontFamily ? { fontFamily } : {});

  const onKeyboardDidShow = (e: KeyboardEvent) => {
    _measure();
    setKeyboardHeight(e.endCoordinates.height + (isIOS ? 0 : 50));
  };

  const onKeyboardDidHide = () => {
    _measure();
    setKeyboardHeight(0);
  };

  useEffect(() => {
    const subscriptionKeyboardDidShow = Keyboard.addListener('keyboardDidShow', onKeyboardDidShow);
    const subscriptionKeyboardDidHide = Keyboard.addListener('keyboardDidHide', onKeyboardDidHide);

    return () => {
      subscriptionKeyboardDidShow.remove();
      subscriptionKeyboardDidHide.remove();
    };
  }, []);

  useEffect(() => {
    getValue();
  }, [value, data]);

  const getValue = () => {
    const getItem = data.filter(e => _.isEqual(value, _.get(e, valueField)));
    setCurrentValue(getItem.length > 0 ? getItem[0] : null);
  };

  const showOrClose = () => {
    if (!disable) {
      _measure();
      setVisible(!visible);
      setListData(data);
      if (!visible) onFocus?.();
      else onBlur?.();
    }
    scrollIndex();
  };

  const onSearch = (text: string) => {
    const defaultFilterFunction = (e: any) => {
      const item = _.get(e, labelField)?.toLowerCase().replace(' ', '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const key = text.toLowerCase().replace(' ', '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return item?.indexOf(key) >= 0 || false;
    };

    const propSearchFunction = (e: any) => searchQuery?.(text, _.get(e, labelField));

    setListData(text.length > 0 ? data.filter(searchQuery ? propSearchFunction : defaultFilterFunction) : data);
  };

  const scrollIndex = () => {
    if (autoScroll && data.length > 0 && listData.length === data.length) {
      setTimeout(() => {
        const index = _.findIndex(listData, e => _.isEqual(value, _.get(e, valueField)));
        if (index > -1 && index <= listData.length - 1) {
          refList?.current?.scrollToIndex({ index, animated: false });
        }
      }, 200);
    }
  };

  const onSelect = (item: any) => {
    onSearch('');
    setCurrentValue(item);
    onChange(item);
    eventClose();
  };

  const _renderDropdown = () => {
    const isSelected = currentValue && _.get(currentValue, valueField);
    return (
      <TouchableWithoutFeedback onPress={showOrClose}>
        <View style={styles.dropdown}>
          {renderLeftIcon?.()}
          <Text style={[styles.textItem, isSelected ? selectedTextStyle : placeholderStyle, font()]} {...selectedTextProps}>
            {isSelected ? _.get(currentValue, labelField) : placeholder}
          </Text>
          {renderRightIcon ? renderRightIcon() : <Image source={ic_down} style={[styles.icon, { tintColor: iconColor }, iconStyle]} />}
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const _renderItem = ({ item, index }: { item: any; index: number }) => {
    const isSelected = currentValue && _.get(currentValue, valueField);
    return (
      <TouchableOpacity key={index} onPress={() => onSelect(item)} style={[_.isEqual(_.get(item, valueField), isSelected) && { backgroundColor: activeColor }]}>
        {renderItem ? renderItem(item) : (
          <View style={styles.item}>
            <Text style={[styles.textItem, selectedTextStyle, font()]}>{_.get(item, labelField)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSearch = () => {
    if (search) {
      return renderInputSearch ? renderInputSearch(onSearch) : (
        <CInput
          renderLeftIcon={() => <Search />}
          style={[styles.input, inputSearchStyle]}
          inputStyle={[inputSearchStyle, font()]}
          autoCorrect={false}
          keyboardType={isIOS ? 'default' : 'visible-password'}
          placeholder={searchPlaceholder}
          onChangeText={onSearch}
          autoSearchFoundOnly={autoSearchFoundOnly}
          placeholderTextColor="gray"
          iconStyle={[{ tintColor: iconColor }, iconStyle]}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
        />
      );
    }
    return null;
  };

  const _renderListTop = () => (
    <TouchableWithoutFeedback>
      <View style={{ flexShrink: 1 }}>
        <FlatList
          {...flatListProps}
          keyboardShouldPersistTaps="handled"
          ref={refList}
          onScrollToIndexFailed={scrollIndex}
          data={listData}
          inverted
          renderItem={_renderItem}
          keyExtractor={(item, index) => index.toString()}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        />
        {renderSearch()}
      </View>
    </TouchableWithoutFeedback>
  );

  const _renderListBottom = () => (
    <TouchableWithoutFeedback>
      <View style={{ flexShrink: 1 }}>
        {renderSearch()}
        <FlatList
          {...flatListProps}
          keyboardShouldPersistTaps="handled"
          ref={refList}
          onScrollToIndexFailed={scrollIndex}
          data={listData}
          renderItem={_renderItem}
          keyExtractor={(item, index) => index.toString()}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        />
      </View>
    </TouchableWithoutFeedback>
  );

  const _renderModal = useCallback(() => {
    if (visible && position) {
      const {
        isFull,
        w,
        top,
        bottom,
        left,
        height
      } = position;
      if (w && top && bottom) {
        const styleVertical: ViewStyle = { left, maxHeight };
        const isTopPosition = dropdownPosition === 'auto' ? bottom < (isIOS ? 200 : 300) : dropdownPosition === 'top';
        let topHeight = isTopPosition ? top - height : top;

        let keyboardStyle: ViewStyle = {};

        if (keyboardAvoiding) {
          if (renderInputSearch) {
            if (keyboardHeight > 0 && bottom < keyboardHeight + height) {
              topHeight = isTopPosition ? H - keyboardHeight : H - keyboardHeight - 55;
              if (!isTopPosition) keyboardStyle = { backgroundColor: 'rgba(0,0,0,0.1)' };
            }
          } else {
            if (focus && keyboardHeight > 0 && bottom < keyboardHeight + height) {
              topHeight = isTopPosition ? H - keyboardHeight : H - keyboardHeight - 55;
              if (!isTopPosition) keyboardStyle = { backgroundColor: 'rgba(0,0,0,0.1)' };
            }
          }
        }

        return (
          <Modal transparent visible={visible} supportedOrientations={['landscape', 'portrait']} onRequestClose={showOrClose}>
            <TouchableWithoutFeedback onPress={showOrClose}>
              <View style={[{ flex: 1 }, isFull && styleContainerVertical, keyboardStyle]}>
                <View style={{ height: topHeight, width: w, justifyContent: 'flex-end' }}>
                  {isTopPosition && (
                    <View style={[{ width: w }, styles.container, containerStyle, isFull ? styleHorizontal : styleVertical]}>
                      {_renderListTop()}
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  {!isTopPosition && (
                    <View style={[{ width: w }, styles.container, containerStyle, isFull ? styleHorizontal : styleVertical]}>
                      {_renderListBottom()}
                    </View>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        );
      }
      return null;
    }
    return null;
  }, [focus, position, visible, keyboardHeight, listData, value]);

  const _measure = () => {
    if (ref?.current) {
      ref.current.measure((width, height, px, py, fx, fy) => {
        const isFull = orientation === 'LANDSCAPE' && !isTablet;
        const w = Math.floor(px);
        const top = isFull ? 20 : Math.floor(py) + Math.floor(fy) + 2;
        const bottom = H - top;
        const left = I18nManager.isRTL ? W - Math.floor(px) - Math.floor(fx) : Math.floor(fx);

        setPosition({
          isFull,
          w,
          top,
          bottom: Math.floor(bottom),
          left,
          height: Math.floor(py),
        });
      });
    }
  };

  return (
    <View style={[{ justifyContent: 'center' }, style]} ref={ref} onLayout={_measure}>
      {_renderDropdown()}
      {_renderModal()}
    </View>
  );
});

export default DropdownComponent;
