Node-RED Nodes for IBM Bluemix
==============================

A collection of nodes to be used with [Bluemix](https://ace.ng.bluemix.net/) boilerplates.

# Nodes

The current release contains the following nodes:

- TCP
    - Provides TCP input and output clients
    - Connects to remote TCP port and replies to messages from an input client
- UDP
    - Sends a message to the designated UDP host and port
- MQ Light
    - Provides MQ Light receive and send clients
    - Publishes and subscribes to chosen topics
- MongoDB
    - Perform save, insert, update or remove operations
    - Perform find, count and aggregate operations
- Twilio
    - Sends an SMS message using the Twilio service

### Watson nodes:

- Language Identification
    - Detects the language used in text
- Natural Language Classifier
    - Uses machine learning algorithms to return the top matching predefined classes for short text inputs.
- Personality Insights
    - Use linguistic analytics to infer cognitive and social characteristics from text
- Relationship Extraction
    - Extract entities and their relationships from unstructured text
- Speech To Text
    - Convert audio containing speech to text
- Language Translation
    - Translates text from one language to another
- Text To Speech
    - Convert text to audio speech
- Tradeoff Analytics
    - Optimize decisions balance between multiple conflicting objectives.
- Visual Recognition
    - Analyze visual appearance of images to understand their contents

### Alchemy:

- Feature Extract 
    - Analyse a single piece of text content (either public URL, HTML or raw text)
      to extract multiple AlchemyAPI detected features, e.g. entities, keywords,
      sentiment.
- Image Analysis
    - Upload an image to detect either faces, URL text or
      content present in the image.

### Contributing

For simple typos and single line fixes please just raise an issue pointing out
our mistakes. If you need to raise a pull request please read our
[contribution guidelines](https://github.com/node-red/node-red/blob/master/CONTRIBUTING.md)
before doing so.

### Copyright and license

Copyright 2014, 2015 IBM Corp. under [the Apache 2.0 license](LICENSE).
