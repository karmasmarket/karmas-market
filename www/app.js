/* ==================================
GLOBAL VARIABLES
================================== */
console.log("APP.JS LOADED - CLEAN VERSION");

let currentChatId = null;
let currentItemId = null;
let currentSeller = "";
let messaging = null;
let analyticsChart = null;

try{
    if(firebase.messaging){
        messaging = firebase.messaging();
    }
}catch(error){
    console.log("Messaging not available", error);
}

/* ==================================
ADMIN CONFIGURATION
================================== */

const ADMIN_EMAIL = "musaabdullahi20001@gmail.com";

function isAdmin(){
    const user = auth.currentUser;
    return !!(user && user.email === ADMIN_EMAIL);
}

function requireAdmin(){
    if(!isAdmin()){
        alert("Access denied. Admins only.");
        return false;
    }
    return true;
}

/* ==================================
AUDIT LOGGING
Records fraud-relevant actions (admin
moderation, listing deletions, escrow
releases, withdrawals, logins) to a
dedicated Firestore collection, so
there's a permanent trail if something
is ever disputed or investigated.
This never blocks or fails the action
it's logging — if writing the log
itself fails, that failure is only
logged to the console, not shown to
the user.
================================== */

function logAuditEvent(action, details){

    try{

        const user = auth.currentUser;

        db.collection("auditLogs").add({
            action: action,
            performedByEmail: user ? user.email : "system",
            performedByUid: user ? user.uid : null,
            isAdminAction: isAdmin(),
            details: details || {},
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(error=>{
            console.log("Audit log write failed:", error);
        });

    }catch(error){
        console.log("Audit log error:", error);
    }

}

/* ==================================
COMMISSION ENGINE
(Tiered structure — applies to both
product sales and freelancer hires)
================================== */

function getCommissionRate(price){

    const amount = Number(price);

    if(amount <= 20000) return 0.10;
    if(amount <= 100000) return 0.08;
    if(amount <= 500000) return 0.06;
    if(amount <= 2000000) return 0.04;

    return 0.03; // above ₦2,000,000

}

function calculateCommission(price){

    const amount = Number(price);
    const rate = getCommissionRate(amount);

    return Math.round(amount * rate);

}

/* ==================================
AUTH PERSISTENCE
(keeps users logged in across brief
network drops instead of forcing
re-auth on every hiccup)
================================== */

try{
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
}catch(error){
    console.log("Persistence setup error:", error);
}

/* ==================================
AUTH STATE
================================== */

auth.onAuthStateChanged((user)=>{

    const userEmail = document.getElementById("userEmail");
    const userStatus = document.getElementById("userStatus");

    if(user){

        if(userEmail){
            userEmail.innerText = user.email;
        }

        if(userStatus){
            userStatus.innerText = "Logged in: " + user.email;
        }

        // Route to the right default tab based on account role, once per
        // page load. Sellers already land on Products (hardcoded active
        // in home.html), but freelancers were also landing on Products
        // first — which meant a freelancer's own listings/pricing info
        // could look like it was mixed in with the general product feed.
        // This sends freelancers straight to Services instead. It only
        // runs once so it never fights with the user's own navigation
        // afterward.
        if(!window.hasAppliedRoleLanding){
            window.hasAppliedRoleLanding = true;

            db.collection("users").doc(user.uid).get().then(doc=>{
                if(doc.exists && doc.data().role === "freelancer"){
                    const servicesBtn = Array.from(document.querySelectorAll(".nav-btn"))
                        .find(btn => btn.getAttribute("onclick") && btn.getAttribute("onclick").includes("'services'"));
                    showPage("services", servicesBtn);
                }
            }).catch(error=>{
                console.log("Role landing check failed:", error);
            });
        }

    }else{

        if(userStatus){
            userStatus.innerText = "Not logged in";
        }

    }

});
/* ==================================

INPUT SANITIZATION

Strips HTML tags from user-supplied

text before it's ever written to

Firestore, so stored data can't carry

a script/markup injection payload.

Apply this to any free-text field

before saving (messages, reviews,

product titles/descriptions, contact

form, promo text, etc).

================================== */



function sanitizeText(value){



    if(value === null || value === undefined) return "";



    return String(value)

        .replace(/<[^>]*>/g, "")   // strip HTML tags

        .replace(/[<>]/g, "")      // strip any stray angle brackets

        .trim();



}



/* ==================================

LOGIN RATE LIMITING

Simple client-side cooldown: blocks

rapid repeated login attempts to slow

down brute-force guessing. This is a

first line of defense only — it does

not replace Firebase App Check or

server-side throttling.

================================== */



const LOGIN_MAX_ATTEMPTS = 5;

const LOGIN_WINDOW_MS = 60000; // 1 minute

let loginAttempts = [];



function isLoginRateLimited(){



    const now = Date.now();



    loginAttempts = loginAttempts.filter(t => now - t < LOGIN_WINDOW_MS);



    if(loginAttempts.length >= LOGIN_MAX_ATTEMPTS){

        return true;

    }



    loginAttempts.push(now);

    return false;



}



/* ==================================

NETWORK / AUTH ERROR MESSAGING

Translates raw Firebase error codes

into messages a non-technical user

can actually act on.

================================== */



function friendlyAuthError(error){



    const code = error && error.code ? error.code : "";



    if(!navigator.onLine){

        return "You appear to be offline. Please check your internet connection and try again.";

    }



    switch(code){

        case "auth/network-request-failed":

            return "Connection lost. Please check your internet and try again.";

        case "auth/user-not-found":

        case "auth/wrong-password":

        case "auth/invalid-credential":

            return "Incorrect email or password. Please check your details and try again.";

        case "auth/too-many-requests":

            return "Too many attempts. Please wait a few minutes before trying again.";

        case "auth/invalid-email":

            return "Please enter a valid email address.";

        case "auth/email-already-in-use":

            return "An account with this email already exists.";

        case "auth/weak-password":

            return "Password is too weak. Please use at least 6 characters.";

        default:

            return error && error.message ? error.message : "Something went wrong. Please try again.";

    }



}



/* ==================================

SIGN UP / LOGIN / LOGOUT

================================== */



function signUp(){



    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value;



    if(!email || !password){

        alert("Please enter email and password");

        return;

    }



    if(!navigator.onLine){

        alert("You're offline. Please check your internet connection and try again.");

        return;

    }



    auth.createUserWithEmailAndPassword(email, password)

    .then(()=>{

        alert("Account created successfully");

    })

    .catch(error=>{

        alert(friendlyAuthError(error));

    });



}



function login(){



    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value;



    if(!email || !password){

        alert("Please enter email and password");

        return;

    }



    if(isLoginRateLimited()){

        alert("Too many login attempts. Please wait a minute before trying again.");

        return;

    }



    if(!navigator.onLine){

        alert("You're offline. Please check your internet connection and try again.");

        return;

    }



    // Safety timeout: if Firebase hangs longer than expected on a flaky

    // connection, tell the user instead of leaving them stuck with no feedback.

    let settled = false;

    const timeoutId = setTimeout(()=>{

        if(!settled){

            alert("This is taking longer than usual. Please check your connection and try again.");

        }

    }, 10000);



    auth.signInWithEmailAndPassword(email, password)

    .then(async (result)=>{

        settled = true;

        clearTimeout(timeoutId);



        // Force a brand new ID token immediately after sign-in, discarding

        // anything cached from a previous session on this browser/device.

        // Without this, switching between two different accounts on the

        // same browser (e.g. testing a seller account then a freelancer

        // account) can leave a stale token in memory whose email claim

        // doesn't match the account that just signed in — every Firestore

        // rule checking request.auth.token.email then fails with

        // "Missing or insufficient permissions" even though the user is

        // genuinely logged in correctly.

        try{

            await result.user.getIdToken(true);

        }catch(tokenError){

            console.log("Token refresh after login failed:", tokenError);

        }



        logAuditEvent("login", { email: email });

        window.location.href = "home.html";

    })

    .catch(error=>{

        settled = true;

        clearTimeout(timeoutId);

        alert(friendlyAuthError(error));

    });



}



function logout(){



    const loggingOutUser = auth.currentUser;



    auth.signOut()

    .then(()=>{

        if(loggingOutUser){

            logAuditEvent("logout", { email: loggingOutUser.email });

        }

        window.location.href = "index.html";

    })

    .catch(error=>{

        alert(friendlyAuthError(error));

    });



}

/* ==================================

PAGE NAVIGATION

================================== */



function showPage(id, btn){



    document.querySelectorAll(".page").forEach(page=>{

        page.classList.remove("active");

    });



    const page = document.getElementById(id);

    if(page){

        page.classList.add("active");

    }



    document.querySelectorAll(".nav-btn").forEach(nav=>{

        nav.classList.remove("active");

    });



    if(btn){

        btn.classList.add("active");

    }



    window.scrollTo({ top:0, behavior:"smooth" });



    if(id === "withdrawalPage"){

        if(typeof loadBankList === "function") loadBankList();

        if(typeof loadWithdrawalHistory === "function") loadWithdrawalHistory();

    }



}



/* ==================================

SEARCH

================================== */



function searchItems(value){



    const search = value.toLowerCase();

    const cards = document.querySelectorAll("#itemFeed .card");



    cards.forEach(card=>{

        const title = card.querySelector("h3").innerText.toLowerCase();

        card.style.display = title.includes(search) ? "block" : "none";

    });



}



function searchApps(value){



    const keyword = value.toLowerCase();

    const cards = document.querySelectorAll("#appFeed .card");



    cards.forEach(card=>{

        const title = card.querySelector("h3").innerText.toLowerCase();

        card.style.display = title.includes(keyword) ? "block" : "none";

    });



}



/* ==================================

LOADER / ONBOARDING

================================== */



function closeOnboarding(){

    const onboarding = document.getElementById("onboarding");

    if(onboarding){

        onboarding.style.display = "none";

    }

}
/* ==================================
NOTIFICATIONS
================================== */

function createNotification(title, message, itemId){

    db.collection("notifications").add({
        title: sanitizeText(title),
        message: sanitizeText(message),
        itemId: itemId || null,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

}

function sendDealNotification(title, price, itemId){
    createNotification("🔥 New Deal Alert", `${title} is now available for ₦${price}`, itemId);
}

function sendAppNotification(appName, itemId){
    createNotification("📱 New App Added", `${appName} is now available in the App Marketplace`, itemId);
}

function sendFreelancerNotification(name){
    createNotification("👨‍💻 New Freelancer", `${name} joined the marketplace`);
}

function sendOrderNotification(orderName){
    createNotification("🛒 New Order", `${orderName} order has been created`);
}

function sendPaymentNotification(name){
    createNotification("✅ Payment Released", `Payment released to ${name}`);
}

function sendPromotionNotification(title){
    createNotification("📢 New Promotion", `${title} has just been published.`);
}

function notifyNewMessage(sender, message){
    createNotification("💬 New Message", `${sender}: ${message}`);
}

function showNotifications(){
    showPage("notificationPage");
    loadNotifications();
}

function loadNotifications(){

    const feed = document.getElementById("notificationFeed");
    if(!feed) return;

    db.collection("notifications")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot=>{

        feed.innerHTML = "";
        let unreadCount = 0;

        snapshot.forEach(doc=>{
            const data = doc.data();
            const isRead = !!data.read;
            if(!isRead) unreadCount++;

            feed.innerHTML += `
            <div onclick="handleNotificationClick('${doc.id}', ${data.itemId ? `'${data.itemId}'` : null})"
                 style="background:${isRead ? '#0a0a0a' : '#111'}; padding:15px; border-radius:14px; border:1px solid ${isRead ? 'rgba(255,215,0,.08)' : 'rgba(255,215,0,.2)'}; margin-bottom:10px; cursor:pointer; opacity:${isRead ? '0.6' : '1'};">
                <h3 style="color:gold;">${data.title}</h3>
                <p>${data.message}</p>
            </div>
            `;
        });

        updateNotificationBadge(unreadCount);

    });

}

function handleNotificationClick(notificationId, itemId){

    db.collection("notifications").doc(notificationId).update({ read: true })
    .catch(error => console.log("Could not mark notification read:", error.message));

    if(itemId){
        openProductDetails(itemId);
    }

}

function updateNotificationBadge(count){

    const badge = document.getElementById("notificationCount");
    if(!badge) return;

    if(count > 0){
        badge.style.display = "block";
        badge.innerText = count;
    }else{
        badge.style.display = "none";
    }

}

function requestBrowserNotifications(){

    if(!("Notification" in window)) return;

    if(Notification.permission !== "granted"){
        Notification.requestPermission();
    }

}

function showBrowserNotification(title, message){

    if(Notification.permission === "granted"){
        new Notification(title, { body:message, icon:"logo.png" });
    }

}

function startRealtimeNotifications(){

    // Only attach this listener once we actually have a signed-in user --
    // firing it before auth resolves is what caused repeated
    // "Missing or insufficient permissions" console spam, since the
    // notifications rule requires isSignedIn().
    if(!auth.currentUser){
        auth.onAuthStateChanged(user=>{
            if(user) startRealtimeNotifications();
        });
        return;
    }

    db.collection("notifications")
    .orderBy("createdAt", "desc")
    .limit(1)
    .onSnapshot(snapshot=>{

        snapshot.forEach(doc=>{
            const data = doc.data();
            showNotificationPopup(data.title, data.message);
            showBrowserNotification(data.title, data.message);
        });

    }, error=>{
        // Every onSnapshot listener needs an error callback, or Firebase
        // throws an "Uncaught Error in snapshot listener" straight to the
        // console with no context. This just logs it quietly instead --
        // a broken notification feed shouldn't interrupt anything else
        // the user is doing on the page.
        console.log("Notification listener error:", error.message);
    });

}

function showNotificationPopup(title, message){

    const popup = document.createElement("div");

    popup.style.position = "fixed";
    popup.style.top = "20px";
    popup.style.right = "20px";
    popup.style.zIndex = "999999";
    popup.style.background = "#111";
    popup.style.color = "white";
    popup.style.padding = "15px";
    popup.style.border = "1px solid gold";
    popup.style.borderRadius = "12px";
    popup.style.maxWidth = "300px";

    popup.innerHTML = `<h4 style="color:gold;">${title}</h4><p>${message}</p>`;

    document.body.appendChild(popup);

    setTimeout(()=>{ popup.remove(); }, 5000);

}

async function enableNotifications(){

    try{

        if(!("Notification" in window)) return;

        const permission = await Notification.requestPermission();

        if(permission !== "granted") return;

        if(messaging){
            const token = await messaging.getToken();
            console.log("FCM Token:", token);
        }

    }catch(error){
        console.log(error);
    }

}

if(messaging){
    messaging.onMessage(payload=>{
        showBrowserNotification(payload.notification.title, payload.notification.body);
    });
}

async function clearNotifications(){

    if(!requireAdmin()) return;

    const snapshot = await db.collection("notifications").get();
    const batch = db.batch();

    snapshot.forEach(doc=>{ batch.delete(doc.ref); });

    await batch.commit();

}
/* ==================================
PRODUCT POSTING
================================== */

async function postItem(){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    const seller = sanitizeText(document.getElementById("sellerName").value);
    const title = sanitizeText(document.getElementById("itemTitle").value);
    const price = document.getElementById("itemPrice").value.trim();
    const description = sanitizeText(document.getElementById("itemDescription").value);
    const imageFile = document.getElementById("itemImageFile").files[0];

    if(!seller || !title || !price || !description || !imageFile){
        alert("Please fill all fields");
        return;
    }

    // Basic server-independent validation: reject obviously wrong file types/sizes
    // before spending an upload request on them. Cloudinary still enforces its own
    // rules on the backend, but this saves the user a failed round-trip.
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSizeBytes = 8 * 1024 * 1024; // 8MB

    if(!allowedTypes.includes(imageFile.type)){
        alert("Please upload a JPG, PNG, WEBP or GIF image.");
        return;
    }

    if(imageFile.size > maxSizeBytes){
        alert("Image is too large. Please upload an image under 8MB.");
        return;
    }

    const postBtn = document.getElementById("postItemBtn");
    const setBtnState = (text, disabled)=>{
        if(postBtn){ postBtn.textContent = text; postBtn.disabled = disabled; }
    };

    // Uploads to Cloudinary using XHR (not fetch) so we get real upload
    // progress events, and wraps it with a 60s timeout — slow mobile
    // networks in Nigeria/India need much more headroom than a typical
    // fetch default. One automatic silent retry on network failure
    // covers the common case of a single dropped packet/hiccup.
    function uploadImage(file, attempt){
        return new Promise((resolve, reject)=>{

            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "karmas.ng");

            xhr.open("POST", "https://api.cloudinary.com/v1_1/djrijnh6c/image/upload");
            xhr.timeout = 60000; // 60 seconds — was failing too early on slow connections

            xhr.upload.onprogress = (e)=>{
                if(e.lengthComputable){
                    const pct = Math.round((e.loaded / e.total) * 100);
                    setBtnState(`Uploading image... ${pct}%`, true);
                }
            };

            xhr.onload = ()=>{
                try{
                    const data = JSON.parse(xhr.responseText);
                    if(xhr.status >= 200 && xhr.status < 300 && data.secure_url){
                        resolve(data);
                    }else{
                        reject(new Error("Image upload failed"));
                    }
                }catch(e){
                    reject(new Error("Image upload failed"));
                }
            };

            xhr.ontimeout = ()=> reject(new Error("TIMEOUT"));
            xhr.onerror = ()=> reject(new Error("NETWORK"));

            xhr.send(formData);

        }).catch(err=>{
            // One silent retry for network-type failures only (not for
            // validation-type rejections), so a single bad moment on a
            // weak connection doesn't force the user to redo the whole form.
            if(attempt === 1 && (err.message === "TIMEOUT" || err.message === "NETWORK")){
                setBtnState("Connection hiccup, retrying...", true);
                return uploadImage(file, 2);
            }
            throw err;
        });
    }

    try{

        if(!navigator.onLine){
            alert("You're offline. Please check your connection and try again.");
            return;
        }

        setBtnState("Uploading image... 0%", true);

        const data = await uploadImage(imageFile, 1);

        setBtnState("Saving product...", true);

        // The image is already safely uploaded to Cloudinary at this point —
        // we must not make the user re-upload it just because the Firestore
        // write hiccups. This retries the save (not the image) up to 3 times
        // with a short growing delay, which covers the common case on weak
        // networks: the auth token silently failed to refresh mid-flow and
        // the write throws "unavailable" / "network-request-failed" / a
        // generic permission-looking error even though the rules are fine.
        async function saveItemWithRetry(attempt){
            try{
                const newItemRef = await db.collection("items").add({

                    seller,
                    sellerEmail: user.email,
                    title,
                    price: Number(price),
                    description,
                    imageUrl: data.secure_url,
                    featured:false,
                    promoted:false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()

                });
                return newItemRef;
            }catch(err){
                const isNetworkish =
                    err.code === "unavailable" ||
                    err.code === "auth/network-request-failed" ||
                    err.message?.includes("network") ||
                    !navigator.onLine;

                if(isNetworkish && attempt < 3){
                    setBtnState(`Connection hiccup, retrying (${attempt}/3)...`, true);
                    // Give the token/network a moment to recover before trying again.
                    await new Promise(r => setTimeout(r, 1500 * attempt));
                    // Force a fresh ID token before retrying — if the token
                    // refresh itself was what failed, this clears it out.
                    try{ await user.getIdToken(true); }catch(_){}
                    return saveItemWithRetry(attempt + 1);
                }
                throw err;
            }
        }

        const newItemRef = await saveItemWithRetry(1);

        sendDealNotification(title, price, newItemRef ? newItemRef.id : null);

        alert("Product Posted Successfully");

        document.getElementById("sellerName").value = "";
        document.getElementById("itemTitle").value = "";
        document.getElementById("itemPrice").value = "";
        document.getElementById("itemDescription").value = "";
        document.getElementById("itemImageFile").value = "";

    }catch(error){
        console.error(error);
        if(!navigator.onLine){
            alert("You're offline. Please check your connection and try again.");
        }else if(error.message === "TIMEOUT"){
            alert("Upload timed out — your connection may be too slow right now. Please try again, or try a smaller image.");
        }else if(error.message === "NETWORK"){
            alert("Network error during upload. Please check your connection and try again.");
        }else if(error.code === "unavailable" || error.message?.includes("network")){
            alert("Your image was uploaded, but saving the product kept failing due to a weak connection. Please try posting again — you may need to re-select the image.");
        }else{
            alert(error.message);
        }
    }finally{
        setBtnState("Post Product", false);
    }

}

function displayItems(){

    const feed = document.getElementById("itemFeed");
    if(!feed) return;

    db.collection("items")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot=>{

        feed.innerHTML = "";

        const currentUser = auth.currentUser;

        snapshot.forEach(doc=>{

            const item = doc.data();
            const isOwner = currentUser && (currentUser.email === item.sellerEmail || (!item.sellerEmail && isAdmin()));

            feed.innerHTML += `
            <div class="card" id="item-${doc.id}">
                <img src="${item.imageUrl}" alt="${item.title}">
                <div class="card-body">
                    <h3>${item.title}</h3>
                    <p class="price">₦${item.price}</p>
                    <p class="small">${item.description}</p>
                    <p class="small">
                        Seller:
                        <span onclick="openSellerProfile('${item.seller}')" style="color:gold; cursor:pointer;">
                            ${item.seller}
                        </span>
                    </p>
                    <button onclick="payForItem('${item.title}', ${item.price}, '${item.seller}', '${doc.id}')">
                        Buy Now
                    </button>
                    <button class="alt" onclick="openChat('${doc.id}', '${item.sellerEmail}')">
                        Chat Seller
                    </button>
                    ${isOwner ? `
                    <button class="btn-danger" onclick="deleteItem('${doc.id}')">
                        Delete Listing
                    </button>
                    ` : ""}
                </div>
            </div>
            `;

        });

    });

}

function openProductDetails(itemId){

    showPage("itemFeedPage");

    // Give the feed a moment to render before scrolling to the target card
    setTimeout(()=>{
        const card = document.getElementById(`item-${itemId}`);
        if(card){
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            card.style.transition = "box-shadow 0.3s";
            card.style.boxShadow = "0 0 0 3px gold";
            setTimeout(()=>{ card.style.boxShadow = ""; }, 2500);
        }
    }, 400);

}

// Deletes a product listing. Only shown/callable for the item's own seller —
// the Firestore rule for the items collection should also check
// request.auth.token.email == resource.data.sellerEmail server-side so this
// can't be bypassed by calling the function directly from devtools.
async function deleteItem(itemId){

    const user = auth.currentUser;
    if(!user){
        alert("Please login first");
        return;
    }

    const confirmed = confirm("Delete this listing? This cannot be undone.");
    if(!confirmed) return;

    try{

        const docRef = db.collection("items").doc(itemId);
        const docSnap = await docRef.get();

        if(!docSnap.exists){
            alert("This listing no longer exists.");
            return;
        }

        const item = docSnap.data();

        if(item.sellerEmail !== user.email && !(!item.sellerEmail && isAdmin())){
            alert("You can only delete your own listings.");
            return;
        }

        await docRef.delete();
        logAuditEvent("delete_listing", { itemId: itemId, title: item.title || "", sellerEmail: item.sellerEmail || "" });
        alert("Listing deleted.");

    }catch(error){
        console.error(error);
        if(!navigator.onLine){
            alert("You're offline. Please check your connection and try again.");
        }else{
            alert("Failed to delete listing: " + error.message);
        }
    }

}

// Deletes a freelancer's own service listing. Mirrors deleteItem() above.
// Firestore rule for /freelancers/{freelancerId} requires the document ID
// itself to equal request.auth.uid, so ownership is checked the same way.
async function deleteFreelancerListing(freelancerId){

    const user = auth.currentUser;
    if(!user){
        alert("Please login first");
        return;
    }

    if(user.uid !== freelancerId){
        alert("You can only delete your own listing.");
        return;
    }

    const confirmed = confirm("Delete this freelancer listing? This cannot be undone.");
    if(!confirmed) return;

    try{

        const docRef = db.collection("freelancers").doc(freelancerId);
        const docSnap = await docRef.get();

        if(!docSnap.exists){
            alert("This listing no longer exists.");
            return;
        }

        await docRef.delete();
        logAuditEvent("delete_freelancer_listing", { freelancerId: freelancerId });
        alert("Listing deleted.");

    }catch(error){
        console.error(error);
        if(!navigator.onLine){
            alert("You're offline. Please check your connection and try again.");
        }else{
            alert("Failed to delete listing: " + error.message);
        }
    }

}

document.addEventListener("DOMContentLoaded", ()=>{
    if(document.getElementById("itemFeed")){
        displayItems();
        // Re-render once login is confirmed, so the "Delete Listing" button
        // (which depends on knowing who's logged in) shows up correctly.
        // Without this, if the page draws before auth resolves, every card
        // renders as if no one is logged in and never redraws.
        auth.onAuthStateChanged(()=>{
            displayItems();
        });
    }
});
/* ==================================
PRODUCT PAYMENT (tiered commission)
================================== */

function payForItem(title, price, seller, itemId){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    const basePrice = Number(price);
    const appFee = calculateCommission(basePrice);
    const totalCharge = basePrice + appFee;

    // Show the buyer a clear price breakdown (item price vs. platform fee)
    // before opening the payment popup, instead of only ever seeing one
    // lump total with no explanation of what it's made of.
    const breakdownMessage =
        "Order Summary\n\n" +
        "Item: " + title + "\n" +
        "Item Price: \u20A6" + basePrice.toLocaleString() + "\n" +
        "Platform Fee: \u20A6" + appFee.toLocaleString() + "\n" +
        "-----------------------------\n" +
        "Total to Pay: \u20A6" + totalCharge.toLocaleString() + "\n\n" +
        "Press OK to continue to secure payment.";

    const confirmedBreakdown = confirm(breakdownMessage);
    if(!confirmedBreakdown) return;

    FlutterwaveCheckout({

        public_key: "FLWPUBK-10783948c6fa8ead4ce8e667a24a3d51-X",
        tx_ref: "KM-" + Date.now(),
        amount: totalCharge,
        currency: "NGN",
        payment_options: "card,banktransfer,ussd",

        customer:{ email:user.email, name:user.email },

        customizations:{
            title: "Karmas Market",
            description: title + " - Item: \u20A6" + basePrice.toLocaleString() + " + Fee: \u20A6" + appFee.toLocaleString()
        },

        callback:function(response){

            db.collection("orders").add({

                buyer: user.email,
                seller,
                itemId: itemId || null,
                title,
                totalPaid: totalCharge,
                sellerAmount: basePrice,
                appFee,
                status: "in_escrow",
                released:false,
                paymentReference: response.tx_ref,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()

            });

            addAppCommission(appFee);

            sendOrderNotification(title);

            alert("Payment secured in escrow");

        },

        onclose:function(){
            console.log("Payment window closed");
        }

    });

}

/* ==================================
FREELANCER SYSTEM
================================== */

function openFreelancers(skill){

    showPage("freelancerPage");

    const feed = document.getElementById("freelancerFeed");
    if(!feed) return;

    feed.innerHTML = "Loading freelancers...";

    function fetchFreelancers(){
        db.collection("freelancers")
        .where("skill", "==", skill)
        .get()
        .then(renderFreelancers)
        .catch(error=>{
            console.log(error);
            feed.innerHTML = "<h3>Error loading freelancers</h3>";
        });
    }

    function renderFreelancers(snapshot){

        feed.innerHTML = "";

        if(snapshot.empty){
            feed.innerHTML = "<h3>No freelancers found</h3>";
            return;
        }

        const currentUser = auth.currentUser;

        snapshot.forEach(doc=>{

            const freelancer = doc.data();
            const isOwner = currentUser && currentUser.uid === doc.id;

            feed.innerHTML += `
            <div class="card" id="freelancer-${doc.id}">
                <img src="${freelancer.image || 'https://via.placeholder.com/400'}">
                <div class="card-body">
                    <h3>${freelancer.name} ${freelancer.verified ? "✔️" : ""}</h3>
                    <p class="small">${freelancer.bio || ""}</p>
                    <p class="small">Skill: ${freelancer.skill}</p>
                    <p class="price">₦${freelancer.price}</p>
                    <button onclick="hireFreelancer('${doc.id}')">Hire Freelancer</button>
                    <textarea id="review-${doc.id}" placeholder="Leave a review"></textarea>
                    <select id="rating-${doc.id}">
                        <option value="5">⭐⭐⭐⭐⭐</option>
                        <option value="4">⭐⭐⭐⭐</option>
                        <option value="3">⭐⭐⭐</option>
                        <option value="2">⭐⭐</option>
                        <option value="1">⭐</option>
                    </select>
                    <button class="alt" onclick="submitReview('${doc.id}')">Submit Review</button>
                    <div id="reviews-${doc.id}"></div>
                    ${isOwner ? `
                    <button class="btn-danger" onclick="deleteFreelancerListing('${doc.id}')">
                        Delete Listing
                    </button>
                    ` : ""}
                </div>
            </div>
            `;

            setTimeout(()=>{ loadReviews(doc.id); }, 300);

        });

    }

    fetchFreelancers();

    // Re-fetch once login is confirmed, so the "Delete Listing" button
    // (which depends on knowing who's logged in) shows up correctly,
    // mirroring the same fix applied to displayItems() for products.
    auth.onAuthStateChanged(()=>{
        fetchFreelancers();
    });

}

function closeFreelancers(){
    showPage("services");
}

function hireFreelancer(id){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    db.collection("freelancers").doc(id).get()
    .then(doc=>{

        if(!doc.exists){
            alert("Freelancer not found");
            return;
        }

        const freelancer = doc.data();
        const basePrice = Number(freelancer.price);
        const appFee = calculateCommission(basePrice);
        const totalCharge = basePrice + appFee;

        FlutterwaveCheckout({

            public_key: "FLWPUBK-10783948c6fa8ead4ce8e667a24a3d51-X",
            tx_ref: "FREELANCER-" + Date.now(),
            amount: totalCharge,
            currency: "NGN",
            payment_options: "card,banktransfer,ussd",

            customer:{ email:user.email, name:user.email },

            customizations:{
                title: "Freelancer Hiring",
                description: freelancer.name
            },

            callback:function(response){

                db.collection("orders").add({

                    freelancerId: id,
                    freelancerName: freelancer.name,
                    client: user.email,
                    totalPaid: totalCharge,
                    freelancerAmount: basePrice,
                    appFee,
                    paymentReference: response.tx_ref,
                    status: "in_escrow",
                    paymentStatus: "held",
                    approved:false,
                    delivery:null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()

                });

                sendOrderNotification(freelancer.name);

                alert("Payment secured in escrow");

            }

        });

    });

}

function submitReview(freelancerId){

    const user = auth.currentUser;

    if(!user){
        alert("Login first");
        return;
    }

    const comment = sanitizeText(document.getElementById(`review-${freelancerId}`).value);
    const rating = document.getElementById(`rating-${freelancerId}`).value;

    db.collection("reviews").add({

        freelancerId,
        reviewer: user.email,
        comment,
        rating: Number(rating),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()

    })
    .then(()=>{
        alert("Review submitted");
        loadReviews(freelancerId);
    });

}

function loadReviews(freelancerId){

    const container = document.getElementById(`reviews-${freelancerId}`);
    if(!container) return;

    db.collection("reviews")
    .where("freelancerId", "==", freelancerId)
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        let total = 0;
        let count = 0;

        snapshot.forEach(doc=>{

            const review = doc.data();

            total += review.rating;
            count++;

            container.innerHTML += `
            <div style="background:#1a1a1a; padding:10px; border-radius:10px; margin-top:10px;">
                <p>${"⭐".repeat(review.rating)}</p>
                <p>${review.comment}</p>
                <small>${review.reviewer}</small>
            </div>
            `;

        });

        if(count > 0){
            const average = (total / count).toFixed(1);
            container.innerHTML = `<h3 style="color:gold;">⭐ ${average}/5</h3>` + container.innerHTML;
        }

    });

}

