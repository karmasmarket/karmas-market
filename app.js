/* ==================================
GLOBAL VARIABLES
================================== */
console.log("APP.JS VERSION TEST");
let currentChatId = null;
let currentItemId = null;
let currentSeller = "";

/* ==================================
AUTH STATE
================================== */

auth.onAuthStateChanged((user)=>{

const userEmail =
document.getElementById("userEmail");

const userStatus =
document.getElementById("userStatus");

if(user){

    if(userEmail){
        userEmail.innerText =
        user.email;
    }

    if(userStatus){
        userStatus.innerText =
        "Logged in: " + user.email;
    }

}else{

    if(userStatus){
        userStatus.innerText =
        "Not logged in";
    }

}

});

/* ==================================
SIGN UP
================================== */

function signUp(){

const email =
document.getElementById("email").value;

const password =
document.getElementById("password").value;

if(!email || !password){

    alert("Please enter email and password");

    return;
}

auth.createUserWithEmailAndPassword(
    email,
    password
)

.then(()=>{

    alert(
    "Account created successfully"
    );

})

.catch(error=>{

    alert(error.message);

});

}

/* ==================================
LOGIN
================================== */

function login(){

const email =
document.getElementById("email").value;

const password =
document.getElementById("password").value;

if(!email || !password){

    alert("Please enter email and password");

    return;
}

auth.signInWithEmailAndPassword(
    email,
    password
)

.then(()=>{

    window.location.href =
    "home.html";

})

.catch(error=>{

    alert(error.message);

});

}

/* ==================================
LOGOUT
================================== */

function logout(){

auth.signOut()

.then(()=>{

    window.location.href =
    "index.html";

})

.catch(error=>{

    alert(error.message);

});

}

/* ==================================
PAGE NAVIGATION
================================== */

function showPage(id,btn){

document
.querySelectorAll(".page")
.forEach(page=>{

    page.classList.remove("active");

});

const page =
document.getElementById(id);

if(page){

    page.classList.add("active");

}

document
.querySelectorAll(".nav-btn")
.forEach(nav=>{

    nav.classList.remove("active");

});

if(btn){

    btn.classList.add("active");

}

window.scrollTo({

    top:0,

    behavior:"smooth"

});

}

/* ==================================
SEARCH PRODUCTS
================================== */

function searchItems(value){

const search =
value.toLowerCase();

const cards =
document.querySelectorAll(
"#itemFeed .card"
);

cards.forEach(card=>{

    const title =
    card.querySelector("h3")
    .innerText
    .toLowerCase();

    card.style.display =

    title.includes(search)

    ? "block"

    : "none";

});

}

/* ==================================
LOADER
================================== */

window.addEventListener("load",()=>{

const loader =
document.getElementById("loader");

if(loader){

    setTimeout(()=>{

        loader.style.display =
        "none";

    },1500);

}

});

/* ==================================
ONBOARDING
================================== */

function closeOnboarding(){

const onboarding =
document.getElementById(
"onboarding"
);

if(onboarding){

    onboarding.style.display =
    "none";

}

}

/* ==================================
NOTIFICATIONS
================================== */

function showNotifications(){

showPage("notificationPage");

loadNotifications();

}

/* ==================================
NOTIFICATION LOADER
================================== */

function loadNotifications(){

const feed =
document.getElementById(
"notificationFeed"
);

if(!feed) return;

db.collection("notifications")

.orderBy(
    "createdAt",
    "desc"
)

.onSnapshot(snapshot=>{

    feed.innerHTML = "";

    let count = 0;

    snapshot.forEach(doc=>{

        count++;

        const data =
        doc.data();

        feed.innerHTML += `

        <div
        style="
        background:#111;
        padding:15px;
        border-radius:14px;
        border:1px solid rgba(255,215,0,.2);
        ">

            <h3 style="color:gold;">
            ${data.title}
            </h3>

            <p>
            ${data.message}
            </p>

        </div>

        `;

    });

    const badge =
    document.getElementById(
    "notificationCount"
    );

    if(badge){

        if(count > 0){

            badge.style.display =
            "block";

            badge.innerText =
            count;

        }else{

            badge.style.display =
            "none";

        }

    }

});

}

/* ==================================
DEAL ALERT
================================== */

function sendDealNotification(

title,

price

){

db.collection(
"notifications"
)

.add({

    title:
    "🔥 New Deal Alert",

    message:

    title +

    " now available for ₦" +

    price,

    createdAt:

    firebase.firestore
    .FieldValue
    .serverTimestamp()

});

}

console.log(
"APP SECTION A LOADED"
);
/* ==================================
PRODUCT POSTING
================================== */

async function postItem(){

const seller =
document.getElementById(
"sellerName"
).value.trim();

const title =
document.getElementById(
"itemTitle"
).value.trim();

const price =
document.getElementById(
"itemPrice"
).value.trim();

const description =
document.getElementById(
"itemDescription"
).value.trim();

const imageFile =
document.getElementById(
"itemImageFile"
).files[0];

if(
    !seller ||
    !title ||
    !price ||
    !description ||
    !imageFile
){

    alert(
    "Please fill all fields"
    );

    return;
}

try{

    const formData =
    new FormData();

    formData.append(
    "file",
    imageFile
    );

    formData.append(
    "upload_preset",
    "karmas.ng"
    );

    const response =
    await fetch(

    "https://api.cloudinary.com/v1_1/djrijnh6c/image/upload",

    {
        method:"POST",
        body:formData
    }

    );

    const data =
    await response.json();

    if(!data.secure_url){

        throw new Error(
        "Image upload failed"
        );

    }

    await db.collection(
    "items"
    ).add({

        seller,
        title,

        price:Number(price),

        description,

        imageUrl:
        data.secure_url,

        createdAt:
        firebase.firestore
        .FieldValue
        .serverTimestamp()

    });

    sendDealNotification(
    title,
    price
    );

    alert(
    "Product Posted Successfully"
    );

    document.getElementById(
    "sellerName"
    ).value = "";

    document.getElementById(
    "itemTitle"
    ).value = "";

    document.getElementById(
    "itemPrice"
    ).value = "";

    document.getElementById(
    "itemDescription"
    ).value = "";

    document.getElementById(
    "itemImageFile"
    ).value = "";

}

catch(error){

    console.error(error);

    alert(error.message);

}

}

/* ==================================
DISPLAY PRODUCTS
================================== */

function displayItems(){

const feed =
document.getElementById(
"itemFeed"
);

if(!feed) return;

db.collection("items")

.orderBy(
    "createdAt",
    "desc"
)

.onSnapshot(snapshot=>{

    feed.innerHTML = "";

    snapshot.forEach(doc=>{

        const item =
        doc.data();

        feed.innerHTML += `

        <div class="card">

            <img
            src="${item.imageUrl}"
            alt="${item.title}"
            >

            <div class="card-body">

                <h3>
                ${item.title}
                </h3>

                <p class="price">

                ₦${item.price}

                </p>

                <p class="small">

                ${item.description}

                </p>

                <p class="small">

                Seller:
                <span

                onclick="
                openSellerProfile(
                '${item.seller}'
                )
                "

                style="
                color:gold;
                cursor:pointer;
                "

                >

                ${item.seller}

                </span>

                </p>

                <button

                onclick="payForItem(

                '${item.title}',

                ${item.price},

                '${item.seller}'

                )"

                >

                Buy Now

                </button>

                <button

                class="alt"

                onclick="openChat(

                '${doc.id}',

                '${item.seller}'

                )"

                >

                Chat Seller

                </button>

            </div>

        </div>

        `;

    });

});

}

/* ==================================
PRODUCT PAYMENT
================================== */

function payForItem(

title,

price,

seller

){

const user =
auth.currentUser;

if(!user){

    alert(
    "Please login first"
    );

    return;
}

const appFee = 2000;

const sellerAmount =

Number(price)

- appFee;

FlutterwaveCheckout({

    public_key:

    "FLWPUBK-5c799a7def902df5408063221cd6c39a-X",

    tx_ref:

    "KM-" +

    Date.now(),

    amount:

    Number(price),

    currency:

    "NGN",

    payment_options:

    "card,banktransfer,ussd",

    customer:{

        email:user.email,

        name:user.email

    },

    customizations:{

        title:
        "Karmas Market",

        description:

        title +

        " purchase"

    },

    callback:function(response){

        db.collection(
        "orders"
        )

        .add({

            buyer:
            user.email,

            seller,

            title,

            totalPaid:
            Number(price),

            sellerAmount,

            appFee,

            status:
            "in_escrow",

            released:
            false,

            paymentReference:
            response.tx_ref,

            createdAt:

            firebase.firestore
            .FieldValue
            .serverTimestamp()

        });

        db.collection(
        "admin"
        )

        .doc(
        "earnings"
        )

        .set({

            total:

            firebase.firestore
            .FieldValue
            .increment(appFee)

        },

        {
            merge:true
        }

        );

        alert(

        "Payment secured in escrow"

        );

    },

    onclose:function(){

        console.log(
        "Payment window closed"
        );

    }

});

}

/* ==================================
AUTO LOAD PRODUCTS
================================== */

document.addEventListener(

"DOMContentLoaded",

()=>{

if(

document.getElementById(
"itemFeed"
)

){

    displayItems();

}

}

);

console.log(
"APP SECTION B LOADED"
);
/* ==================================
OPEN FREELANCERS
================================== */

function openFreelancers(skill){

showPage("freelancerPage");

const feed =
document.getElementById(
"freelancerFeed"
);

if(!feed) return;

feed.innerHTML =
"Loading freelancers...";

db.collection("freelancers")

.where(
"skill",
"==",
skill
)

.get()

.then(snapshot=>{

    feed.innerHTML = "";

    if(snapshot.empty){

        feed.innerHTML =

        "<h3>No freelancers found</h3>";

        return;
    }

    snapshot.forEach(doc=>{

        const freelancer =
        doc.data();

        feed.innerHTML += `

        <div class="card">

            <img
            src="${
            freelancer.image ||
            'https://via.placeholder.com/400'
            }">

            <div class="card-body">

                <h3>

                ${freelancer.name}

                ${freelancer.verified ?

                "✔️"

                :

                ""

                }

                </h3>

                <p class="small">

                ${freelancer.bio || ""}

                </p>

                <p class="small">

                Skill:
                ${freelancer.skill}

                </p>

                <p class="price">

                ₦${freelancer.price}

                </p>

                <button

                onclick="
                hireFreelancer(
                '${doc.id}'
                )
                "

                >

                Hire Freelancer

                </button>

                <textarea

                id="review-${doc.id}"

                placeholder="
                Leave a review
                "

                ></textarea>

                <select

                id="rating-${doc.id}"

                >

                    <option value="5">
                    ⭐⭐⭐⭐⭐
                    </option>

                    <option value="4">
                    ⭐⭐⭐⭐
                    </option>

                    <option value="3">
                    ⭐⭐⭐
                    </option>

                    <option value="2">
                    ⭐⭐
                    </option>

                    <option value="1">
                    ⭐
                    </option>

                </select>

                <button

                class="alt"

                onclick="
                submitReview(
                '${doc.id}'
                )
                "

                >

                Submit Review

                </button>

                <div

                id="reviews-${doc.id}"

                ></div>

            </div>

        </div>

        `;

        setTimeout(()=>{

            loadReviews(doc.id);

        },300);

    });

})

.catch(error=>{

    console.log(error);

    feed.innerHTML =

    "<h3>Error loading freelancers</h3>";

});

}

