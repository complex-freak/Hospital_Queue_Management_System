import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Image,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const AboutScreen = () => {
    const { t } = useTranslation();
    
    const appVersion = '1.0.0';
    
    const openLink = (url: string) => {
        Linking.openURL(url).catch((err) => console.error('An error occurred', err));
    };
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <View style={styles.headerSection}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="medkit" size={60} color={COLORS.primary} />
                    </View>
                    <Text style={styles.appName}>{t('hospitalAppName')}</Text>
                    <Text style={styles.versionText}>v{appVersion}</Text>
                </View>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('aboutUs')}</Text>
                    <Text style={styles.paragraph}>
                        {t('aboutUsDescription')}
                    </Text>
                </View>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('ourMission')}</Text>
                    <Text style={styles.paragraph}>
                        {t('missionDescription')}
                    </Text>
                </View>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('contactUs')}</Text>
                    
                    <TouchableOpacity 
                        style={styles.contactItem}
                        onPress={() => openLink('tel:+1234567890')}
                    >
                        <View style={styles.contactIconContainer}>
                            <Ionicons name="call" size={24} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>{t('phone')}</Text>
                            <Text style={styles.contactValue}>+123 456 7890</Text>
                        </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.contactItem}
                        onPress={() => openLink('mailto:info@hospital.com')}
                    >
                        <View style={styles.contactIconContainer}>
                            <Ionicons name="mail" size={24} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>{t('email')}</Text>
                            <Text style={styles.contactValue}>info@hospital.com</Text>
                        </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.contactItem}
                        onPress={() => openLink('https://maps.google.com')}
                    >
                        <View style={styles.contactIconContainer}>
                            <Ionicons name="location" size={24} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>{t('address')}</Text>
                            <Text style={styles.contactValue}>123 Healthcare St, Medical City, Country</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('followUs')}</Text>
                    
                    <View style={styles.socialContainer}>
                        <TouchableOpacity 
                            style={styles.socialButton}
                            onPress={() => openLink('https://facebook.com')}
                        >
                            <Ionicons name="logo-facebook" size={28} color={COLORS.primary} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.socialButton}
                            onPress={() => openLink('https://twitter.com')}
                        >
                            <Ionicons name="logo-twitter" size={28} color={COLORS.primary} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.socialButton}
                            onPress={() => openLink('https://instagram.com')}
                        >
                            <Ionicons name="logo-instagram" size={28} color={COLORS.primary} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.socialButton}
                            onPress={() => openLink('https://linkedin.com')}
                        >
                            <Ionicons name="logo-linkedin" size={28} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
                
                <View style={styles.footerSection}>
                    <Text style={styles.footerText}>© 2023 Hospital App. {t('allRightsReserved')}</Text>
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
        alignItems: 'center',
        padding: 30,
        backgroundColor: COLORS.white,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    appName: {
        ...FONTS.h2,
        color: COLORS.black,
        marginBottom: 5,
    },
    versionText: {
        ...FONTS.body4,
        color: COLORS.gray,
    },
    section: {
        backgroundColor: COLORS.white,
        borderRadius: 10,
        padding: 20,
        margin: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.primary,
        marginBottom: 15,
    },
    paragraph: {
        ...FONTS.body3,
        color: COLORS.black,
        lineHeight: 22,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    contactIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    contactLabel: {
        ...FONTS.body4,
        color: COLORS.gray,
    },
    contactValue: {
        ...FONTS.body3,
        color: COLORS.black,
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    socialButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerSection: {
        padding: 20,
        alignItems: 'center',
    },
    footerText: {
        ...FONTS.body5,
        color: COLORS.gray,
    },
});

export default AboutScreen; 