/* ==================================
ORDERS (privacy-filtered)
FIXED: runs three separately scoped
queries (buyer / client / sellerEmail)
instead of pulling every order in the
database and filtering client-side.
Cards include a colored status badge.
================================== */

function loadOrders(){

    const feed = document.getElementById("ordersFeed");
    if(!feed) return;

    const user = auth.currentUser;
    if(!user) return;

    feed.innerHTML = "";

    const seen = new Set();

    function statusColor(status){
        if(status === "completed") return "#22c55e";
        if(status === "in_escrow") return "#f59e0b";
        return "#94a3b8";
    }

    function statusText(status){
        if(status === "completed") return "✅ Completed";
        if(status === "in_escrow") return "⏳ In Escrow";
        return status || "Pending";
    }

    function renderOrder(doc){

        if(seen.has(doc.id)) return;
        seen.add(doc.id);

        const order = doc.data();
        const label = order.title || order.freelancerName || "Order";
        const amount = order.totalPaid || order.amount || 0;
        const color = statusColor(order.status);
        const text = statusText(order.status);

        // Once payment has actually been made (in escrow or fully
        // completed), both sides of the deal should be able to message
        // each other — freelancers previously had no dedicated chat with
        // clients after being hired at all. We reuse the existing chat
        // system (openChat / sendMessage / loadConversations), keyed the
        // same way product chats are: a chatId built from the order, and
        // the OTHER party's real email (never a display name — that was
        // the earlier chat-delivery bug).
        const canMessage = order.status === "in_escrow" || order.status === "completed";
        const chatId = "order_" + doc.id;

        let messageButtonHtml = "";

        if(canMessage && order.freelancerId){
            // Viewing this as the client: the other party is the
            // freelancer, looked up by UID to get their real email.
            // Viewing this as the freelancer: the other party is the
            // client, whose email is already stored directly.
            if(user.uid === order.freelancerId){
                messageButtonHtml = `<button class="alt" onclick="openOrderChat('${chatId}', '${order.client}')">Message Client</button>`;
            }else{
                messageButtonHtml = `<button class="alt" onclick="openFreelancerOrderChat('${chatId}', '${order.freelancerId}')">Message Freelancer</button>`;
            }
        }

        const card = document.createElement("div");
        card.className = "card";
        card.style.borderLeft = `4px solid ${color}`;
        card.innerHTML = `
            <div class="card-body">
                <h3>${label}</h3>
                <p class="price">₦${amount}</p>
                <p class="small" style="color:${color}; font-weight:bold;">${text}</p>
                ${order.status === "in_escrow" ? `<button onclick="approveOrder('${doc.id}')">Approve / Release Payment</button>` : ""}
                ${messageButtonHtml}
            </div>
        `;

        feed.appendChild(card);

        if(feed.querySelector(".empty-order-msg")){
            feed.querySelector(".empty-order-msg").remove();
        }

    }

    db.collection("orders").where("buyer", "==", user.email)
        .onSnapshot(snapshot => snapshot.forEach(renderOrder),
            error => console.log("Orders (buyer) listener error:", error.message));

    db.collection("orders").where("client", "==", user.email)
        .onSnapshot(snapshot => snapshot.forEach(renderOrder),
            error => console.log("Orders (client) listener error:", error.message));

    db.collection("orders").where("sellerEmail", "==", user.email)
        .onSnapshot(snapshot => snapshot.forEach(renderOrder),
            error => console.log("Orders (seller) listener error:", error.message));

    // Freelancer's own hire orders — previously missing entirely, so a
    // freelancer could never see the jobs they'd been hired for here.
    db.collection("orders").where("freelancerId", "==", user.uid)
        .onSnapshot(snapshot => snapshot.forEach(renderOrder),
            error => console.log("Orders (freelancer) listener error:", error.message));

}

