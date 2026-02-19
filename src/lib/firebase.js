
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCcjXiweWQgea_GGaa2LMxqisnwclp-Kh0",
    authDomain: "meal-planner-94b37.firebaseapp.com",
    projectId: "meal-planner-94b37",
    storageBucket: "meal-planner-94b37.firebasestorage.app",
    messagingSenderId: "678747187904",
    appId: "1:678747187904:web:477b63f1e4f3a1a49f1b25",
    measurementId: "G-1ZK9X38KQV"
};

// Initialize Firebase (singleton)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, app };
