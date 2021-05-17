const express = require('express');
var request = require('request');
var rp = require('request-promise');
const app = express();
const { v4: uuidv4 } = require('uuid');

const PORT = 3000;
var targetUrl = "";

//PayPal Values
var paypalOrderToken = "";

//MPGS Values
var mpgsBaseURL = 'https://test-tyro.mtf.gateway.mastercard.com'
var mpgsVersion = '58'
var mpgsMerchantID = 'TESTPAYPAL_EM'
var mpgsBasicAuth = 'Basic bWVyY2hhbnQuVEVTVFBBWVBBTF9FTTphNTM0OGRiOWRlOTU0YWY4MGRkZDFjNmZjOGQ5ZGFlNQ=='
//TODO Automate the basic auth header with https://www.npmjs.com/package/basic-authorization-header
//'Basic bWVyY2hhbnQuUEFZUEFMX0VNOmU1Y2UxYmZhY2Y3ZmE3YzQxMDhmMTg4OGExNmY2YmIy'
var currentMpgsOrderID = '';
var currentMpgsTransactionID = '';
var mpgsTransactionURL = mpgsBaseURL + '/api/rest/version/' + mpgsVersion + '/merchant/' + mpgsMerchantID + '/order/';
var completeSBtransactionBaseURL = mpgsBaseURL + '/bpui/pp/in/';

//https://test-tyro.mtf.gateway.mastercard.com/bpui/pp/in/BP-9bc027a9fc10f6bba0b284655b3dc941?action=success&paymentId=PAYID-MBLKIJA9D6760109N016503L&token=EC-4W810525K4764773V&PayerID=GB6K2E6DFBGXC


