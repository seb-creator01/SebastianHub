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

// --- CLOUDINARY CONFIG (REPLACE THESE WITH YOUR ACTUAL CLOUDINARY INFO) ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "YOUR_UNSIGNED_PRESET_NAME";

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
            await auth.signInWithEmailAndPassword(email, password);
            alert("Welcome back!");
        } else {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.sendEmailVerification();
            alert("Account created! Check your email to verify your account.");
        }
        window.location.href = "dashboard.html";
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// 5. PROTECT THE DASHBOARD
auth.onAuthStateChanged((user) => {
    if (user) {
        if (window.location.pathname.includes("index.html")) {
            window.location.href = "dashboard.html";
        }
        if (window.location.pathname.includes("dashboard.html")) {
            checkStoreExists(user);
        }
    } else {
        if (window.location.pathname.includes("dashboard.html")) {
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

    if (doc.exists) {
        const data = doc.data();
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('manage-section').style.display = 'block';
        const publicLink = window.location.origin + window.location.pathname.replace("dashboard.html", "store.html") + "?slug=" + data.slug;
        document.getElementById('store-url').innerText = publicLink;
        loadSellerProducts(data.slug); // Load products for the dashboard list
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
        div.style = "border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;";
        div.innerHTML = `
            <div><strong>${p.name}</strong><br>₦${p.price}</div>
            <div>
                <button onclick="editForm('${doc.id}', '${p.name}', '${p.price}', '${p.description || ''}')" style="background:#3498db; width:auto; padding:5px 10px; margin-right:5px;">Edit</button>
                <button onclick="deleteProduct('${doc.id}')" style="background:#e74c3c; width:auto; padding:5px 10px;">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function editForm(id, name, price, desc) {
    document.getElementById('edit-id').value = id;
    document.getElementById('p-name').value = name;
    document.getElementById('p-price').value = price;
    document.getElementById('p-desc').value = desc;
    document.getElementById('upload-btn').innerText = "Save Changes";
    window.scrollTo(0,0);
}

async function deleteProduct(id) {
    if (confirm("Are you sure you want to delete this product?")) {
        await db.collection("products").doc(id).delete();
        location.reload();
    }
}

// --- PUBLIC STORE VIEW LOGIC ---

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

    const productQuery = await db.collection("products").where("storeSlug", "==", slug).get();
    const list = document.getElementById('product-list');

    productQuery.forEach(doc => {
        const p = doc.data();
        const card = document.createElement('div');
        card.className = "product-card";
        card.innerHTML = `
            <img src="${p.image}" alt="${p.name}" onclick="openModal('${p.name}', '${p.price}', '${p.description || ''}', '${p.image}', '${storeData.whatsapp}')">
            <h3>${p.name}</h3>
            <p class="price">₦${p.price}</p>
            <button onclick="openModal('${p.name}', '${p.price}', '${p.description || ''}', '${p.image}', '${storeData.whatsapp}')" style="font-size:12px; padding:5px; margin-bottom:10px;">View Details</button>
            <a href="https://wa.me/${storeData.whatsapp}?text=Hello, I am interested in ${p.name}" class="wa-link">Order on WhatsApp</a>
        `;
        list.appendChild(card);
    });
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

function reportStore() {
    alert("This store has been flagged for review. Thank you for keeping SebastianHub safe.");
}

function copyStoreLink() {
    const linkText = document.getElementById('store-url').innerText;
    navigator.clipboard.writeText(linkText);
    alert("Link copied! Now paste it on your WhatsApp status.");
}