// Opens a chat with a client, from the freelancer's side. The client's
// email is already stored directly on the order, so no lookup is needed.
function openOrderChat(chatId, clientEmail){
    openChat(chatId, clientEmail);
}

// Opens a chat with a freelancer, from the client's side. Freelancer
// orders only store the freelancer's UID (order.freelancerId), not their
// email, so we look them up via the "users" collection (keyed by UID)
// to get the real email openChat() needs.
function openFreelancerOrderChat(chatId, freelancerUid){
    db.collection("users").doc(freelancerUid).get()
    .then(doc=>{
        if(doc.exists && doc.data().email){
            openChat(chatId, doc.data().email);
        }else{
            alert("Could not find this freelancer's contact details.");
        }
    })
    .catch(error=>{
        console.log("Freelancer email lookup failed:", error);
        alert("Something went wrong opening this chat. Please try again.");
    });
}
/* ==================================
ESCROW RELEASE (commission-aware)
================================== */

function approveOrder(orderId){

    db.collection("orders").doc(orderId).get()
    .then(doc=>{

        if(!doc.exists) return;

        const order = doc.data();

        // Determine recipient (freelancer or seller) and payout amount
        const recipientId = order.freelancerId || null;
        const recipientEmail = order.sellerEmail || null;
        const payoutAmount = order.freelancerAmount || order.sellerAmount || 0;

        const payoutPromise =
            recipientId
            ? addWalletBalance(recipientId, payoutAmount)
            : recipientEmail
            ? addWalletBalance(recipientEmail, payoutAmount)
            : Promise.resolve();

        payoutPromise
        .then(()=>{

            return db.collection("orders").doc(orderId).update({
                status: "completed",
                paymentStatus: "released",
                approved: true,
                released: true
            });

        })
        .then(()=>{

            // Once payment is fully settled to the seller, the product
            // listing is no longer for sale, so it auto-removes itself
            // from the marketplace instead of sitting there looking
            // available. Only applies to product orders (order.itemId is
            // only set for product purchases, not freelancer service
            // orders, since a freelancer's profile shouldn't disappear
            // after one job).
            if(order.itemId){
                return db.collection("items").doc(order.itemId).delete()
                .catch(error=>{
                    // Non-fatal: the item may already be gone, or this may
                    // simply fail quietly — the payout itself has already
                    // succeeded above, so we don't want to alarm the user
                    // over a listing cleanup issue.
                    console.log("Auto-delete of sold listing failed:", error);
                });
            }

        })
        .then(()=>{

            const label = order.freelancerName || order.title || "Order";
            sendPaymentNotification(label);
            logAuditEvent("release_escrow_payment", {
                orderId: orderId,
                recipientEmail: recipientEmail,
                recipientId: recipientId,
                payoutAmount: payoutAmount,
                itemAutoDeleted: !!order.itemId
            });
            alert("Payment Released");

        })
        .catch(error=>{
            console.log(error);
            alert(error.message);
        });

    });

}
/* ==================================
CHAT SYSTEM (privacy-filtered)
Renders into the Messenger-style markup
(.message.sent / .message.received /
.conversation-item) from style.css.
All messages are sanitized before being
written to Firestore. All Firestore
queries, the anti-scam filter, and auth
checks are unchanged.
================================== */

