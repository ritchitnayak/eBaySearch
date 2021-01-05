const path = require('path');
const express = require('express');
const https = require('https');
const axios = require('axios')
const port = process.env.PORT || 8080;

const app = new express();

function ebayRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';

      resp.on('data', (chunk) => {
        data += chunk;
      });

      resp.on('end', () => {
        resolve(JSON.parse(data))
      });

    }).on("error", (err) => {
      reject(err);
    });
  });
}

function formatedData(response) {
  let sres = [];
  try {
    for (let i = 0; i < response['findItemsAdvancedResponse'][0]['searchResult'][0]['@count']; i++) {
      let itemdict = {};
      try {
        items = response['findItemsAdvancedResponse'][0]['searchResult'][0]['item']

        itemdict['title'] = items[i]['title'][0]
        itemdict['cat'] = items[i]['primaryCategory'][0]['categoryName'][0]
        itemdict['cond'] = items[i]['condition'][0]['conditionDisplayName'][0]
        itemdict['retAcc'] = items[i]['returnsAccepted'][0]
        itemdict['price'] = items[i]['sellingStatus'][0]['currentPrice'][0]['__value__']
        itemdict['loc'] = items[i]['location'][0]
        itemdict['redirect'] = items[i]['viewItemURL'][0]
        itemdict['shipType'] = items[i]['shippingInfo'][0]['shippingType'][0]
        itemdict['shipCost'] = items[i]['shippingInfo'][0]['shippingServiceCost'][0]['__value__']
        itemdict['shipToLoc'] = items[i]['shippingInfo'][0]['shipToLocations'][0]
        itemdict['expShip'] = items[i]['shippingInfo'][0]['expeditedShipping'][0]
        itemdict['onedayship'] = items[i]['shippingInfo'][0]['oneDayShippingAvailable'][0]
        itemdict['bestOff'] = items[i]['listingInfo'][0]['bestOfferEnabled'][0]
        itemdict['buyNow'] = items[i]['listingInfo'][0]['buyItNowAvailable'][0]
        itemdict['listingType'] = items[i]['listingInfo'][0]['listingType'][0]
        itemdict['gift'] = items[i]['listingInfo'][0]['gift'][0]
        itemdict['wcount'] = items[i]['listingInfo'][0]['watchCount'][0]

        if (!('galleryURL' in items[i])) {
          itemdict['imgUrl'] = "/assets/img/ebayDefault.png"
        } else if (items[i]['galleryURL'][0] == "https://thumbs1.ebaystatic.com/pict/04040_0.jpg") {
          itemdict['imgUrl'] = "/assets/img/ebayDefault.png"
        } else {
          itemdict['imgUrl'] = items[i]['galleryURL'][0]
        }

        if ('topRatedListing' in items[i]) {
          itemdict['isTopRated'] = items[i]['topRatedListing'][0]
        }

        sres.push(itemdict)
      } catch (err) {
        continue;
      }
    }
  } catch (error) {
    sres = [];
  } finally {
    return JSON.stringify(sres);
  }
}

