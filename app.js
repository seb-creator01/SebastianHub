// 1. YOUR FIREBASE CONFIGURATION
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

// --- CLOUDINARY CONFIG (UPDATED WITH YOUR REAL KEYS) ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dwsc9eumf/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "sebastian_preset";

// 3. TOGGLE BETWEEN LOGIN AND SIGNUP
let isLoginMode = false;

function toggleAuth() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggle = document.getElementById('toggle-text');
    const terms = document.getElementById('terms-container'); // NEW: Get the terms container

    if (isLoginMode) {
        title.innerText = "Login to Store";
        btn.innerText = "Login";
        toggle.innerHTML = "New seller? <strong>Create account</strong>";
        if(terms) terms.style.display = "none"; // Hide checkbox on login
    } else {
        title.innerText = "Create Store Account";
        btn.innerText = "Sign Up";
        toggle.innerHTML = "Already a seller? <strong>Login here</strong>";
        if(terms) terms.style.display = "flex"; // Show checkbox on signup
    }
}

// 4. HANDLE SIGNUP AND LOGIN (UPDATED FOR VERIFICATION AND TERMS)
async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const termsCheckbox = document.getElementById('terms-checkbox');

    // NEW: Check if terms are accepted only during Sign Up
    if (!isLoginMode && termsCheckbox && !termsCheckbox.checked) {
        return alert("You must agree to the Terms & Conditions to create a store.");
    }

    if (!email || !password) {
        return alert("Please fill in all fields.");
    }

    try {
        if (isLoginMode) {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (!user.emailVerified) {
                alert("Please verify your email before logging in. Check your inbox.");
                await auth.signOut();
                return;
            }
            alert("Welcome back!");
        } else {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.sendEmailVerification();
            alert("Account created! Please check your email and click the verification link before logging in.");
            await auth.signOut();
            location.reload();
            return;
        }
        window.location.href = "dashboard.html";
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// --- NEW: PASSWORD RESET & RESEND VERIFICATION ---
async function forgotPassword() {
    const email = document.getElementById('email').value;
    if (!email) return alert("Please enter your email address first.");
    try {
        await auth.sendPasswordResetEmail(email);
        alert("Password reset link sent to your email!");
    } catch (error) {
        alert("Error: " + error.message);
    }
}

async function resendVerification() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) return alert("Enter email and password to resend link.");

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        await userCredential.user.sendEmailVerification();
        alert("Verification email resent!");
        await auth.signOut();
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// 5. PROTECT THE DASHBOARD (UPDATED GATEKEEPER)
auth.onAuthStateChanged((user) => {
    if (user) {
        if (!user.emailVerified) {
            // Force logout if they try to bypass verification
            auth.signOut();
            if (!window.location.pathname.includes("index.html")) {
                window.location.href = "index.html";
            }
            return;
        }

        if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
            window.location.href = "dashboard.html";
        }
        if (window.location.pathname.includes("dashboard.html")) {
            checkStoreExists(user);
        }
    } else {
        if (window.location.pathname.includes("dashboard.html") || window.location.pathname.includes("admin.html")) {
            window.location.href = "index.html";
        }
    }
});

// --- DASHBOARD LOGIC ---

function generateSlug(text) {
    return text.toLowerCase()
               .trim()
               .replace(/[^\w\s-]/g, '')
               .replace(/[\s_-]+/g, '-')
               .replace(/^-+|-+$/g, '');
}

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
        checkStoreExists(user);
    } catch (error) {
        alert(error.message);
    }
}

async function checkStoreExists(user) {
    if (!user) return;
    const storeRef = db.collection("stores").doc(user.uid);
    const doc = await storeRef.get();

    // ADMIN CHECK: Show a link to admin.html if the user is you
    if (user.email === "precioussebastian70@gmail.com") {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) adminLink.style.display = "block";
    }

    if (doc.exists) {
        const data = doc.data();
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('manage-section').style.display = 'block';
        
        // Dynamic link generation for GitHub Pages
        const publicLink = window.location.origin + window.location.pathname.replace("dashboard.html", "store.html") + "?slug=" + data.slug;
        document.getElementById('store-url').innerText = publicLink;
        loadSellerProducts(data.slug); 
    }
}

// --- NEW UPDATED LOGIC (IMAGE UPLOAD, EDIT, DELETE, LOADER) ---

function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = show ? 'flex' : 'none';
}

