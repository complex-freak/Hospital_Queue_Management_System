# Firebase Cloud Messaging Setup Guide

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the Hospital App.

## Prerequisites

- Firebase account
- Access to Firebase Console
- Android Studio and/or Xcode (depending on your target platforms)

## Setup Steps

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "Hospital Queue App")
4. Follow the steps to create your project

### 2. Set Up Android

1. In Firebase Console, select your project
2. Click "Android" icon to add an Android app
3. Enter package name (e.g., `com.hospitalqueuing.app`)
4. Enter app nickname (optional)
5. Click "Register app"
6. Download the `google-services.json` file
7. Place the file in the `/android/app/` directory of your React Native project

### 3. Set Up iOS

1. In Firebase Console, select your project
2. Click "iOS" icon to add an iOS app
3. Enter Bundle ID (e.g., `com.hospitalqueuing.app`)
4. Enter app nickname (optional)
5. Click "Register app"
6. Download the `GoogleService-Info.plist` file
7. Place the file in the `/ios/` directory of your React Native project
8. Open Xcode, right-click on the project and select "Add Files to..."
9. Select the `GoogleService-Info.plist` file and ensure "Copy items if needed" is checked

### 4. Update iOS Podfile

Add the following to your `ios/Podfile`:

```ruby
target 'HospitalApp' do
  # ... existing content
  pod 'Firebase/Messaging'
end
```

Then run:

```bash
cd ios && pod install
```

### 5. Configure Background Modes for iOS

1. Open your project in Xcode
2. Select your project in the Navigator
3. Go to "Capabilities"
4. Enable "Background Modes"
5. Check "Remote notifications"

### 6. Update AndroidManifest.xml

Add these permissions to your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### 7. Test Push Notifications

1. In Firebase Console, go to "Cloud Messaging"
2. Click "Send your first message"
3. Fill out the notification details
4. Under "Target", select your app
5. Complete the message and send it

## Troubleshooting

### iOS Issues

- Ensure APNs authentication key is set up in the Firebase Console (Cloud Messaging section)
- Verify that Push Notifications capability is enabled in Xcode

### Android Issues

- Verify that the package name in `google-services.json` matches your app's package name
- Check that the `google-services.json` file is properly placed in the `/android/app/` directory

## Useful Resources

- [Firebase React Native Documentation](https://rnfirebase.io/)
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging) 