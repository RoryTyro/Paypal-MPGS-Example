const express = require('express');
var request = require('request');
const app = express();
const PORT = 3000;
var targetUrl;


function requestPaypalTransaction(req, res) {

    
    var options = {
      'method': 'PUT',
      'url': 'https://test-tyro.mtf.gateway.mastercard.com/api/rest/version/58/merchant/PAYPAL_EM/order/edcdaa22-3767-44aa-8e2f-5f2182651436/transaction/f950e665-2484-4d79-84ac-705b85c8fde9\n',
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': 'Basic bWVyY2hhbnQuUEFZUEFMX0VNOmU1Y2UxYmZhY2Y3ZmE3YzQxMDhmMTg4OGExNmY2YmIy'
      },
      body: JSON.stringify({"apiOperation":"INITIATE_BROWSER_PAYMENT","browserPayment":{"operation":"PAY","returnUrl":"https://tyro.com","paypal":{"paymentConfirmation":"CONFIRM_AT_MERCHANT"}},"order":{"amount":0.01,"currency":"AUD"},"sourceOfFunds":{"type":"PAYPAL"}})
    
    };
    request(options, function (error, response) {
      if (error) throw new Error(error);
        var objectResponse = JSON.parse(response.body)
        var targetUrl = objectResponse.browserPayment.redirectUrl;
        console.log(targetUrl);
        res.status(307).redirect(targetUrl);
        //res.status(200);
       
    });


    
  }

  function handleRedirect(req, res, targetUrl){ 
    res.status(307).redirect(targetUrl);
console.log("handle redirect: " + targetUrl);
  }

//app.get('/', (req, res) => {
//    res.send('Hello World!');
//});

app.post('/create-paypal-transaction', requestPaypalTransaction);

app.get('/redirect-paypal-transaction', handleRedirect);


app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));


app.use(express.static('public'));

