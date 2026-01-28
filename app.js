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

// --- NEW HELPER: TIME AGO FUNCTION ---
function timeAgo(date) {
    if (!date) return "";
    const seconds = Math.floor((new Date() - date.toDate()) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + " years ago";
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + " months ago";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + (interval === 1 ? " day ago" : " days ago");
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + (interval === 1 ? " hour ago" : " hours ago");
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + (interval === 1 ? " min ago" : " mins ago");
    return "Just now";
}

// 3. TOGGLE BETWEEN LOGIN AND SIGNUP
let isLoginMode = false;

function toggleAuth() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggle = document.getElementById('toggle-text');
    const terms = document.getElementById('terms-container'); 

    if (isLoginMode) {
        title.innerText = "Login to Store";
        btn.innerText = "Login";
        toggle.innerHTML = "New seller? <strong>Create account</strong>";
        if(terms) terms.style.display = "none"; 
    } else {
        title.innerText = "Create Store Account";
        btn.innerText = "Sign Up";
        toggle.innerHTML = "Already a seller? <strong>Login here</strong>";
        if(terms) terms.style.display = "flex"; 
    }
}

// 4. HANDLE SIGNUP AND LOGIN (UPDATED FOR VERIFICATION AND TERMS)
async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const termsCheckbox = document.getElementById('terms-checkbox');

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

// --- PASSWORD RESET & RESEND VERIFICATION ---
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

// 5. PROTECT THE DASHBOARD
auth.onAuthStateChanged((user) => {
    if (user) {
        if (!user.emailVerified) {
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
            listenForGlobalMessages(); // Start listening for Admin messages
        }
    } else {
        if (window.location.pathname.includes("dashboard.html") || window.location.pathname.includes("admin.html")) {
            window.location.href = "index.html";
        }
    }
});

// --- NEW: GLOBAL MESSAGE LOGIC ---
function listenForGlobalMessages() {
    db.collection("settings").doc("announcement").onSnapshot((doc) => {
        const msgArea = document.getElementById('global-announcement-area');
        if (doc.exists && doc.data().message && msgArea) {
            msgArea.style.display = "block";
            const timeStr = doc.data().timestamp ? timeAgo(doc.data().timestamp) : "";
            msgArea.innerHTML = `
                <div style="background:#e8f4fd; border-left:5px solid #3498db; padding:15px; margin-bottom:20px; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                        <strong style="color:#2c3e50;">📢 Admin Announcement</strong>
                        <span style="font-size:10px; color:#7f8c8d;">${timeStr}</span>
                    </div>
                    <p style="margin:0; color:#34495e; font-size:14px; line-height:1.4;">${doc.data().message}</p>
                </div>`;
        } else if (msgArea) {
            msgArea.style.display = "none";
        }
    });
}

// --- NEW: ADMIN ANNOUNCEMENT FUNCTIONS ---
async function sendGlobalMessage() {
    const msg = document.getElementById('global-msg-input').value;
    if (!msg) return alert("Please type a message first.");
    try {
        await db.collection("settings").doc("announcement").set({ 
            message: msg, 
            timestamp: new Date() 
        });
        alert("Announcement Published to all sellers!");
        document.getElementById('global-msg-input').value = "";
    } catch (e) { alert("Error: " + e.message); }
}

async function clearGlobalMessage() {
    if(confirm("Are you sure you want to remove the announcement for everyone?")) {
        try {
            await db.collection("settings").doc("announcement").delete();
            alert("Announcement Removed.");
        } catch (e) { alert("Error: " + e.message); }
    }
}

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
    const bizBio = document.getElementById('biz-bio') ? document.getElementById('biz-bio').value : ""; 
    const slug = generateSlug(bizName);

    if (!bizName || !bizPhone) return alert("Please fill all fields");

    try {
        await db.collection("stores").doc(user.uid).set({
            storeName: bizName,
            whatsapp: bizPhone,
            storeBio: bizBio, 
            slug: slug,
            ownerId: user.uid,
            visits: 0, 
            isSuspended: false, 
            profilePic: "https://via.placeholder.com/100", 
            createdAt: new Date()
        });
        alert("Store setup complete!");
        checkStoreExists(user);
    } catch (error) {
        alert(error.message);
    }
}

async function updateBio() {
    const newBio = document.getElementById('biz-bio-edit').value;
    try {
        await db.collection("stores").doc(auth.currentUser.uid).update({ 
            storeBio: newBio 
        });
        alert("Business Bio Updated!");
    } catch (e) { 
        alert("Error: " + e.message); 
    }
}

