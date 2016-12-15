/**
 * Copyright 2016 IBM Corp.
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
var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();

function ServiceUtils() {}
ServiceUtils.prototype = {
  //function to determine if WDC service is bound
  checkServiceBound: function(serviceName) {
    var regex = new RegExp('(http|https)(://)([^\/]+)(/)('+serviceName+').*');
    var services = appEnv.getServices();
    for (var service in services) {
      if (services[service].hasOwnProperty('credentials')) {
        if(services[service].credentials.hasOwnProperty('url')){
          if(services[service].credentials.url.search(regex) == 0){
            return true;
          }
        }
      }
    }
    return false;
  },
};

var serviceutils = new ServiceUtils();

module.exports = serviceutils;
