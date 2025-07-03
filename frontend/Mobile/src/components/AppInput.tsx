import React from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    KeyboardTypeOptions,
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';

interface AppInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: KeyboardTypeOptions;
    error?: string;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    editable?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
}

const AppInput: React.FC<AppInputProps> = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType = 'default',
    error,
    autoCapitalize = 'none',
    containerStyle,
    inputStyle,
    editable = true,
    multiline = false,
    numberOfLines = 1,
}) => {
    return (
        <View style={[styles.container, containerStyle]}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    error && styles.inputError,
                    !editable && styles.disabledInput,
                    multiline && styles.multilineInput,
                    inputStyle,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.gray}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                editable={editable}
                multiline={multiline}
                numberOfLines={numberOfLines}
                accessible={true}
                accessibilityLabel={label}
                accessibilityHint={placeholder}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SIZES.margin,
        width: '100%',
    },
    label: {
        ...FONTS.h4,
        color: COLORS.black,
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
        borderRadius: SIZES.radius,
        paddingHorizontal: SIZES.padding,
        color: COLORS.black,
        fontSize: SIZES.h4,
    },
    multilineInput: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingTop: SIZES.padding,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    disabledInput: {
        backgroundColor: COLORS.lightGray,
        opacity: 0.7,
    },
    errorText: {
        color: COLORS.error,
        fontSize: SIZES.body5,
        marginTop: 5,
    },
});

export default AppInput; 