async function updateWhatsApp() {
    const newPhone = document.getElementById('biz-phone-edit').value;
    if(!newPhone) return alert("Please enter a valid number");
    try {
        await db.collection("stores").doc(auth.currentUser.uid).update({ 
            whatsapp: newPhone 
        });
        alert("WhatsApp Number Updated!");
    } catch (e) { 
        alert("Error: " + e.message); 
    }
}

async function checkStoreExists(user) {
    if (!user) return;
    const storeRef = db.collection("stores").doc(user.uid);
    const doc = await storeRef.get();

    if (user.email === "precioussebastian70@gmail.com") {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) adminLink.style.display = "block";
    }

    if (doc.exists) {
        const data = doc.data();
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('manage-section').style.display = 'block';

        // --- ADDED: DASHBOARD SUSPENSION WARNING ---
        const manageSection = document.getElementById('manage-section');
        const existingWarning = document.getElementById('suspension-warning');
        if (data.isSuspended) {
            if (!existingWarning) {
                const warningDiv = document.createElement('div');
                warningDiv.id = "suspension-warning";
                warningDiv.style = "background:#ffeded; border:1px solid #ff4d4d; color:#cc0000; padding:15px; border-radius:10px; margin-bottom:20px; text-align:center; font-weight:bold;";
                warningDiv.innerHTML = `
                    ⚠️ Your store is currently SUSPENDED.<br>
                    <span style="font-size:12px; font-weight:normal;">Your public link is hidden. Please contact support to resolve this.</span>
                `;
                manageSection.prepend(warningDiv);
            }
            const statusText = document.getElementById('store-status-text');
            if (statusText) {
                statusText.innerText = "Suspended";
                statusText.style.color = "red";
            }
        } else {
            if (existingWarning) existingWarning.remove();
            const statusText = document.getElementById('store-status-text');
            if (statusText) {
                statusText.innerText = "Active";
                statusText.style.color = "#3498db";
            }
        }
        
        const visitCounter = document.getElementById('visit-count');
        if (visitCounter) {
            visitCounter.innerText = data.visits || 0;
        }

        const profilePreview = document.getElementById('profile-preview');
        if (profilePreview) {
            profilePreview.src = data.profilePic || "https://via.placeholder.com/100";
        }

        const bioEditInput = document.getElementById('biz-bio-edit');
        if (bioEditInput) {
            bioEditInput.value = data.storeBio || "";
        }

        const phoneEditInput = document.getElementById('biz-phone-edit');
        if (phoneEditInput) {
            phoneEditInput.value = data.whatsapp || "";
        }

        const publicLink = window.location.origin + window.location.pathname.replace("dashboard.html", "store.html") + "?slug=" + data.slug;
        document.getElementById('store-url').innerText = publicLink;
        loadSellerProducts(data.slug); 
    }
}

async function uploadProfilePic() {
    const file = document.getElementById('profile-upload').files[0];
    if (!file) return alert("Select an image first");
    
    toggleLoader(true);
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        
        await db.collection("stores").doc(auth.currentUser.uid).update({ 
            profilePic: data.secure_url 
        });
        
        const profilePreview = document.getElementById('profile-preview');
        if (profilePreview) profilePreview.src = data.secure_url;
        
        alert("Profile Picture Updated!");
    } catch (e) { 
        alert("Error: " + e.message); 
    }
    toggleLoader(false);
}

function saveCustomerProfile() {
    const name = document.getElementById('cust-name').value;
    const address = document.getElementById('cust-address').value;
    localStorage.setItem('customer_profile', JSON.stringify({ name, address }));
    alert("Profile saved! Your info will now be attached to your orders.");
    document.getElementById('profile-form').style.display = 'none';
    renderProducts(allProducts); 
}

function getCustomerData() {
    const data = localStorage.getItem('customer_profile');
    return data ? JSON.parse(data) : null;
}

// --- PRODUCT LOGIC ---

function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = show ? 'flex' : 'none';
}

