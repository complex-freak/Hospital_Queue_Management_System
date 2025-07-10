import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Text,
  Platform,
  Dimensions
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';

type PDFViewerRouteProp = RouteProp<{
  PDFViewer: { uri: string; title?: string };
}, 'PDFViewer'>;

type PDFViewerNavigationProp = StackNavigationProp<any, 'PDFViewer'>;

const PDFViewerScreen: React.FC = () => {
  const route = useRoute<PDFViewerRouteProp>();
  const navigation = useNavigation<PDFViewerNavigationProp>();
  const { uri, title } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Set the header title
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: title || 'View Report',
      headerRight: () => (
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color="#172B4D" />
        </TouchableOpacity>
      )
    });
  }, [navigation, title]);

  // Handle PDF loading
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load PDF. Please try again.');
  };

  // Create a source URI that can be used by the WebView
  const getSourceUri = () => {
    if (Platform.OS === 'ios') {
      // For iOS, we can use the file URL directly
      return uri;
    } else if (Platform.OS === 'android') {
      // For Android, we need to use a content provider or a web URL
      if (uri.startsWith('file://')) {
        // If it's a file URI, we need to use a base64 encoded data URI
        // This is a simplified approach - in a real app, you might want to use a ContentProvider
        return `data:application/pdf;base64,${FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })}`;
      } else {
        // If it's a web URL, we can use it directly
        return uri;
      }
    } else {
      // For web or other platforms
      return uri;
    }
  };

  // Create HTML to embed the PDF
  const pdfHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: #F4F5F7;
        }
        #pdf-viewer {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        #pdf-container {
          flex: 1;
          overflow: hidden;
        }
        iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      </style>
    </head>
    <body>
      <div id="pdf-viewer">
        <div id="pdf-container">
          <iframe src="${uri}" type="application/pdf"></iframe>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: pdfHTML }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        bounces={false}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2684FF" />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#DE350B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.pageControls}>
        <TouchableOpacity 
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          disabled={currentPage === 1}
          onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        >
          <Ionicons name="chevron-back" size={24} color={currentPage === 1 ? "#A5ADBA" : "#172B4D"} />
        </TouchableOpacity>
        
        <Text style={styles.pageText}>
          Page {currentPage} of {totalPages}
        </Text>
        
        <TouchableOpacity 
          style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          disabled={currentPage === totalPages}
          onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        >
          <Ionicons name="chevron-forward" size={24} color={currentPage === totalPages ? "#A5ADBA" : "#172B4D"} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#172B4D',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F4F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#172B4D',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  pageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#DFE1E6',
  },
  pageButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#F4F5F7',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: 14,
    color: '#172B4D',
  },
  button: {
    backgroundColor: '#2684FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
});

export default PDFViewerScreen; 