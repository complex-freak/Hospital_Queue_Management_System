import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';

const PrivacyScreen = () => {
    const { t } = useTranslation();
    
    // Mock privacy policy sections
    const privacyPolicySections = [
        {
            title: 'informationCollection',
            content: 'privacyInfoCollectionContent',
        },
        {
            title: 'informationUsage',
            content: 'privacyInfoUsageContent',
        },
        {
            title: 'dataSharing',
            content: 'privacyDataSharingContent',
        },
        {
            title: 'dataSecurity',
            content: 'privacyDataSecurityContent',
        },
        {
            title: 'yourRights',
            content: 'privacyYourRightsContent',
        },
        {
            title: 'cookies',
            content: 'privacyCookiesContent',
        },
        {
            title: 'updates',
            content: 'privacyUpdatesContent',
        },
        {
            title: 'contact',
            content: 'privacyContactContent',
        },
    ];
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <View style={styles.headerSection}>
                    <Text style={styles.headerTitle}>{t('privacyPolicy')}</Text>
                    <Text style={styles.headerSubtitle}>{t('lastUpdated')}: June 1, 2023</Text>
                </View>
                
                <View style={styles.contentSection}>
                    <Text style={styles.introText}>
                        {t('privacyPolicyIntro')}
                    </Text>
                    
                    {privacyPolicySections.map((section, index) => (
                        <View key={index} style={styles.section}>
                            <Text style={styles.sectionTitle}>{t(section.title)}</Text>
                            <Text style={styles.sectionContent}>
                                {t(section.content)}
                            </Text>
                        </View>
                    ))}
                    
                    <View style={styles.footerSection}>
                        <Text style={styles.footerText}>
                            {t('privacyPolicyFooter')}
                        </Text>
                    </View>
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
    headerSection: {
        backgroundColor: COLORS.primary,
        padding: 20,
        paddingTop: 30,
        paddingBottom: 30,
    },
    headerTitle: {
        ...FONTS.h1,
        color: COLORS.white,
        marginBottom: 10,
    },
    headerSubtitle: {
        ...FONTS.body4,
        color: COLORS.white,
        opacity: 0.8,
    },
    contentSection: {
        padding: 20,
    },
    introText: {
        ...FONTS.body3,
        marginBottom: 20,
        lineHeight: 22,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.primary,
        marginBottom: 10,
    },
    sectionContent: {
        ...FONTS.body3,
        lineHeight: 22,
    },
    footerSection: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
    },
    footerText: {
        ...FONTS.body4,
        fontStyle: 'italic',
        color: COLORS.gray,
    },
});

export default PrivacyScreen; 