//const payPalClient = require('../Common/payPalClient');
//session functions
var session = {
  requestSessionId: function() {
    console.log("Requesting sessionId");
    currentMpgsOrderID = uuidv4();
    currentMpgsTransactionID = uuidv4();

    var options = {
      'method': 'POST',
      'url': mpgsTransactionURL + currentMpgsOrderID + '/transaction/' + currentMpgsTransactionID,
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': mpgsBasicAuth
      },
      body: "{}"
    
    };
    console.log('sending this: ' + JSON.stringify(options));
    return  rp(options);
  }


  }


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
      body: JSON.stringify({"apiOperation":"INITIATE_BROWSER_PAYMENT","browserPayment":{"operation":"PAY","returnUrl":"http://localhost:3000/retrieve-transaction-result","paypal":{"paymentConfirmation":"CONFIRM_AT_PROVIDER"}},"order":{"amount":100.09,"currency":"AUD"},"sourceOfFunds":{"type":"PAYPAL"}})
    
    };
    console.log('sending this: ' + JSON.stringify(options));
    return  rp(options);
  },
  getRedirectURL: function(response){
    console.log("Getting paypal redirect URL");
      console.log("The Response is: " + response);
        var objectResponse = JSON.parse(response);
      redirectURL = objectResponse.browserPayment.redirectUrl;
        console.log('The target URL is: ' + redirectURL);
        return redirectURL;
  },
  getBrowserPaymentToken: function(redirectURL){
    console.log("Getting Browser Payment token");
    var browserPaymentToken = redirectURL.match(/BP-\w+/)[0];
    console.log('Browser Payment Token is: ' + browserPaymentToken);
    return browserPaymentToken;
  },
  getPaypalOrderID: function(redirectURL){
    console.log("Getting paypal order id");
      var options = {
        'method': 'GET',
        'url': redirectURL,
        'simple': false,
        'followRedirect': false,
        'followAllRedirects': false,
        'resolveWithFullResponse': true,
        'headers': {
          'Content-Type': 'application/json'
        }
      };
  
     return rp(options);
    },

    respondWithOrderID: function(response){
      console.log("extreacting orderID");
      console.log('response = ' + JSON.stringify(response));

      // var location = JSON.stringify(response.headers['location']);
       var location = response.headers['location'];
       console.log('location = ' + location);
       paypalOrderToken = location.match(/EC-\w+/)[0];
       console.log("paypalOrderToken = " + paypalOrderToken);

       return  paypalOrderToken;
    },
    completeSbTransaction: function(browserPaymentToken, paypalOrderToken){
      console.log("Completeing Smart Button transaction");
      var options = {
        'method': 'GET',
        'url': completeSBtransactionBaseURL + browserPaymentToken + '?action=success&token=' + paypalOrderToken,
        'simple': false,
        'followRedirect': false,
        'followAllRedirects': false,
        'resolveWithFullResponse': true,
        'headers': {
          'Content-Type': 'application/json'
        }
      };
      console.log('sending this: ' + JSON.stringify(options));
     return rp(options);
    },
    retrieveTransactionResult: function(response) {
      console.log("retrieving transaction result");
      console.log('Response from complete transaction request: ' + response);
      var options = {
        'method': 'GET',
        'url': mpgsTransactionURL + currentMpgsOrderID + '/transaction/' + currentMpgsTransactionID,
        'headers': {
          //'Content-Type': 'application/json',
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
      result = {
        result: objectResponse.result,
        gatewayCode: objectResponse.response.gatewayCode,
        acquirerCode: objectResponse.response.acquirerCode,
        browserPaymentStatus: objectResponse.browserPayment.interaction.status,
        orderStatus: objectResponse.order.status
      };
      console.log('transaction result is: ' + result);
      return result;

    }
       
  }

//app.post('/create-paypal-transaction', createPayPalTransaction);

app.post('/create-sb-paypal-transaction', function (req, res) {
    return payPal.requestPayPalTransaction()
      .then(payPal.getRedirectURL)
      .then(payPal.getPaypalOrderID)
      .then(payPal.respondWithOrderID)
      .then( function(paypalOrderToken) {
        console.log("Final paypalOrderToken = " + paypalOrderToken);
  
        return res.status(200).json({
        orderID: paypalOrderToken
      });
    })
      .then(payPal.getBrowserPaymentToken)
      .catch(function(err){
        // 4. Handle any errors from the call
        console.error(err);
        return res.sendStatus(500);
      });
  
}


);

app.post('/create-exp-paypal-transaction', function (req, res) {
  return payPal.requestPayPalTransaction()
    .then(payPal.getRedirectURL)
    .then( function(redirectURL) {
      console.log("redirect URL: " + JSON.stringify(redirectURL));

      return res.status(200).json({
      redirectURL: redirectURL
    });
  })
    .catch(function(err){
      // 4. Handle any errors from the call
      console.error(err);
      return res.sendStatus(500);
    });

}


);


//app.get('/retrieve-transaction-result', retrievePayPalResult);


app.get('/retrieve-transaction-result', function (req, res) {
  return payPal.retrieveTransactionResult(currentMpgsOrderID, currentMpgsTransactionID)
  .then(payPal.respondWithTransactionResult)
  .then( function(){
   return  res.status(200).json(result);
  })
  .catch(function(err){
    // 4. Handle any errors from the call
    console.error(err);
    return res.sendStatus(500);
  });
})


app.get('/retrieve-sb-transaction-result', function (req, res) {
    return payPal.completeSbTransaction()
    .then(payPal.retrieveTransactionResult(currentMpgsOrderID, currentMpgsTransactionID))
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

app.get('/checkout-js', (req, res) => {
  res.sendFile('./public/express.html', { root: __dirname });
});

app.get('/sb', (req, res) => {
  res.sendFile('./public/js-SDK.html', { root: __dirname });
});

app.get('/custom-button', (req, res) => {
  res.sendFile('./public/redirecturl.html', { root: __dirname });
});




//personal sandbox account pw      2/7YzNte
// use this for redirect url:
//https://www.paypal.com/checkoutnow/error



//TODO add express and modal examples as new html page resources
//TODO add routing to each example
//TODO make seperate requests for Smart button and standard integration
//TODo Finish extra request for smart button complete transaction request
//TODO Test Smart button method to make sure a failed transaction doesn't show as approved.
//Make environment variables for MID and auth
//Make deployable to Heroku
//Test if available from JS fiddle.