/* ==================================
HIRE FREELANCER
================================== */

function hireFreelancer(id){

const user =
auth.currentUser;

if(!user){

    alert(
    "Please login first"
    );

    return;
}

db.collection("freelancers")

.doc(id)

.get()

.then(doc=>{

    if(!doc.exists){

        alert(
        "Freelancer not found"
        );

        return;
    }

    const freelancer =
    doc.data();

    FlutterwaveCheckout({

        public_key:

        "FLWPUBK-5c799a7def902df5408063221cd6c39a-X",

        tx_ref:

        "FREELANCER-" +

        Date.now(),

        amount:

        Number(
        freelancer.price
        ),

        currency:"NGN",

        payment_options:

        "card,banktransfer,ussd",

        customer:{

            email:user.email,

            name:
            user.email

        },

        customizations:{

            title:
            "Freelancer Hiring",

            description:

            freelancer.name

        },

        callback:function(response){

            db.collection(
            "orders"
            )

            .add({

                freelancerId:id,

                freelancerName:
                freelancer.name,

                client:
                user.email,

                amount:
                freelancer.price,

                paymentReference:
                response.tx_ref,

                status:
                "in_escrow",

                paymentStatus:
                "held",

                approved:
                false,

                delivery:null,

                createdAt:

                firebase.firestore
                .FieldValue
                .serverTimestamp()

            });

            alert(
            "Payment secured in escrow"
            );

        }

    });

});

}

/* ==================================
SUBMIT REVIEW
================================== */

function submitReview(

freelancerId

){

const user =
auth.currentUser;

if(!user){

    alert(
    "Please login first"
    );

    return;
}

const comment =
document.getElementById(
`review-${freelancerId}`
).value;

const rating =
document.getElementById(
`rating-${freelancerId}`
).value;

db.collection("reviews")

.add({

    freelancerId,

    reviewer:
    user.email,

    comment,

    rating:
    Number(rating),

    createdAt:

    firebase.firestore
    .FieldValue
    .serverTimestamp()

})

.then(()=>{

    alert(
    "Review submitted"
    );

    loadReviews(
    freelancerId
    );

});

}

/* ==================================
LOAD REVIEWS
================================== */

function loadReviews(

freelancerId

){

const container =
document.getElementById(
`reviews-${freelancerId}`
);

if(!container) return;

db.collection("reviews")

.where(
"freelancerId",
"==",
freelancerId
)

.onSnapshot(snapshot=>{

    container.innerHTML = "";

    let total = 0;
    let count = 0;

    snapshot.forEach(doc=>{

        const review =
        doc.data();

        total +=
        review.rating;

        count++;

        container.innerHTML += `

        <div
        style="
        background:#1a1a1a;
        padding:10px;
        border-radius:10px;
        margin-top:10px;
        ">

            <p>

            ${"⭐".repeat(
            review.rating
            )}

            </p>

            <p>

            ${review.comment}

            </p>

            <small>

            ${review.reviewer}

            </small>

        </div>

        `;

    });

    if(count > 0){

        const average =

        (
        total / count
        )

        .toFixed(1);

        container.innerHTML =

        `<h3 style="color:gold;">
        ⭐ ${average}/5
        </h3>`

        +

        container.innerHTML;

    }

});

}


/* ==================================
CHAT SYSTEM
================================== */



/* ==================================
OPEN CHAT
================================== */

function openChat(

itemId,

sellerId

){

const user =
auth.currentUser;

if(!user){

    alert(
    "Please login first"
    );

    return;
}

currentChatId =

itemId +

"_" +

sellerId;

showPage(
"chatPage"
);

loadMessages();

}

/* ==================================
SEND MESSAGE
================================== */

function sendMessage(){

const input =
document.getElementById(
"chatInput"
);

if(!input) return;

const message =
input.value.trim();

const user =
auth.currentUser;

if(!user){

    alert(
    "Please login first"
    );

    return;
}

if(!message){

    return;
}

if(!currentChatId){

    currentChatId =
    "general";

}

db.collection("messages")

.add({

    chatId:
    currentChatId,

    sender:
    user.email,

    message:
    message,

    createdAt:

    firebase.firestore
    .FieldValue
    .serverTimestamp()

});

db.collection(
"conversations"
)

.doc(
currentChatId
)

.set({

    chatId:
    currentChatId,

    lastMessage:
    message,

    sender:
    user.email,

    updatedAt:

    firebase.firestore
    .FieldValue
    .serverTimestamp()

});

input.value = "";

}

/* ==================================
LOAD MESSAGES
================================== */

function loadMessages(){

const box =
document.getElementById(
"chatMessages"
);

if(!box) return;

db.collection("messages")

.where(
"chatId",
"==",
currentChatId
)

.orderBy(
"createdAt",
"asc"
)

.onSnapshot(snapshot=>{

    box.innerHTML = "";

    snapshot.forEach(doc=>{

        const chat =
        doc.data();

        box.innerHTML += `

        <div
        style="
        background:#1a1a1a;
        padding:12px;
        margin-bottom:10px;
        border-radius:12px;
        ">

            <b
            style="
            color:gold;
            "
            >

            ${chat.sender}

            </b>

            <p
            style="
            margin-top:5px;
            "
            >

            ${chat.message}

            </p>

        </div>

        `;

    });

    box.scrollTop =
    box.scrollHeight;

});

}

/* ==================================
LOAD CONVERSATIONS
================================== */

function loadConversations(){

const user =
auth.currentUser;

if(!user){

    return;
}

const list =
document.getElementById(
"conversationList"
);

if(!list){

    return;
}

db.collection(
"conversations"
)

.orderBy(
"updatedAt",
"desc"
)

.onSnapshot(snapshot=>{

    list.innerHTML = "";

    snapshot.forEach(doc=>{

        const chat =
        doc.data();

        list.innerHTML += `

        <div

        onclick="

        currentChatId='${chat.chatId}';

        showPage('chatPage');

        loadMessages();

        "

        style="
        background:#111;
        padding:15px;
        margin-bottom:10px;
        border-radius:12px;
        border:1px solid rgba(255,215,0,.15);
        cursor:pointer;
        "

        >

            <h3
            style="
            color:gold;
            "
            >

            ${chat.sender}

            </h3>

            <p
            class="small"
            >

            ${chat.lastMessage}

            </p>

        </div>

        `;

    });

});

}

/* ==================================
REALTIME NOTIFICATIONS
================================== */

function startRealtimeNotifications(){

db.collection(
"notifications"
)

.orderBy(
"createdAt",
"desc"
)

.limit(1)

.onSnapshot(snapshot=>{

    snapshot.forEach(doc=>{

        const data =
        doc.data();

        if(

        Notification.permission ===

        "granted"

        ){

            new Notification(

            data.title,

            {

                body:
                data.message,

                icon:
                "icon.png"

            }

            );

        }

    });

});

}

/* ==================================
ENABLE PUSH NOTIFICATIONS
================================== */

async function enableNotifications(){

try{

    const permission =

    await Notification
    .requestPermission();

    if(

    permission ===

    "granted"

    ){

        console.log(

        "Notifications Enabled"

        );

    }

}

catch(error){

    console.log(error);

}

}

/* ==================================
CHAT ENTER KEY SUPPORT
================================== */

document.addEventListener(

"DOMContentLoaded",

()=>{

const input =

document.getElementById(
"chatInput"
);

if(input){

    input.addEventListener(

    "keypress",

    function(event){

        if(

        event.key ===

        "Enter"

        ){

            sendMessage();

        }

    });

}

});

console.log(
"APP SECTION D LOADED"
);
/* ==========================================
   FREELANCER SYSTEM
========================================== */

function openFreelancers(skill) {

    showPage("freelancerPage");

    const freelancerFeed =
    document.getElementById("freelancerFeed");

    freelancerFeed.innerHTML =
    "<h2>Loading freelancers...</h2>";

    db.collection("freelancers")
    .where("skill", "==", skill)
    .get()
    .then(snapshot => {

        freelancerFeed.innerHTML = "";

        if(snapshot.empty){

            freelancerFeed.innerHTML =
            "<h2>No freelancers found</h2>";

            return;
        }

        snapshot.forEach(doc => {

            const freelancer = doc.data();

            freelancerFeed.innerHTML += `

            <div class="card">

                <img
                src="${freelancer.image || 'https://via.placeholder.com/500'}">

                <div class="card-body">

                    <h3>
                        ${freelancer.name}
                    </h3>

                    <p class="small">
                        ${freelancer.bio || ""}
                    </p>

                    <p class="small">
                        Skill:
                        ${freelancer.skill}
                    </p>

                    <p class="price">
                        ₦${freelancer.price}
                    </p>

                    <button
                    onclick="hireFreelancer('${doc.id}')">

                    Hire Freelancer

                    </button>

                </div>

            </div>

            `;
        });

    })
    .catch(error => {

        console.log(error);

        freelancerFeed.innerHTML =
        "<h2>Error loading freelancers</h2>";

    });

}

function closeFreelancers(){

    showPage("services");

}

/* ==========================================
   HIRE FREELANCER
========================================== */

function hireFreelancer(id){

    const user =
    auth.currentUser;

    if(!user){

        alert("Please login first");
        return;
    }

    db.collection("freelancers")
    .doc(id)
    .get()
    .then(doc => {

        const freelancer =
        doc.data();

        FlutterwaveCheckout({

            public_key:
            "FLWPUBK-5c799a7def902df5408063221cd6c39a-X",

            tx_ref:
            "FREELANCER-" +
            Date.now(),

            amount:
            Number(freelancer.price),

            currency:"NGN",

            payment_options:
            "card,banktransfer,ussd",

            customer:{
                email:user.email,
                name:user.email
            },

            customizations:{
                title:
                "Freelancer Payment",

                description:
                freelancer.name
            },

            callback:function(response){

                db.collection("orders")
                .add({

                    freelancerId:id,

                    freelancerName:
                    freelancer.name,

                    amount:
                    freelancer.price,

                    buyer:
                    user.email,

                    status:
                    "in_escrow",

                    createdAt:
                    firebase.firestore
                    .FieldValue
                    .serverTimestamp()

                });

                alert(
                "Payment secured successfully"
                );

            }

        });

    });

}

