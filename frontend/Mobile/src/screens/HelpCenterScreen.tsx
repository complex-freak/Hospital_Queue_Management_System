import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const HelpCenterScreen = () => {
    const { t } = useTranslation();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    
    // Mock FAQs data
    const faqs = [
        {
            question: 'faqQuestion1',
            answer: 'faqAnswer1',
        },
        {
            question: 'faqQuestion2',
            answer: 'faqAnswer2',
        },
        {
            question: 'faqQuestion3',
            answer: 'faqAnswer3',
        },
        {
            question: 'faqQuestion4',
            answer: 'faqAnswer4',
        },
        {
            question: 'faqQuestion5',
            answer: 'faqAnswer5',
        },
        {
            question: 'faqQuestion6',
            answer: 'faqAnswer6',
        },
    ];
    
    // Mock support categories
    const supportCategories = [
        {
            title: 'appointmentsHelp',
            icon: 'calendar' as IoniconsName,
        },
        {
            title: 'accountHelp',
            icon: 'person' as IoniconsName,
        },
        {
            title: 'paymentHelp',
            icon: 'card' as IoniconsName,
        },
        {
            title: 'technicalHelp',
            icon: 'construct' as IoniconsName,
        },
    ];
    
    const toggleFaq = (index: number) => {
        if (expandedFaq === index) {
            setExpandedFaq(null);
        } else {
            setExpandedFaq(index);
        }
    };
    
    const handleSearch = () => {
        // In a real app, this would filter FAQs or navigate to search results
        Alert.alert(t('searchResults'), t('searchResultsMessage'));
    };
    
    const handleContactSupport = () => {
        Alert.alert(
            t('contactSupport'),
            t('supportTicketConfirmation'),
            [
                { 
                    text: t('cancel'), 
                    style: 'cancel' 
                },
                { 
                    text: t('confirm'), 
                    onPress: () => Alert.alert(t('success'), t('supportTicketCreated')) 
                },
            ]
        );
    };
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={COLORS.gray} />
                        <TextInput
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={t('searchHelp')}
                            placeholderTextColor={COLORS.gray}
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                        />
                    </View>
                </View>
                
                {/* Support Categories */}
                <View style={styles.categoriesContainer}>
                    {supportCategories.map((category, index) => (
                        <TouchableOpacity 
                            key={index}
                            style={styles.categoryItem}
                            onPress={() => Alert.alert(t(category.title), t('categorySelected'))}
                        >
                            <View style={styles.categoryIcon}>
                                <Ionicons name={category.icon} size={24} color={COLORS.primary} />
                            </View>
                            <Text style={styles.categoryTitle}>{t(category.title)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                
                {/* FAQs */}
                <View style={styles.faqContainer}>
                    <Text style={styles.sectionTitle}>{t('frequentlyAskedQuestions')}</Text>
                    
                    {faqs.map((faq, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.faqItem}
                            onPress={() => toggleFaq(index)}
                        >
                            <View style={styles.faqHeader}>
                                <Text style={styles.faqQuestion}>{t(faq.question)}</Text>
                                <Ionicons 
                                    name={expandedFaq === index ? "chevron-up" : "chevron-down"} 
                                    size={20} 
                                    color={COLORS.gray} 
                                />
                            </View>
                            
                            {expandedFaq === index && (
                                <Text style={styles.faqAnswer}>{t(faq.answer)}</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
                
                {/* Contact Support */}
                <View style={styles.contactContainer}>
                    <Text style={styles.contactTitle}>{t('needMoreHelp')}</Text>
                    <Text style={styles.contactDescription}>{t('contactSupportDescription')}</Text>
                    
                    <TouchableOpacity 
                        style={styles.contactButton}
                        onPress={handleContactSupport}
                    >
                        <Ionicons name="mail" size={20} color={COLORS.white} />
                        <Text style={styles.contactButtonText}>{t('contactSupport')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flex: 1,
    },
    searchContainer: {
        padding: 15,
        backgroundColor: COLORS.primary,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 8,
        paddingHorizontal: 15,
        height: 45,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        ...FONTS.body3,
    },
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 10,
        justifyContent: 'space-between',
    },
    categoryItem: {
        width: '48%',
        backgroundColor: COLORS.white,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    categoryIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    categoryTitle: {
        ...FONTS.body3,
        textAlign: 'center',
    },
    faqContainer: {
        padding: 15,
    },
    sectionTitle: {
        ...FONTS.h2,
        marginBottom: 15,
    },
    faqItem: {
        backgroundColor: COLORS.white,
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestion: {
        ...FONTS.body2,
        flex: 1,
        paddingRight: 10,
    },
    faqAnswer: {
        ...FONTS.body3,
        color: COLORS.gray,
        marginTop: 10,
        lineHeight: 20,
    },
    contactContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 10,
        padding: 20,
        margin: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    contactTitle: {
        ...FONTS.h3,
        marginBottom: 10,
    },
    contactDescription: {
        ...FONTS.body3,
        textAlign: 'center',
        marginBottom: 20,
        color: COLORS.gray,
    },
    contactButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactButtonText: {
        ...FONTS.h4,
        color: COLORS.white,
        marginLeft: 8,
    },
});

export default HelpCenterScreen; 