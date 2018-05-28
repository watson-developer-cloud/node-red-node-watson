const pkg = require('../../package.json'),
  TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1');

class TTSUtils {
  constructor() {
  }

  static buildStdSettings (apikey, username, password, endpoint) {
    let serviceSettings = {
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }
    };

    if (apikey) {
      serviceSettings.iam_apikey = apikey;
    } else {
      serviceSettings.username = username;
      serviceSettings.password = password;
    }

    if (endpoint) {
      serviceSettings.url = endpoint;
    }

    return new TextToSpeechV1(serviceSettings);
  }

  static initTTSService(req, sApikey, sUsername, sPassword, sEndpoint) {
    endpoint = req.query.e ? req.query.e : sEndpoint;

    let serviceSettings = {
      url: endpoint,
      headers: {
        'User-Agent': pkg.name + '-' + pkg.version
      }};

      if (sApikey || req.query.key) {
        serviceSettings.iam_apikey = sApikey ? sApikey : req.query.key;
      } else {
        serviceSettings.username = sUsername ? sUsername : req.query.un;
        serviceSettings.password = sPassword ? sPassword : req.query.pwd;
      }

      return new TextToSpeechV1(serviceSettings);
  }


}

module.exports = TTSUtils;
