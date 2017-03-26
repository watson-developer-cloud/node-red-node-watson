Node-RED Watson Nodes for IBM Bluemix
=====================================

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/4f98536040924add9da4ca1deecb72b4)](https://www.codacy.com/app/BetaWorks-NodeRED-Watson/node-red-node-watson?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=watson-developer-cloud/node-red-node-watson&amp;utm_campaign=Badge_Grade)
[![npm-version](https://img.shields.io/npm/v/node-red-node-watson.svg)](https://www.npmjs.com/package/node-red-node-watson)
[![npm-downloads](https://img.shields.io/npm/dm/node-red-node-watson.svg)](https://www.npmjs.com/package/node-red-node-watson)

<a href="https://cla-assistant.io/watson-developer-cloud/node-red-node-watson"><img src="https://cla-assistant.io/readme/badge/watson-developer-cloud/node-red-node-watson" alt="CLA assistant" /></a>

### New in version 0.5.3
- Implement methods to manage Counter Examples in
Conversation workspace Manager node.
- Removed V1 Personality Insights node.
- Removed V1 Language Indentification node.
- Removed V1 Language Translation node.
- Removed V1 Language Translation Utility node.

### New in version 0.5.2
- Visual Recognition was overwriting msg.payload with 'look at msg.results'. Fixed
so that msg.payload is left as is.

### New in version 0.5.1
- Implement methods to manage for Intent and Example Input for Intent, in
Conversation workspace Manager node.
- Deprecated Alchemy Nodes.
- Removed Conversation experimental node.
- Removed Discovery experimental node.
- Removed Tone Analyzer beta node.
- Removed Relationship Extraction node.
- Removed the V1 Visual Recognition node.

### New in version 0.5.0
- New node for Natural Language Understanding
- watson-developer-cloud dependency forces node engine >= 4.5
- Nodes deprecated in 0.4.x will be removed in 0.5.x releases


### Watson Nodes for Node-RED
A collection of nodes to interact with the IBM Watson services in [IBM Bluemix](http://bluemix.net).

# Nodes

- Concept Insights
    - Use concept graphs to tag and explore information and documents.
- Conversation
    - Add conversational capabilities into applications.
- Date Extraction
    - Uses AlchemyAPI Date Extraction to detect natural language date/time expressions from text
- Dialog
    - Automate branching conversation between a user and your application.
    - Use natural language to automatically respond to user questions, cross-sell and up-sell, walk users through processes or applications, or even hand-hold users through difficult tasks.
- Discovery
    - List environments created for the Discovery service
- Document Conversion
    - Prepare documents for the Retrieve and Rank service.
- Feature Extract
    - Analyse a single piece of text content (either public URL, HTML or raw text)
      to extract multiple AlchemyAPI detected features, e.g. entities, keywords,
      sentiment.           
- Image Analysis
    - Upload an image to detect either faces, URL text or
      content present in the image.
- Language Identification
    - Detects the language used in text
- Language Translation
    - Translates text from one language to another    
- Natural Language Classifier
    - Uses machine learning algorithms to return the top matching predefined classes for short text inputs.
- Natural Language Understanding
    - Analyze text to extract meta-data from content such as concepts, entities, keywords ...
- News
    - Searches news and blog content    
- Personality Insights
    - Use linguistic analytics to infer cognitive and social characteristics from text
- Retrieve and Rank
    - Creates a trainable search engine for your data  
- Similarity search
    - Create and search against image collections  
- Speech To Text
    - Convert audio containing speech to text
- Text To Speech
    - Convert text to audio speech
- Tone Analyzer
    - Discover, understand, and revise the language tones in text.
- Tradeoff Analytics
    - Optimize decisions balance between multiple conflicting objectives.
- Visual Recognition
    - Analyze visual appearance of images to understand their contents

### Usage
Example usage flows can be found here [node-red-labs](https://github.com/watson-developer-cloud/node-red-labs)

### Contributing

For simple typos and fixes please just raise an issue pointing out our mistakes.
If you need to raise a pull request please read our [contribution guidelines](https://github.com/watson-developer-cloud/node-red-node-watson/blob/master/CONTRIBUTING.md)
before doing so.

### Copyright and license

Copyright 2014, 2016 IBM Corp. under [the Apache 2.0 license](LICENSE).