async function handleProductUpload() {
    const file = document.getElementById('p-image').files[0];
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const desc = document.getElementById('p-desc').value;
    const category = document.getElementById('p-category').value; // NEW
    const editId = document.getElementById('edit-id').value;

    if (!name || !price) return alert("Fill name and price!");

    toggleLoader(true);

    try {
        let imageUrl = "";
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await res.json();
            imageUrl = data.secure_url;
        }

        const user = auth.currentUser;
        const storeDoc = await db.collection("stores").doc(user.uid).get();
        const storeData = storeDoc.data();

        const productData = {
            name, price, description: desc,
            category: category, // NEW
            storeSlug: storeData.slug,
            ownerId: user.uid,
            updatedAt: new Date()
        };
        if (imageUrl) productData.image = imageUrl;

        if (editId) {
            await db.collection("products").doc(editId).update(productData);
            alert("Updated Successfully!");
        } else {
            if(!imageUrl) { toggleLoader(false); return alert("Please select an image for new products"); }
            productData.createdAt = new Date();
            await db.collection("products").add(productData);
            alert("Uploaded Successfully!");
        }
        location.reload();
    } catch (e) { alert(e.message); toggleLoader(false); }
}

async function loadSellerProducts(slug) {
    const list = document.getElementById('seller-product-list');
    if(!list) return;
    const snapshot = await db.collection("products").where("storeSlug", "==", slug).get();
    list.innerHTML = "";
    snapshot.forEach(doc => {
        const p = doc.data();
        const div = document.createElement('div');
        div.style = "border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; background:white;";
        div.innerHTML = `
            <div><strong>${p.name}</strong><br>₦${p.price} | ${p.category || 'No Category'}</div>
            <div>
                <button onclick="editForm('${doc.id}', '${p.name}', '${p.price}', '${p.description || ''}', '${p.category || ''}')" style="background:#3498db; width:auto; padding:5px 10px; margin-right:5px; font-size:12px;">Edit</button>
                <button onclick="deleteProduct('${doc.id}')" style="background:#e74c3c; width:auto; padding:5px 10px; font-size:12px;">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function editForm(id, name, price, desc, category) { // UPDATED
    document.getElementById('edit-id').value = id;
    document.getElementById('p-name').value = name;
    document.getElementById('p-price').value = price;
    document.getElementById('p-desc').value = desc;
    document.getElementById('p-category').value = category || ""; // NEW
    document.getElementById('upload-btn').innerText = "Save Changes";
    window.scrollTo(0,0);
}

async function deleteProduct(id) {
    if (confirm("Are you sure you want to delete this product?")) {
        await db.collection("products").doc(id).delete();
        location.reload();
    }
}

// --- PUBLIC STORE VIEW LOGIC (UPDATED WITH SEARCH & FILTER) ---

let allProducts = []; // Global variable to store all products for local filtering

async function loadPublicStore() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    if (!slug) return;

    const storeQuery = await db.collection("stores").where("slug", "==", slug).get();
    if (storeQuery.empty) {
        document.body.innerHTML = "<h1>Store not found</h1>";
        return;
    }
    
    const storeData = storeQuery.docs[0].data();
    document.getElementById('display-store-name').innerText = storeData.storeName;
    document.title = storeData.storeName + " - SebastianHub";

    // Update verified badge UI if store is verified
    const badge = document.getElementById('badge');
    if (badge && storeData.isVerified) {
        badge.innerText = "Verified Seller ✅";
        badge.className = "badge-verified"; 
        badge.style.background = "#25D366";
    }

    const productQuery = await db.collection("products").where("storeSlug", "==", slug).get();
    
    allProducts = []; // Clear array
    productQuery.forEach(doc => {
        allProducts.push({ id: doc.id, ...doc.data(), whatsapp: storeData.whatsapp });
    });

    renderProducts(allProducts); // Initial render
}

// Function to render the product grid
function renderProducts(products) {
    const list = document.getElementById('product-list');
    if(!list) return;
    list.innerHTML = "";

    if (products.length === 0) {
        list.innerHTML = "<p style='grid-column: 1/-1; text-align:center; padding: 20px; color:#888;'>No products found matching your search.</p>";
        return;
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = "product-card";
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}" onclick="openModal('${p.name}', '${p.price}', '${p.description || ''}', '${p.image}', '${p.whatsapp}')">
            <h3>${p.name}</h3>
            <p class="price">₦${p.price}</p>
            <button onclick="openModal('${p.name}', '${p.price}', '${p.description || ''}', '${p.image}', '${p.whatsapp}')" style="font-size:12px; padding:5px; margin-bottom:10px; width:100%;">View Details</button>
            <a href="https://wa.me/${p.whatsapp}?text=Hello, I am interested in ${p.name}" class="wa-link">Order on WhatsApp</a>
        `;
        list.appendChild(card);
    });
}

