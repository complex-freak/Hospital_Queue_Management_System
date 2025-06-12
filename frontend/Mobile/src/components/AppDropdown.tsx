import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';

interface OptionItem {
    label: string;
    value: string;
}

interface AppDropdownProps {
    label: string;
    options: OptionItem[];
    selectedValue: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    containerStyle?: ViewStyle;
}

const AppDropdown: React.FC<AppDropdownProps> = ({
    label,
    options,
    selectedValue,
    onValueChange,
    placeholder = 'Chagua...',
    error,
    containerStyle,
}) => {
    const [modalVisible, setModalVisible] = useState(false);

    const selectedOption = options.find(option => option.value === selectedValue);

    return (
        <View style={[styles.container, containerStyle]}>
            <Text style={styles.label}>{label}</Text>

            <TouchableOpacity
                style={[styles.dropdownButton, error && styles.dropdownError]}
                onPress={() => setModalVisible(true)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint={`Bonyeza kuchagua ${label}`} // "Press to select {label}" in Swahili
            >
                <Text style={selectedOption ? styles.selectedText : styles.placeholderText}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{label}</Text>

                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.optionItem,
                                        selectedValue === item.value && styles.selectedOptionItem,
                                    ]}
                                    onPress={() => {
                                        onValueChange(item.value);
                                        setModalVisible(false);
                                    }}
                                    accessible={true}
                                    accessibilityRole="button"
                                    accessibilityLabel={item.label}
                                    accessibilityState={{ selected: selectedValue === item.value }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        selectedValue === item.value && styles.selectedOptionText,
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel="Funga"
                            accessibilityHint="Funga orodha ya chaguo" // "Close the options list" in Swahili
                        >
                            <Text style={styles.closeButtonText}>Funga</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    dropdownButton: {
        height: 50,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
        borderRadius: SIZES.radius,
        paddingHorizontal: SIZES.padding,
        justifyContent: 'center',
    },
    dropdownError: {
        borderColor: COLORS.error,
    },
    placeholderText: {
        color: COLORS.gray,
        fontSize: SIZES.h4,
    },
    selectedText: {
        color: COLORS.black,
        fontSize: SIZES.h4,
    },
    errorText: {
        color: COLORS.error,
        fontSize: SIZES.body5,
        marginTop: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: SIZES.radius,
        borderTopRightRadius: SIZES.radius,
        padding: SIZES.padding,
        maxHeight: '80%',
    },
    modalTitle: {
        ...FONTS.h3,
        textAlign: 'center',
        marginBottom: SIZES.padding,
    },
    optionItem: {
        padding: SIZES.padding,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    selectedOptionItem: {
        backgroundColor: COLORS.primary + '20', // primary color with opacity
    },
    optionText: {
        ...FONTS.body3,
    },
    selectedOptionText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    closeButton: {
        marginTop: SIZES.padding,
        padding: SIZES.padding,
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius,
        alignItems: 'center',
    },
    closeButtonText: {
        ...FONTS.h4,
        color: COLORS.white,
    },
});

export default AppDropdown; 