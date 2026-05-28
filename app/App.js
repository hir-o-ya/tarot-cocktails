// App.js — WebView + ネイティブブリッジ版
// WebView版のHTML/CSS/JSアニメーションをそのまま活かしつつ、
// シェイク検出・シェア・Apple Maps をネイティブで処理
import React, { useEffect, useRef } from 'react';
import {
  StatusBar, SafeAreaView, StyleSheet, Linking, Share, Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Accelerometer } from 'expo-sensors';

const htmlFile = require('./assets/index.html');

export default function App() {
  const webViewRef = useRef(null);
  const lastShake = useRef(0);

  // ── シェイク検出 → WebViewに通知 ──
  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const total = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (total > 2.5 && now - lastShake.current > 1000) {
        lastShake.current = now;
        // WebViewにシェイクイベントを送信
        webViewRef.current?.injectJavaScript(`
          try {
            window.dispatchEvent(new MessageEvent('message', {
              data: JSON.stringify({ type: 'shake' })
            }));
          } catch(e) {}
          true;
        `);
      }
    });
    return () => sub.remove();
  }, []);

  // ── WebViewからのメッセージ受信 ──
  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // シェア
      if (data.type === 'share') {
        await Share.share({ message: data.text });
      }

      // Apple Maps
      if (data.type === 'openMap') {
        Linking.openURL(data.url);
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#08091a" />
      <WebView
        ref={webViewRef}
        source={htmlFile}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={(request) => {
          // Apple Mapsリンクは外部で開く
          if (request.url.includes('maps.apple.com')) {
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