/* ==========================================
   REVIEWS
========================================== */

function submitReview(freelancerId){

    const user =
    auth.currentUser;

    if(!user){

        alert("Login first");
        return;
    }

    const comment =
    document.getElementById(
    `review-${freelancerId}`
    ).value;

    const rating =
    document.getElementById(
    `rating-${freelancerId}`
    ).value;

    db.collection("reviews")
    .add({

        freelancerId,
        reviewer:user.email,
        comment,
        rating:Number(rating),

        createdAt:
        firebase.firestore
        .FieldValue
        .serverTimestamp()

    })

    .then(()=>{

        alert(
        "Review submitted"
        );

    });

}

/* ==========================================
   LOAD ORDERS
========================================== */

function loadOrders(){

    const feed = document.getElementById("ordersFeed");
    if(!feed) return;

    const user = auth.currentUser;
    if(!user) return;

    feed.innerHTML = "";

    const seen = new Set();

    function renderOrder(doc){
        if(seen.has(doc.id)) return;
        seen.add(doc.id);

        const order = doc.data();
        const label = order.title || order.freelancerName || "Order";
        const amount = order.totalPaid || order.amount || 0;

        feed.innerHTML += `
        <div class="card">
            <div class="card-body">
                <h3>${label}</h3>
                <p>₦${amount}</p>
                <p>Status: ${order.status}</p>
                ${order.status === "in_escrow" ? `<button onclick="completeOrder('${doc.id}')">Approve Work</button>` : ""}
            </div>
        </div>`;
    }

    db.collection("orders")
    .where("buyer", "==", user.email)
    .onSnapshot(snapshot=>{
        snapshot.forEach(renderOrder);
    });

    db.collection("orders")
    .where("client", "==", user.email)
    .onSnapshot(snapshot=>{
        snapshot.forEach(renderOrder);
    });

    db.collection("orders")
    .where("sellerEmail", "==", user.email)
    .onSnapshot(snapshot=>{
        snapshot.forEach(renderOrder);
    });

}
/* ==========================================
   COMPLETE ORDER
========================================== */

function completeOrder(orderId){

    db.collection("orders")
    .doc(orderId)
    .update({

        status:"completed"

    })

    .then(()=>{

        alert(
        "Order completed"
        );

    });

}

/* ==========================================
   WALLET
========================================== */

function loadWallet(){

    const user =
    auth.currentUser;

    if(!user) return;

    db.collection("wallets")
    .doc(user.uid)
    .onSnapshot(doc=>{

        if(!doc.exists){

            db.collection("wallets")
            .doc(user.uid)
            .set({

                balance:0

            });

            return;
        }

        const wallet =
        doc.data();

        const balanceEl =
        document.getElementById(
        "walletBalance"
        );

        if(balanceEl){

            balanceEl.innerText =
            "₦" +
            (wallet.balance || 0);

        }

    });

}

function addWalletBalance(
userId,
amount
){

    db.collection("wallets")
    .doc(userId)
    .set({

        balance:
        firebase.firestore
        .FieldValue
        .increment(amount)

    }, { merge:true });

}

function withdrawWallet(){

    const user =
    auth.currentUser;

    if(!user) return;

    alert(
    "Withdrawal request submitted"
    );

}
/* ==========================================
   SELLER PROFILE SYSTEM
========================================== */

function openSellerProfile(sellerName){

    showPage("sellerProfilePage");

    loadSellerProfile(sellerName);

    loadSellerProducts(sellerName);

}

function loadSellerProfile(sellerName){

    const container =
    document.getElementById(
    "sellerProfile"
    );

    if(!container) return;

    db.collection("sellers")
    .where("name","==",sellerName)
    .get()
    .then(snapshot=>{

        container.innerHTML = "";

        if(snapshot.empty){

            container.innerHTML = `

            <div class="profile-box">

                <h2>
                Seller Not Found
                </h2>

            </div>

            `;

            return;
        }

        snapshot.forEach(doc=>{

            const seller =
            doc.data();

            container.innerHTML = `

            <div class="profile-box">

                <img
                src="${
                seller.image ||
                'https://via.placeholder.com/150'
                }"

                style="
                width:120px;
                height:120px;
                border-radius:50%;
                object-fit:cover;
                margin-bottom:15px;
                ">

                <h2>
                ${seller.name}
                </h2>

                <p class="small">
                ${seller.bio || ""}
                </p>

                <p class="small">
                ${seller.email || ""}
                </p>

            </div>

            `;

        });

    });

}

/* ==========================================
   SELLER PRODUCTS
========================================== */