function openChat(itemId, sellerEmail){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    // sellerEmail must be the seller's real email (not their display name)
    // so it matches what's stored in Firestore's "participants" array below.
    // Using a display name here was the root cause of messages never
    // reaching the seller's inbox.
    //
    // Legacy listings created before sellerEmail was added to the schema
    // have no sellerEmail at all - without this fallback, chatId would be
    // built as "itemId_undefined" and the conversation would silently never
    // reach the real owner's inbox (same root cause as the old delete-button
    // bug on legacy items). Route those chats to the admin email instead.
    const resolvedSellerEmail = sellerEmail || ADMIN_EMAIL;

    currentChatId = itemId + "_" + resolvedSellerEmail;
    currentSeller = resolvedSellerEmail;

    showPage("chatPage");
    updateChatHeader(sellerEmail);
    loadMessages();

}

function updateChatHeader(name){

    const nameEl = document.getElementById("chatHeaderName");
    const avatarEl = document.getElementById("chatHeaderAvatar");

    if(nameEl){
        nameEl.innerText = name || "Seller";
    }

    if(avatarEl){
        avatarEl.src = "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(name || "Seller");
    }

}

/* ==================================
CHAT MESSAGE FILTER
Blocks phone numbers, WhatsApp links,
Telegram handles, and email addresses
to prevent off-platform transactions
================================== */

function validateChatMessage(message){

    const blockedPatterns = [
        /\+?[0-9]{7,}/,                                            // Phone numbers
        /wa\.me/i,                                                 // WhatsApp links
        /whatsapp\.com/i,                                          // WhatsApp web
        /telegram\.me/i,                                           // Telegram
        /(?<![a-zA-Z])t\.me(?![a-zA-Z])/i,                        // Telegram short link
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/      // Email addresses
    ];

    for(let pattern of blockedPatterns){
        if(pattern.test(message)){
            return false;
        }
    }

    return true;

}

function sendMessage(){

    const input = document.getElementById("chatInput");
    const user = auth.currentUser;

    if(!input || !user) return;

    const rawMessage = input.value.trim();
    if(!rawMessage) return;

    // BLOCK external contact info - protect platform transactions
    if(!validateChatMessage(rawMessage)){
        alert("⚠️ External contact information is not allowed. Keep all communication and payments inside Karmas Market to stay protected.");
        return;
    }

    // Sanitize before writing to Firestore, so stored chat history
    // can never carry an HTML/script injection payload.
    const message = sanitizeText(rawMessage);
    if(!message) return;

    if(!currentChatId){
        currentChatId = "general";
    }

    db.collection("messages").add({

        chatId: currentChatId,
        sender: user.email,
        message: message,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()

    });

    // Both people in the conversation must be added to "participants" on
    // the very first message, not just whoever happens to be typing.
    // Previously only the sender got added, so if the buyer messaged first,
    // the seller's email was never in the array and their inbox query
    // (which filters by "participants array-contains my email") would
    // never find the conversation at all — messages were saving fine,
    // they just never appeared on the recipient's side.
    const chatParticipants = [user.email];
    if(currentSeller && currentSeller !== user.email){
        chatParticipants.push(currentSeller);
    }

    db.collection("conversations").doc(currentChatId).set({

        chatId: currentChatId,
        lastMessage: message,
        sender: user.email,
        participants: firebase.firestore.FieldValue.arrayUnion(...chatParticipants),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()

    }, { merge:true });

    // Notify the other person in this chat that a new message has arrived.
    // Without this, messages were saving to Firestore correctly but the
    // recipient never got any alert that they'd received one.
    if(currentSeller && currentSeller !== user.email){
        notifyNewMessage(user.email, message);
    }

    input.value = "";

}

/* Formats a Firestore Timestamp (or null, if not yet
   committed by the server) into a short time string. */
function formatMessageTime(createdAt){

    if(!createdAt || typeof createdAt.toDate !== "function"){
        return "";
    }

    const date = createdAt.toDate();

    return date.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

}

function loadMessages(){

    const box = document.getElementById("chatMessages");
    if(!box) return;

    const user = auth.currentUser;

    db.collection("messages")
    .where("chatId", "==", currentChatId)
    .orderBy("createdAt", "asc")
    .onSnapshot(snapshot=>{

        box.innerHTML = "";

        snapshot.forEach(doc=>{

            const chat = doc.data();
            const isMine = user && chat.sender === user.email;
            const time = formatMessageTime(chat.createdAt);

            box.innerHTML += `
            <div class="message ${isMine ? "sent" : "received"}">
                ${chat.message}
                ${time ? `<div class="message-time">${time}</div>` : ""}
            </div>
            `;

        });

        box.scrollTop = box.scrollHeight;

    }, error => console.log("Messages listener error:", error.message));

}

