import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB9IUlr4FlgB6hunIsedJFeCVfhE6JDVUc",
  authDomain: "trip-tracker-b4a11.firebaseapp.com",
  projectId: "trip-tracker-b4a11",
  appId: "1:243770727727:web:df633bd8857b7a407e15da"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut };
