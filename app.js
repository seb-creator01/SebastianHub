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
// --- DASHBOARD LOGIC ---

// 1. Function to turn "Sebastian Hub" into "sebastian-hub"
function generateSlug(text) {
    return text.toLowerCase()
               .trim()
               .replace(/[^\w\s-]/g, '')
               .replace(/[\s_-]+/g, '-')
               .replace(/^-+|-+$/g, '');
}

// 2. Save Store Settings
async function saveStoreSettings() {
    const user = auth.currentUser;
    const bizName = document.getElementById('biz-name').value;
    const bizPhone = document.getElementById('biz-phone').value;
    const slug = generateSlug(bizName);

    if (!bizName || !bizPhone) return alert("Please fill all fields");

    try {
        await db.collection("stores").doc(user.uid).set({
            storeName: bizName,
            whatsapp: bizPhone,
            slug: slug,
            ownerId: user.uid,
            createdAt: new Date()
        });
        alert("Store setup complete!");
        checkStoreExists(user); // Refresh the UI
    } catch (error) {
        alert(error.message);
    }
}

// 3. Check if user already has a store
async function checkStoreExists(user) {
    if (!user) return;
    
    const storeRef = db.collection("stores").doc(user.uid);
    const doc = await storeRef.get();

    if (doc.exists) {
        const data = doc.data();
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('manage-section').style.display = 'block';
        
        // Generate the Public Link
        const publicLink = window.location.origin + "/store.html?slug=" + data.slug;
        document.getElementById('store-url').innerText = publicLink;
    }
}

// 4. Update the Auth Listener
auth.onAuthStateChanged((user) => {
    if (user) {
        if (window.location.pathname.includes("dashboard.html")) {
            checkStoreExists(user);
        }
    } else {
        if (window.location.pathname.includes("dashboard.html")) {
            window.location.href = "index.html";
        }
    }
});
// --- PUBLIC STORE VIEW LOGIC ---

async function loadPublicStore() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) return;

    // 1. Get Store Info (WhatsApp number & Name)
    const storeQuery = await db.collection("stores").where("slug", "==", slug).get();
    if (storeQuery.empty) {
        document.body.innerHTML = "<h1>Store not found</h1>";
        return;
    }
    
    const storeData = storeQuery.docs[0].data();
    document.getElementById('display-store-name').innerText = storeData.storeName;
    document.title = storeData.storeName + " - SebastianHub";

    // 2. Load Products for this store
    const productQuery = await db.collection("products").where("storeSlug", "==", slug).get();
    const list = document.getElementById('product-list');

    productQuery.forEach(doc => {
        const p = doc.data();
        const card = document.createElement('div');
        card.className = "product-card";
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p class="price">₦${p.price}</p>
            <a href="https://wa.me/${storeData.whatsapp}?text=Hello, I am interested in ${p.name} from your SebastianHub store" class="wa-link">
                Order on WhatsApp
            </a>
        `;
        list.appendChild(card);
    });
}

// Check if we are on the store page
if (window.location.pathname.includes("store.html")) {
    loadPublicStore();
}

function reportStore() {
    alert("This store has been flagged for review. Thank you for keeping SebastianHub safe.");
}

