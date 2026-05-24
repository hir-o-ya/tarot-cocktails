import React from 'react';
import { StatusBar, SafeAreaView, StyleSheet, Linking, Share, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const htmlFile = require('./assets/index.html');

export default function App() {

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'share') {
        await Share.share({
          message: data.text,
        });
      }
    } catch (e) {
      // ignore
    }
  };

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
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url.includes('google.com/maps')) {
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