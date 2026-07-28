const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// Flutterwave API credentials
const FLW_SECRET_KEY = 'FLWPUBK-1748ab89-bb60-4d85-b918-54bfc755772a ';  // Replace with your LIVE secret key
const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

/**
 * Cloud Function: Process withdrawal requests
 * Triggered when a withdrawal document is created in Firestore
 */
exports.processWithdrawal = functions.firestore
    .document('withdrawals/{withdrawalId}')
    .onCreate(async (snap, context) => {
        
        const withdrawal = snap.data();
        const withdrawalId = context.params.withdrawalId;

        console.log(`Processing withdrawal: ${withdrawalId}`, withdrawal);

        try {
            // Validate withdrawal data
            if (!withdrawal.userId || !withdrawal.amount || !withdrawal.bankAccount || !withdrawal.bankCode || !withdrawal.accountName) {
                throw new Error('Missing required withdrawal fields');
            }

            if (withdrawal.amount < 1000) {
                throw new Error('Minimum withdrawal is ₦1,000');
            }

            // Get user wallet to verify balance
            const walletDoc = await db.collection('wallets').doc(withdrawal.userId).get();
            if (!walletDoc.exists) {
                throw new Error('Wallet not found');
            }

            const wallet = walletDoc.data();
            if (wallet.balance < withdrawal.amount) {
                throw new Error('Insufficient balance');
            }

            // Call Flutterwave Transfer API
            const transferResponse = await axios.post(
                `${FLW_BASE_URL}/transfers`,
                {
                    account_bank: withdrawal.bankCode,
                    account_number: withdrawal.bankAccount,
                    amount: withdrawal.amount,
                    narration: `Karmas Market withdrawal for ${withdrawal.accountName}`,
                    currency: 'NGN',
                    reference: `KM-${withdrawalId}`
                },
                {
                    headers: {
                        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Flutterwave transfer response:', transferResponse.data);

            if (transferResponse.data.status === 'success') {
                // Update withdrawal document as completed
                await db.collection('withdrawals').doc(withdrawalId).update({
                    status: 'completed',
                    transactionId: transferResponse.data.data.id,
                    completedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Deduct from user wallet
                await db.collection('wallets').doc(withdrawal.userId).update({
                    balance: admin.firestore.FieldValue.increment(-withdrawal.amount)
                });

                // Create notification for user
                await db.collection('notifications').add({
                    userId: withdrawal.userId,
                    type: 'withdrawal_completed',
                    title: 'Withdrawal Successful',
                    message: `₦${withdrawal.amount.toLocaleString()} has been transferred to your account`,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    read: false
                });

                console.log(`Withdrawal ${withdrawalId} completed successfully`);

                return { success: true, message: 'Withdrawal processed' };

            } else {
                throw new Error(`Flutterwave error: ${transferResponse.data.message}`);
            }

        } catch (error) {
            console.error(`Withdrawal ${withdrawalId} failed:`, error.message);

            // Mark withdrawal as failed
            await db.collection('withdrawals').doc(withdrawalId).update({
                status: 'failed',
                errorMessage: error.message,
                failedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Notify user of failure
            await db.collection('notifications').add({
                userId: withdrawal.userId,
                type: 'withdrawal_failed',
                title: 'Withdrawal Failed',
                message: `Withdrawal failed: ${error.message}`,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                read: false
            });

            return { success: false, error: error.message };
        }

    });

/**
 * Cloud Function: Get bank list for dropdown
 * Returns list of Nigerian banks for user selection
 */
exports.getBankList = functions.https.onCall(async (data, context) => {
    
    try {
        const response = await axios.get(`${FLW_BASE_URL}/banks/NG`, {
            headers: {
                'Authorization': `Bearer ${FLW_SECRET_KEY}`
            }
        });

        if (response.data.status === 'success') {
            return response.data.data.map(bank => ({
                code: bank.code,
                name: bank.name
            }));
        } else {
            throw new Error('Failed to fetch banks');
        }

    } catch (error) {
        console.error('Bank list fetch error:', error.message);
        throw new functions.https.HttpsError('internal', error.message);
    }

});