
import React, { createContext, useContext, useState, useEffect } from 'react';

// Define available languages
export type Language = 'en' | 'sw';

// Define translations
export const translations = {
  en: {
    // Common
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Authentication
    login: 'Sign In',
    loggingIn: 'Logging in...',
    username: 'Username',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    enterEmail: 'Enter your email address',
    sendResetLink: 'Send Reset Link',
    enterNewPassword: 'Enter new password',
    confirmNewPassword: 'Confirm new password',
    passwordsDoNotMatch: 'Passwords do not match',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    
    // Profile
    profile: 'Profile',
    updateProfile: 'Update Profile',
    updating: 'Updating...',
    name: 'Full Name',
    email: 'Email',
    specialization: 'Specialization',
    bio: 'Bio',
    contactNumber: 'Contact Number',
    changePassword: 'Change Password',
    
    // Language
    language: 'Language',
    english: 'English',
    swahili: 'Swahili',
  },
  sw: {
    // Common
    submit: 'Wasilisha',
    cancel: 'Ghairi',
    save: 'Hifadhi',
    loading: 'Inapakia...',
    error: 'Hitilafu',
    success: 'Mafanikio',
    
    // Authentication
    login: 'Ingia',
    loggingIn: 'Inaingia...',
    username: 'Jina la mtumiaji',
    password: 'Nenosiri',
    forgotPassword: 'Umesahau Nenosiri?',
    resetPassword: 'Weka upya Nenosiri',
    enterEmail: 'Ingiza barua pepe yako',
    sendResetLink: 'Tuma Kiungo cha Kuweka upya',
    enterNewPassword: 'Ingiza nenosiri jipya',
    confirmNewPassword: 'Thibitisha nenosiri jipya',
    passwordsDoNotMatch: 'Manenosiri hayalingani',
    currentPassword: 'Nenosiri la Sasa',
    newPassword: 'Nenosiri Jipya',
    confirmPassword: 'Thibitisha Nenosiri',
    
    // Profile
    profile: 'Wasifu',
    updateProfile: 'Sasisha Wasifu',
    updating: 'Inasasisha...',
    name: 'Jina Kamili',
    email: 'Barua pepe',
    specialization: 'Utaalamu',
    bio: 'Wasifu',
    contactNumber: 'Namba ya Mawasiliano',
    changePassword: 'Badilisha Nenosiri',
    
    // Language
    language: 'Lugha',
    english: 'Kiingereza',
    swahili: 'Kiswahili',
  }
};

// Create the language context
type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: keyof typeof translations.en) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Try to get the language from localStorage
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage && (savedLanguage === 'en' || savedLanguage === 'sw') ? savedLanguage : 'en';
  });

  useEffect(() => {
    // Save the language preference to localStorage
    localStorage.setItem('language', language);
  }, [language]);

  // Translation function
  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
