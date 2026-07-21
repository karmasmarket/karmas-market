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

const ADMIN_EMAIL = "karmaking426@gmail.com";

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

    }else{

        if(userStatus){
            userStatus.innerText = "Not logged in";
        }

    }

});

/* ==================================
SIGN UP / LOGIN / LOGOUT
================================== */

function signUp(){

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if(!email || !password){
        alert("Please enter email and password");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
    .then(()=>{
        alert("Account created successfully");
    })
    .catch(error=>{
        alert(error.message);
    });

}

function login(){

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if(!email || !password){
        alert("Please enter email and password");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
    .then(()=>{
        window.location.href = "home.html";
    })
    .catch(error=>{
        alert(error.message);
    });

}

function logout(){

    auth.signOut()
    .then(()=>{
        window.location.href = "index.html";
    })
    .catch(error=>{
        alert(error.message);
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

window.addEventListener("load", ()=>{
    const loader = document.getElementById("loader");
    if(loader){
        setTimeout(()=>{ loader.style.display = "none"; }, 1500);
    }
});

function closeOnboarding(){
    const onboarding = document.getElementById("onboarding");
    if(onboarding){
        onboarding.style.display = "none";
    }
}

/* ==================================
NOTIFICATIONS
================================== */

function createNotification(title, message){

    db.collection("notifications").add({
        title,
        message,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

}

function sendDealNotification(title, price){
    createNotification("🔥 New Deal Alert", `${title} is now available for ₦${price}`);
}

function sendAppNotification(appName){
    createNotification("📱 New App Added", `${appName} is now available in the App Marketplace`);
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
        let count = 0;

        snapshot.forEach(doc=>{
            count++;
            const data = doc.data();

            feed.innerHTML += `
            <div style="background:#111; padding:15px; border-radius:14px; border:1px solid rgba(255,215,0,.2); margin-bottom:10px;">
                <h3 style="color:gold;">${data.title}</h3>
                <p>${data.message}</p>
            </div>
            `;
        });

        updateNotificationBadge(count);

    });

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

    db.collection("notifications")
    .orderBy("createdAt", "desc")
    .limit(1)
    .onSnapshot(snapshot=>{

        snapshot.forEach(doc=>{
            const data = doc.data();
            showNotificationPopup(data.title, data.message);
            showBrowserNotification(data.title, data.message);
        });

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

    const seller = document.getElementById("sellerName").value.trim();
    const title = document.getElementById("itemTitle").value.trim();
    const price = document.getElementById("itemPrice").value.trim();
    const description = document.getElementById("itemDescription").value.trim();
    const imageFile = document.getElementById("itemImageFile").files[0];

    if(!seller || !title || !price || !description || !imageFile){
        alert("Please fill all fields");
        return;
    }

    try{

        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", "karmas.ng");

        const response = await fetch(
            "https://api.cloudinary.com/v1_1/djrijnh6c/image/upload",
            { method:"POST", body:formData }
        );

        const data = await response.json();

        if(!data.secure_url){
            throw new Error("Image upload failed");
        }

        await db.collection("items").add({

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

        sendDealNotification(title, price);

        alert("Product Posted Successfully");

        document.getElementById("sellerName").value = "";
        document.getElementById("itemTitle").value = "";
        document.getElementById("itemPrice").value = "";
        document.getElementById("itemDescription").value = "";
        document.getElementById("itemImageFile").value = "";

    }catch(error){
        console.error(error);
        alert(error.message);
    }

}

function displayItems(){

    const feed = document.getElementById("itemFeed");
    if(!feed) return;

    db.collection("items")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot=>{

        feed.innerHTML = "";

        snapshot.forEach(doc=>{

            const item = doc.data();

            feed.innerHTML += `
            <div class="card">
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
                    <button class="alt" onclick="openChat('${doc.id}', '${item.seller}')">
                        Chat Seller
                    </button>
                </div>
            </div>
            `;

        });

    });

}

document.addEventListener("DOMContentLoaded", ()=>{
    if(document.getElementById("itemFeed")){
        displayItems();
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

    FlutterwaveCheckout({

        public_key: "FLWPUBK-1748ab89-bb60-4d85-b918-54bfc755772a",
        tx_ref: "KM-" + Date.now(),
        amount: totalCharge,
        currency: "NGN",
        payment_options: "card,banktransfer,ussd",

        customer:{ email:user.email, name:user.email },

        customizations:{
            title: "Karmas Market",
            description: title + " purchase"
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

    db.collection("freelancers")
    .where("skill", "==", skill)
    .get()
    .then(snapshot=>{

        feed.innerHTML = "";

        if(snapshot.empty){
            feed.innerHTML = "<h3>No freelancers found</h3>";
            return;
        }

        snapshot.forEach(doc=>{

            const freelancer = doc.data();

            feed.innerHTML += `
            <div class="card">
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
                </div>
            </div>
            `;

            setTimeout(()=>{ loadReviews(doc.id); }, 300);

        });

    })
    .catch(error=>{
        console.log(error);
        feed.innerHTML = "<h3>Error loading freelancers</h3>";
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

            public_key: "FLWPUBK-1748ab89-bb60-4d85-b918-54bfc755772a",
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

    const comment = document.getElementById(`review-${freelancerId}`).value;
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
================================== */

function loadOrders(){

    const feed = document.getElementById("ordersFeed");
    if(!feed) return;

    const user = auth.currentUser;
    if(!user) return;

    db.collection("orders")
    .orderBy("createdAt", "desc")
    .onSnapshot(snapshot=>{

        feed.innerHTML = "";

        snapshot.forEach(doc=>{

            const order = doc.data();

            const isParticipant =
                order.buyer === user.email ||
                order.client === user.email ||
                order.sellerEmail === user.email ||
                order.freelancerId === user.uid;

            if(!isParticipant && !isAdmin()){
                return; // skip orders that don't belong to this user
            }

            const label = order.title || order.freelancerName || "Order";
            const amount = order.totalPaid || order.amount || 0;

            feed.innerHTML += `
            <div class="card">
                <div class="card-body">
                    <h3>${label}</h3>
                    <p>₦${amount}</p>
                    <p>Status: ${order.status}</p>
                    ${
                        order.status === "in_escrow"
                        ?
                        `<button onclick="approveOrder('${doc.id}')">Approve / Release Payment</button>`
                        :
                        ""
                    }
                </div>
            </div>
            `;

        });

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

            const label = order.freelancerName || order.title || "Order";
            sendPaymentNotification(label);
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
================================== */

function openChat(itemId, sellerId){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    currentChatId = itemId + "_" + sellerId;

    showPage("chatPage");
    loadMessages();

}

function sendMessage(){

    const input = document.getElementById("chatInput");
    const user = auth.currentUser;

    if(!input || !user) return;

    const message = input.value.trim();
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

    db.collection("conversations").doc(currentChatId).set({

        chatId: currentChatId,
        lastMessage: message,
        sender: user.email,
        participants: firebase.firestore.FieldValue.arrayUnion(user.email),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()

    }, { merge:true });

    input.value = "";

}

function loadMessages(){

    const box = document.getElementById("chatMessages");
    if(!box) return;

    db.collection("messages")
    .where("chatId", "==", currentChatId)
    .orderBy("createdAt", "asc")
    .onSnapshot(snapshot=>{

        box.innerHTML = "";

        snapshot.forEach(doc=>{

            const chat = doc.data();

            box.innerHTML += `
            <div style="background:#1a1a1a; padding:12px; margin-bottom:10px; border-radius:12px;">
                <b style="color:gold;">${chat.sender}</b>
                <p style="margin-top:5px;">${chat.message}</p>
            </div>
            `;

        });

        box.scrollTop = box.scrollHeight;

    });

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

        snapshot.forEach(doc=>{

            const chat = doc.data();

            list.innerHTML += `
            <div onclick="currentChatId='${chat.chatId}'; showPage('chatPage'); loadMessages();"
                 style="background:#111; padding:15px; margin-bottom:10px; border-radius:12px; border:1px solid rgba(255,215,0,.15); cursor:pointer;">
                <h3 style="color:gold;">${chat.sender}</h3>
                <p class="small">${chat.lastMessage}</p>
            </div>
            `;

        });

    });

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

    });

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

function withdrawWallet(){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    db.collection("wallets").doc(user.uid).get()
    .then(doc=>{

        if(!doc.exists){
            alert("Wallet not found");
            return;
        }

        const wallet = doc.data();
        const balance = Number(wallet.balance || 0);

        if(balance <= 0){
            alert("No funds available");
            return;
        }

        db.collection("withdrawals").add({

            userId: user.uid,
            email: user.email,
            amount: balance,
            status: "pending",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()

        });

        alert("Withdrawal request submitted");

    });

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

        snapshot.forEach(doc=>{

            const item = doc.data();

            container.innerHTML += `
            <div class="card">
                <img src="${item.imageUrl}">
                <div class="card-body">
                    <h3>${item.title}</h3>
                    <p class="price">₦${item.price}</p>
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

    const sellerName = document.getElementById("sellerProfileName")?.value || "";
    const sellerBio = document.getElementById("sellerProfileBio")?.value || "";
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

// One-time listing fee. Priced in Naira (₦7,000 ≈ $10 equivalent)
// so Flutterwave can charge in NGN like everything else in the app.
const APP_LISTING_FEE = 7000;

function postApp(){

    const user = auth.currentUser;

    if(!user){
        alert("Please login first");
        return;
    }

    const appName = document.getElementById("appName").value.trim();
    const developerName = document.getElementById("developerName").value.trim();
    const category = document.getElementById("appCategory").value.trim();
    const price = document.getElementById("appPrice").value.trim();
    const appLink = document.getElementById("appLink").value.trim();
    const appImage = document.getElementById("appImage").value.trim();
    const description = document.getElementById("appDescription").value.trim();

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

        public_key: "FLWPUBK-1748ab89-bb60-4d85-b918-54bfc755772a",
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

    const title = document.getElementById("promoTitle").value;
    const description = document.getElementById("promoDescription").value;
    const link = document.getElementById("promoLink").value;
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

    // Show the fee clearly before charging so nothing feels like a surprise.
    const confirmed = confirm(
        `Posting this ad (${tier} tier) costs ₦${adPrice}. Continue to payment?`
    );
    if(!confirmed) return;

    FlutterwaveCheckout({

        public_key: "FLWPUBK-1748ab89-bb60-4d85-b918-54bfc755772a",
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

    const title = document.getElementById("adTitle")?.value;
    const description = document.getElementById("adDescription")?.value;
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

        public_key: "FLWPUBK-1748ab89-bb60-4d85-b918-54bfc755772a",
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

    const text = document.getElementById("logoText").value;

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

    const name = document.getElementById("businessName").value;
    const info = document.getElementById("businessInfo").value;

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

    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const message = document.getElementById("contactMessage").value.trim();
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
        alert("Seller sponsored");
    }catch(error){
        console.log(error);
        alert(error.message);
    }

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

    });

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

    });

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
    });

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

    });

}

function loadSubscriptions(){

    const box = document.getElementById("subscriptionCount");
    if(!box) return;

    db.collection("subscriptions").onSnapshot(snapshot=>{
        box.innerText = snapshot.size;
    });

}

function loadWithdrawals(){

    const box = document.getElementById("withdrawalCount");
    if(!box) return;

    db.collection("withdrawals").onSnapshot(snapshot=>{
        box.innerText = snapshot.size;
    });

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

});

/* ==================================
GLOBAL ERROR HANDLER
================================== */

window.addEventListener("error", function(event){
    console.log("APP ERROR:", event.message);
});

console.log("APP JS FULLY LOADED");