function loadSellerProducts(sellerName){

    const container =
    document.getElementById(
    "sellerProducts"
    );

    if(!container) return;

    db.collection("items")
    .where(
        "seller",
        "==",
        sellerName
    )
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const item =
            doc.data();

            container.innerHTML += `

            <div class="card">

                <img
                src="${item.imageUrl}">

                <div class="card-body">

                    <h3>
                    ${item.title}
                    </h3>

                    <p class="price">
                    ₦${item.price}
                    </p>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   CHAT SYSTEM
========================================== */

 currentChatId = null;

function openChat(
itemId,
sellerName
){

    const user =
    auth.currentUser;

    if(!user){

        alert(
        "Please login first"
        );

        return;
    }

    currentChatId =
    itemId;

    showPage(
    "chatPage"
    );

    loadMessages();

}

function sendMessage(){

    const input =
    document.getElementById(
    "chatInput"
    );

    const user =
    auth.currentUser;

    if(!input || !user){

        return;

    }

    const message =
    input.value.trim();

    if(!message){

        return;

    }

    if(!currentChatId){

        currentChatId =
        "general";
    }

    db.collection("messages")
    .add({

        chatId:
        currentChatId,

        sender:
        user.email,

        message:
        message,

        createdAt:
        firebase.firestore
        .FieldValue
        .serverTimestamp()

    });

    db.collection("conversations")
    .doc(currentChatId)
    .set({

        lastMessage:
        message,

        updatedAt:
        firebase.firestore
        .FieldValue
        .serverTimestamp()

    }, { merge:true });

    input.value = "";

}

/* ==========================================
   LOAD CHAT MESSAGES
========================================== */

function loadMessages(){

    const box =
    document.getElementById(
    "chatMessages"
    );

    if(!box) return;

    db.collection("messages")
    .where(
        "chatId",
        "==",
        currentChatId
    )
    .orderBy("createdAt")
    .onSnapshot(snapshot=>{

        box.innerHTML = "";

        snapshot.forEach(doc=>{

            const chat =
            doc.data();

            box.innerHTML += `

            <div
            style="
            margin-bottom:12px;
            padding:12px;
            background:#1a1a1a;
            border-radius:12px;
            ">

                <b
                style="color:gold;">

                ${chat.sender}

                </b>

                <p
                style="
                margin-top:6px;
                ">

                ${chat.message}

                </p>

            </div>

            `;

        });

        box.scrollTop =
        box.scrollHeight;

    });

}

/* ==========================================
   CONVERSATIONS LIST
========================================== */

function loadConversations(){

    const user =
    auth.currentUser;

    const list =
    document.getElementById(
    "conversationList"
    );

    if(!user || !list){

        return;
    }

    db.collection("messages")
    .orderBy(
    "createdAt",
    "desc"
    )
    .onSnapshot(snapshot=>{

        list.innerHTML = "";

        const chats = {};

        snapshot.forEach(doc=>{

            const data =
            doc.data();

            if(
                !chats[data.chatId]
            ){

                chats[
                data.chatId
                ] = data;

            }

        });

        Object.keys(chats)
        .forEach(chatId=>{

            const chat =
            chats[chatId];

            list.innerHTML += `

            <div

            onclick="
            currentChatId='${chat.chatId}';
            showPage('chatPage');
            loadMessages();
            "

            style="
            background:#111;
            padding:15px;
            border-radius:14px;
            cursor:pointer;
            margin-bottom:10px;
            border:1px solid rgba(255,215,0,.15);
            "

            >

                <h3
                style="color:gold;">

                Conversation

                </h3>

                <p class="small">

                ${chat.message}

                </p>

            </div>

            `;

        });

    });

}

/* ==========================================
   CHAT NOTIFICATION
========================================== */

function notifyNewMessage(sender){

    db.collection("notifications")
    .add({

        title:
        "💬 New Message",

        message:
        sender +
        " sent a message",

        createdAt:
        firebase.firestore
        .FieldValue
        .serverTimestamp()

    });

}
/* ==========================================
   AFFILIATE MARKETING SYSTEM
========================================== */

function showPromotionForm(){

    showPage("promotionPage");

}

/* ==========================================
   SUBMIT AFFILIATE AD
========================================== */

async function submitPromotion(){

    const title =
    document.getElementById(
    "promoTitle"
    ).value;

    const description =
    document.getElementById(
    "promoDescription"
    ).value;

    const link =
    document.getElementById(
    "promoLink"
    ).value;

    const type =
    document.getElementById(
    "affiliateType"
    ).value;

    const file =
    document.getElementById(
    "affiliateImage"
    ).files[0];

    if(
        !title ||
        !description ||
        !link ||
        !file
    ){

        alert(
        "Please complete all fields"
        );

        return;
    }

    try{

        const formData =
        new FormData();

        formData.append(
        "file",
        file
        );

        formData.append(
        "upload_preset",
        "karmas.ng"
        );

        const response =
        await fetch(

        "https://api.cloudinary.com/v1_1/djrijnh6c/image/upload",

        {
            method:"POST",
            body:formData
        }

        );

        const data =
        await response.json();

        const imageUrl =
        data.secure_url;

        await db.collection(
        "affiliateAds"
        )
        .add({

            title,
            description,
            link,
            type,

            image:
            imageUrl,

            clicks:0,

            impressions:0,

            createdAt:
            firebase.firestore
            .FieldValue
            .serverTimestamp()

        });

        alert(
        "Affiliate Ad Posted"
        );

        loadAffiliateAds();

    }

    catch(error){

        console.log(error);

        alert(
        error.message
        );

    }

}

/* ==========================================
   LOAD AFFILIATE ADS
========================================== */

function loadAffiliateAds(){

    const feed =
    document.getElementById(
    "affiliateFeed"
    );

    if(!feed) return;

    db.collection("affiliateAds")
    .orderBy(
    "createdAt",
    "desc"
    )
    .onSnapshot(snapshot=>{

        feed.innerHTML = "";

        snapshot.forEach(doc=>{

            const ad =
            doc.data();

            trackAdImpression(
            doc.id
            );

            feed.innerHTML += `

            <div class="card">

                <img
                src="${ad.image}">

                <div class="card-body">

                    <h3>
                    ${ad.title}
                    </h3>

                    <p class="small">
                    ${ad.description}
                    </p>

                    <p class="price">
                    ${ad.type}
                    </p>

                    <button
                    onclick="
                    openAffiliateLink(
                    '${doc.id}',
                    '${ad.link}'
                    )
                    ">

                    View Deal

                    </button>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   TRACK IMPRESSIONS
========================================== */

function trackAdImpression(adId){

    db.collection("affiliateAds")
    .doc(adId)
    .update({

        impressions:
        firebase.firestore
        .FieldValue
        .increment(1)

    })
    .catch(()=>{});

}

/* ==========================================
   TRACK CLICKS
========================================== */

function trackAffiliateClick(
adId,
link
){

    db.collection("affiliateAds")
    .doc(adId)
    .update({

        clicks:
        firebase.firestore
        .FieldValue
        .increment(1)

    });

    window.open(
    link,
    "_blank"
    );

}

/* ==========================================
   OPEN AFFILIATE LINK
========================================== */

async function openAffiliateLink(
id,
link
){

    try{

        await db.collection(
        "affiliateAds"
        )
        .doc(id)
        .update({

            clicks:
            firebase.firestore
            .FieldValue
            .increment(1)

        });

        window.open(
        link,
        "_blank"
        );

    }

    catch(error){

        console.log(error);

    }

}

/* ==========================================
   SPONSORED ADS SYSTEM
========================================== */

function loadSponsoredAds(){

    const feed =
    document.getElementById(
    "sponsoredAdsFeed"
    );

    if(!feed) return;

    db.collection("affiliateAds")
    .orderBy(
    "clicks",
    "desc"
    )
    .limit(5)
    .onSnapshot(snapshot=>{

        feed.innerHTML = "";

        snapshot.forEach(doc=>{

            const ad =
            doc.data();

            feed.innerHTML += `

            <div class="card">

                <img
                src="${ad.image}">

                <div class="card-body">

                    <h3
                    style="color:gold;">

                    ⭐ Sponsored

                    </h3>

                    <h4>
                    ${ad.title}
                    </h4>

                    <p class="small">
                    ${ad.description}
                    </p>

                    <button
                    onclick="
                    openAffiliateLink(
                    '${doc.id}',
                    '${ad.link}'
                    )
                    ">

                    View Offer

                    </button>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   AFFILIATE ANALYTICS
========================================== */

function loadAffiliateStats(){

    const clicksEl =
    document.getElementById(
    "affiliateClicks"
    );

    const impressionsEl =
    document.getElementById(
    "affiliateImpressions"
    );

    db.collection("affiliateAds")
    .onSnapshot(snapshot=>{

        let totalClicks = 0;
        let totalImpressions = 0;

        snapshot.forEach(doc=>{

            const ad =
            doc.data();

            totalClicks +=
            Number(
            ad.clicks || 0
            );

            totalImpressions +=
            Number(
            ad.impressions || 0
            );

        });

        if(clicksEl){

            clicksEl.innerText =
            totalClicks;

        }

        if(impressionsEl){

            impressionsEl.innerText =
            totalImpressions;

        }

    });

}

/* ==========================================
   PROMOTION NOTIFICATION
========================================== */

function sendPromotionNotification(
title
){

    db.collection(
    "notifications"
    )
    .add({

        title:
        "📢 New Promotion",

        message:
        title +
        " has just been published.",

        createdAt:
        firebase.firestore
        .FieldValue
        .serverTimestamp()

    });

}
/* ==========================================
   APP MARKETPLACE SYSTEM
========================================== */

/* ==========================================
   POST APPLICATION
========================================== */

function postApp(){

    const appName =
    document.getElementById(
    "appName"
    ).value.trim();

    const developerName =
    document.getElementById(
    "developerName"
    ).value.trim();

    const category =
    document.getElementById(
    "appCategory"
    ).value.trim();

    const price =
    document.getElementById(
    "appPrice"
    ).value.trim();

    const appLink =
    document.getElementById(
    "appLink"
    ).value.trim();

    const appImage =
    document.getElementById(
    "appImage"
    ).value.trim();

    const description =
    document.getElementById(
    "appDescription"
    ).value.trim();

    if(
        !appName ||
        !developerName ||
        !category ||
        !price ||
        !appLink ||
        !appImage ||
        !description
    ){

        alert(
        "Please complete all fields"
        );

        return;
    }

    db.collection("apps")
    .add({

        appName,
        developerName,
        category,
        price,
        appLink,
        appImage,
        description,

        featured:false,

        downloads:0,

        createdAt:
        firebase.firestore
        .FieldValue
        .serverTimestamp()

    })

    .then(()=>{

        alert(
        "Application Posted Successfully"
        );

        clearAppForm();

    })

    .catch(error=>{

        console.log(error);

        alert(
        error.message
        );

    });

}

/* ==========================================
   CLEAR APP FORM
========================================== */

function clearAppForm(){

    document.getElementById(
    "appName"
    ).value = "";

    document.getElementById(
    "developerName"
    ).value = "";

    document.getElementById(
    "appCategory"
    ).value = "";

    document.getElementById(
    "appPrice"
    ).value = "";

    document.getElementById(
    "appLink"
    ).value = "";

    document.getElementById(
    "appImage"
    ).value = "";

    document.getElementById(
    "appDescription"
    ).value = "";

}

/* ==========================================
   LOAD APPLICATIONS
========================================== */

function loadApps(){

    const appFeed =
    document.getElementById(
    "appFeed"
    );

    if(!appFeed) return;

    db.collection("apps")
    .orderBy(
    "createdAt",
    "desc"
    )
    .onSnapshot(snapshot=>{

        appFeed.innerHTML = "";

        snapshot.forEach(doc=>{

            const app =
            doc.data();

            appFeed.innerHTML += `

            <div class="card">

                <img
                src="${app.appImage}"
                alt="${app.appName}">

                <div class="card-body">

                    <h3>
                    ${app.appName}
                    </h3>

                    <p class="small">

                    Developer:
                    ${app.developerName}

                    </p>

                    <p class="small">

                    Category:
                    ${app.category}

                    </p>

                    <p class="small">

                    ${app.description}

                    </p>

                    <p class="price">

                    ₦${app.price}

                    </p>

                    ${
                        app.featured
                        ?

                        `
                        <p
                        style="
                        color:gold;
                        font-weight:bold;
                        ">
                        ⭐ Featured App
                        </p>
                        `

                        :

                        ""
                    }

                    <button
                    onclick="
                    downloadApp(
                    '${doc.id}',
                    '${app.appLink}'
                    )
                    ">

                    Download App

                    </button>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   DOWNLOAD APP
========================================== */

function downloadApp(
appId,
appLink
){

    db.collection("apps")
    .doc(appId)
    .update({

        downloads:
        firebase.firestore
        .FieldValue
        .increment(1)

    })

    .then(()=>{

        window.open(
        appLink,
        "_blank"
        );

    })

    .catch(error=>{

        console.log(error);

    });

}

/* ==========================================
   FEATURE APP
========================================== */

function featureApp(appId){

    db.collection("apps")
    .doc(appId)
    .update({

        featured:true

    })

    .then(()=>{

        alert(
        "Application Featured"
        );

    });

}

/* ==========================================
   REMOVE FEATURED STATUS
========================================== */

function unfeatureApp(appId){

    db.collection("apps")
    .doc(appId)
    .update({

        featured:false

    })

    .then(()=>{

        alert(
        "Featured Status Removed"
        );

    });

}

/* ==========================================
   LOAD FEATURED APPS
========================================== */

function loadFeaturedApps(){

    const container =
    document.getElementById(
    "featuredApps"
    );

    if(!container) return;

    db.collection("apps")
    .where(
    "featured",
    "==",
    true
    )
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const app =
            doc.data();

            container.innerHTML += `

            <div class="card">

                <img
                src="${app.appImage}">

                <div class="card-body">

                    <h3>

                    ⭐ ${app.appName}

                    </h3>

                    <p class="small">

                    ${app.description}

                    </p>

                    <button
                    onclick="
                    downloadApp(
                    '${doc.id}',
                    '${app.appLink}'
                    )
                    ">

                    Download

                    </button>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   APP ANALYTICS
========================================== */

function loadAppAnalytics(){

    const totalApps =
    document.getElementById(
    "totalApps"
    );

    const totalDownloads =
    document.getElementById(
    "totalDownloads"
    );

    db.collection("apps")
    .onSnapshot(snapshot=>{

        let downloads = 0;

        snapshot.forEach(doc=>{

            const app =
            doc.data();

            downloads +=
            Number(
            app.downloads || 0
            );

        });

        if(totalApps){

            totalApps.innerText =
            snapshot.size;

        }

        if(totalDownloads){

            totalDownloads.innerText =
            downloads;

        }

    });

}

/* ==========================================
   SEARCH APPS
========================================== */

function searchApps(value){

    const keyword =
    value.toLowerCase();

    const cards =
    document.querySelectorAll(
    "#appFeed .card"
    );

    cards.forEach(card=>{

        const title =
        card.querySelector("h3")
        .innerText
        .toLowerCase();

        card.style.display =

        title.includes(keyword)

        ?

        "block"

        :

        "none";

    });

}

/* ==========================================
   APP NOTIFICATIONS
========================================== */

function notifyNewApp(
appName
){

    db.collection(
    "notifications"
    )
    .add({

        title:
        "📱 New App Added",

        message:
        appName +
        " is now available in the marketplace.",

        createdAt:
        firebase.firestore
        .FieldValue
        .serverTimestamp()

    });

}
/* ==========================================
   NOTIFICATION SYSTEM
========================================== */

/* ==========================================
   SHOW NOTIFICATIONS PAGE
========================================== */

function showNotifications(){

    showPage(
    "notificationPage"
    );

    loadNotifications();

}

/* ==========================================
   LOAD NOTIFICATIONS
========================================== */

function loadNotifications(){

    const feed =
    document.getElementById(
    "notificationFeed"
    );

    if(!feed) return;

    db.collection(
    "notifications"
    )
    .orderBy(
    "createdAt",
    "desc"
    )
    .onSnapshot(snapshot=>{

        feed.innerHTML = "";

        let count = 0;

        snapshot.forEach(doc=>{

            const data =
            doc.data();

            count++;

            feed.innerHTML += `

            <div
            style="
            background:#111;
            padding:15px;
            border-radius:14px;
            border:1px solid rgba(255,215,0,.2);
            margin-bottom:10px;
            ">

                <h3
                style="
                color:gold;
                ">
                ${data.title}
                </h3>

                <p
                style="
                margin-top:8px;
                ">
                ${data.message}
                </p>

            </div>

            `;

        });

        updateNotificationBadge(
        count
        );

    });

}

/* ==========================================
   NOTIFICATION BADGE
========================================== */

function updateNotificationBadge(
count
){

    const badge =
    document.getElementById(
    "notificationCount"
    );

    if(!badge) return;

    if(count > 0){

        badge.style.display =
        "block";

        badge.innerText =
        count;

    }else{

        badge.style.display =
        "none";

    }

}

/* ==========================================
   CREATE NOTIFICATION
========================================== */

function createNotification(
title,
message
){

    db.collection(
    "notifications"
    )
    .add({

        title,
        message,

        createdAt:
        firebase.firestore
        .FieldValue
        .serverTimestamp()

    });

}

/* ==========================================
   PRODUCT DEAL ALERT
========================================== */

function sendDealNotification(
title,
price
){

    createNotification(

        "🔥 New Deal Alert",

        `${title} is now available for ₦${price}`

    );

}

/* ==========================================
   APP ALERT
========================================== */

function sendAppNotification(
appName
){

    createNotification(

        "📱 New App Added",

        `${appName} is now available in the App Marketplace`

    );

}

/* ==========================================
   FREELANCER ALERT
========================================== */

function sendFreelancerNotification(
name
){

    createNotification(

        "👨‍💻 New Freelancer",

        `${name} joined the marketplace`

    );

}

/* ==========================================
   ORDER ALERT
========================================== */

function sendOrderNotification(
orderName
){

    createNotification(

        "🛒 New Order",

        `${orderName} order has been created`

    );

}

/* ==========================================
   PAYMENT RELEASE ALERT
========================================== */

function sendPaymentNotification(
freelancerName
){

    createNotification(

        "✅ Payment Released",

        `Payment released to ${freelancerName}`

    );

}

/* ==========================================
   BROWSER NOTIFICATIONS
========================================== */

function requestBrowserNotifications(){

    if(!("Notification" in window)){

        return;

    }

    if(
        Notification.permission
        !==
        "granted"
    ){

        Notification
        .requestPermission();

    }

}

/* ==========================================
   SHOW BROWSER NOTIFICATION
========================================== */

function showBrowserNotification(
title,
message
){

    if(
        Notification.permission
        ===
        "granted"
    ){

        new Notification(
        title,
        {
            body:message,
            icon:"logo.png"
        });

    }

}

/* ==========================================
   REALTIME NOTIFICATION LISTENER
========================================== */

function startRealtimeNotifications(){

    db.collection(
    "notifications"
    )
    .orderBy(
    "createdAt",
    "desc"
    )
    .limit(1)
    .onSnapshot(snapshot=>{

        snapshot.forEach(doc=>{

            const data =
            doc.data();

            showBrowserNotification(

                data.title,

                data.message

            );

        });

    });

}

/* ==========================================
   ENABLE PUSH NOTIFICATIONS
========================================== */

async function enableNotifications(){

    try{

        await Notification
        .requestPermission();

        if(!messaging){

            return;

        }

        const token =
        await messaging
        .getToken({

            vapidKey:
            "YOUR_VAPID_KEY"

        });

        console.log(
        "Notification Token:",
        token
        );

    }

    catch(error){

        console.log(error);

    }

}
/* ==========================================
   FIREBASE MESSAGING
========================================== */

let messaging = null;

try{

    if(firebase.messaging){

        messaging =
        firebase.messaging();

    }

}catch(error){

    console.log(
    "Messaging not available",
    error
    );

}
/* ==========================================
   RECEIVE PUSH NOTIFICATIONS
========================================== */

if(messaging){

    messaging.onMessage(
    payload=>{

        console.log(
        "Push Notification:",
        payload
        );

        showBrowserNotification(

            payload.notification.title,

            payload.notification.body

        );

    });

}

/* ==========================================
   CONVERSATION ALERT
========================================== */

function notifyNewMessage(
sender,
message
){

    createNotification(

        "💬 New Message",

        `${sender}: ${message}`

    );

}

/* ==========================================
   CLEAR ALL NOTIFICATIONS
========================================== */

async function clearNotifications(){

    const snapshot =
    await db.collection(
    "notifications"
    )
    .get();

    const batch =
    db.batch();

    snapshot.forEach(doc=>{

        batch.delete(
        doc.ref
        );

    });

    await batch.commit();

}

/* ==========================================
   AUTO START NOTIFICATIONS
========================================== */

requestBrowserNotifications();

startRealtimeNotifications();
/* ==========================================
   WALLET SYSTEM
========================================== */

/* ==========================================
   LOAD WALLET
========================================== */

function loadWallet(){

    const user =
    auth.currentUser;

    if(!user) return;

    db.collection("wallets")
    .doc(user.uid)
    .onSnapshot(doc=>{

        const walletBalance =
        document.getElementById(
        "walletBalance"
        );

        if(!walletBalance) return;

        if(doc.exists){

            const wallet =
            doc.data();

            walletBalance.innerText =
            "₦" +
            (wallet.balance || 0);

        }else{

            db.collection("wallets")
            .doc(user.uid)
            .set({

                balance:0,

                createdAt:
                firebase.firestore
                .FieldValue
                .serverTimestamp()

            });

        }

    });

}

/* ==========================================
   ADD WALLET BALANCE
========================================== */

function addWalletBalance(
userId,
amount
){

    return db.collection(
    "wallets"
    )
    .doc(userId)
    .set({

        balance:
        firebase.firestore
        .FieldValue
        .increment(
        Number(amount)
        )

    },

    {
        merge:true
    });

}

/* ==========================================
   DEDUCT WALLET BALANCE
========================================== */

function deductWalletBalance(
userId,
amount
){

    return db.collection(
    "wallets"
    )
    .doc(userId)
    .set({

        balance:
        firebase.firestore
        .FieldValue
        .increment(
        -Number(amount)
        )

    },

    {
        merge:true
    });

}

/* ==========================================
   WITHDRAW FUNDS
========================================== */

function withdrawWallet(){

    const user =
    auth.currentUser;

    if(!user){

        alert(
        "Please login first"
        );

        return;

    }

    db.collection("wallets")
    .doc(user.uid)
    .get()
    .then(doc=>{

        if(!doc.exists){

            alert(
            "Wallet not found"
            );

            return;
        }

        const wallet =
        doc.data();

        const balance =
        Number(
        wallet.balance || 0
        );

        if(balance <= 0){

            alert(
            "No funds available"
            );

            return;

        }

        db.collection(
        "withdrawals"
        )
        .add({

            userId:user.uid,

            email:user.email,

            amount:balance,

            status:"pending",

            createdAt:
            firebase.firestore
            .FieldValue
            .serverTimestamp()

        });

        alert(
        "Withdrawal request submitted"
        );

    });

}

/* ==========================================
   ESCROW PAYMENT RELEASE
========================================== */

function releasePayment(
orderId,
freelancerId,
amount
){

    addWalletBalance(

        freelancerId,

        amount

    )

    .then(()=>{

        return db.collection(
        "orders"
        )
        .doc(orderId)
        .update({

            status:"completed",

            released:true,

            paymentStatus:
            "released"

        });

    })

    .then(()=>{

        createNotification(

            "✅ Payment Released",

            "Escrow payment released successfully"

        );

        alert(
        "Payment Released"
        );

    })

    .catch(error=>{

        console.log(error);

        alert(
        error.message
        );

    });

}

/* ==========================================
   LOAD REVENUE
========================================== */

function loadRevenue(){

    const revenueBox =
    document.getElementById(
    "totalRevenue"
    );

    if(!revenueBox) return;

    db.collection("orders")
    .where(
        "status",
        "==",
        "completed"
    )
    .onSnapshot(snapshot=>{

        let revenue = 0;

        snapshot.forEach(doc=>{

            const order =
            doc.data();

            revenue +=
            Number(
            order.amount || 0
            );

        });

        revenueBox.innerText =
        "₦" + revenue;

    });

}

/* ==========================================
   APP EARNINGS
========================================== */

function loadAppEarnings(){

    const earningsBox =
    document.getElementById(
    "appEarnings"
    );

    if(!earningsBox) return;

    db.collection("admin")
    .doc("earnings")
    .onSnapshot(doc=>{

        if(!doc.exists){

            earningsBox.innerText =
            "₦0";

            return;
        }

        const data =
        doc.data();

        earningsBox.innerText =

        "₦" +

        (
            data.total || 0
        );

    });

}

/* ==========================================
   ADD APP COMMISSION
========================================== */

function addAppCommission(
amount
){

    db.collection("admin")
    .doc("earnings")
    .set({

        total:
        firebase.firestore
        .FieldValue
        .increment(
        Number(amount)
        )

    },

    {
        merge:true
    });

}

/* ==========================================
   SELLER SUBSCRIPTIONS
========================================== */

function loadSubscriptions(){

    const box =
    document.getElementById(
    "subscriptionCount"
    );

    if(!box) return;

    db.collection(
    "subscriptions"
    )
    .onSnapshot(snapshot=>{

        box.innerText =
        snapshot.size;

    });

}

/* ==========================================
   TOTAL WITHDRAWALS
========================================== */

function loadWithdrawals(){

    const box =
    document.getElementById(
    "withdrawalCount"
    );

    if(!box) return;

    db.collection(
    "withdrawals"
    )
    .onSnapshot(snapshot=>{

        box.innerText =
        snapshot.size;

    });

}

/* ==========================================
   ADMIN DASHBOARD STATS
========================================== */

function loadAdminRevenueDashboard(){

    loadRevenue();

    loadAppEarnings();

    loadSubscriptions();

    loadWithdrawals();

}

/* ==========================================
   FREELANCER EARNINGS
========================================== */

function loadFreelancerEarnings(){

    const earnings =
    document.getElementById(
    "freelancerEarnings"
    );

    if(!earnings) return;

    const user =
    auth.currentUser;

    if(!user) return;

    db.collection("wallets")
    .doc(user.uid)
    .onSnapshot(doc=>{

        if(doc.exists){

            const wallet =
            doc.data();

            earnings.innerHTML = `

            <h2>
            Total Earnings:
            ₦${wallet.balance || 0}
            </h2>

            `;

        }

    });

}

/* ==========================================
   AUTO LOAD
========================================== */

setTimeout(()=>{

    loadWallet();

    loadRevenue();

    loadAppEarnings();

},1000);
/* ==========================================
   ANALYTICS DASHBOARD
========================================== */

/* ==========================================
   LOAD ADMIN ANALYTICS
========================================== */

function loadAdminAnalytics(){

    loadTotalProducts();
    loadTotalFreelancers();
    loadTotalApps();
    loadTotalOrders();
    loadTotalRevenue();
    loadAffiliateClicks();

}

/* ==========================================
   TOTAL PRODUCTS
========================================== */

function loadTotalProducts(){

    const element =
    document.getElementById(
    "totalProducts"
    );

    if(!element) return;

    db.collection("items")
    .onSnapshot(snapshot=>{

        element.innerText =
        snapshot.size;

    });

}

/* ==========================================
   TOTAL FREELANCERS
========================================== */

function loadTotalFreelancers(){

    const element =
    document.getElementById(
    "totalFreelancers"
    );

    if(!element) return;

    db.collection("freelancers")
    .onSnapshot(snapshot=>{

        element.innerText =
        snapshot.size;

    });

}

/* ==========================================
   TOTAL APPS
========================================== */

function loadTotalApps(){

    const element =
    document.getElementById(
    "totalApps"
    );

    if(!element) return;

    db.collection("apps")
    .onSnapshot(snapshot=>{

        element.innerText =
        snapshot.size;

    });

}

/* ==========================================
   TOTAL ORDERS
========================================== */

function loadTotalOrders(){

    const element =
    document.getElementById(
    "totalOrders"
    );

    if(!element) return;

    db.collection("orders")
    .onSnapshot(snapshot=>{

        element.innerText =
        snapshot.size;

    });

}

/* ==========================================
   TOTAL REVENUE
========================================== */

function loadTotalRevenue(){

    const element =
    document.getElementById(
    "totalRevenue"
    );

    if(!element) return;

    db.collection("orders")
    .where(
        "status",
        "==",
        "completed"
    )
    .onSnapshot(snapshot=>{

        let revenue = 0;

        snapshot.forEach(doc=>{

            const order =
            doc.data();

            revenue +=
            Number(
            order.amount || 0
            );

        });

        element.innerText =
        "₦" + revenue;

    });

}

/* ==========================================
   AFFILIATE CLICKS
========================================== */

function loadAffiliateClicks(){

    const element =
    document.getElementById(
    "totalClicks"
    );

    if(!element) return;

    db.collection("affiliateAds")
    .onSnapshot(snapshot=>{

        let clicks = 0;

        snapshot.forEach(doc=>{

            const ad =
            doc.data();

            clicks +=
            Number(
            ad.clicks || 0
            );

        });

        element.innerText =
        clicks;

    });

}

/* ==========================================
   CHART.JS ANALYTICS GRAPH
========================================== */

let analyticsChart = null;

function loadAnalyticsChart(){

    const canvas =
    document.getElementById(
    "analyticsChart"
    );

    if(!canvas){

        return;

    }

    Promise.all([

        db.collection("items").get(),

        db.collection("freelancers").get(),

        db.collection("apps").get(),

        db.collection("orders").get()

    ])

    .then(results=>{

        const products =
        results[0].size;

        const freelancers =
        results[1].size;

        const apps =
        results[2].size;

        const orders =
        results[3].size;

        if(analyticsChart){

            analyticsChart.destroy();

        }

        analyticsChart = new Chart(canvas,{

            type:"bar",

            data:{

                labels:[

                    "Products",

                    "Freelancers",

                    "Apps",

                    "Orders"

                ],

                datasets:[{

                    label:
                    "Marketplace Stats",

                    data:[

                        products,

                        freelancers,

                        apps,

                        orders

                    ]

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
/* ==========================================
   PRODUCT CATEGORY REPORT
========================================== */

function loadCategoryReport(){

    db.collection("apps")
    .get()
    .then(snapshot=>{

        const categories = {};

        snapshot.forEach(doc=>{

            const app =
            doc.data();

            const category =
            app.category ||
            "Other";

            categories[
            category
            ] =

            (
                categories[
                category
                ] || 0
            ) + 1;

        });

        console.log(
        "Category Report",
        categories
        );

    });

}

/* ==========================================
   TOP SELLING PRODUCTS
========================================== */

function loadTopProducts(){

    db.collection("items")
    .limit(10)
    .get()
    .then(snapshot=>{

        console.log(
        "Top Products:",
        snapshot.size
        );

    });

}

/* ==========================================
   TOP FREELANCERS
========================================== */

function loadTopFreelancers(){

    db.collection("freelancers")
    .get()
    .then(snapshot=>{

        console.log(
        "Top Freelancers:",
        snapshot.size
        );

    });

}

/* ==========================================
   AFFILIATE PERFORMANCE REPORT
========================================== */

function affiliateReport(){

    db.collection("affiliateAds")
    .get()
    .then(snapshot=>{

        let totalClicks = 0;
        let totalImpressions = 0;

        snapshot.forEach(doc=>{

            const ad =
            doc.data();

            totalClicks +=
            Number(
            ad.clicks || 0
            );

            totalImpressions +=
            Number(
            ad.impressions || 0
            );

        });

        console.log({

            totalClicks,

            totalImpressions

        });

    });

}

/* ==========================================
   MARKETPLACE SUMMARY REPORT
========================================== */

function generateMarketplaceReport(){

    Promise.all([

        db.collection("items").get(),

        db.collection("freelancers").get(),

        db.collection("apps").get(),

        db.collection("orders").get()

    ])

    .then(results=>{

        const report = {

            products:
            results[0].size,

            freelancers:
            results[1].size,

            apps:
            results[2].size,

            orders:
            results[3].size

        };

        console.log(
        "Marketplace Report",
        report
        );

    });

}

/* ==========================================
   AUTO REFRESH ANALYTICS
========================================== */

setInterval(()=>{

    loadAdminAnalytics();

},30000);

/* ==========================================
   AUTO START
========================================== */

setTimeout(()=>{

    loadAdminAnalytics();

    loadAnalyticsChart();

    loadCategoryReport();

},1500);
/* ==========================================
   SELLER DASHBOARD
========================================== */

function openSellerDashboard(){

    showPage(
    "sellerDashboard"
    );

    loadSellerStats();
    loadSellerProducts();
    loadSellerSubscription();

}

/* ==========================================
   CREATE SELLER PROFILE
========================================== */

async function createSellerProfile(){

    const user =
    auth.currentUser;

    if(!user){

        alert(
        "Please login first"
        );

        return;
    }

    const sellerName =
    document.getElementById(
    "sellerProfileName"
    )?.value || "";

    const sellerBio =
    document.getElementById(
    "sellerProfileBio"
    )?.value || "";

    const sellerImage =
    document.getElementById(
    "sellerProfileImage"
    )?.value || "";

    try{

        await db.collection(
        "sellers"
        )
        .doc(user.uid)
        .set({

            uid:user.uid,

            email:user.email,

            name:sellerName,

            bio:sellerBio,

            image:sellerImage,

            verified:false,

            sponsored:false,

            createdAt:
            firebase.firestore
            .FieldValue
            .serverTimestamp()

        });

        alert(
        "Seller profile created"
        );

    }catch(error){

        console.log(error);
        alert(error.message);

    }

}

/* ==========================================
   LOAD SELLER PROFILE
========================================== */

function loadCurrentSellerProfile(){

    const user =
    auth.currentUser;

    if(!user) return;

    db.collection("sellers")
    .doc(user.uid)
    .get()
    .then(doc=>{

        if(!doc.exists){

            return;
        }

        const seller =
        doc.data();

        const box =
        document.getElementById(
        "sellerProfileInfo"
        );

        if(!box) return;

        box.innerHTML = `

        <div class="profile-box">

            <img
            src="${seller.image || ''}"
            style="
            width:100px;
            height:100px;
            border-radius:50%;
            object-fit:cover;
            ">

            <h2>
            ${seller.name || ""}
            </h2>

            <p>
            ${seller.bio || ""}
            </p>

            <p>
            ${seller.email || ""}
            </p>

        </div>

        `;

    });

}

/* ==========================================
   LOAD SELLER PRODUCTS
========================================== */

function loadSellerProducts(){

    const user =
    auth.currentUser;

    if(!user) return;

    const container =
    document.getElementById(
    "sellerProductsFeed"
    );

    if(!container) return;

    db.collection("items")
    .where(
        "seller",
        "==",
        user.email
    )
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const item =
            doc.data();

            container.innerHTML += `

            <div class="card">

                <img
                src="${item.imageUrl}">

                <div class="card-body">

                    <h3>
                    ${item.title}
                    </h3>

                    <p class="price">
                    ₦${item.price}
                    </p>

                    <button
                    onclick="deleteProduct(
                    '${doc.id}'
                    )">

                    Delete

                    </button>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   DELETE PRODUCT
========================================== */

async function deleteProduct(
productId
){

    const confirmDelete =
    confirm(
    "Delete this product?"
    );

    if(!confirmDelete){

        return;
    }

    try{

        await db.collection(
        "items"
        )
        .doc(productId)
        .delete();

        alert(
        "Product deleted"
        );

    }catch(error){

        console.log(error);
        alert(error.message);

    }

}

/* ==========================================
   SELLER STATS
========================================== */

function loadSellerStats(){

    const user =
    auth.currentUser;

    if(!user) return;

    db.collection("items")
    .where(
        "seller",
        "==",
        user.email
    )
    .get()
    .then(snapshot=>{

        const totalProducts =
        document.getElementById(
        "sellerTotalProducts"
        );

        if(totalProducts){

            totalProducts.innerText =
            snapshot.size;

        }

    });

}

/* ==========================================
   VERIFY SELLER
========================================== */

async function verifySeller(
sellerId
){

    try{

        await db.collection(
        "sellers"
        )
        .doc(sellerId)
        .update({

            verified:true

        });

        alert(
        "Seller verified"
        );

    }catch(error){

        console.log(error);
        alert(error.message);

    }

}

/* ==========================================
   SPONSOR SELLER
========================================== */

async function sponsorSeller(
sellerId
){

    try{

        await db.collection(
        "sellers"
        )
        .doc(sellerId)
        .update({

            sponsored:true

        });

        alert(
        "Seller sponsored"
        );

    }catch(error){

        console.log(error);
        alert(error.message);

    }

}

/* ==========================================
   LOAD SUBSCRIPTION STATUS
========================================== */

function loadSellerSubscription(){

    const user =
    auth.currentUser;

    if(!user) return;

    const box =
    document.getElementById(
    "sellerSubscriptionStatus"
    );

    if(!box) return;

    db.collection("subscriptions")
    .where(
        "email",
        "==",
        user.email
    )
    .get()
    .then(snapshot=>{

        if(snapshot.empty){

            box.innerHTML =

            "Free Plan";

            return;

        }

        box.innerHTML =

        "Premium Seller";

    });

}

/* ==========================================
   FEATURE PRODUCT
========================================== */

async function featureProduct(
productId
){

    try{

        await db.collection(
        "items"
        )
        .doc(productId)
        .update({

            featured:true

        });

        alert(
        "Product featured"
        );

    }catch(error){

        console.log(error);
        alert(error.message);

    }

}

/* ==========================================
   LOAD FEATURED PRODUCTS
========================================== */

function loadFeaturedProducts(){

    db.collection("items")
    .where(
        "featured",
        "==",
        true
    )
    .get()
    .then(snapshot=>{

        console.log(
        "Featured Products:",
        snapshot.size
        );

    });

}

/* ==========================================
   SELLER SALES STATS
========================================== */

function loadSellerSales(){

    const user =
    auth.currentUser;

    if(!user) return;

    db.collection("orders")
    .where(
        "seller",
        "==",
        user.email
    )
    .get()
    .then(snapshot=>{

        let sales = 0;

        snapshot.forEach(doc=>{

            const order =
            doc.data();

            sales +=
            Number(
            order.totalPaid || 0
            );

        });

        const salesBox =
        document.getElementById(
        "sellerSales"
        );

        if(salesBox){

            salesBox.innerText =
            "₦" + sales;

        }

    });

}

/* ==========================================
   AUTO LOAD
========================================== */

setTimeout(()=>{

    loadCurrentSellerProfile();
    loadSellerSubscription();
    loadSellerSales();

},2000);
/* ==========================================
   ADMIN DASHBOARD
========================================== */

function openAdminDashboard(){

    showPage("adminDashboard");

    loadAdminUsers();
    loadAdminProducts();
    loadAdminApps();
    loadAdminFreelancers();
    loadAdminStats();

}

/* ==========================================
   ADMIN STATS
========================================== */

function loadAdminStats(){

    loadTotalProducts();
    loadTotalFreelancers();
    loadTotalApps();
    loadTotalOrders();
    loadAppEarnings();

}

/* ==========================================
   LOAD USERS
========================================== */

function loadAdminUsers(){

    const container =
    document.getElementById(
    "adminUsersFeed"
    );

    if(!container) return;

    db.collection("users")
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const user =
            doc.data();

            container.innerHTML += `

            <div class="card">

                <div class="card-body">

                    <h3>
                    ${user.name || "User"}
                    </h3>

                    <p>
                    ${user.email || ""}
                    </p>

                    <p>
                    ${user.role || "member"}
                    </p>

                    <button
                    onclick="banUser(
                    '${doc.id}'
                    )">

                    Ban User

                    </button>

                    <button
                    class="alt"
                    onclick="unbanUser(
                    '${doc.id}'
                    )">

                    Unban User

                    </button>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   BAN USER
========================================== */

async function banUser(userId){

    try{

        await db.collection("users")
        .doc(userId)
        .set({

            banned:true

        },

        {
            merge:true
        });

        alert(
        "User banned"
        );

    }catch(error){

        console.log(error);

        alert(error.message);

    }

}

/* ==========================================
   UNBAN USER
========================================== */

async function unbanUser(userId){

    try{

        await db.collection("users")
        .doc(userId)
        .set({

            banned:false

        },

        {
            merge:true
        });

        alert(
        "User unbanned"
        );

    }catch(error){

        console.log(error);

        alert(error.message);

    }

}

/* ==========================================
   LOAD PRODUCTS
========================================== */

function loadAdminProducts(){

    const container =
    document.getElementById(
    "adminProductsFeed"
    );

    if(!container) return;

    db.collection("items")
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const item =
            doc.data();

            container.innerHTML += `

            <div class="card">

                <img
                src="${item.imageUrl}">

                <div class="card-body">

                    <h3>
                    ${item.title}
                    </h3>

                    <p>
                    ₦${item.price}
                    </p>

                    <button
                    onclick="adminDeleteProduct(
                    '${doc.id}'
                    )">

                    Delete Product

                    </button>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   DELETE PRODUCT
========================================== */

async function adminDeleteProduct(
productId
){

    const proceed =
    confirm(
    "Delete this product?"
    );

    if(!proceed) return;

    try{

        await db.collection("items")
        .doc(productId)
        .delete();

        alert(
        "Product deleted"
        );

    }catch(error){

        console.log(error);

        alert(error.message);

    }

}

/* ==========================================
   LOAD APPS
========================================== */

function loadAdminApps(){

    const container =
    document.getElementById(
    "adminAppsFeed"
    );

    if(!container) return;

    db.collection("apps")
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const app =
            doc.data();

            container.innerHTML += `

            <div class="card">

                <img
                src="${app.appImage}">

                <div class="card-body">

                    <h3>
                    ${app.appName}
                    </h3>

                    <p>
                    ${app.developerName}
                    </p>

                    <button
                    onclick="featureApp(
                    '${doc.id}'
                    )">

                    Feature App

                    </button>

                    <button
                    class="alt"
                    onclick="deleteApp(
                    '${doc.id}'
                    )">

                    Delete App

                    </button>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   FEATURE APP
========================================== */

async function featureApp(appId){

    try{

        await db.collection("apps")
        .doc(appId)
        .update({

            featured:true

        });

        alert(
        "App featured"
        );

    }catch(error){

        console.log(error);

        alert(error.message);

    }

}

/* ==========================================
   DELETE APP
========================================== */

async function deleteApp(appId){

    try{

        await db.collection("apps")
        .doc(appId)
        .delete();

        alert(
        "App deleted"
        );

    }catch(error){

        console.log(error);

        alert(error.message);

    }

}

/* ==========================================
   LOAD FREELANCERS
========================================== */

function loadAdminFreelancers(){

    const container =
    document.getElementById(
    "adminFreelancersFeed"
    );

    if(!container) return;

    db.collection("freelancers")
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const freelancer =
            doc.data();

            container.innerHTML += `

            <div class="card">

                <div class="card-body">

                    <h3>
                    ${freelancer.name}
                    </h3>

                    <p>
                    ${freelancer.skill}
                    </p>

                    <button
                    onclick="approveFreelancer(
                    '${doc.id}'
                    )">

                    Verify

                    </button>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   APPROVE FREELANCER
========================================== */

async function approveFreelancer(
freelancerId
){

    try{

        await db.collection(
        "freelancers"
        )
        .doc(freelancerId)
        .update({

            verified:true

        });

        alert(
        "Freelancer approved"
        );

    }catch(error){

        console.log(error);

        alert(error.message);

    }

}

/* ==========================================
   SEND ADMIN NOTIFICATION
========================================== */

function sendAdminNotification(
title,
message
){

    db.collection(
    "notifications"
    )
    .add({

        title,
        message,

        createdAt:
        firebase.firestore
        .FieldValue
        .serverTimestamp()

    });

}

/* ==========================================
   ADMIN MARKETPLACE REPORT
========================================== */

function generateAdminReport(){

    Promise.all([

        db.collection("users").get(),

        db.collection("items").get(),

        db.collection("apps").get(),

        db.collection("freelancers").get(),

        db.collection("orders").get()

    ])

    .then(results=>{

        console.log({

            users:
            results[0].size,

            products:
            results[1].size,

            apps:
            results[2].size,

            freelancers:
            results[3].size,

            orders:
            results[4].size

        });

    });

}

/* ==========================================
   AUTO LOAD ADMIN DATA
========================================== */

setTimeout(()=>{

    generateAdminReport();

},2500);


/* ==========================================
   ENABLE PUSH NOTIFICATIONS
========================================== */

async function enableNotifications(){

    try{

        if(
            !("Notification" in window)
        ){

            return;
        }

        const permission =
        await Notification
        .requestPermission();

        if(
            permission !== "granted"
        ){

            return;
        }

        if(messaging){

            const token =
            await messaging.getToken();

            console.log(
            "FCM Token:",
            token
            );

        }

    }catch(error){

        console.log(error);

    }

}

/* ==========================================
   REALTIME IN-APP NOTIFICATIONS
========================================== */

function startRealtimeNotifications(){

    db.collection("notifications")
    .orderBy(
        "createdAt",
        "desc"
    )
    .limit(1)
    .onSnapshot(snapshot=>{

        snapshot.forEach(doc=>{

            const data =
            doc.data();

            showNotificationPopup(

                data.title,

                data.message

            );

        });

    });

}
/* OPEN CANVAS EDITOR */

function openCanvasEditor() {

    console.log("openCanvasEditor is running");

    const area =
    document.getElementById("toolContent");

    console.log(area);

    if (!area) return;

    console.log("Writing HTML into toolContent");

    area.innerHTML = `

<h2 style="color:gold;">
    Flyer Designer
</h2>

<canvas
    id="flyerCanvas"
    width="900"
    height="600"
    style="
        border:2px solid gold;
        background:white;
        max-width:100%;
    ">
</canvas>

<br>

<button onclick="addTextToCanvas()">
    Add Text
</button>

<button onclick="addRectangle()">
    Add Shape
</button>

<input type="file" id="imageUpload">

`;

    console.log("HTML inserted");

    console.log(
        document.getElementById("flyerCanvas")
    );

    setTimeout(() => {

        try {

            window.canvas =
            new fabric.Canvas("flyerCanvas");

            console.log("Fabric canvas created");

        } catch(error) {

            console.error(
                "Fabric Error:",
                error
            );

        }

    },300);

}
/* IMAGE UPLOAD */

document.addEventListener("change", function(e){

    if(e.target.id === "imageUpload"){

        const file =
        e.target.files[0];

        if(!file) return;

        const reader =
        new FileReader();

        reader.onload = function(event){

            fabric.Image.fromURL(
                event.target.result,
                function(img){

                    canvas.add(img);

                    refreshLayers();

                }
            );

        };

        reader.readAsDataURL(file);

    }

});


/* ==========================================
   NOTIFICATION POPUP
========================================== */

function showNotificationPopup(
title,
message
){

    const popup =
    document.createElement("div");

    popup.style.position =
    "fixed";

    popup.style.top =
    "20px";

    popup.style.right =
    "20px";

    popup.style.zIndex =
    "999999";

    popup.style.background =
    "#111";

    popup.style.color =
    "white";

    popup.style.padding =
    "15px";

    popup.style.border =
    "1px solid gold";

    popup.style.borderRadius =
    "12px";

    popup.style.maxWidth =
    "300px";

    popup.innerHTML = `

        <h4 style="color:gold;">
        ${title}
        </h4>

        <p>
        ${message}
        </p>

    `;

    document.body.appendChild(
    popup
    );

    setTimeout(()=>{

        popup.remove();

    },5000);

}

/* ==========================================
   CREATE ADVERTISEMENT
========================================== */

async function createSponsoredAd(){

    const title =
    document.getElementById(
    "adTitle"
    )?.value;

    const description =
    document.getElementById(
    "adDescription"
    )?.value;

    const image =
    document.getElementById(
    "adImage"
    )?.value;

    const link =
    document.getElementById(
    "adLink"
    )?.value;

    if(
        !title ||
        !description ||
        !image ||
        !link
    ){

        alert(
        "Fill all fields"
        );

        return;
    }

    try{

        await db.collection(
        "sponsoredAds"
        )
        .add({

            title,
            description,
            image,
            link,

            clicks:0,

            impressions:0,

            active:true,

            createdAt:
            firebase.firestore
            .FieldValue
            .serverTimestamp()

        });

        alert(
        "Advertisement created"
        );

    }catch(error){

        console.log(error);

        alert(error.message);

    }

}

/* ==========================================
   LOAD FEATURED ADS
========================================== */

function loadFeaturedAds(){

    const container =
    document.getElementById(
    "featuredAdsFeed"
    );

    if(!container) return;

    db.collection("sponsoredAds")
    .where(
        "active",
        "==",
        true
    )
    .onSnapshot(snapshot=>{

        container.innerHTML = "";

        snapshot.forEach(doc=>{

            const ad =
            doc.data();

            trackAdImpression(
            doc.id
            );

            container.innerHTML += `

            <div class="card">

                <img
                src="${ad.image}">

                <div class="card-body">

                    <h3>
                    ${ad.title}
                    </h3>

                    <p>
                    ${ad.description}
                    </p>

                    <button
                    onclick="openSponsoredAd(
                    '${doc.id}',
                    '${ad.link}'
                    )">

                    View Offer

                    </button>

                </div>

            </div>

            `;

        });

    });

}

/* ==========================================
   OPEN AD
========================================== */

async function openSponsoredAd(
adId,
link
){

    try{

        await db.collection(
        "sponsoredAds"
        )
        .doc(adId)
        .update({

            clicks:
            firebase.firestore
            .FieldValue
            .increment(1)

        });

        window.open(
        link,
        "_blank"
        );

    }catch(error){

        console.log(error);

    }

}

/* ==========================================
   TRACK IMPRESSION
========================================== */

function trackAdImpression(
adId
){

    db.collection(
    "sponsoredAds"
    )
    .doc(adId)
    .update({

        impressions:
        firebase.firestore
        .FieldValue
        .increment(1)

    });

}

/* ==========================================
   ADVERTISEMENT PAYMENT
========================================== */

function payForAdvertisement(){

    const user =
    auth.currentUser;

    if(!user){

        alert(
        "Login required"
        );

        return;
    }

    FlutterwaveCheckout({

        public_key:
        "FLWPUBK-5c799a7def902df5408063221cd6c39a-X",

        tx_ref:
        "AD-" +
        Date.now(),

        amount:5000,

        currency:"NGN",

        customer:{

            email:user.email,

            name:user.email

        },

        customizations:{

            title:
            "Advertisement Payment",

            description:
            "Featured Advertisement"

        },

        callback:function(){

            alert(
            "Advertisement payment successful"
            );

        }

    });

}

/* ==========================================
   PROMOTE PRODUCT
========================================== */

async function promoteProduct(
productId
){

    try{

        await db.collection(
        "items"
        )
        .doc(productId)
        .update({

            featured:true,

            promoted:true

        });

        alert(
        "Product promoted"
        );

    }catch(error){

        console.log(error);

    }

}

/* ==========================================
   AFFILIATE PERFORMANCE
========================================== */

function loadAffiliateAnalytics(){

    const clickBox =
    document.getElementById(
    "affiliateClicks"
    );

    const impressionBox =
    document.getElementById(
    "affiliateImpressions"
    );

    db.collection(
    "affiliateAds"
    )
    .onSnapshot(snapshot=>{

        let clicks = 0;
        let impressions = 0;

        snapshot.forEach(doc=>{

            const ad =
            doc.data();

            clicks +=
            Number(
            ad.clicks || 0
            );

            impressions +=
            Number(
            ad.impressions || 0
            );

        });

        if(clickBox){

            clickBox.innerText =
            clicks;

        }

        if(impressionBox){

            impressionBox.innerText =
            impressions;

        }

    });

}

/* ==========================================
   AUTO LOAD
========================================== */

setTimeout(()=>{

    enableNotifications();

    startRealtimeNotifications();

    loadFeaturedAds();

    loadAffiliateAnalytics();

},3000);
/* =========================
   SECTION O
   CREATOR TOOLS
========================= */

/* ─────────────────────────────────────
   KARMA AD MAKER URL
   Change this one line when you deploy
───────────────────────────────────── */
const AD_MAKER_URL = "https://karmas-tools.vercel.app";

/* OPEN AD MAKER — takes user directly to Karma Ad Maker */
function openAdMaker() {
  window.location.href = AD_MAKER_URL;
}

/* OPEN CANVAS EDITOR — same as Ad Maker */
function openCanvasEditor() {
  window.location.href = AD_MAKER_URL;
}

/* OPEN BANNER MAKER — same as Ad Maker */
function openBannerMaker() {
  window.location.href = AD_MAKER_URL;
}

/* OPEN ANIMATION STUDIO — same as Ad Maker */
function openAnimationStudio() {
  window.location.href = AD_MAKER_URL;
}

/* LOAD TEMPLATE 1 — Restaurant */
function loadTemplate1() {
  window.location.href = AD_MAKER_URL;
}

/* LOAD TEMPLATE 2 — Business */
function loadTemplate2() {
  window.location.href = AD_MAKER_URL;
}

/* OPEN LOGO MAKER */
function openLogoMaker() {
  showPage("logoMakerPage");
}

/* GENERATE LOGO */
function generateLogo() {

  const text =
  document.getElementById("logoText").value;

  document.getElementById("logoPreview").innerHTML = `
    <div style="
      font-size:48px;
      font-weight:bold;
      color:gold;
      padding:20px;
    ">
      ${text}
    </div>
  `;
}

/* AI CONTENT GENERATOR */
function generateAIContent() {

  const area =
  document.getElementById("toolContent");

  area.innerHTML = `
    <h2 style="color:gold;">AI Ad Writer</h2>

    <input
      id="businessName"
      placeholder="Business Name"
      style="width:100%; margin-bottom:10px;"
    >

    <textarea
      id="businessInfo"
      placeholder="Describe your business"
      style="width:100%; height:100px; margin-bottom:10px;"
    ></textarea>

    <button onclick="createAdText()">
      Generate Ad
    </button>

    <div id="generatedAd" style="margin-top:15px;"></div>
  `;
}

/* CREATE AD TEXT */
function createAdText() {

  const name =
  document.getElementById("businessName").value;

  const info =
  document.getElementById("businessInfo").value;

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

/* EXPORT PNG */
function exportPNG() {

  const target =
  document.getElementById("canvasContainer");

  if (!target) return;

  html2canvas(target).then(canvas => {

    const link =
    document.createElement("a");

    link.download = "flyer.png";
    link.href = canvas.toDataURL();
    link.click();

  });
}

/* EXPORT PDF */
async function exportPDF() {

  const target =
  document.getElementById("canvasContainer");

  if (!target) return;

  const canvasImage =
  await html2canvas(target);

  const image =
  canvasImage.toDataURL("image/png");

  const pdf = new jspdf.jsPDF();

  pdf.addImage(image, "PNG", 10, 10, 180, 100);

  pdf.save("karmas-market-design.pdf");
}

/* REFRESH LAYERS */
function refreshLayers() {

  const panel =
  document.getElementById("layerPanel");

  if (!panel || !window.canvas) return;

  panel.innerHTML = "";

  canvas.getObjects().forEach((obj, index) => {

    panel.innerHTML += `
      <div>Layer ${index + 1}</div>
    `;

  });
}

/* GENERATE QUICK AD */
function generateAd() {

  const business =
  document.getElementById("aiPrompt").value;

  document.getElementById("aiResult").value =
`🚀 ${business}

Looking for quality service?

Contact us today.

Limited-time offer available.

Act now!`;
}

/* VIDEO PREVIEW */
function previewVideo() {

  const file =
  document.getElementById("videoUpload")
  .files[0];

  if (!file) return;

  const url = URL.createObjectURL(file);

  document.getElementById("videoPreview").src = url;
}

/* LOAD TEMPLATES FROM FIREBASE */
function loadTemplates() {

  const feed =
  document.getElementById("templateFeed");

  if (!feed) return;

  feed.innerHTML = "";

  db.collection("templates").get().then(snapshot => {

    snapshot.forEach(doc => {

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
/* =========================
   AUTO LOAD APP
========================= */

window.addEventListener("load", () => {

    console.log("Karmas Market Loaded");

    displayItems();

    loadApps();

    loadNotifications();

    loadAffiliateAds();

    loadTemplates();

    loadWallet();

    loadConversations();

    loadAnalyticsChart();

});


/* =========================
   SECTION P
   STARTUP & AUTO LOAD
========================= */

function startRealtimeNotifications() {

    db.collection("notifications")
    .orderBy("createdAt", "desc")
    .limit(1)
    .onSnapshot(snapshot => {

        snapshot.forEach(doc => {

            const data = doc.data();

            if (
                Notification.permission === "granted"
            ) {

                new Notification(
                    data.title || "Karmas Market",
                    {
                        body:
                        data.message ||
                        "New notification"
                    }
                );

            }

        });

    });

}

/* =========================
   INITIALIZE APP
========================= */

function initializeAppData() {

    try {

        if (
            document.getElementById("itemFeed")
        ) {
            displayItems();
        }

        if (
            document.getElementById("appFeed")
        ) {
            loadApps();
        }

        if (
            document.getElementById("notificationFeed")
        ) {
            loadNotifications();
        }

        if (
            document.getElementById("templateFeed")
        ) {
            loadTemplates();
        }

        if (
            document.getElementById("conversationList")
        ) {
            loadConversations();
        }

        if (
            document.getElementById("walletBalance")
        ) {
            loadWallet();
        }

        loadAffiliateAds();

    } catch(error) {

        console.log(
            "Initialization Error:",
            error
        );

    }

}

/* =========================
   REQUEST NOTIFICATIONS
========================= */

async function setupNotifications() {

    try {

        if (
            "Notification" in window
        ) {

            if (
                Notification.permission !==
                "granted"
            ) {

                await Notification
                .requestPermission();

            }

        }

    } catch(error) {

        console.log(error);

    }

}

/* =========================
   WINDOW LOAD
========================= */

window.addEventListener(
    "load",
    async function() {

        console.log(
            "Karmas Market Loaded"
        );

        initializeAppData();

        await setupNotifications();

        try {

            enableNotifications();

        } catch(error) {

            console.log(error);

        }

        try {

            startRealtimeNotifications();

        } catch(error) {

            console.log(error);

        }

        try {

            loadAnalyticsChart();

        } catch(error) {

            console.log(error);

        }

    }
);

/* =========================
   FIREBASE AUTH WATCHER
========================= */

auth.onAuthStateChanged(user => {

    if(user){

        console.log(
            "Logged in:",
            user.email
        );

    } else {

        console.log(
            "User not logged in"
        );

    }

});

/* =========================
   GLOBAL ERROR HANDLER
========================= */

window.addEventListener(
    "error",
    function(event){

        console.log(
            "APP ERROR:",
            event.message
        );

    }
);

console.log(
    "APP JS FULLY LOADED"
);
/* BANNER MAKER */

function openBannerMaker(){

    window.open(
        "https://www.canva.com/",
        "_blank"
    );

}
/* ANIMATION STUDIO */

function openAnimationStudio(){

    window.open(
        "https://www.wickeditor.com/",
        "_blank"
    );

}