function loadConversations(){

    const user = auth.currentUser;
    if(!user) return;

    const list = document.getElementById("conversationList");
    if(!list) return;

    db.collection("conversations")
    .where("participants", "array-contains", user.email)
    .orderBy("updatedAt", "desc")
    .onSnapshot(snapshot=>{

        list.innerHTML = "";

        if(snapshot.empty){
            list.innerHTML = `<p class="small" style="padding:20px; text-align:center;">No conversations yet</p>`;
            return;
        }

        snapshot.forEach(doc=>{

            const chat = doc.data();

            // Show whichever participant isn't the current user, so the
            // list reads as "who am I talking to" rather than always
            // showing the last sender (which could be me).
            const participants = chat.participants || [];
            const otherParticipant = participants.find(email => email !== user.email) || chat.sender;

            list.innerHTML += `
            <div class="conversation-item" onclick="openConversation('${chat.chatId}', '${otherParticipant}')">
                <img class="conversation-avatar" src="https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(otherParticipant)}">
                <div class="conversation-info">
                    <div class="conversation-name">${otherParticipant}</div>
                    <div class="conversation-preview">${chat.lastMessage || ""}</div>
                </div>
            </div>
            `;

        });

    }, error => console.log("Conversations listener error:", error.message));

}

/* Opens an existing conversation thread from the conversation
   list (as opposed to openChat(), which is entered from a
   product card and builds a fresh chatId). */
function openConversation(chatId, otherParticipant){

    currentChatId = chatId;
    currentSeller = otherParticipant;

    showPage("chatPage");
    updateChatHeader(otherParticipant);
    loadMessages();

}

document.addEventListener("DOMContentLoaded", ()=>{

    const input = document.getElementById("chatInput");

    if(input){
        input.addEventListener("keypress", function(event){
            if(event.key === "Enter"){
                sendMessage();
            }
        });
    }

});
/* ==================================
WALLET SYSTEM
================================== */

