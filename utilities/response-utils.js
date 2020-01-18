/**
 * Copyright 2020 IBM Corp.
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

// We are only looking at the token expiry, then refreshing that if
// needed. An alternative would be to refresh the token, before expiry
// using the refresh token, and checking if the refresh token has expired,
// but the token time has proven to be sufficient so far. If not will need
// to make the change to add refresh token processing.

class ResponseUtils {

  constructor() {
  }

  static parseResponseFor(msg, response, field) {
    if (response && response.result) {
      if (response.result[field]) {
        msg[field] = response.result[field];
      } else {
        msg[field] = response.result;
      }
    } else {
      msg[field] = response;
    }
  }

  static assignResultToField(msg, response, field) {
    if (response && response.result) {
        msg[field] = response.result;
    } else {
      msg[field] = response;
    }
  }


}

module.exports = ResponseUtils;
