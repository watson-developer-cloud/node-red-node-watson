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
  //function to determine if WDC service is bound. A simple check on
  // name may fail because of duplicate usage. This function verifies
  // that the url associated with the service, contains the matched
  // input value, hence reducing the chances of a false match.
  checkCFForService: function(serviceName, returnBoolean, alchemyRegex) {
    var regex = alchemyRegex ?
                RegExp('(http|https)(://)('+serviceName+').*') :
                RegExp('(http|https)(://)([^\/]+)(/)('+serviceName+').*');

    var services = appEnv.getServices();

    for (var service in services) {
      if (services[service].hasOwnProperty('credentials')) {
        if (services[service].credentials.hasOwnProperty('url')){
          if (services[service].credentials.url.search(regex) === 0){
            return returnBoolean ? true : services[service].credentials;
          }
        }
      }
    }
    return returnBoolean ? false : null;
  },

  // Function to return all the details of a service. Used by Document
  // Conversion Node to provide a list and a choice to the user.
  // Node: Like the original Document Conversion check, this
  // function will look for all bound instances of Document Conversion.
  getAllServiceDetails: function(serviceName) {
    var regex = RegExp('(http|https)(://)([^\/]+)(/)('+serviceName+').*'),
      services = appEnv.getServices(),
      theList = [];

    for (var service in services) {
      if (services[service].hasOwnProperty('credentials')) {
        if (services[service].credentials.hasOwnProperty('url')) {
          if (services[service].credentials.url.search(regex) === 0) {
            var newCandidate = {};
            var v = services[service];
            newCandidate.name = v.name ? v.name : '';
            newCandidate.label = v.label ? v.label : '';
            newCandidate.url = v.credentials.url ?
                                    v.credentials.url : '';
            newCandidate.username = v.credentials.username ?
                                        v.credentials.username : '';
            newCandidate.password = v.credentials.password ?
                                        v.credentials.password : '';
            theList = theList.concat(newCandidate);
          }
        }
      }
    }
    return theList;
  },

  // Check for service return a boolean to indicate if it is bound in
  checkServiceBound: function(serviceName) {
    return ServiceUtils.prototype.checkCFForService(serviceName, true, false);
  },

  // Check for and return bound servie
  getServiceCreds: function(serviceName) {
    return ServiceUtils.prototype.checkCFForService(serviceName, false, false);
  },

  getServiceCredsAlchemy: function(serviceName) {
    return ServiceUtils.prototype.checkCFForService(serviceName, false, true);
  },

};

var serviceutils = new ServiceUtils();

module.exports = serviceutils;
