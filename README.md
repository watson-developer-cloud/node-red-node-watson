Node-RED Watson Nodes for IBM Bluemix
=====================================

[![Codacy Badge](https://api.codacy.com/project/badge/grade/e157cf8407f2442396789dc78075340a)](https://www.codacy.com/app/rezgui-y/node-red-node-watson)

### New in next version
- The transcription returned for the Speech to Text node now returns full (untruncated) transcription. The
alternatives are returned in msg.fullresult. The dialog now loads available models dynamically. This will
allow new speech models to be identified without requiring a further code change. 

### New in version 0.4.1
- AlchemyAPI Image Analysis and Language nodes migrated from old Alchemy SDK to current 
Watson Developer Cloud SDK for Node.js
- The dialog for the Language Translation service now loads available models dynamically. This allows
new translation models to be identified without requiring a further code change. This version
allows customised translations models to be selected.

### Watson Nodes for Node-RED
A collection of nodes to interact with the IBM Watson services in [IBM Bluemix](http://bluemix.net).

# Nodes

- Concept Insights
    - Use concept graphs to tag and explore information and documents. 
- Dialog
    - Automate branching conversation between a user and your application.
    - Use natural language to automatically respond to user questions, cross-sell and up-sell, walk users through processes or applications, or even hand-hold users through difficult tasks.
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
- News
    - Searches news and blog content    
- Personality Insights
    - Use linguistic analytics to infer cognitive and social characteristics from text
- Relationship Extraction
    - Extract entities and their relationships from unstructured text
- Retrieve and Rank
    - Creates a trainable search engine for your data    
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


### Contributing

For simple typos and fixes please just raise an issue pointing out our mistakes.
If you need to raise a pull request please read our [contribution guidelines](https://github.com/watson-developer-cloud/node-red-node-watson/blob/master/CONTRIBUTING.md)
before doing so.

### Copyright and license

Copyright 2014, 2016 IBM Corp. under [the Apache 2.0 license](LICENSE).