function loadWallet(){

    const user = auth.currentUser;
    if(!user) return;

    db.collection("wallets").doc(user.uid)
    .onSnapshot(doc=>{

        const walletBalance = document.getElementById("walletBalance");
        if(!walletBalance) return;

        if(doc.exists){
            const wallet = doc.data();
            walletBalance.innerText = "₦" + (wallet.balance || 0);
        }else{
            db.collection("wallets").doc(user.uid).set({
                balance:0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

    }, error => console.log("Wallet listener error:", error.message));

}

function addWalletBalance(userId, amount){

    return db.collection("wallets").doc(userId).set({
        balance: firebase.firestore.FieldValue.increment(Number(amount))
    }, { merge:true });

}

function deductWalletBalance(userId, amount){

    return db.collection("wallets").doc(userId).set({
        balance: firebase.firestore.FieldValue.increment(-Number(amount))
    }, { merge:true });

}

/* ==================================
SELLER PROFILE SYSTEM
================================== */

function openSellerProfile(sellerName){
    showPage("sellerProfilePage");
    loadSellerProfile(sellerName);
    loadSellerProducts(sellerName);
}

function loadSellerProfile(sellerName){

    const container = document.getElementById("sellerProfile");
    if(!container) return;

    db.collection("sellers")
    .where("name", "==", sellerName)
    .get()
    .then(snapshot=>{

        container.innerHTML = "";

        if(snapshot.empty){
            container.innerHTML = `<div class="profile-box"><h2>Seller Not Found</h2></div>`;
            return;
        }

        snapshot.forEach(doc=>{

            const seller = doc.data();

            container.innerHTML = `
            <div class="profile-box">
                <img src="${seller.image || 'https://via.placeholder.com/150'}"
                     style="width:120px; height:120px; border-radius:50%; object-fit:cover; margin-bottom:15px;">
                <h2>${seller.name}</h2>
                <p class="small">${seller.bio || ""}</p>
                <p class="small">${seller.email || ""}</p>
            </div>
            `;

        });

    });

}

function loadSellerProducts(sellerName){

    const container = document.getElementById("sellerProducts");
    if(!container) return;

    db.collection("items")
    .where("seller", "==", sellerName)
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        const currentUser = auth.currentUser;

        snapshot.forEach(doc=>{

            const item = doc.data();
            // This is the public seller-profile view, so the delete button
            // is only shown when the person viewing it is the owner —
            // everyone else just sees the listing with no delete control.
            // Fallback: legacy listings created before sellerEmail existed have
            // no such field at all — let the admin account manage those too.
            const isOwner = currentUser && (currentUser.email === item.sellerEmail || (!item.sellerEmail && isAdmin()));

            container.innerHTML += `
            <div class="card">
                <img src="${item.imageUrl}">
                <div class="card-body">
                    <h3>${item.title}</h3>
                    <p class="price">₦${item.price}</p>
                    ${isOwner ? `
                    <button class="btn-danger" onclick="deleteItem('${doc.id}')">
                        Delete Listing
                    </button>
                    ` : ""}
                </div>
            </div>
            `;

        });

    });

}

async function createSellerProfile(){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    const sellerName = sanitizeText(document.getElementById("sellerProfileName")?.value || "");
    const sellerBio = sanitizeText(document.getElementById("sellerProfileBio")?.value || "");
    const sellerImage = document.getElementById("sellerProfileImage")?.value || "";

    try{

        await db.collection("sellers").doc(user.uid).set({

            uid: user.uid,
            email: user.email,
            name: sellerName,
            bio: sellerBio,
            image: sellerImage,
            verified:false,
            sponsored:false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()

        });

        alert("Seller profile created");

    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

function loadCurrentSellerProfile(){

    const user = auth.currentUser;
    if(!user) return;

    db.collection("sellers").doc(user.uid).get()
    .then(doc=>{

        if(!doc.exists) return;

        const seller = doc.data();
        const box = document.getElementById("sellerProfileInfo");
        if(!box) return;

        box.innerHTML = `
        <div class="profile-box">
            <img src="${seller.image || ''}" style="width:100px; height:100px; border-radius:50%; object-fit:cover;">
            <h2>${seller.name || ""}</h2>
            <p>${seller.bio || ""}</p>
            <p>${seller.email || ""}</p>
        </div>
        `;

    });

}

function openSellerDashboard(){
    showPage("sellerDashboard");
    loadSellerStats();
    loadSellerProductsForCurrentUser();
    loadSellerSubscription();
    loadSellerSales();
}

function loadSellerProductsForCurrentUser(){

    const user = auth.currentUser;
    if(!user) return;

    const container = document.getElementById("sellerProductsFeed");
    if(!container) return;

    db.collection("items")
    .where("sellerEmail", "==", user.email)
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const item = doc.data();

            container.innerHTML += `
            <div class="card">
                <img src="${item.imageUrl}">
                <div class="card-body">
                    <h3>${item.title}</h3>
                    <p class="price">₦${item.price}</p>
                    <button onclick="deleteProduct('${doc.id}')">Delete</button>
                </div>
            </div>
            `;

        });

    });

}
async function deleteProduct(productId){

    const user = auth.currentUser;
    if(!user) return;

    const confirmDelete = confirm("Delete this product?");
    if(!confirmDelete) return;

    try{

        const doc = await db.collection("items").doc(productId).get();

        if(doc.exists && doc.data().sellerEmail !== user.email && !isAdmin()){
            alert("You can only delete your own products.");
            return;
        }

        await db.collection("items").doc(productId).delete();
        logAuditEvent("delete_listing", { itemId: productId, byAdmin: isAdmin() });
        alert("Product deleted");

    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

function loadSellerStats(){

    const user = auth.currentUser;
    if(!user) return;

    db.collection("items")
    .where("sellerEmail", "==", user.email)
    .get()
    .then(snapshot=>{

        const totalProducts = document.getElementById("sellerTotalProducts");
        if(totalProducts){
            totalProducts.innerText = snapshot.size;
        }

    });

}

function loadSellerSubscription(){

    const user = auth.currentUser;
    if(!user) return;

    const box = document.getElementById("sellerSubscriptionStatus");
    if(!box) return;

    db.collection("subscriptions")
    .where("email", "==", user.email)
    .get()
    .then(snapshot=>{

        box.innerHTML = snapshot.empty ? "Free Plan" : "Premium Seller";

    });

}

function loadSellerSales(){

    const user = auth.currentUser;
    if(!user) return;

    db.collection("orders")
    .where("sellerEmail", "==", user.email)
    .get()
    .then(snapshot=>{

        let sales = 0;

        snapshot.forEach(doc=>{
            const order = doc.data();
            sales += Number(order.totalPaid || 0);
        });

        const salesBox = document.getElementById("sellerSales");
        if(salesBox){
            salesBox.innerText = "₦" + sales;
        }

    });

}

async function featureProduct(productId){

    try{

        await db.collection("items").doc(productId).update({ featured:true });
        alert("Product featured");

    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

async function promoteProduct(productId){

    try{

        await db.collection("items").doc(productId).update({
            featured:true,
            promoted:true
        });

        alert("Product promoted");

    }catch(error){
        console.log(error);
    }

}
/* ==================================
APP MARKETPLACE
================================== */

// One-time listing fee. Priced in Naira.
const APP_LISTING_FEE = 10000;

function postApp(){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    const appName = sanitizeText(document.getElementById("appName").value);
    const developerName = sanitizeText(document.getElementById("developerName").value);
    const category = sanitizeText(document.getElementById("appCategory").value);
    const price = document.getElementById("appPrice").value.trim();
    const appLink = document.getElementById("appLink").value.trim();
    const appImage = document.getElementById("appImage").value.trim();
    const description = sanitizeText(document.getElementById("appDescription").value);

    if(!appName || !developerName || !category || !price || !appLink || !appImage || !description){
        alert("Please complete all fields");
        return;
    }

    // Show the fee clearly before charging, so nothing feels like a surprise.
    const confirmed = confirm(
        `Listing your app costs a one-time fee of ₦${APP_LISTING_FEE}. ` +
        `You'll also earn 85% of every sale (Karmas Market keeps 15%). Continue to payment?`
    );
    if(!confirmed) return;

    FlutterwaveCheckout({

        public_key: "FLWPUBK-10783948c6fa8ead4ce8e667a24a3d51-X",
        tx_ref: "APPLIST-" + Date.now(),
        amount: APP_LISTING_FEE,
        currency: "NGN",
        payment_options: "card,banktransfer,ussd",

        customer:{ email:user.email, name:user.email },

        customizations:{
            title: "Karmas Market",
            description: "App listing fee — " + appName
        },

        callback:function(response){

            db.collection("apps").add({

                appName,
                developerName,
                developerEmail: user.email,
                category,
                price,
                appLink,
                appImage,
                description,
                featured:false,
                downloads:0,
                totalEarnings:0,
                listingFeePaid: APP_LISTING_FEE,
                paymentReference: response.tx_ref,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()

            })
            .then(()=>{
                addAppCommission(APP_LISTING_FEE);
                sendAppNotification(appName);
                alert("Payment successful. Application Posted Successfully");
                clearAppForm();
            })
            .catch(error=>{
                console.log(error);
                alert(error.message);
            });

        },

        onclose:function(){
            console.log("App listing payment window closed");
        }

    });

}

function clearAppForm(){

    document.getElementById("appName").value = "";
    document.getElementById("developerName").value = "";
    document.getElementById("appCategory").value = "";
    document.getElementById("appPrice").value = "";
    document.getElementById("appLink").value = "";
    document.getElementById("appImage").value = "";
    document.getElementById("appDescription").value = "";

}

function loadApps(){

    const appFeed = document.getElementById("appFeed");
    if(!appFeed) return;

    db.collection("apps")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot=>{

        appFeed.innerHTML = "";

        snapshot.forEach(doc=>{

            const app = doc.data();

            appFeed.innerHTML += `
            <div class="card">
                <img src="${app.appImage}" alt="${app.appName}">
                <div class="card-body">
                    <h3>${app.appName}</h3>
                    <p class="small">Developer: ${app.developerName}</p>
                    <p class="small">Category: ${app.category}</p>
                    <p class="small">${app.description}</p>
                    <p class="price">₦${app.price}</p>
                    ${app.featured ? `<p style="color:gold; font-weight:bold;">⭐ Featured App</p>` : ""}
                    <button onclick="downloadApp('${doc.id}', '${app.appLink}')">Download App</button>
                </div>
            </div>
            `;

        });

    });

}

function downloadApp(appId, appLink){

    db.collection("apps").doc(appId).update({
        downloads: firebase.firestore.FieldValue.increment(1)
    })
    .then(()=>{
        window.open(appLink, "_blank");
    })
    .catch(error=>{
        console.log(error);
    });

}

async function featureApp(appId){
    if(!requireAdmin()) return;

    try{
        await db.collection("apps").doc(appId).update({ featured:true });
        logAuditEvent("feature_app", { appId: appId });
        alert("App featured");
    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

async function unfeatureApp(appId){
    if(!requireAdmin()) return;

    try{
        await db.collection("apps").doc(appId).update({ featured:false });
        logAuditEvent("unfeature_app", { appId: appId });
        alert("Featured status removed");
    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

async function deleteApp(appId){
    if(!requireAdmin()) return;

    try{
        await db.collection("apps").doc(appId).delete();
        logAuditEvent("delete_app", { appId: appId });
        alert("App deleted");
    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

function loadFeaturedApps(){

    const container = document.getElementById("featuredApps");
    if(!container) return;

    db.collection("apps")
    .where("featured", "==", true)
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const app = doc.data();

            container.innerHTML += `
            <div class="card">
                <img src="${app.appImage}">
                <div class="card-body">
                    <h3>⭐ ${app.appName}</h3>
                    <p class="small">${app.description}</p>
                    <button onclick="downloadApp('${doc.id}', '${app.appLink}')">Download</button>
                </div>
            </div>
            `;

        });

    });

}

/* ==================================
AFFILIATE / SPONSORED ADS
================================== */
/* ==================================
AD PRICING TIERS
(Standard ads: ₦2,500–₦10,000, chosen
by the user based on desired visibility.
Premium/top-of-search ads are a separate,
later feature — not wired here yet.)
================================== */

const AD_PRICE_TIERS = {
    basic:    2500,
    standard: 5000,
    featured: 10000
};

function getAdPrice(tier){
    return AD_PRICE_TIERS[tier] || AD_PRICE_TIERS.basic;
}

async function submitPromotion(){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    const title = sanitizeText(document.getElementById("promoTitle").value);
    const description = sanitizeText(document.getElementById("promoDescription").value);
    const link = document.getElementById("promoLink").value.trim();
    const type = document.getElementById("affiliateType").value;
    const file = document.getElementById("affiliateImage").files[0];

    // Which pricing tier the user picked in the ad form.
    // Expects a <select id="adPricingTier"> with values: basic / standard / featured
    const tierSelect = document.getElementById("adPricingTier");
    const tier = tierSelect ? tierSelect.value : "basic";
    const adPrice = getAdPrice(tier);

    if(!title || !description || !link || !file){
        alert("Please complete all fields");
        return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSizeBytes = 8 * 1024 * 1024;

    if(!allowedTypes.includes(file.type)){
        alert("Please upload a JPG, PNG, WEBP or GIF image.");
        return;
    }

    if(file.size > maxSizeBytes){
        alert("Image is too large. Please upload an image under 8MB.");
        return;
    }

    // Show the fee clearly before charging so nothing feels like a surprise.
    const confirmed = confirm(
        `Posting this ad (${tier} tier) costs ₦${adPrice}. Continue to payment?`
    );
    if(!confirmed) return;

    FlutterwaveCheckout({

        public_key: "FLWPUBK-10783948c6fa8ead4ce8e667a24a3d51-X",
        tx_ref: "AD-" + Date.now(),
        amount: adPrice,
        currency: "NGN",
        payment_options: "card,banktransfer,ussd",

        customer:{ email:user.email, name:user.email },

        customizations:{
            title: "Karmas Market",
            description: "Advertisement posting — " + tier + " tier"
        },

        callback: async function(response){

            try{

                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", "karmas.ng");

                const uploadResponse = await fetch(
                    "https://api.cloudinary.com/v1_1/djrijnh6c/image/upload",
                    { method:"POST", body:formData }
                );

                const data = await uploadResponse.json();
                const imageUrl = data.secure_url;

                await db.collection("affiliateAds").add({

                    title,
                    description,
                    link,
                    type,
                    tier,
                    pricePaid: adPrice,
                    image: imageUrl,
                    postedBy: user.email,
                    paymentReference: response.tx_ref,
                    clicks:0,
                    impressions:0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()

                });

                addAppCommission(adPrice);

                alert("Payment successful. Affiliate Ad Posted");
                sendPromotionNotification(title);
                loadAffiliateAds();

            }catch(error){
                console.log(error);
                alert(error.message);
            }

        },

        onclose:function(){
            console.log("Ad payment window closed");
        }

    });

}

function loadAffiliateAds(){

    const feed = document.getElementById("affiliateFeed");
    if(!feed) return;

    db.collection("affiliateAds")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot=>{

        feed.innerHTML = "";

        snapshot.forEach(doc=>{

            const ad = doc.data();

            trackAdImpression(doc.id);

            feed.innerHTML += `
            <div class="card">
                <img src="${ad.image}">
                <div class="card-body">
                    <h3>${ad.title}</h3>
                    <p class="small">${ad.description}</p>
                    <p class="price">${ad.type}</p>
                    <button onclick="openAffiliateLink('${doc.id}', '${ad.link}')">View Deal</button>
                </div>
            </div>
            `;

        });

    });

}

function trackAdImpression(adId){

    db.collection("affiliateAds").doc(adId).update({
        impressions: firebase.firestore.FieldValue.increment(1)
    }).catch(()=>{});

}

async function openAffiliateLink(id, link){

    try{

        await db.collection("affiliateAds").doc(id).update({
            clicks: firebase.firestore.FieldValue.increment(1)
        });

        window.open(link, "_blank");

    }catch(error){
        console.log(error);
    }

}

function loadSponsoredAds(){

    const feed = document.getElementById("sponsoredAdsFeed");
    if(!feed) return;

    db.collection("affiliateAds")
    .orderBy("clicks", "desc")
    .limit(5)
    .onSnapshot(snapshot=>{

        feed.innerHTML = "";

        snapshot.forEach(doc=>{

            const ad = doc.data();

            feed.innerHTML += `
            <div class="card">
                <img src="${ad.image}">
                <div class="card-body">
                    <h3 style="color:gold;">⭐ Sponsored</h3>
                    <h4>${ad.title}</h4>
                    <p class="small">${ad.description}</p>
                    <button onclick="openAffiliateLink('${doc.id}', '${ad.link}')">View Offer</button>
                </div>
            </div>
            `;

        });

    });

}

function loadAffiliateStats(){

    const clicksEl = document.getElementById("affiliateClicks");
    const impressionsEl = document.getElementById("affiliateImpressions");

    db.collection("affiliateAds").onSnapshot(snapshot=>{

        let totalClicks = 0;
        let totalImpressions = 0;

        snapshot.forEach(doc=>{
            const ad = doc.data();
            totalClicks += Number(ad.clicks || 0);
            totalImpressions += Number(ad.impressions || 0);
        });

        if(clicksEl) clicksEl.innerText = totalClicks;
        if(impressionsEl) impressionsEl.innerText = totalImpressions;

    });

}

/* Admin-created sponsored ads (separate, direct-sold ad slots) */

async function createSponsoredAd(){
    if(!requireAdmin()) return;

    const title = sanitizeText(document.getElementById("adTitle")?.value);
    const description = sanitizeText(document.getElementById("adDescription")?.value);
    const image = document.getElementById("adImage")?.value;
    const link = document.getElementById("adLink")?.value;

    if(!title || !description || !image || !link){
        alert("Fill all fields");
        return;
    }

    try{

        await db.collection("sponsoredAds").add({

            title, description, image, link,
            clicks:0,
            impressions:0,
            active:true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()

        });

        alert("Advertisement created");

    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

function loadFeaturedAds(){

    const container = document.getElementById("featuredAdsFeed");
    if(!container) return;

    db.collection("sponsoredAds")
    .where("active", "==", true)
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const ad = doc.data();

            db.collection("sponsoredAds").doc(doc.id).update({
                impressions: firebase.firestore.FieldValue.increment(1)
            });

            container.innerHTML += `
            <div class="card">
                <img src="${ad.image}">
                <div class="card-body">
                    <h3>${ad.title}</h3>
                    <p>${ad.description}</p>
                    <button onclick="openSponsoredAd('${doc.id}', '${ad.link}')">View Offer</button>
                </div>
            </div>
            `;

        });

    });

}

async function openSponsoredAd(adId, link){

    try{

        await db.collection("sponsoredAds").doc(adId).update({
            clicks: firebase.firestore.FieldValue.increment(1)
        });

        window.open(link, "_blank");

    }catch(error){
        console.log(error);
    }

}

function payForAdvertisement(tier){

    const user = auth.currentUser;

    if(!user){
        alert("Login required");
        return;
    }

    // Tiered ad pricing (₦2,500–₦10,000). Pass a tier price in from the UI.
    const amount = Number(tier) || 2500;

    FlutterwaveCheckout({

        public_key: "FLWPUBK-10783948c6fa8ead4ce8e667a24a3d51-X",
        tx_ref: "AD-" + Date.now(),
        amount: amount,
        currency: "NGN",

        customer:{ email:user.email, name:user.email },

        customizations:{
            title: "Advertisement Payment",
            description: "Featured Advertisement"
        },

        callback:function(){
            addAppCommission(amount);
            alert("Advertisement payment successful. You can now submit your ad.");
        }

    });

}
/* ==================================
KARMAS-TOOLS
(Redirects pass the logged-in user's
email so the tool site can track
per-user usage limits in Firestore)
================================== */

const AD_MAKER_URL = "https://karmas-tools.vercel.app";

function openToolWithAuth(basePath){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    window.location.href = `${basePath}?userEmail=${encodeURIComponent(user.email)}`;

}

function openAdMaker(){
    openToolWithAuth(AD_MAKER_URL);
}

function openBannerMaker(){
    openToolWithAuth(AD_MAKER_URL);
}

function openAnimationStudio(){
    openToolWithAuth(AD_MAKER_URL);
}

function loadTemplate1(){
    openToolWithAuth(AD_MAKER_URL);
}

function loadTemplate2(){
    openToolWithAuth(AD_MAKER_URL);
}

function openLogoMaker(){
    showPage("logoMakerPage");
}

function generateLogo(){

    const text = sanitizeText(document.getElementById("logoText").value);

    document.getElementById("logoPreview").innerHTML = `
    <div style="font-size:48px; font-weight:bold; color:gold; padding:20px;">
        ${text}
    </div>
    `;

}

function generateAIContent(){

    const area = document.getElementById("toolContent");

    area.innerHTML = `
    <h2 style="color:gold;">AI Ad Writer</h2>
    <input id="businessName" placeholder="Business Name" style="width:100%; margin-bottom:10px;">
    <textarea id="businessInfo" placeholder="Describe your business" style="width:100%; height:100px; margin-bottom:10px;"></textarea>
    <button onclick="createAdText()">Generate Ad</button>
    <div id="generatedAd" style="margin-top:15px;"></div>
    `;

}

function createAdText(){

    const name = sanitizeText(document.getElementById("businessName").value);
    const info = sanitizeText(document.getElementById("businessInfo").value);

    document.getElementById("generatedAd").innerHTML = `
    <div class="card">
        <div class="card-body">
            <h3>${name}</h3>
            <p>
                🔥 Looking for quality services?
                <br><br>
                ${info}
                <br><br>
                Contact us today and grow your business.
            </p>
        </div>
    </div>
    `;

}

function generateAd(){

    const business = document.getElementById("aiPrompt").value;

    document.getElementById("aiResult").value =
`🚀 ${business}

Looking for quality service?

Contact us today.

Limited-time offer available.

Act now!`;

}

function exportPNG(){

    const target = document.getElementById("canvasContainer");
    if(!target) return;

    html2canvas(target).then(canvas=>{

        const link = document.createElement("a");
        link.download = "flyer.png";
        link.href = canvas.toDataURL();
        link.click();

    });

}

async function exportPDF(){

    const target = document.getElementById("canvasContainer");
    if(!target) return;

    const canvasImage = await html2canvas(target);
    const image = canvasImage.toDataURL("image/png");

    const pdf = new jspdf.jsPDF();
    pdf.addImage(image, "PNG", 10, 10, 180, 100);
    pdf.save("karmas-market-design.pdf");

}

function loadTemplates(){

    const feed = document.getElementById("templateFeed");
    if(!feed) return;

    feed.innerHTML = "";

    db.collection("templates").get().then(snapshot=>{

        snapshot.forEach(doc=>{

            const template = doc.data();

            feed.innerHTML += `
            <div class="card">
                <img src="${template.image}">
                <div class="card-body">
                    <h3>${template.name}</h3>
                    <p class="price">₦${template.price}</p>
                    <button>Use Template</button>
                </div>
            </div>
            `;

        });

    });

}
/* ==================================
CONTACT FORM
================================== */

function submitContact(){

    const name = sanitizeText(document.getElementById("contactName").value);
    const email = document.getElementById("contactEmail").value.trim();
    const message = sanitizeText(document.getElementById("contactMessage").value);
    const result = document.getElementById("contactResult");

    if(!name || !email || !message){
        result.innerHTML = "⚠️ Please fill in all fields.";
        return;
    }

    db.collection("contactSubmissions").add({

        name, email, message,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()

    })
    .then(()=>{

        result.innerHTML = "✅ Thank you " + name + "! We'll get back to you at " + email + " within 24 hours.";

        document.getElementById("contactName").value = "";
        document.getElementById("contactEmail").value = "";
        document.getElementById("contactMessage").value = "";

    })
    .catch(error=>{
        result.innerHTML = "⚠️ Something went wrong. Please try again.";
        console.log(error);
    });

}

/* ==================================
ADMIN — USERS
================================== */

function openAdminDashboard(){
    if(!requireAdmin()) return;

    showPage("adminDashboard");
    loadAdminUsers();
    loadAdminProducts();
    loadAdminApps();
    loadAdminFreelancers();
    loadAdminStats();

}

function loadAdminUsers(){
    if(!requireAdmin()) return;

    const container = document.getElementById("adminUsersFeed");
    if(!container) return;

    db.collection("users").onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const user = doc.data();

            container.innerHTML += `
            <div class="card">
                <div class="card-body">
                    <h3>${user.name || "User"}</h3>
                    <p>${user.email || ""}</p>
                    <p>${user.role || "member"}</p>
                    <button onclick="banUser('${doc.id}')">Ban User</button>
                    <button class="alt" onclick="unbanUser('${doc.id}')">Unban User</button>
                </div>
            </div>
            `;

        });

    });

}