async function handleProductUpload() {
    const file = document.getElementById('p-image').files[0];
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const desc = document.getElementById('p-desc').value;
    const category = document.getElementById('p-category').value; 
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
            category: category, 
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
            productData.isSoldOut = false; 
            productData.isFeatured = false; 
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
    
    let featuredCount = 0;
    snapshot.forEach(doc => { if(doc.data().isFeatured) featuredCount++; });

    snapshot.forEach(doc => {
        const p = doc.data();
        const div = document.createElement('div');
        div.style = "border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; background:white;";
        
        const statusColor = p.isSoldOut ? "#888" : "#25D366";
        const statusText = p.isSoldOut ? "Restock" : "Mark Sold";
        const pinText = p.isFeatured ? "Unpin" : "Pin Top";
        const pinColor = p.isFeatured ? "#f1c40f" : "#95a5a6";

        div.innerHTML = `
            <div style="flex:1;">
                <strong>${p.name}</strong> ${p.isSoldOut ? '<span style="color:red; font-size:10px;">(SOLD)</span>' : ''} 
                ${p.isFeatured ? '⭐' : ''}<br>
                ₦${p.price} | ${p.category || 'No Category'}<br>
                <span style="font-size:10px; color:#999;">Last update: ${timeAgo(p.updatedAt || p.createdAt)}</span>
            </div>
            <div style="display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end;">
                <button onclick="toggleFeatured('${doc.id}', ${p.isFeatured}, ${featuredCount})" style="background:${pinColor}; width:auto; padding:5px 8px; font-size:11px;">${pinText}</button>
                <button onclick="toggleSoldStatus('${doc.id}', ${p.isSoldOut})" style="background:${statusColor}; width:auto; padding:5px 8px; font-size:11px;">${statusText}</button>
                <button onclick="editForm('${doc.id}', '${p.name}', '${p.price}', '${p.description || ''}', '${p.category || ''}')" style="background:#3498db; width:auto; padding:5px 8px; font-size:11px;">Edit</button>
                <button onclick="deleteProduct('${doc.id}')" style="background:#e74c3c; width:auto; padding:5px 8px; font-size:11px;">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

async function toggleFeatured(id, currentStatus, count) {
    if (!currentStatus && count >= 3) return alert("You can only pin up to 3 featured products.");
    try {
        await db.collection("products").doc(id).update({ isFeatured: !currentStatus });
        location.reload();
    } catch (e) { alert(e.message); }
}

async function toggleSoldStatus(id, currentStatus) {
    try {
        await db.collection("products").doc(id).update({
            isSoldOut: !currentStatus,
            updatedAt: new Date()
        });
        location.reload();
    } catch (e) { alert("Error updating status: " + e.message); }
}

function editForm(id, name, price, desc, category) { 
    document.getElementById('edit-id').value = id;
    document.getElementById('p-name').value = name;
    document.getElementById('p-price').value = price;
    document.getElementById('p-desc').value = desc;
    document.getElementById('p-category').value = category || ""; 
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

let allProducts = []; 

async function loadPublicStore() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    if (!slug) return;

    const storeQuery = await db.collection("stores").where("slug", "==", slug).get();
    if (storeQuery.empty) {
        document.body.innerHTML = "<h1>Store not found</h1>";
        return;
    }
    
    const storeDoc = storeQuery.docs[0];
    const storeData = storeDoc.data();

    if (storeData.isSuspended) {
        document.body.innerHTML = `
            <div style="text-align:center; margin-top:100px; font-family:sans-serif; padding:20px;">
                <h1 style="color:#e74c3c;">Store Unavailable</h1>
                <p>This store has been temporarily suspended by SebastianHub for violating our terms.</p>
                <a href="index.html" style="color:#25D366; text-decoration:none; font-weight:bold;">Return to Homepage</a>
            </div>
        `;
        return;
    }

    document.getElementById('display-store-name').innerText = storeData.storeName;
    document.title = storeData.storeName + " - SebastianHub";

    const bioDisplay = document.getElementById('display-store-bio');
    if (bioDisplay) {
        bioDisplay.innerText = storeData.storeBio || "Welcome to my store!";
    }

    const storeProfileImg = document.getElementById('store-profile-img');
    if (storeProfileImg) {
        storeProfileImg.src = storeData.profilePic || "https://via.placeholder.com/100";
    }

    db.collection("stores").doc(storeDoc.id).update({
        visits: firebase.firestore.FieldValue.increment(1)
    });

    const badge = document.getElementById('badge');
    if (badge && storeData.isVerified) {
        badge.innerText = "Verified Seller ✅";
        badge.className = "badge-verified"; 
        badge.style.background = "#25D366";
    }

    const productQuery = await db.collection("products").where("storeSlug", "==", slug).get();
    
    allProducts = []; 
    productQuery.forEach(doc => {
        allProducts.push({ id: doc.id, ...doc.data(), whatsapp: storeData.whatsapp });
    });

    const customer = getCustomerData();
    if (customer) {
        if (document.getElementById('cust-name')) document.getElementById('cust-name').value = customer.name;
        if (document.getElementById('cust-address')) document.getElementById('cust-address').value = customer.address;
    }

    renderProducts(allProducts); 
}

function getCategoryStyle(cat) {
    const colors = {
        'Electronics': '#3498db',
        'Fashion': '#e91e63',
        'Beauty': '#9b59b6',
        'Food': '#e67e22',
        'Home': '#27ae60',
        'Services': '#1abc9c'
    };
    return colors[cat] || '#7f8c8d';
}

function renderProducts(products) {
    const featuredList = document.getElementById('featured-list');
    const regularList = document.getElementById('product-list');
    const featuredSection = document.getElementById('featured-section');

    if(!regularList) return;
    regularList.innerHTML = "";
    if(featuredList) featuredList.innerHTML = "";

    const customer = getCustomerData();
    let customerString = "";
    if (customer && customer.name) {
        customerString = `\n\n--- Customer Info ---\nName: ${customer.name}\nAddress: ${customer.address || 'Not provided'}`;
    }

    if (products.length === 0) {
        regularList.innerHTML = "<p style='grid-column: 1/-1; text-align:center; padding: 20px; color:#888;'>No products found matching your search.</p>";
        if(featuredSection) featuredSection.style.display = "none";
        return;
    }

    const featuredItems = products.filter(p => p.isFeatured);
    const regularItems = products.filter(p => !p.isFeatured);

    if(featuredSection) featuredSection.style.display = featuredItems.length > 0 ? "block" : "none";

    const createCard = (p) => {
        const opacity = p.isSoldOut ? 'opacity: 0.6;' : '';
        const soldTag = p.isSoldOut ? '<div style="position:absolute; top:10px; right:10px; background:red; color:white; padding:5px 10px; border-radius:5px; font-weight:bold; font-size:12px; z-index:5;">SOLD OUT</div>' : '';
        
        const waTextMsg = encodeURIComponent(`Hello, I'm interested in buying: ${p.name} (₦${p.price})${customerString}`);
        const waLink = p.isSoldOut ? '#' : `https://wa.me/${p.whatsapp}?text=${waTextMsg}`;
        
        const waBtnLabel = p.isSoldOut ? 'Out of Stock' : 'Order on WhatsApp';
        const waStyle = p.isSoldOut ? 'background:#ccc; pointer-events:none;' : '';
        const catBadge = p.category ? `<span style="background:${getCategoryStyle(p.category)}; color:white; padding:3px 8px; border-radius:12px; font-size:10px; margin-bottom:5px; display:inline-block;">${p.category}</span>` : '';

        const card = document.createElement('div');
        card.className = "product-card";
        card.style = `position:relative; ${opacity}`;
        card.innerHTML = `
            ${soldTag}
            <img src="${p.image}" alt="${p.name}" onclick="openModal('${p.name}', '${p.price}', '${p.description || ''}', '${p.image}', '${p.whatsapp}')">
            <div style="padding:10px;">
                ${catBadge}
                <p style="font-size:9px; color:#999; margin: 0;">Updated ${timeAgo(p.updatedAt || p.createdAt)}</p>
                <h3 style="margin:5px 0;">${p.name}</h3>
                <p class="price" style="color:#25D366; font-weight:bold;">₦${p.price}</p>
                <button onclick="openModal('${p.name}', '${p.price}', '${p.description || ''}', '${p.image}', '${p.whatsapp}')" style="font-size:12px; padding:5px; margin-bottom:10px; width:100%;">View Details</button>
                <a href="${waLink}" class="wa-link" style="display:block; text-align:center; padding:10px; border-radius:5px; text-decoration:none; color:white; font-weight:bold; ${waStyle}">${waBtnLabel}</a>
            </div>
        `;
        return card;
    };

    featuredItems.forEach(p => { if(featuredList) featuredList.appendChild(createCard(p)); });
    regularItems.forEach(p => { regularList.appendChild(createCard(p)); });
}

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
    const customer = getCustomerData();
    let customerString = "";
    if (customer && customer.name) {
        customerString = `\n\n--- Customer Info ---\nName: ${customer.name}\nAddress: ${customer.address || 'Not provided'}`;
    }
    const waTextMsg = encodeURIComponent(`Hello, I'm interested in: ${name} (₦${price})${customerString}`);

    document.getElementById('modal-name').innerText = name;
    document.getElementById('modal-price').innerText = "₦" + price;
    document.getElementById('modal-desc').innerText = desc || "No description provided.";
    document.getElementById('modal-img').src = img;
    document.getElementById('modal-wa-btn').href = `https://wa.me/${phone}?text=${waTextMsg}`;
    document.getElementById('product-modal').style.display = "flex";
}

