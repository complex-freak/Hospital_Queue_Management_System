import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';

interface AppButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    type?: 'primary' | 'secondary' | 'outline';
    containerStyle?: ViewStyle;
    textStyle?: TextStyle;
}

const AppButton: React.FC<AppButtonProps> = ({
    title,
    onPress,
    loading = false,
    disabled = false,
    type = 'primary',
    containerStyle,
    textStyle,
}) => {
    const { t } = useTranslation();

    // Determine button styles based on type
    const getButtonStyle = () => {
        switch (type) {
            case 'primary':
                return styles.primaryButton;
            case 'secondary':
                return styles.secondaryButton;
            case 'outline':
                return styles.outlineButton;
            default:
                return styles.primaryButton;
        }
    };

    // Determine text styles based on type
    const getTextStyle = () => {
        switch (type) {
            case 'primary':
                return styles.primaryText;
            case 'secondary':
                return styles.secondaryText;
            case 'outline':
                return styles.outlineText;
            default:
                return styles.primaryText;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                getButtonStyle(),
                disabled && styles.disabledButton,
                containerStyle,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={`${t('press')} ${title}`}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={type === 'outline' ? COLORS.primary : COLORS.white}
                />
            ) : (
                <Text style={[styles.text, getTextStyle(), textStyle]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 50,
        marginVertical: 10,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
    },
    secondaryButton: {
        backgroundColor: COLORS.secondary,
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    disabledButton: {
        opacity: 0.6,
    },
    text: {
        fontSize: SIZES.h3,
        fontWeight: 'bold',
    },
    primaryText: {
        color: COLORS.white,
    },
    secondaryText: {
        color: COLORS.white,
    },
    outlineText: {
        color: COLORS.primary,
    },
});

export default AppButton; 