async function banUser(userId){
    if(!requireAdmin()) return;

    try{
        await db.collection("users").doc(userId).set({ banned:true }, { merge:true });
        logAuditEvent("ban_user", { userId: userId });
        alert("User banned");
    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

async function unbanUser(userId){
    if(!requireAdmin()) return;

    try{
        await db.collection("users").doc(userId).set({ banned:false }, { merge:true });
        logAuditEvent("unban_user", { userId: userId });
        alert("User unbanned");
    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

/* ==================================
ADMIN — PRODUCTS
================================== */

function loadAdminProducts(){
    if(!requireAdmin()) return;

    const container = document.getElementById("adminProductsFeed");
    if(!container) return;

    db.collection("items").onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const item = doc.data();

            container.innerHTML += `
            <div class="card">
                <img src="${item.imageUrl}">
                <div class="card-body">
                    <h3>${item.title}</h3>
                    <p>₦${item.price}</p>
                    <button onclick="adminDeleteProduct('${doc.id}')">Delete Product</button>
                </div>
            </div>
            `;

        });

    });

}

async function adminDeleteProduct(productId){
    if(!requireAdmin()) return;

    const proceed = confirm("Delete this product?");
    if(!proceed) return;

    try{
        await db.collection("items").doc(productId).delete();
        logAuditEvent("admin_delete_product", { itemId: productId });
        alert("Product deleted");
    }catch(error){
        console.log(error);
        alert(error.message);
    }

}
/* ==================================
ADMIN — APPS
================================== */

function loadAdminApps(){
    if(!requireAdmin()) return;

    const container = document.getElementById("adminAppsFeed");
    if(!container) return;

    db.collection("apps").onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const app = doc.data();

            container.innerHTML += `
            <div class="card">
                <img src="${app.appImage}">
                <div class="card-body">
                    <h3>${app.appName}</h3>
                    <p>${app.developerName}</p>
                    <button onclick="featureApp('${doc.id}')">Feature App</button>
                    <button class="alt" onclick="deleteApp('${doc.id}')">Delete App</button>
                </div>
            </div>
            `;

        });

    });

}

/* ==================================
ADMIN — FREELANCERS / SELLERS
================================== */

function loadAdminFreelancers(){
    if(!requireAdmin()) return;

    const container = document.getElementById("adminFreelancersFeed");
    if(!container) return;

    db.collection("freelancers").onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const freelancer = doc.data();

            container.innerHTML += `
            <div class="card">
                <div class="card-body">
                    <h3>${freelancer.name}</h3>
                    <p>${freelancer.skill}</p>
                    <button onclick="approveFreelancer('${doc.id}')">Verify</button>
                </div>
            </div>
            `;

        });

    });

}

