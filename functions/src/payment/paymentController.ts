import {Request, Response} from "express";
import https = require("https");
import paytmChecksum = require("paytmchecksum");

const requestPayment = async (req: Request, res: Response) => {
  try {
    const paytmParams = {
      head: {},
      body: {},
    };
    paytmParams.body = {
      "requestType": "Payment",
      "mid": process.env.MERCHANT_ID,
      "websiteName": process.env.WEBSITE,
      "orderId": req.query.order_id,
      "callbackUrl": process.env.CALLBACK_URL,
      "txnAmount": {
        "value": req.query.amount,
        "currency": "INR",
      },
      "userInfo": {
        "custId": req.query.customer_id,
      },
    };

    paytmChecksum.generateSignature(
        JSON.stringify(paytmParams.body), process.env.MERCHANT_KEY)
        .then(function(checksum: string) {
          console.log("generateSignature Returns: " + checksum);
          paytmParams.head = {
            "signature": checksum,
          };

          const postData = JSON.stringify(paytmParams);

          const options = {
            hostname: process.env.HOST_NAME,
            port: 443,
            path: "/theia/api/v1/initiateTransaction?mid=" +
                        process.env.MERCHANT_ID + "&orderId=" +
                        req.query.order_id,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": postData.length,
            },
          };

          let response = "";
          const postReq = https.request(options, function(postRes) {
            postRes.on("data", function(chunk) {
              response += chunk;
            });

            postRes.on("end", function() {
              console.log("Response: ", response);
              res.status(200).send({
                "token": JSON.parse(response).body.txnToken,
              });
            });
          });

          postReq.write(postData);
          postReq.end();
        }).catch(function(error: unknown) {
          console.log(error);
        });
  } catch (error) {
    res.status(500).send(error);
  }
};

const verifyPayment = async (req: Request, res: Response) => {
  try {
    const paytmParams = {
      head: {},
      body: {},
    };

    /* body parameters */
    paytmParams.body = {
      "mid": process.env.MERCHANT_ID,
      "orderId": req.query.order_id,
    };

    // eslint-disable-next-line max-len
    paytmChecksum.generateSignature(JSON.stringify(paytmParams.body), process.env.MERCHANT_KEY).then(function(checksum:string) {
    /* head parameters */
      paytmParams.head = {
        "signature": checksum,
      };

      const postData = JSON.stringify(paytmParams);
      const options = {
        hostname: process.env.HOST_NAME,
        port: 443,
        path: "/v3/order/status",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": postData.length,
        },
      };

      // Set up the request
      let response = "";
      const postReq = https.request(options, function(postRes) {
        postRes.on("data", function(chunk) {
          response += chunk;
        });

        postRes.on("end", function() {
          console.log("Response: ", response);

          res.status(200).send({
            status: JSON.parse(response).body.resultInfo.resultStatus,
          });
        });
      });

      // post the data
      postReq.write(postData);
      postReq.end();
    });
  } catch (error) {
    res.status(500).send(error);
  }
};

export {requestPayment, verifyPayment};