function closeModal() {
    document.getElementById('product-modal').style.display = "none";
}

if (window.location.pathname.includes("store.html")) {
    loadPublicStore();
}

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

function shareToWhatsApp() {
    const linkText = document.getElementById('store-url').innerText;
    const bizName = document.getElementById('biz-name').value || "my store";
    
    const message = encodeURIComponent(
        `Hi! Check out my official store on SebastianHub: ${bizName} 🛍️\n\n` +
        `Browse my products and chat with me directly here:\n${linkText}`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
}

const ADMIN_EMAIL = "precioussebastian70@gmail.com"; 

async function loadMasterList() {
    const user = auth.currentUser;
    if (!user || user.email !== ADMIN_EMAIL) {
        alert("Access Denied. Logged in as: " + (user ? user.email : "Guest"));
        window.location.href = "dashboard.html";
        return;
    }

    const tbody = document.getElementById('admin-master-list');
    if (!tbody) return;

    try {
        const reportsSnapshot = await db.collection("reports").get();
        const reportCounts = {};
        reportsSnapshot.forEach(doc => {
            const data = doc.data();
            reportCounts[data.flaggedStore] = (reportCounts[data.flaggedStore] || 0) + 1;
        });

        const snapshot = await db.collection("stores").get();
        tbody.innerHTML = "";

        if (snapshot.empty) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px; color:#888;'>No stores found in database.</td></tr>";
            return;
        }

        snapshot.forEach(doc => {
            const store = doc.data();
            const count = reportCounts[store.slug] || 0; 
            const isSuspended = store.isSuspended || false;
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #eee";
            
            const reportStyle = count > 0 ? "color: red; font-weight: bold;" : "color: #888;";
            const suspendBtnText = isSuspended ? "Un-Ban" : "Ban Store";
            const suspendBtnColor = isSuspended ? "#27ae60" : "#f39c12";

            tr.innerHTML = `
                <td style="padding: 10px;">${store.storeName}</td>
                <td style="padding: 10px;">${store.whatsapp}</td>
                <td style="padding: 10px;">
                    ${store.isVerified ? '<span style="color:green;">Verified ✅</span>' : '<span style="color:orange;">Pending</span>'}<br>
                    ${isSuspended ? '<span style="color:red; font-size:10px;">SUSPENDED</span>' : '<span style="color:green; font-size:10px;">ACTIVE</span>'}
                </td>
                <td style="padding: 10px; ${reportStyle}">${count} Reports</td>
                <td style="padding: 10px;">
                    <button onclick="adminVerifyStore('${doc.id}')" style="font-size: 10px; padding: 5px; width: auto; background: #3498db; margin-right:5px;">Verify</button>
                    <button onclick="adminToggleSuspension('${doc.id}', ${isSuspended})" style="font-size: 10px; padding: 5px; width: auto; background: ${suspendBtnColor}; margin-right:5px;">${suspendBtnText}</button>
                    <button onclick="adminDeleteStore('${doc.id}')" style="font-size: 10px; padding: 5px; width: auto; background: #e74c3c;">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        alert("Database Error: " + error.message);
    }
}

async function adminToggleSuspension(storeId, currentStatus) {
    const action = currentStatus ? "un-suspend" : "suspend";
    if (confirm(`Are you sure you want to ${action} this store?`)) {
        try {
            await db.collection("stores").doc(storeId).update({ 
                isSuspended: !currentStatus 
            });
            alert(`Store ${action}ed successfully.`);
            loadMasterList(); 
        } catch (e) {
            alert("Error: " + e.message);
        }
    }
}

async function adminVerifyStore(storeId) {
    if (confirm("Confirm verification for this store?")) {
        await db.collection("stores").doc(storeId).update({ isVerified: true });
        alert("Store Verified!");
        loadMasterList();
    }
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

if (window.location.pathname.includes("admin.html")) {
    auth.onAuthStateChanged((user) => {
        if (user) loadMasterList();
    });
}

function toggleDarkMode() {
    const body = document.body;
    const btn = document.getElementById('dark-mode-toggle');
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (btn) btn.innerText = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('dark-mode-toggle');
        if (btn) btn.innerText = "☀️ Light Mode";
    }
});
