/**
 * Copyright 2018, 2022 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
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


class TranslatorUtils {
  constructor() {
  }

  credentialCheck(k) {
    if (!k) {
      return Promise.reject('Missing Watson Language Translator service credentials');
    }
    return Promise.resolve();
  }

  checkForAction(action) {
    if (!action) {
      return Promise.reject('Missing action, please select one');
    }
    return Promise.resolve();
  }

}

var translatorutils = new TranslatorUtils();
module.exports = translatorutils ;