function formatedData2(response) {
  let sres = [];
  try {
    for (let i = 0; i < response['findItemsAdvancedResponse'][0]['searchResult'][0]['@count']; i++) {
      try {
        let itemdict = {};

        items = response['findItemsAdvancedResponse'][0]['searchResult'][0]['item'];

        itemdict['id'] = items[i]['itemId'][0];
        itemdict['title'] = items[i]['title'][0];
        itemdict['price'] = items[i]['sellingStatus'][0]['currentPrice'][0]['__value__'];
        itemdict['shipCost'] = items[i]['shippingInfo'][0]['shippingServiceCost'][0]['__value__'];
        itemdict['img'] = items[i]['galleryURL'][0];
        itemdict['redirect'] = items[i]['viewItemURL'][0];

        let shipInfo = {};
        Object.keys(items[i]['shippingInfo'][0]).forEach(function(k){
          switch(k) {
            case 'expeditedShipping':
              shipInfo['expShip'] = items[i]['shippingInfo'][0][k][0];
              break;
            case 'handlingTime':
              shipInfo['handlingTime'] = items[i]['shippingInfo'][0][k][0];
              break;
            case 'oneDayShippingAvailable':
              shipInfo['oneDayShip'] = items[i]['shippingInfo'][0][k][0];
              break;
            case 'shippingType':
              shipInfo['shipType'] = items[i]['shippingInfo'][0][k][0];
              break;
            case 'shipToLocations':
              shipInfo['shipToLoc'] = items[i]['shippingInfo'][0][k][0];
              break;
          }
        });
        itemdict['shipInfo'] = shipInfo;

        if ('topRatedListing' in items[i]) {
          itemdict['topRated'] = items[i]['topRatedListing'][0];
        } else {
          itemdict['topRated'] = false;
        }

        if('condition' in items[i]) {
          if('conditionDisplayName' in items[i]['condition'][0]) {
            itemdict['cond'] = items[i]['condition'][0]['conditionDisplayName'][0];
          } else {
            itemdict['cond'] = "N/A";
          }
        } else {
          itemdict['cond'] = "N/A";
        }

        sres.push(itemdict);

        if(sres.length >= 50) {
          break;
        }
      } catch (err) {
        continue;
      }
    }
  } catch (error) {
    sres = [];
  } finally {
    return JSON.stringify(sres);
  }
}

function formatedItemDetails(response) {
  let sres = {};
  try {
    sres['img'] = response['Item']['PictureURL'];

    if(response['Item']['Subtitle']) {
      sres['subtitle'] = response['Item']['Subtitle'];
    }

    if(response['Item']['ItemSpecifics']) {
      if(response['Item']['ItemSpecifics']['NameValueList']) {
        let speclist = []
        response['Item']['ItemSpecifics']['NameValueList'].forEach(function (spec) {
          if(spec['Name'] == 'Brand') {
            sres['brand'] = spec['Value'][0];
          } else {
            let newspec = {};
            newspec['name'] = spec['Name'];
            newspec['val'] = spec['Value'][0];
            speclist.push(newspec);
          }
        });
        sres['hasSpecs'] = true;
        sres['specs'] = speclist;
      } else {
        sres['hasSpecs'] = false;
      }
    } else {
      sres['hasSpecs'] = false;
    }

    if(sres['subtitle'] || sres['brand']) {
      sres['hasFeatures'] = true;
    } else {
      sres['hasFeatures'] = false;
    }

    if(response['Item']['ReturnPolicy']) {
      sres['hasRetPolicy'] = true;
      sres['retPolicy'] = response['Item']['ReturnPolicy'];
    } else {
      sres['hasRetPolicy'] = false;
    }

    if(response['Item']['Seller']) {
      sres['hasSellerInfo'] = true;
      sres['sellerInfo'] = response['Item']['Seller'];
    } else {
      sres['hasSellerInfo'] = false;
    }

    if(response['Item']['ShippingInfo']) {
      sres['hasshippingInfo'] = true;
      sres['shippingInfo'] = response['Item']['ShippingInfo'];
    } else {
      sres['hasshippingInfo'] = false;
    }

  } catch (error) {
    console.error(error);
    sres = {};
  } finally {
    return JSON.stringify(sres);
  }
}

app.use(express.static(path.resolve(__dirname, 'dist/hw8-angular/')))

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist/hw8-angular/index.html'));
});

