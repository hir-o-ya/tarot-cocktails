import React from 'react';
import { StatusBar, SafeAreaView, StyleSheet, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const htmlFile = require('./assets/index.html');

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#08091a" />
      <WebView
        source={htmlFile}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url.includes('google.com/maps') || request.url.includes('navigator.share')) {
            Linking.openURL(request.url);
            return false;
          }
          return true;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08091a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#08091a',
  },
});