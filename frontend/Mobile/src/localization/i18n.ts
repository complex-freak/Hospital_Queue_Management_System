import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
    en: {
        translation: {
            // Auth screens
            welcome: 'Welcome to Hospital App',
            loginSubtitle: 'Sign in to access your medical services',
            login: 'Log In',
            register: 'Register',
            createAccount: 'Create New Account',
            createNewAccount: 'Create New Account',
            alreadyHaveAccount: 'Already have an account?',
            forgotPassword: 'Forgot Password?',
            forgotYourPassword: 'Forgot your password?',
            resetPassword: 'Reset Password',
            resetPasswordSubtitle: 'Enter your phone number to reset your password',
            backToLogin: 'Back to Login',
            passwordResetSent: 'Password reset link sent to your phone',
            phoneNumber: 'Phone Number',
            password: 'Password',
            confirmPassword: 'Confirm Password',
            fullName: 'Full Name',
            submit: 'Submit',

            // Home screen
            greeting: 'Hello,',
            dontHaveAccount: 'Don\'t have an account?',
            wouldResetPassword: 'Would you like to reset your password?',
            cancel: 'Cancel',
            continue: 'Continue',
            rememberPassword: 'Remembered your password?',
            services: 'Services',
            recentActivity: 'Recent Activity',
            bookAppointment: 'Book a new appointment',
            checkQueuePosition: 'Check your queue position',
            viewNotifications: 'View your notifications',
            getAssistance: 'Get assistance',
            today: 'Today',
            appointmentWithDr: 'Appointment with Dr. Sarah',
            generalConsultation: 'General Consultation',
            completed: 'Completed',

            // Stats dashboard
            appointments: 'Appointments',
            queuePosition: 'Queue Position',

            // Validation messages
            phoneNumberRequired: 'Phone number is required',
            passwordRequired: 'Password is required',
            fullNameRequired: 'Full name is required',
            passwordsDoNotMatch: 'Passwords do not match',

            // Home screen
            appointmentReg: 'Appointment Registration',
            queueStatus: 'Queue Status',
            notifications: 'Notifications',
            help: 'Help',
            settings: 'Settings',

            // Appointment registration
            gender: 'Gender',
            male: 'Male',
            female: 'Female',
            dateOfBirth: 'Date of Birth',
            conditionType: 'Condition Type',
            emergency: 'Emergency',
            elderly: 'Elderly',
            child: 'Child',
            normal: 'Normal',
            confirm: 'Confirm',
            reasonForVisit: 'Reason for Visit',
            reasonForVisitPlaceholder: 'Please describe the main reason for your visit',
            additionalInformation: 'Additional Information',
            conditionExplanationPlaceholder: 'Provide more details about your condition (optional)',
            reasonForVisitRequired: 'Reason for visit is required',
            appointmentSuccess: 'Your appointment has been registered successfully',
            appointmentFailed: 'Failed to register appointment. Please try again later.',
            patientInformation: 'Patient Information',
            appointmentDetails: 'Appointment Details',
            registerAppointmentInfo: 'Please fill in the following information to register an appointment',
            priorityInformation: 'Priority Information',
            priorityExplanation: 'Emergency cases are given highest priority, followed by elderly, children, and then normal cases.',

            // Queue status
            queueNumber: 'Queue Number',
            currentPosition: 'Current Position',
            doctorName: 'Doctor Name',
            estimatedTime: 'Estimated Time',
            timeSinceCreation: 'Time Since Creation',
            refresh: 'Refresh',
            status: 'Status',
            waitForNumber: 'Please wait for your number to be called',
            generalPractice: 'General Practice',
            waiting: 'Waiting',

            // Settings
            preferences: 'Preferences',
            language: 'Language',
            account: 'Account',
            version: 'App Version',
            logout: 'Logout',
            currentPassword: 'Current Password',
            newPassword: 'New Password',
            currentPasswordRequired: 'Current password is required',
            newPasswordRequired: 'New password is required',
            passwordResetSuccess: 'Password has been reset successfully',
            profileUpdateSuccess: 'Profile has been updated successfully',
            updateProfile: 'Update Profile',
            editProfile: 'Edit Profile',
            update: 'Update',
            security: 'Security',
            about: 'About',
            contactSupport: 'Contact Support',
            user: 'User',
            ok: 'OK',

            // Help screen
            welcomeToHelp: 'Welcome to the Help Center. Here you\'ll find guides on how to use the app and answers to common questions.',
            emergencyInformation: 'Emergency Information',
            howToRegisterAppointment: 'How to Register an Appointment',
            howToCheckQueueStatus: 'How to Check Queue Status',
            managingNotifications: 'Managing Notifications',
            frequentlyAskedQuestions: 'Frequently Asked Questions',
            contactUs: 'Contact Us',

            // General
            minutes: 'minutes',
            error: 'Error',
            success: 'Success',
            loading: 'Loading...',
            press: 'Press',

            // Notifications
            appointmentCreatedTitle: 'Appointment Created',
            appointmentCreatedMessage: 'Your appointment has been successfully created. You will be notified when it\'s your turn.',
            appointmentCreatedOfflineTitle: 'Appointment Saved',
            appointmentCreatedOfflineMessage: 'Your appointment has been saved offline and will be synced when you\'re back online.',
            notificationPermissionRequired: 'Notification permission is required to receive updates about your appointment.',
        },
    },
    sw: {
        translation: {
            // Auth screens
            welcome: 'Karibu kwenye Hospital App',
            loginSubtitle: 'Ingia ili kufikia huduma zako za matibabu',
            login: 'Ingia',
            register: 'Jisajili',
            createAccount: 'Unda Akaunti Mpya',
            createNewAccount: 'Unda Akaunti Mpya',
            alreadyHaveAccount: 'Una akaunti tayari?',
            forgotPassword: 'Umesahau nywila?',
            forgotYourPassword: 'Umesahau nywila yako?',
            resetPassword: 'Weka Nywila Mpya',
            resetPasswordSubtitle: 'Weka nambari yako ya simu ili kuweka nywila mpya',
            backToLogin: 'Rudi Kwenye Ingia',
            passwordResetSent: 'Maelekezo ya kuweka nywila mpya yametumwa kwenye nambari yako ya simu',
            phoneNumber: 'Nambari ya Simu',
            password: 'Nywila',
            confirmPassword: 'Thibitisha Nywila',
            fullName: 'Jina Kamili',
            submit: 'Wasilisha',

            // Home screen
            greeting: 'Karibu,',
            dontHaveAccount: 'Huna akaunti?',
            wouldResetPassword: 'Ungependa kuweka upya nywila yako?',
            cancel: 'Ghairi',
            continue: 'Endelea',
            rememberPassword: 'Umekumbuka nywila yako?',
            services: 'Huduma',
            recentActivity: 'Shughuli za Hivi Karibuni',
            bookAppointment: 'Sajili miadi mpya',
            checkQueuePosition: 'Angalia nafasi yako kwenye foleni',
            viewNotifications: 'Angalia arifa zako',
            getAssistance: 'Pata msaada',
            today: 'Leo',
            appointmentWithDr: 'Miadi na Dk. Sarah',
            generalConsultation: 'Ushauri wa Jumla',
            completed: 'Imekamilika',

            // Stats dashboard
            appointments: 'Miadi',
            queuePosition: 'Nafasi ya Foleni',

            // Validation messages
            phoneNumberRequired: 'Nambari ya simu inahitajika',
            passwordRequired: 'Nywila inahitajika',
            fullNameRequired: 'Jina kamili linahitajika',
            passwordsDoNotMatch: 'Nywila hazilingani',

            // Home screen
            appointmentReg: 'Usajili wa Miadi',
            queueStatus: 'Hali ya Foleni',
            notifications: 'Arifa',
            help: 'Msaada',
            settings: 'Mipangilio',

            // Appointment registration
            gender: 'Jinsia',
            male: 'Mwanaume',
            female: 'Mwanamke',
            dateOfBirth: 'Tarehe ya Kuzaliwa',
            conditionType: 'Aina ya Hali',
            emergency: 'Dharura',
            elderly: 'Mzee',
            child: 'Mtoto',
            normal: 'Kawaida',
            confirm: 'Thibitisha',
            reasonForVisit: 'Sababu ya Kutembelea',
            reasonForVisitPlaceholder: 'Tafadhali eleza sababu kuu ya kutembelea',
            additionalInformation: 'Taarifa za Ziada',
            conditionExplanationPlaceholder: 'Toa maelezo zaidi kuhusu hali yako (hiari)',
            reasonForVisitRequired: 'Sababu ya kutembelea inahitajika',
            appointmentSuccess: 'Miadi yako imesajiliwa kwa mafanikio',
            appointmentFailed: 'Imeshindwa kusajili miadi. Tafadhali jaribu tena baadaye.',
            patientInformation: 'Taarifa za Mgonjwa',
            appointmentDetails: 'Maelezo ya Miadi',
            registerAppointmentInfo: 'Tafadhali jaza taarifa zifuatazo ili kusajili miadi',
            priorityInformation: 'Taarifa za Kipaumbele',
            priorityExplanation: 'Kesi za dharura zinapewa kipaumbele cha juu, ikifuatiwa na wazee, watoto, na kisha kesi za kawaida.',

            // Queue status
            queueNumber: 'Nambari ya Foleni',
            currentPosition: 'Nafasi ya Sasa',
            doctorName: 'Jina la Daktari',
            estimatedTime: 'Muda unaokadiriwa',
            timeSinceCreation: 'Muda Tangu Uundaji',
            refresh: 'Sasisha',
            status: 'Hali',
            waitForNumber: 'Tafadhali subiri nambari yako itakapotajwa',
            generalPractice: 'Daktari wa Kawaida',
            waiting: 'Inasubiri',

            // Settings
            preferences: 'Mapendeleo',
            language: 'Lugha',
            account: 'Akaunti',
            version: 'Toleo la Programu',
            logout: 'Toka',
            currentPassword: 'Nywila ya Sasa',
            newPassword: 'Nywila Mpya',
            currentPasswordRequired: 'Nywila ya sasa inahitajika',
            newPasswordRequired: 'Nywila mpya inahitajika',
            passwordResetSuccess: 'Nywila imewekwa upya kwa mafanikio',
            profileUpdateSuccess: 'Wasifu wako umesasishwa kwa mafanikio',
            updateProfile: 'Sasisha Wasifu',
            editProfile: 'Hariri Wasifu',
            update: 'Sasisha',
            security: 'Usalama',
            about: 'Kuhusu',
            contactSupport: 'Wasiliana na Msaada',
            user: 'Mtumiaji',
            ok: 'Sawa',

            // Help screen
            welcomeToHelp: 'Karibu kwenye Kituo cha Msaada. Hapa utapata mwongozo wa jinsi ya kutumia programu na majibu ya maswali ya kawaida.',
            emergencyInformation: 'Taarifa za Dharura',
            howToRegisterAppointment: 'Jinsi ya Kusajili Miadi',
            howToCheckQueueStatus: 'Jinsi ya Kuangalia Hali ya Foleni',
            managingNotifications: 'Kusimamia Arifa',
            frequentlyAskedQuestions: 'Maswali Yanayoulizwa Mara kwa Mara',
            contactUs: 'Wasiliana Nasi',

            // General
            minutes: 'dakika',
            error: 'Hitilafu',
            success: 'Imefanikiwa',
            loading: 'Inapakia...',
            press: 'Bonyeza',

            // Notifications
            appointmentCreatedTitle: 'Miadi Imesajiliwa',
            appointmentCreatedMessage: 'Miadi yako imesajiliwa kwa mafanikio. Utaarifiwa wakati itakapokuwa zamu yako.',
            appointmentCreatedOfflineTitle: 'Miadi Imesalwa',
            appointmentCreatedOfflineMessage: 'Miadi yako imesalwa kwa kiwango cha kawaida na itakuwa imesaliwa wakati uko mtandaoni.',
            notificationPermissionRequired: 'Ruhusa ya arifa inahitajika kupata arifa kuhusu miadi yako.',
        },
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'en', // default to English
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

export default i18n; 