app.get('/api/search', async (req, res) => {
  // console.log(req.query);

  let filterIdx = 0;
  let url = 'https://svcs.ebay.com/services/search/FindingService/v1?';
  url += 'OPERATION-NAME=findItemsAdvanced';
  url += '&SERVICE-VERSION=1.0.0';
  url += '&SECURITY-APPNAME=APP_NAME';
  url += '&RESPONSE-DATA-FORMAT=JSON';
  url += '&REST-PAYLOAD=true';
  url += '&paginationInput.entriesPerPage=100';
  url += '&keywords=' + req.query.keywords;
  url += '&sortOrder=' + req.query.sortOrder;

  if (req.query['prange'] == 'true') {
    ['MinPrice', 'MaxPrice'].forEach(function (item) {
      if (req.query[item] && (req.query[item] != 'null')) {
        url += '&itemFilter(' + filterIdx + ').name=' + item;
        url += '&itemFilter(' + filterIdx + ').value=' + req.query[item];
        url += '&itemFilter(' + filterIdx + ').paramName=Currency';
        url += '&itemFilter(' + filterIdx + ').paramValue=USD';
        filterIdx += 1;
      }
    });
  }

  ['ReturnsAcceptedOnly', 'FreeShippingOnly', 'ExpeditedShippingType'].forEach(function (item) {
    if (req.query[item] && (req.query[item] != 'null')) {
      url += '&itemFilter(' + filterIdx + ').name=' + item;
      url += '&itemFilter(' + filterIdx + ').value=' + req.query[item];
      filterIdx += 1;
    }
  });

  if (req.query['Condition'] == 'true') {
    let cond_idx = 0;
    url += '&itemFilter(' + filterIdx + ').name=Condition';
    ['cond_new', 'cond_used', 'cond_vgood', 'cond_good', 'cond_acceptable'].forEach(function (item) {
      if (req.query[item]) {
        url += '&itemFilter(' + filterIdx + ').value=' + req.query[item];
        cond_idx += 1;
      }
    });
  }

  try {
    let data = await ebayRequest(url);
    res.setHeader('Content-Type', 'application/json');
    res.send(formatedData(data));
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify([]));
  }
});

app.get('/api/searchv2', async (req, res) => {
  console.log(req.query);
  
  let filterIdx = 0;
  let url = 'https://svcs.ebay.com/services/search/FindingService/v1?';
  url += 'OPERATION-NAME=findItemsAdvanced';
  url += '&SERVICE-VERSION=1.0.0';
  url += '&SECURITY-APPNAME=RitchitN-CSCI571H-PRD-42eba3d7e-f830303e';
  url += '&RESPONSE-DATA-FORMAT=JSON';
  url += '&REST-PAYLOAD=true';
  url += '&paginationInput.entriesPerPage=70';
  url += '&keywords=' + req.query.keywords;
  url += '&sortOrder=' + req.query.sortOrder;

  ['MinPrice', 'MaxPrice'].forEach(function (item) {
    if (req.query[item] && (req.query[item] != 'null')) {
      url += '&itemFilter(' + filterIdx + ').name=' + item;
      url += '&itemFilter(' + filterIdx + ').value=' + req.query[item];
      url += '&itemFilter(' + filterIdx + ').paramName=Currency';
      url += '&itemFilter(' + filterIdx + ').paramValue=USD';
      filterIdx += 1;
    }
  });

  if (req.query['condition'] == 'true') {
    url += '&itemFilter(' + filterIdx + ').name=Condition';
    ['cond_new', 'cond_used', 'cond_unspec'].forEach(function (item) {
      if (req.query[item]) {
        url += '&itemFilter(' + filterIdx + ').value=' + req.query[item];
      }
    });
  }

  try {
    let data = await ebayRequest(url);
    res.setHeader('Content-Type', 'application/json');
    res.send(formatedData2(data));
  } catch (err) {
    console.log(err);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify([]));
  }
});

app.get('/api/details/:pid', async (req, res) => {
  let query = `https://open.api.ebay.com/shopping?callname=GetSingleItem&responseencoding=JSON&appid=RitchitN-CSCI571H-PRD-42eba3d7e-f830303e&siteid=0&version=967&ItemID=${req.params.pid}&IncludeSelector=Description,Details,ItemSpecifics`;
  // console.log(query);
  try {
    let data = await ebayRequest(query);
    res.setHeader('Content-Type', 'application/json');
    res.send(formatedItemDetails(data));
  } catch (err) {
    console.error(err);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify([]));
  }
});

app.listen(port, () => console.log('App listening on port ' + port));

module.exports = app;
