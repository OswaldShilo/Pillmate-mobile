import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Use 10.0.2.2 for Android emulator to hit localhost, or your real IP for physical device
const API_URL = Platform.OS === 'android' ? 'http://32.192.26.168:8080' : 'http://32.192.26.168:8080';

export const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
