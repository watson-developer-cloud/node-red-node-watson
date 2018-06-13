/**
 * Copyright 2018 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
const request = require('request');

// We are only looking at the token expiry, then refreshing that if
// needed. An alternative would be to refresh the token, before expiry
// using the refresh token, and checking if the refresh token has expired,
// but the token time has proven to be sufficient so far. If not will need
// to make the change to add refresh token processing.

class IAMUtils {

  constructor(key) {
    this._key = key;
  }

  getToken(cb) {
    IAMUtils.getIAMToken(this._key)
    .then((token) => {
      cb(null, token);
    })
    .catch((err) => {
      cb(err, null);
    });
  }

  static stashToken(key, tokenInfo) {
    if (! IAMUtils.tokenStash) {
       IAMUtils.tokenStash = {};
    }
    IAMUtils.tokenStash[key] = {};
    ['access_token', 'refresh_token', 'expires_in', 'expiration'].forEach((f) => {
      IAMUtils.tokenStash[key][f] = tokenInfo[f] ? tokenInfo[f] : null;
    })
  }

  static checkForToken(key) {
    return IAMUtils.tokenStash &&
          IAMUtils.tokenStash[key] &&
          IAMUtils.tokenStash[key].access_token;
  }

  static notExpiredToken(key) {
    let fractionOfTtl = 0.8,
      timeToLive = IAMUtils.tokenStash[key].expires_in,
      expireTime = IAMUtils.tokenStash[key].expiration,
      currentTime = Math.floor(Date.now() / 1000),
      refreshTime = expireTime - (timeToLive * (1.0 - fractionOfTtl));

    return refreshTime >= currentTime;
  }

  static lookInStash(key){
    if (IAMUtils.checkForToken(key) && IAMUtils.notExpiredToken(key)) {
      return Promise.resolve(IAMUtils.tokenStash[key].access_token);
    }
    return Promise.reject();
  }

  static getNewIAMToken(key) {
    var p = new Promise(function resolver(resolve, reject){
      let iamtoken = null,
        uriAddress = 'https://iam.bluemix.net/identity/token';

      request({
        uri: uriAddress,
        method: 'POST',
        headers : {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        form: {
          grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
          apikey: key,
          response_type: 'cloud_iam'
        }
      }, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          //console.log('Token body looks like : ', body);
          var b = JSON.parse(body);
          //console.log('Token body looks like : ', b);
          IAMUtils.stashToken(key, b);
          if (b.access_token) {
            iamtoken = b.access_token;
          }
          resolve(iamtoken);
        } else if (error) {
          reject(error);
        } else {
          //console.log(body);
          reject('IAM Access Token Error ' + response.statusCode);
        }
      });
    });
    return p;
  }


  static getIAMToken(key) {
    var p = new Promise(function resolver(resolve, reject){
      IAMUtils.lookInStash(key)
      .then((iamtoken) => {
        //console.log('Resolving from stash');
        resolve(iamtoken);
      })
      .catch(() => {
        //console.log('Resolving from new');
        IAMUtils.getNewIAMToken(key)
        .then((iamtoken) => {
          resolve(iamtoken);
        })
        .catch((err) => {
          reject(err);
        });
      });
    });
    return p;
  }

}

module.exports = IAMUtils;