// Function to filter products based on search input and category selection
function filterProducts() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const categoryQuery = document.getElementById('filter-category').value;

    const filtered = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery);
        const matchesCategory = categoryQuery === "" || p.category === categoryQuery;
        return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
}

function openModal(name, price, desc, img, phone) {
    document.getElementById('modal-name').innerText = name;
    document.getElementById('modal-price').innerText = "₦" + price;
    document.getElementById('modal-desc').innerText = desc || "No description provided.";
    document.getElementById('modal-img').src = img;
    document.getElementById('modal-wa-btn').href = `https://wa.me/${phone}?text=Hello, I'm interested in ${name}`;
    document.getElementById('product-modal').style.display = "flex";
}

function closeModal() {
    document.getElementById('product-modal').style.display = "none";
}

if (window.location.pathname.includes("store.html")) {
    loadPublicStore();
}

// --- UPDATED REPORT LOGIC ---
async function reportStore() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) return;

    if (confirm("Are you sure you want to report this store for suspicious activity?")) {
        try {
            await db.collection("reports").add({
                flaggedStore: slug,
                reportedAt: new Date(),
                status: "pending_review"
            });
            alert("This store has been flagged for review. Thank you for keeping SebastianHub safe.");
        } catch (error) {
            console.error("Error reporting store: ", error);
            alert("Report could not be sent. Please try again later.");
        }
    }
}

function copyStoreLink() {
    const linkText = document.getElementById('store-url').innerText;
    navigator.clipboard.writeText(linkText);
    alert("Link copied! Now paste it on your WhatsApp status.");
}

// --- ADMIN MASTER LIST LOGIC (NEW) ---

const ADMIN_EMAIL = "precioussebastian70@gmail.com"; 

async function loadMasterList() {
    const user = auth.currentUser;
    if (!user || user.email !== ADMIN_EMAIL) {
        alert("Access Denied.");
        window.location.href = "dashboard.html";
        return;
    }

    const tbody = document.getElementById('admin-master-list');
    if (!tbody) return;

    // 1. Get all reports first to count them
    const reportsSnapshot = await db.collection("reports").get();
    const reportCounts = {};
    reportsSnapshot.forEach(doc => {
        const data = doc.data();
        reportCounts[data.flaggedStore] = (reportCounts[data.flaggedStore] || 0) + 1;
    });

    // 2. Fetch all stores
    const snapshot = await db.collection("stores").orderBy("createdAt", "desc").get();
    tbody.innerHTML = "";

    snapshot.forEach(doc => {
        const store = doc.data();
        const count = reportCounts[store.slug] || 0; 
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #eee";
        
        const reportStyle = count > 0 ? "color: red; font-weight: bold;" : "color: #888;";

        tr.innerHTML = `
            <td style="padding: 10px;">${store.storeName}</td>
            <td style="padding: 10px;">${store.whatsapp}</td>
            <td style="padding: 10px;">
                ${store.isVerified ? '<span style="color:green;">Verified ✅</span>' : '<span style="color:orange;">Pending</span>'}
            </td>
            <td style="padding: 10px; ${reportStyle}">${count} Reports</td>
            <td style="padding: 10px;">
                <button onclick="adminVerifyStore('${doc.id}')" style="font-size: 10px; padding: 5px; width: auto; background: #3498db; margin-right:5px;">Verify</button>
                <button onclick="adminDeleteStore('${doc.id}')" style="font-size: 10px; padding: 5px; width: auto; background: #e74c3c;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function adminVerifyStore(storeId) {
    if (confirm("Confirm verification for this store?")) {
        await db.collection("stores").doc(storeId).update({ isVerified: true });
        alert("Store Verified!");
        loadMasterList();
    }
}

async function adminDeleteStore(storeId) {
    if (confirm("WARNING: This will delete the store permanently. Continue?")) {
        await db.collection("stores").doc(storeId).delete();
        alert("Store Removed.");
        loadMasterList();
    }
}

// Run the loader if on admin.html
if (window.location.pathname.includes("admin.html")) {
    auth.onAuthStateChanged((user) => {
        if (user) loadMasterList();
    });
}

// --- NEW UPDATE: DARK MODE LOGIC ---

function toggleDarkMode() {
    const body = document.body;
    const btn = document.getElementById('dark-mode-toggle');
    
    body.classList.toggle('dark-mode');
    
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (btn) btn.innerText = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('dark-mode-toggle');
        if (btn) btn.innerText = "☀️ Light Mode";
    }
});
