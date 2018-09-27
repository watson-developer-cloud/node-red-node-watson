Node-RED Watson Nodes for IBM Cloud
=====================================

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/4f98536040924add9da4ca1deecb72b4)](https://www.codacy.com/app/BetaWorks-NodeRED-Watson/node-red-node-watson?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=watson-developer-cloud/node-red-node-watson&amp;utm_campaign=Badge_Grade)
[![npm-version](https://img.shields.io/npm/v/node-red-node-watson.svg)](https://www.npmjs.com/package/node-red-node-watson)
[![npm-downloads](https://img.shields.io/npm/dm/node-red-node-watson.svg)](https://www.npmjs.com/package/node-red-node-watson)

<a href="https://cla-assistant.io/watson-developer-cloud/node-red-node-watson"><img src="https://cla-assistant.io/readme/badge/watson-developer-cloud/node-red-node-watson" alt="CLA assistant" /></a>

### New in version 0.7.4
- Bump SDK Dependency to 3.11.0

### New in version 0.7.3
- Modify Discovery Query Builder Node to use `listCollectionFields` to determine query list.

### New in version 0.7.2
- Allow version date for Assistant to be specified in `msg.params.version`
to allow optional usage of beta version.

### New in version 0.7.1
- Fix to how IAM Key for bound Visual Recognition is retrieved

### New in version 0.7.0
- In this release STT in Stream mode with IAM Keys does not work.
- Assistant, Discovery, Language Identify, Language Translator,
Natural Language Understanding, Personality Insights,
Speech to Text, Text to Speech, Tone Analyzer nodes updated
to allow for use of IAM key for authentication.
- Migrated STT node off deprecated methods.
- Fix to Tone Analyzer Node to preserve credentials on config reopen.
- Fix to Tone Analyzer to allow json objects and arrays as payload.
- Fix to STT where auto-connect was not being preserved when reopening configuration.
- Bump to 2018-03-05 version date for Discovery service.
- Move to V3 of Language Translator
- Migrated Discovery Nodes off deprecated methods.
- Remove Deprecated Retrieve and Rank Nodes


### Watson Nodes for Node-RED
A collection of nodes to interact with the IBM Watson services in [IBM Cloud](http://bluemix.net).

# Nodes

- Conversation
    - Add conversational capabilities into applications.
- Discovery
    - List environments created for the Discovery service
- Language Identification
    - Detects the language used in text
- Language Translator
    - Translates text from one language to another    
- Natural Language Classifier
    - Uses machine learning algorithms to return the top matching predefined classes for short text inputs.
- Natural Language Understanding
    - Analyze text to extract meta-data from content such as concepts, entities, keywords ...
- Personality Insights
    - Use linguistic analytics to infer cognitive and social characteristics from text
- Retrieve and Rank
    - Creates a trainable search engine for your data  
- Speech To Text
    - Convert audio containing speech to text
- Text To Speech
    - Convert text to audio speech
- Tone Analyzer
    - Discover, understand, and revise the language tones in text.
- Visual Recognition
    - Analyze visual appearance of images to understand their contents

### Usage
Example usage flows can be found here [node-red-labs](https://github.com/watson-developer-cloud/node-red-labs)

### Contributing

For simple typos and fixes please just raise an issue pointing out our mistakes.
If you need to raise a pull request please read our [contribution guidelines](https://github.com/watson-developer-cloud/node-red-node-watson/blob/master/CONTRIBUTING.md)
before doing so.

### Copyright and license

Copyright 2018 IBM Corp. under [the Apache 2.0 license](LICENSE).
