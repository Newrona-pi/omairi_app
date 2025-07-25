// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCyJPQrXT-r7gBL94xKf7zdPU2ygjktMho",
  authDomain: "omairi-app.firebaseapp.com",
  projectId: "omairi-app",
  storageBucket: "omairi-app.firebasestorage.app",
  messagingSenderId: "320081611622",
  appId: "1:320081611622:web:39986811072db6fe7356a7",
  measurementId: "G-DHDT19YH80"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Firestoreインスタンスをエクスポート
export const db = getFirestore(app);