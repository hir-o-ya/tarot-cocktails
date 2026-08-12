// App.js — WebView + ネイティブブリッジ版
// WebView版のHTML/CSS/JSアニメーションをそのまま活かしつつ、
// シェイク検出・シェア・Apple Maps をネイティブで処理
import React, { useEffect, useRef } from 'react';
import {
  StatusBar, SafeAreaView, StyleSheet, Linking, Share, Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';

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

  // ── 位置情報をWebViewへ渡す（取得できなければ null）──
  const deliverLocation = (coords) => {
    const payload = coords ? JSON.stringify(coords) : 'null';
    webViewRef.current?.injectJavaScript(
      `window.__deliverLocation && window.__deliverLocation(${payload}); true;`
    );
  };

  // ── WebViewからのメッセージ受信 ──
  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // シェア
      if (data.type === 'share') {
        await Share.share({ message: data.text });
      }

      // 位置情報要求（ネイティブで取得 → WebViewへ渡す。WebKitの確認は出さない）
      if (data.type === 'requestLocation') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') { deliverLocation(null); return; }
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          deliverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } catch (e) {
          deliverLocation(null);
        }
      }

      // Apple Maps（多層防御: https のURLのみ開く）
      if (data.type === 'openMap' && typeof data.url === 'string' && /^https:\/\//i.test(data.url)) {
        Linking.openURL(data.url);
      }

      // 外部リンク（バー詳細: Apple Maps・電話・サイト）— https / tel のみ許可
      if (data.type === 'openExternal' && typeof data.url === 'string' && /^(https:\/\/|tel:)/i.test(data.url)) {
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
          const url = request.url || '';
          const isHttp = /^https?:\/\//i.test(url);
          // アプリ本体はローカルのバンドルHTML（SPA）。地図の「リーガル」リンクや
          // 外部リンクのタップ(http/https)はWebViewを離脱させず外部ブラウザで開く。
          if (isHttp && (request.navigationType === 'click' || url.includes('maps.apple.com'))) {
            Linking.openURL(url);
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
