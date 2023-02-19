import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import {requestPayment, verifyPayment} from "./payment/paymentController";

admin.initializeApp();
const app = express();

app.get("/", (req, res) => res.status(200).send("Welcome to Mayas Kitchen"));
app.get("/payment/initiate", requestPayment);
app.get("/payment/verify", verifyPayment);

export const api = functions.https.onRequest(app);

export const sendOrderToShop = functions.database
    .ref("/users/{userId}/orders/{new}").onCreate(async (snapshot, context) => {
      const original = snapshot.val();
      await admin.database().ref("/orders/" + context.params.new).set(original);
      return true;
    });
export const sendOrderToHistory = functions.database
    .ref("/orders/{new}").onCreate(async (snapshot, context) => {
      const original = snapshot.val();
      // eslint-disable-next-line max-len
      await admin.firestore().collection("orders").doc(context.params.new).set(original);
      return true;
    });

export const syncOrderChanges = functions.database
    .ref("/orders/{orderKey}").onUpdate(async (change, context) => {
      console.log("Order " + context.params.orderKey + " updated");
      const original = change.after.val();
      if (original == null) {
        return true;
      }
      await admin.database()
          .ref("/users/" + original.contact_uid + "/orders/" + change.after.key)
          .set(original);
      return true;
    });

export const syncOrderChangesForPastOrders = functions.database
    .ref("/orders/{orderKey}").onUpdate(async (change, context) => {
      console.log("Order " + context.params.orderKey + " updated");
      const original = change.after.val();
      if (original == null) {
        return true;
      }
      await admin.firestore()
          .collection("orders")
          .doc()
          .set(original);
      return true;
    });


export const deleteOldOrders = functions.pubsub
    .schedule("0 0 * * *").timeZone("Asia/Kolkata").onRun(async () => {
      console.log("Triggered night event");
      await admin.database().ref("/orders").set(null);

      return true;
    });
