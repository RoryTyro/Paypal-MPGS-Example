const express = require('express');
var request = require('request');
var rp = require('request-promise');
const app = express();
const { v4: uuidv4 } = require('uuid');

const PORT = 3000;
var targetUrl = "";

//PayPal Values
var paypalOrderID = "";

//MPGS Values
var mpgsBaseURL = 'https://test-tyro.mtf.gateway.mastercard.com'
var mpgsVersion = '58'
var mpgsMerchantID = 'PAYPAL_EM'
var mpgsBasicAuth = 'Basic bWVyY2hhbnQuUEFZUEFMX0VNOmU1Y2UxYmZhY2Y3ZmE3YzQxMDhmMTg4OGExNmY2YmIy'
var currentMpgsOrderID = '';
var currentMpgsTransactionID = '';
var mpgsTransactionURL = mpgsBaseURL + '/api/rest/version/' + mpgsVersion + '/merchant/' + mpgsMerchantID + '/order/';


//const payPalClient = require('../Common/payPalClient');
//use this: https://medium.com/adobetech/how-to-combine-rest-api-calls-with-javascript-promises-in-node-js-or-openwhisk-d96cbc10f299

//PayPal transaction functions
var payPal = {
  requestPayPalTransaction: function(req, res) {
    console.log("Requesting PayPal transaction");
    currentMpgsOrderID = uuidv4();
    currentMpgsTransactionID = uuidv4();

    var options = {
      'method': 'PUT',
      'url': mpgsTransactionURL + currentMpgsOrderID + '/transaction/' + currentMpgsTransactionID,
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': mpgsBasicAuth
      },
      body: JSON.stringify({"apiOperation":"INITIATE_BROWSER_PAYMENT","browserPayment":{"operation":"PAY","returnUrl":"https://*/confirm-paypal-transaction","paypal":{"paymentConfirmation":"CONFIRM_AT_PROVIDER"}},"order":{"amount":0.01,"currency":"AUD"},"sourceOfFunds":{"type":"PAYPAL"}})
    
    };
    console.log('sending this: ' + JSON.stringify(options));
    return  rp(options);
  },
  getPaypalOrderID: function(response){
    console.log("Getting paypal order id");
      console.log("The Response is: " + response);
        var objectResponse = JSON.parse(response);
        targetUrl = objectResponse.browserPayment.redirectUrl;
        console.log(targetUrl);
      console.log("inside the function targetUrl is: " + JSON.stringify(targetUrl));
      var options = {
        'method': 'GET',
        'url': targetUrl,
        'simple': false,
        'followRedirect': false,
        'followAllRedirects': false,
        'resolveWithFullResponse': true,
        //'transform': '_include_headers',
        'headers': {
          'Content-Type': 'application/json'
        }
      };
  
     return rp(options);
    },

    respondWithOrderID: function(response, res){
      console.log("extreacting orderID");
      console.log('response = ' + JSON.stringify(response));

      // var location = JSON.stringify(response.headers['location']);
       var location = response.headers['location'];
       console.log('location = ' + location);
       paypalOrderID = location.match(/EC-\w+/)[0];
       console.log("paypalOrderID = " + paypalOrderID);

       return  paypalOrderID;
    },
    retrieveTransactionResult: function(req, res) {
      console.log("retrieving transaction result");
      var options = {
        'method': 'GET',
        'url': mpgsTransactionURL + currentMpgsOrderID + '/transaction/' + currentMpgsTransactionID,
        'headers': {
          'Content-Type': 'application/json',
          'Authorization': mpgsBasicAuth
        }      
      };
      console.log('sending this: ' + JSON.stringify(options));
      return  rp(options);
    },
    respondWithTransactionResult: function(response){
      console.log("responding with transaction response");
      console.log('response = ' + JSON.stringify(response)); 
      var objectResponse = JSON.parse(response);
      result = objectResponse.response.gatewayResponse;
      console.log('transaction result is: ' + result);
      return result;

    }
       
  }


function createPayPalTransaction(req, res) {
  return payPal.requestPayPalTransaction()
    .then(payPal.getPaypalOrderID)
    .then(payPal.respondWithOrderID)
    .then( function(paypalOrderID) {
      console.log("Final paypalOrderID = " + paypalOrderID);

      return res.status(200).json({
      orderID: paypalOrderID
    });
  })
    .catch(function(err){
      // 4. Handle any errors from the call
      console.error(err);
      return res.sendStatus(500);
    });
}

function retrievePayPalResult(req, res,  currentMpgsOrderID, currentMpgsTransactionID) {
  return payPal.retrieveTransactionResult(response, res, currentMpgsOrderID, currentMpgsTransactionID)
    .then(payPal.respondWithTransactionResult(response, res))
    .then( function(){
     return  res.status(200).json({
        result: result
      });
    })
    .catch(function(err){
      // 4. Handle any errors from the call
      console.error(err);
      return res.sendStatus(500);
    });
}

app.post('/create-paypal-transaction', createPayPalTransaction);

//app.get('/retrieve-transaction-result', retrievePayPalResult);


app.get('/retrieve-transaction-result', function (req, res) {
  return payPal.retrieveTransactionResult(req, res, currentMpgsOrderID, currentMpgsTransactionID)
    .then(payPal.respondWithTransactionResult)
    .then( function(){
     return  res.status(200).json({
        result: result
      });
    })
    .catch(function(err){
      // 4. Handle any errors from the call
      console.error(err);
      return res.sendStatus(500);
    });
})


app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));


app.use(express.static('public'));



//personal sandbox account pw      2/7YzNte
// use this for redirect url:
//https://www.paypal.com/checkoutnow/error