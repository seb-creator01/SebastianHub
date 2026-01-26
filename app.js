// 1. YOUR FIREBASE CONFIGURATION
// Replace the values below with your actual keys from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyA30CbfejxYBs_KLgiw1OhqFbvQiHUbQGQ",
  authDomain: "sebastianhub-e3407.firebaseapp.com",
  projectId: "sebastianhub-e3407",
  storageBucket: "sebastianhub-e3407.firebasestorage.app",
  messagingSenderId: "137914871553",
  appId: "1:137914871553:web:6a05e00df2f63496d13500"
};

// 2. INITIALIZE FIREBASE
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 3. TOGGLE BETWEEN LOGIN AND SIGNUP
let isLoginMode = false;

function toggleAuth() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggle = document.getElementById('toggle-text');

    if (isLoginMode) {
        title.innerText = "Login to Store";
        btn.innerText = "Login";
        toggle.innerHTML = "New seller? <strong>Create account</strong>";
    } else {
        title.innerText = "Create Store Account";
        btn.innerText = "Sign Up";
        toggle.innerHTML = "Already a seller? <strong>Login here</strong>";
    }
}

// 4. HANDLE SIGNUP AND LOGIN
async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        return alert("Please fill in all fields.");
    }

    try {
        if (isLoginMode) {
            // Login existing user
            await auth.signInWithEmailAndPassword(email, password);
            alert("Welcome back!");
        } else {
            // Register new user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            // Security: Send email verification
            await userCredential.user.sendEmailVerification();
            alert("Account created! Check your email to verify your account.");
        }
        // Move to the dashboard after success
        window.location.href = "dashboard.html";
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// 5. PROTECT THE DASHBOARD
// This checks if a user is logged in. If they are, it keeps them logged in.
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes("index.html")) {
        window.location.href = "dashboard.html";
    }
});

