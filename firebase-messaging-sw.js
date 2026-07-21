importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyADxrvh97PxTqjkeXKoHP0_XK8HRa8AmpA",
    authDomain: "realistic-market-show.firebaseapp.com",
    projectId: "realistic-market-show",
    storageBucket: "realistic-market-show.firebasestorage.app",
    messagingSenderId: "390618933993",
    appId: "1:390618933993:web:8dc95add0ab530bd171e78"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {

    console.log(
        "[firebase-messaging-sw.js] Received background message ",
        payload
    );

    const notificationTitle =
        payload.notification?.title || "New Notification";

    const notificationOptions = {
        body: payload.notification?.body || "",
        icon: "/favicon.ico"
    };

    self.registration.showNotification(
        notificationTitle,
        notificationOptions
    );

});