async function approveFreelancer(freelancerId){
    if(!requireAdmin()) return;

    try{
        await db.collection("freelancers").doc(freelancerId).update({ verified:true });
        logAuditEvent("verify_freelancer", { freelancerId: freelancerId });
        alert("Freelancer approved");
    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

async function verifySeller(sellerId){
    if(!requireAdmin()) return;

    try{
        await db.collection("sellers").doc(sellerId).update({ verified:true });
        logAuditEvent("verify_seller", { sellerId: sellerId });
        alert("Seller verified");
    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

async function sponsorSeller(sellerId){
    if(!requireAdmin()) return;

    try{
        await db.collection("sellers").doc(sellerId).update({ sponsored:true });
        logAuditEvent("sponsor_seller", { sellerId: sellerId });
        alert("Seller sponsored");
    }catch(error){
        console.log(error);
        alert(error.message);
    }

}

/* ==================================
ADMIN — AUDIT LOG VIEWER
Drop a <div id="auditLogFeed"></div>
anywhere in your admin panel and call
loadAuditLogs() when that page loads
(the same way loadAdminUsers() etc.
are called) to see the trail.
================================== */

function loadAuditLogs(){
    if(!requireAdmin()) return;

    const container = document.getElementById("auditLogFeed");
    if(!container) return;

    db.collection("auditLogs")
    .orderBy("createdAt", "desc")
    .limit(100)
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        if(snapshot.empty){
            container.innerHTML = "<p class='small' style='text-align:center; padding:20px;'>No audit events yet</p>";
            return;
        }

        snapshot.forEach(doc=>{

            const log = doc.data();
            const date = log.createdAt ? new Date(log.createdAt.toDate()).toLocaleString() : "N/A";
            const detailsText = log.details ? JSON.stringify(log.details) : "";

            container.innerHTML += `
            <div class="card">
                <div class="card-body">
                    <h3>${log.action}</h3>
                    <p class="small">${log.performedByEmail}${log.isAdminAction ? " (admin)" : ""} • ${date}</p>
                    <p class="small">${detailsText}</p>
                </div>
            </div>
            `;

        });

    });

}

/* ==================================
ADMIN — REVENUE / ANALYTICS
================================== */

function addAppCommission(amount){

    db.collection("admin").doc("earnings").set({
        total: firebase.firestore.FieldValue.increment(Number(amount))
    }, { merge:true });

}

function loadAppEarnings(){
    if(!requireAdmin()) return;

    const earningsBox = document.getElementById("appEarnings");
    if(!earningsBox) return;

    db.collection("admin").doc("earnings").onSnapshot(doc=>{

        if(!doc.exists){
            earningsBox.innerText = "₦0";
            return;
        }

        const data = doc.data();
        earningsBox.innerText = "₦" + (data.total || 0);

    }, error => console.log("Earnings listener error:", error.message));

}

function loadTotalRevenue(){

    const element = document.getElementById("totalRevenue");
    if(!element) return;

    db.collection("orders")
    .where("status", "==", "completed")
    .onSnapshot(snapshot=>{

        let revenue = 0;

        snapshot.forEach(doc=>{
            const order = doc.data();
            revenue += Number(order.totalPaid || order.amount || 0);
        });

        element.innerText = "₦" + revenue + " (transaction volume)";

    }, error => console.log("Revenue listener error:", error.message));

}

function loadTotalProducts(){

    const element = document.getElementById("totalProducts");
    if(!element) return;

    db.collection("items").onSnapshot(snapshot=>{
        element.innerText = snapshot.size;
    });

}

function loadTotalFreelancers(){

    const element = document.getElementById("totalFreelancers");
    if(!element) return;

    db.collection("freelancers").onSnapshot(snapshot=>{
        element.innerText = snapshot.size;
    });

}

function loadTotalApps(){

    const element = document.getElementById("totalApps");
    if(!element) return;

    db.collection("apps").onSnapshot(snapshot=>{
        element.innerText = snapshot.size;
    });

}

function loadTotalOrders(){

    const element = document.getElementById("totalOrders");
    if(!element) return;

    db.collection("orders").onSnapshot(snapshot=>{
        element.innerText = snapshot.size;
    }, error => console.log("Total orders listener error:", error.message));

}

function loadAffiliateClicks(){

    const element = document.getElementById("totalClicks");
    if(!element) return;

    db.collection("affiliateAds").onSnapshot(snapshot=>{

        let clicks = 0;

        snapshot.forEach(doc=>{
            const ad = doc.data();
            clicks += Number(ad.clicks || 0);
        });

        element.innerText = clicks;

    }, error => console.log("Affiliate clicks listener error:", error.message));

}

function loadSubscriptions(){

    const box = document.getElementById("subscriptionCount");
    if(!box) return;

    db.collection("subscriptions").onSnapshot(snapshot=>{
        box.innerText = snapshot.size;
    }, error => console.log("Subscriptions listener error:", error.message));

}

function loadWithdrawals(){

    const box = document.getElementById("withdrawalCount");
    if(!box) return;

    db.collection("withdrawals").onSnapshot(snapshot=>{
        box.innerText = snapshot.size;
    }, error => console.log("Withdrawals listener error:", error.message));

}

function loadAdminStats(){
    if(!requireAdmin()) return;

    loadTotalProducts();
    loadTotalFreelancers();
    loadTotalApps();
    loadTotalOrders();
    loadAppEarnings();
    loadSubscriptions();
    loadWithdrawals();

}

function loadAdminAnalytics(){
    if(!requireAdmin()) return;

    loadTotalProducts();
    loadTotalFreelancers();
    loadTotalApps();
    loadTotalOrders();
    loadTotalRevenue();
    loadAffiliateClicks();

}

function loadAnalyticsChart(){
    if(!requireAdmin()) return;

    const canvas = document.getElementById("analyticsChart");
    if(!canvas) return;

    Promise.all([
        db.collection("items").get(),
        db.collection("freelancers").get(),
        db.collection("apps").get(),
        db.collection("orders").get()
    ])
    .then(results=>{

        const products = results[0].size;
        const freelancers = results[1].size;
        const apps = results[2].size;
        const orders = results[3].size;

        if(analyticsChart){
            analyticsChart.destroy();
        }

        analyticsChart = new Chart(canvas, {

            type: "bar",

            data:{
                labels: ["Products", "Freelancers", "Apps", "Orders"],
                datasets:[{
                    label: "Marketplace Stats",
                    data: [products, freelancers, apps, orders]
                }]
            },

            options:{
                responsive:true,
                maintainAspectRatio:false
            }

        });

    })
    .catch(error=>{
        console.log(error);
    });

}

function generateAdminReport(){
    if(!requireAdmin()) return;

    Promise.all([
        db.collection("users").get(),
        db.collection("items").get(),
        db.collection("apps").get(),
        db.collection("freelancers").get(),
        db.collection("orders").get()
    ])
    .then(results=>{

        console.log({
            users: results[0].size,
            products: results[1].size,
            apps: results[2].size,
            freelancers: results[3].size,
            orders: results[4].size
        });

    });

}
/* ==================================
WITHDRAWAL SYSTEM
Seller/Freelancer bank payouts
(Bank list + automatic payout now run
through Supabase Edge Functions, since
Firebase Cloud Functions require the
paid Blaze plan)
================================== */

const SUPABASE_URL = "https://oguzadajvbcdnfwdcmwv.supabase.co";

function showWithdrawalForm(){
    showPage("withdrawalPage");
    loadBankList();
}

function loadBankList(){

    const bankSelect = document.getElementById("bankSelect");
    if(!bankSelect) return;

    fetch(`${SUPABASE_URL}/functions/v1/get-bank-list`)
    .then(response => response.json())
    .then(result => {
        const banks = result.data;
        bankSelect.innerHTML = '<option value="">Select your bank...</option>';
        banks.forEach(bank => {
            bankSelect.innerHTML += `<option value="${bank.code}">${bank.name}</option>`;
        });
    })
    .catch(error => {
        console.error('Error loading banks:', error);
        if(!navigator.onLine){
            alert('You appear to be offline. Please check your connection and try again.');
        }else{
            alert('Could not load bank list. Please try again.');
        }
    });

}

function requestWithdrawal(){

    const user = auth.currentUser;
    if(!user) return alert("Please log in first");

    const amount = Number(document.getElementById("withdrawAmount").value);
    const bankCode = document.getElementById("bankSelect").value;
    const accountNumber = document.getElementById("accountNumber").value.trim();
    const accountName = sanitizeText(document.getElementById("accountName").value);

    if(!amount || amount < 1000){
        alert("Minimum withdrawal is ₦1,000");
        return;
    }

    if(!bankCode || !accountNumber || !accountName){
        alert("Please fill in all fields");
        return;
    }

    if(accountNumber.length !== 10){
        alert("Account number must be exactly 10 digits");
        return;
    }

    if(!navigator.onLine){
        alert("You're offline. Please check your connection and try again.");
        return;
    }

    db.collection('wallets').doc(user.uid).get()
    .then(doc => {

        if(!doc.exists || doc.data().balance < amount){
            alert("Insufficient balance");
            return;
        }

        db.collection('withdrawals').add({
            userId: user.uid,
            amount: amount,
            bankCode: bankCode,
            bankAccount: accountNumber,
            accountName: accountName,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(docRef => {

            logAuditEvent("withdrawal_requested", {
                withdrawalId: docRef.id,
                amount: amount,
                bankCode: bankCode,
                accountNumber: accountNumber,
                accountName: accountName
            });

            alert(`✅ Withdrawal request submitted. Reference: ${docRef.id}\nProcessing your payout now...`);
            document.getElementById("withdrawAmount").value = "";
            document.getElementById("bankSelect").value = "";
            document.getElementById("accountNumber").value = "";
            document.getElementById("accountName").value = "";
            showPage("walletPage");

            // Deduct from wallet immediately so balance can't be spent twice
            db.collection('wallets').doc(user.uid).update({
                balance: firebase.firestore.FieldValue.increment(-amount)
            });

            // Trigger automatic payout via Supabase Edge Function
            fetch(`${SUPABASE_URL}/functions/v1/process-withdrawal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    withdrawalId: docRef.id,
                    amount: amount,
                    bankCode: bankCode,
                    accountNumber: accountNumber,
                    accountName: accountName
                })
            })
            .then(response => response.json())
            .then(result => {

                if(result.status === 'success'){
                    db.collection('withdrawals').doc(docRef.id).update({ status: 'completed' });
                    logAuditEvent("withdrawal_completed", { withdrawalId: docRef.id, amount: amount });
                }else{
                    db.collection('withdrawals').doc(docRef.id).update({ status: 'failed' });
                    // Refund wallet if the transfer failed
                    db.collection('wallets').doc(user.uid).update({
                        balance: firebase.firestore.FieldValue.increment(amount)
                    });
                    logAuditEvent("withdrawal_failed", { withdrawalId: docRef.id, amount: amount, reason: (result && result.message) || "unknown" });
                }

            })
            .catch(error => {
                console.error('Payout error:', error);
                db.collection('withdrawals').doc(docRef.id).update({ status: 'failed' });
                db.collection('wallets').doc(user.uid).update({
                    balance: firebase.firestore.FieldValue.increment(amount)
                });
                logAuditEvent("withdrawal_failed", { withdrawalId: docRef.id, amount: amount, reason: error.message || "network error" });
            });

        })
        .catch(error => {
            alert("Error submitting withdrawal: " + error.message);
        });

    });

}

/* Renders into the shared .transaction /
   .transaction-info / .transaction-amount classes from
   style.css Section G instead of ad-hoc inline styles.
   Same data, same query, same 20-item limit — only the
   markup changed. */
function loadWithdrawalHistory(){

    const user = auth.currentUser;
    if(!user) return;

    const historyBox = document.getElementById("withdrawalHistory");
    if(!historyBox) return;

    db.collection('withdrawals')
    .where('userId', '==', user.uid)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .onSnapshot(snapshot => {

        historyBox.innerHTML = "";

        if(snapshot.empty){
            historyBox.innerHTML = "<p class='small' style='text-align:center; padding:20px;'>No withdrawals yet</p>";
            return;
        }

        snapshot.forEach(doc => {

            const w = doc.data();
            const status = w.status === 'completed' ? '✅' : w.status === 'failed' ? '❌' : '⏳';
            const date = w.createdAt ? new Date(w.createdAt.toDate()).toLocaleDateString() : 'N/A';
            const amountClass = w.status === 'failed' ? 'amount-negative' : 'amount-positive';

            historyBox.innerHTML += `
                <div class="transaction">
                    <div class="transaction-info">
                        <div class="transaction-title">₦${w.amount.toLocaleString()}</div>
                        <div class="transaction-date">${w.accountName} • ${date}</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="transaction-amount ${amountClass}">${status}</div>
                        <div class="transaction-date">${w.status}</div>
                    </div>
                </div>
            `;

        });

    });

}
/* ==================================
APP INITIALIZATION
================================== */

function initializeAppData(){

    try{

        if(document.getElementById("itemFeed")) displayItems();
        if(document.getElementById("appFeed")) loadApps();
        if(document.getElementById("notificationFeed")) loadNotifications();
        if(document.getElementById("templateFeed")) loadTemplates();
        if(document.getElementById("conversationList")) loadConversations();
        if(document.getElementById("walletBalance")) loadWallet();
        if(document.getElementById("ordersFeed")) loadOrders();
        if(document.getElementById("withdrawalHistory")) loadWithdrawalHistory();

        loadAffiliateAds();

    }catch(error){
        console.log("Initialization Error:", error);
    }

}

async function setupNotifications(){

    try{

        if("Notification" in window){
            if(Notification.permission !== "granted"){
                await Notification.requestPermission();
            }
        }

    }catch(error){
        console.log(error);
    }

}

window.addEventListener("load", async function(){

    console.log("Karmas Market Loaded");

    initializeAppData();

    await setupNotifications();

    try{ enableNotifications(); }catch(error){ console.log(error); }
    try{ startRealtimeNotifications(); }catch(error){ console.log(error); }

    setTimeout(()=>{

        loadCurrentSellerProfile();
        loadSellerSubscription();
        loadSellerSales();

        if(isAdmin()){
            loadAnalyticsChart();
            loadAdminAnalytics();
        }

    }, 1500);

    // Let the user know when connectivity drops or comes back,
    // instead of leaving silent failures on flaky mobile networks.
    window.addEventListener("online", ()=>{
        console.log("Back online");
    });

    window.addEventListener("offline", ()=>{
        showNotificationPopup("Connection Lost", "You're currently offline. Some features may not work until you reconnect.");
    });

});

/* ==================================
GLOBAL ERROR HANDLER
================================== */

window.addEventListener("error", function(event){
    console.log("APP ERROR:", event.message);
});

console.log("APP JS FULLY LOADED");