
## 0.9.x

### New in version 0.9.5
- Assistant V1 & V2 - Allow customerId to be passed inside msg.params
- Assistant V2 - Skip the persist_session_id check if there is no msg.params
- Update list of supported languages in Speech to Text and Text to Speech nodes.

### New in version 0.9.4
- Assistant V1 Workspace manager - Allow endpoint to be overridden through msg.params
- Language Translator, Speech to Text, Text to Speech - Sort Languages in drop down select list.

### New in version 0.9.3
- Assistant V1 - Fix alternateIntents setting.
- Assistant V2 - Allow return of request session id.
- Update list of supported languages in Speech to Text, Text to Speech and Translation nodes.

### New in version 0.9.2
- Assistant V2 - Fix bug session expiry bug.


### New in version 0.9.1
- Assistant V2 - Allow flow to assign a string session id. The node maps this user specified session id to the real session id. Additional param option allow session id to be reset.  

### New in version 0.9.0
- Node-RED & IBM-Watson & Use of promises on API invocation & IAM URL construct migration & Removal of default endpoint of
    - Assistant V1
    - Assistant V2
- All Nodes now require Node-RED 1.0.x or above
- Remove watson-developer-cloud dependancy
- Remove code for redundant nodes


## 0.8.x

### New in version 0.8.2
- Node-RED & IBM-Watson & Use of promises on API invocation & IAM URL construct migration & Removal of default endpoint of
    - Document Translator node
    - Discovery node
    - Discovery Document Loader node
    - Discovery Query Builder node
    - Assistant V1 Workspace Manager node
- List Expansion list, and List Training data modes added to Discovery node
- Fix to Create Classifier mode in NLC node

### New in version 0.8.1
- Node-RED & IBM-Watson & Use of promises on API invocation & IAM URL construct migration & Removal of default endpoint of
    - Speech to Text node
    - Speech to Text Corpus Builder node
    - Natural Language Understanding node
    - Natural Language Classifier node
    - Language Identifier node
    - Language Translator node
    - Translator Util node
- New NLU Model Manager node.
- NLC CreateClassifier is broken until defect on ibm-watson is fixed.
- Remove X-Watson-Technology-Preview Neural translation option for Language Translator node
- Remove monolingual corpus option from Language Translator mode
- Added new modes to Language Translator mode
  - List Custom models
  - List Default models

### New in version 0.8.0
- In the 0.8.x releases the nodes are migrated to a node-red 1.0.x input
event callback function signature.
and migrated off watson-developer-cloud to ibm-watson as a npm dependancy.
Migrated nodes will not be compatible with pre 1.0.0 versions of node-red.
During the migration there will be a dependancy on both modules.
- Bump dependancy on node to >=10.0.0
- Bump dependancy on cfenv, request, file-type
- Bump dependancy on ibm-cloud-sdk-core to 0.3.7 (need to stay on 0.x, for STT Streaming to work)
- Node-RED & IBM-Watson & Use of promises on API invocation & IAM URL construct migration & Removal of default endpoint of
    - Tone Analyzer node.
    - Personality Insights node.
    - Visual Recognition V3 node
    - Text to Speech node
    - Text to Speech Corpus Builder node
- New Visual Recognition V4 node.
- Drop faces detect option from Visual Recognition V3 node.
- Fix to URL parsing for bound services.
- STT token manager no longer in ibm-cloud-sdk-core
- Update language lists for STT, TTS, Language Translator and Document Translator Nodes



## 0.7.x

### New in version 0.7.8
- NLU Node - Add Syntax to list of selectable features

### New in version 0.7.7
- STT Node - Set correct content-type when File-Type reports a mime type of audio/opus for ogg;codec=opus files.

### New in version 0.7.6
- Bump SDK Dependency to 3.18.2
- STT Node To use iam-utils in place of removed iam-token-manager
- STT Node removed codec setting as service can now automatically detect the codec of the input audio and supports more than codec=opus for ogg formats.
- TSS Node fix to add visibility check on tts.voices and not stt.models
- Assistant V1 Workspace Manager Node updated to reflect that in update mode, updated fields
need a new_ prefix in their keys as part of the input json.
- NLC Node - migrate off deprecated methods
- NLC Node - Allow create of a classier to be based on a csv template node.

### New in version 0.7.5
- Bump SDK Dependency to 3.15.0
- Added Portuguese (Brazilian) and Chinese (Simplified and Traditional) as output languages
for Visual Recognition node.
- Added list voices and delete customisation methods to TTS Corpus Builder node.
- STT Node Changes
  - Allowing SDK to manage IAM Tokens.
  - Streaming mode for STT using IAM key now working.
  - Fix to stream mode for max alternatives and smart formatting options
  - Keywords, Word Confidence and Customization Weight can now be specified
  - Allow Start and End data packets to be specified as JSON objects, as well as
a stringified JSON objects.
  - In line with SDK change use createLanguageModel() to create custom model
- Disable SSL Verification option for Assistant Node.
- Natural Language Understanding Node Changes
  - Bump Natural Language Understanding to 2018-11-16
  - Add Limit Categories and limit_text_characters options
- Allow JSON input into Personality Insights node.
- Japanese word count was causing a Node-RED crash when run in the cloud.
- Hungarian supported by Language Translator.
- New Document Language Translator node.
- New Assistant V2 Node.
- Discovery Node changes
  - Bump Discovery to 2018-12-03
  - Implement Query Notices method
- Bump dependency on file-type to 10.7.0
- Bump dependency on temp to 0.9.0


### New in version 0.7.4
- Bump SDK Dependency to 3.11.0
- Bump Assistant version to 2018-09-20
- Bump Discovery version to 2018-08-01
- Bump Natural Language Understanding to 2018-09-21
- Bump Personality Insights to 2017-10-13
- Discovery New Environment Size is now a string
- Add Language Text to DropDrown for new supported languages in Translation Node.
- Natural Language Classifier updated for use of IAM key for authentication.
- Fix the Natural Language Understanding for bound IAM key service.
- German is a supported STT Language.
- Visual Recognition Key fix when migrating from unbound to bound service.

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



## 0.6.x

### New in version 0.6.14
- Visual Recognition instances created post May 22 2018, have a new authentication mechanism

### New in version 0.6.13
- Added opt-out option for collection parsing of strings in Natural Language Classifier Node.

### New in version 0.6.12
- Fix to collection check in Natural Language Classification Node allowing for . in domain
names.

### New in version 0.6.11
- Fix to defaulting name for NLU Node.
- Allow pre-check of audio format to be disabled in Speech to Text node.
- Migrate from deprecated getModels and getCustomizations methods in Speech to Text nodes.
- Implement update classifier in Visual Recognition Util node.
- In Visual Recognition Util node append 'positive_' to zip name if neither 'positive' not 'negative' not already there.
- Removed duplicated code in Visual Recognition Util node.

### New in version 0.6.10
- Needed to stringify json before addDocument in Discovery node.
- Using Node.js v 6 features, so will not run on Node.js v 4 anymore

### New in version 0.6.9
- Implemented classify collection on Natural Language Classifier node. The collection can be
in the form of multiple sentences, an array of strings, or an array of objects.

### New in version 0.6.8
- Move all Discovery calls to latest API version - 2017-11-07
- Updated calls to deprecated discovery methods addJsonDocument and getCollections
- Correct implemetation of passages related options
- Allow highlight option to be specified in Discovery overrides - msg.discoveryparams
- Rename Conversation Nodes to Assistant
- Use Assistant endpoint
- Move all Assistant calls to latest API version - 2018-02-16
- Move all Visual Recognition calls to lates API version - 2018-03-19
- Add French as a Visual Recognition classification response language

### New in version 0.6.7
- Enable Opt-out option for Conversation Node.
- Implement time out option for response from Conversation Node.
- Bump to v 3.2.1 of watson-developer-cloud dependency.
- Fix to how API version is specified in Natural Language Understanding Node.
- Add Korean to list of languages in Natural Language Classifier Node.

### New in version 0.6.6
- Added Mute option for STT Node warning status when running in Streaming mode
- Discard option for STT Node Streaming listening events.
- Added Auto-Connect mode for STT Node - Will keep connection to service alive,
else connection is restored on demand.
- Fix to Discovery Query Builder Node to return schema options.

### New in version 0.6.5
- Endpoint can now be specified in Natural Language Classifier Node

### New in version 0.6.4
- Speech to Text node now reports all errors, including disconnects when running in stream mode.

### New in version 0.6.3
- Allow input / output from Node-RED web-sockets for Speech to Text node. To
enable select streaming mode. No token is needed as the Node handles this. Look
out for sample flows and templates showing how to use this feature.
- Three new languages for Language Translator, Polish, Russian and Turkish in Neural Translation mode.
- Removed the code for the deprecated Language Translation Nodes.  

### New in version 0.6.2
- Visual Recognition fix for accept-language

### New in version 0.6.1
- Allow STT Language to be dyamically configurable using msg.srclang

### New in version 0.6.0
- Bump to watson-developer-cloud 3.0.4
- Document link updates
- IE fix
- Option to set Conversation credentials though msg.params
- Speech To Text fullresult now includes speaker_labels. Breaking change to any code that used fullresult due an extra level of indirection.
- Allow Korean as an option for Personality Insights
- Text Recognition option removed from Visual Recognition Node
- Move Retrieve and Rank nodes to deprecated list
- Removed Document Conversion, Alchemy, Concept Insights, Dialog, Tradeoff Analytics and Similarity Search Nodes
- Nodes deprecated in 0.5.x will be removed in 0.6.x releases


## 0.5.x

### New in version 0.5.23
- Allow file name to be configured in Add Document node.

### New in version 0.5.22
- Allow payload as json for Add Document node.

### New in version 0.5.21
- New node for Add Document for Discovery.
- Natural Language Understanding Node fix for credentials check.

### New in version 0.5.20
- Added experimental neural translation as a config option to translation node.

### New in version 0.5.19
- Update Supported audio file check in Speech to Text Node.
- Remove Continuous flag from Speech to Text Node.
- Add Alternatives and Smart Formatting options to Speech to Text Node.

### New in version 0.5.18
- Allow Conversation Workspace Manager node to be dynamically configured.

### New in version 0.5.17
- CRUD methods for Entity Values and Dialog Nodes in Conversation Workspace Manager node.

### New in version 0.5.16
- Implement methods to manage Entities in Conversation workspace Manager node.
- Create Collection Language fix in Discovery Node.
- Similarity Search Nodes moved into deprecated category.

### New in version 0.5.15
- Allow language code to be specified on create collection in Discovery Node.
- Implement delete collection, delete environment in Discovery Node.
- Allow multiple interface versions for Tone Analyzer Node.
- Enable Content, en or fr, in Tone Analyzer Node.

### New in version 0.5.14
- Bump to latest version of watson-developer-cloud node.js sdk
- Allow empty input into converse for Conversation Node
- Endpoint can now be specified in Natural Language Understanding, Discovery and Discover Query Builder Nodes
- Full Promises implementation for on input processing for Natural Language Understanding Node
- Fix to node.error invocation in Conversation node.

### New in version 0.5.13
- Personality Insights on Bluemix needed new path to node_modules

### New in version 0.5.12
- Fix to Personality Insights Node when running in Japanese mode.
- Bump Interface version to Discovery service to '2017-08-01'.
- Japanese supported by Translation service.
- Speech to Text service now reports UK English as 'en-GB'.
- Add button to allow model cache for STT node to be flushed.
- Added more of the supported audio formats for the TTS node.
- Retrieve and Rank node update to return document body.

### New in version 0.5.11
- Add support for NLP Query in Discovery and Discovery Query Builder Nodes.

### New in version 0.5.10
- Allowed detect_mode for Visual Recognition node to be set in msg.params

### New in version 0.5.9
- Text to Speech speech on msg.payload option.
- Speech to Text transcription on msg.payload option
- Endpoint can now be specified in Conversation,
Conversation Workspace Manager Language Identify, Language Translator,
Speech to Text, STT Corpus Builder, Text to Speech, TTS Corpus Builder,
Personality Insights and Tone Analyzer nodes.

### New in version 0.5.8
- Visual Reconition Node, now accepts readstream on msg.payload
- Add passages parameter to Discovery Node

### New in version 0.5.7
- Fix to Tone Analyzer to allow JSON as input
- Enabled Conversation Tone method to Tone Analyzer Node
- Discovery Node now supports: Create Environment, Create Configuration,
Create Collection

### New in version 0.5.6
- User Agent added to following nodes: Conversation, Conversation Workspace Manager,
Discovery, Discovery Query Builder, Document Conversion, Language Translator,
Language Translator Utility, Language Indentify, Natural Language Classifier,
Natural Language Understanding, Personality Insights, Retrieve and Rank,
Similarity Search, Speech to Text, STT Corpus Builder, Text to Speech,
TTS Corpus Builder, Tone Analyzer, Visual Recognition

### New in version 0.5.5
- Discovery Query Builder was not picking up searchable fields.
- Personality Insights Node reset to use '2016-10-20' version
- Natural Language Classifier Node migrated to use url based services utility to detect bound service.
- Natural Language Classifier Node Migrated to use Promises.
- Natural Language Classifier now able to use File Inject as input for create mode.
- Natural Language Classifier Node allows Classifier ID to be set dynamically in classify, list and remove modes.
- Natural Language Understanding Node now allows language and model overrides on
msg.nlu_options.language, msg.nlu_options.entity_model and msg.nlu_options.relations_model.
- Trade-off Analytics Node moved to the deprecated list.
- Migrated Visual Recognition and Visual Recognition Util nodes to use promises, and
ensure that all error responses are reported.

### New in version 0.5.4
- Fix for Service / Name conflicts in Document Conversion Node

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


## 0.4.x

### New in version 0.4.43
- Bump version of Conversation interface to '2017-02-03'
- New node for Conversation Workspace Management

### New in version 0.4.42
- Clean up fix in Speech to Text Node, which caused problems with long audio tracks.

### New in version 0.4.41
- Add get pronunciation to Text to Speech Customization Node.

### New in version 0.4.40
- Add delete customization to Speech to Text Customization Node.

### New in version 0.4.39
- Add description to Info panel for Text to Speech Customizations Node.
- Tone node updated to use url based services utility to detect bound service.

### New in version 0.4.38
- New Node for Text to Speech Customizations.
- Added option to select Customization in Text To Speech Node.

### New in version 0.4.37
- Added support for word training in Speech to Text Customizations Node.

### New in version 0.4.36
- New Node for Speech to Text Customizations - Initial support for corpus (sentences) training.
- Added option to select Customization in Speech to Text Node.

### New in version 0.4.35
- Fixed bug in Conversation node, when no msg.params defined.

### New in version 0.4.34
- Added Keyword and Entity emotion and sentiment as options on Alchemy Feature Extract Node.
- Allow Conversation credentials to be provided on msg.params
- Similarity Search and Visual Recognition Nodes updated to use url based services to detect bound service.

### New in version 0.4.33
- Personality Insights node updated to latest December 15, 2016 GloVe profiles.
- Conversation, Alchemy Feature Extract and Date Extraction nodes updated to use url based services utility to detect bound service.

### New in version 0.4.32
- Added diarization support to STT Node via the parameter speaker_labels
- STT and TTS node use url based services utility to detect bound service.

### New in version 0.4.31
- New V1 Query Builder Node for the Discovery Node

### New in version 0.4.30
- New services utilities to handle node-red app name clash problems
- New V1 Discovery Node
- Implementation of Discovery Node query, list and get details methods
- Fix to Translator Node which was ignoring any override values set in the msg object

### New in version 0.4.29
-  Fix to Document Conversion Node to preserve full msg object
-  Fix to Language Translator Node train mode documentation

### New in version 0.4.28
-  New V1 Experimental Discovery Node

### New in version 0.4.27
-  Change color of V3 Personality Insights Node

### New in version 0.4.26
-  New V3 Personality Insights Node
-  Deprecated V2 Personality Insights Node

### New in version 0.4.25
-  Fix to Language Translation Node to allow it work with File Inject

### New in version 0.4.24
- Bugfixes to Language Translator Train Node

### New in version 0.4.23
- Fix to Language Translator Train Node to allow it work with File Inject

### New in version 0.4.22
- Added new Date Extraction Node
- Visual Recognition Node, now defaults detection setting and language on initial initialisation.

### New in version 0.4.21
- Added Translation and Language Identify nodes for Language Translator Service (Blue Tiles)
- Deprecated Translation and Language Indentification nodes for Language Translation (Green Tiles)

### New in version 0.4.20
- Translation Node supports German

### New in version 0.4.19
- New Similarity Search (Beta) Node
- New Language Translation Util mode, to request available translation models
- Translation Node now has option to look for global translation settings
- Enhancements to Conversation Node
 - Node has option to remember context
 - Context support for single user and multi-user models
 - Ability to reset context, including user specific reset
 - Ability to splice in additional context variables.
- Added Concept support to News Node

### New in version 0.4.18
- Name space fixes to Text to Speech Node

### New in version 0.4.17
- Fixed how Document Conversion node was handling docx files

### New in version 0.4.16
- Oops! fix to Speech to Text Node

### New in version 0.4.15
- Name space fixes to Speech to Text Node

### New in version 0.4.14
- The dialog for the Text to Speech service now loads available voices dynamically. This allows
new voices and languages to be identified without requiring a further code change.

### New in version 0.4.13
- Emergency fix for Watson Language Translation node. Bluemix credentials read too late.

### New in version 0.4.12
- Emergency fix for node.js version compatibility problem, in payload-utils

### New in version 0.4.11
- Corrected word count for Japanese text in Personality Insights nodes.
- Move Dialog to deprecated list.

### New in version 0.4.10
- Conversation : added support for optional alternate_intents, output, entities and intents.
- Conversation : Bugfixes
- Retrieve and Rank : allow parameters to be passed into the nodes on the msg object
- Moved Relationship Extraction and Concept Insights nodes to the deprecated list.
- Updated dependency to watson-developer-cloud node-SDK v2.1.0

### New in version 0.4.9
- Added in German and Japanese support to Natural Language Classifier node
- Visual Recognition V3 : added support of Accept-Language for Classify feature, new icon with pink background, icon label renamed (removing v3 from node name)

### New in version 0.4.8
- Fixed document conversion node when filetype is not recognized
- Moved functions to utility module

### New in version 0.4.7
- Oops! fix to Conversation V1 node

### New in version 0.4.6
- New Conversation V1 node
- Bugfixes to Feature Extract node
- Bugfixes to Visual Recognition node
- Added in Japanese and Arabic support to Personality Insights node
- Updated dependency to watson-developer-cloud node-SDK 1.12.2

### New in version 0.4.5
- New Conversation experimental node.
- Visual Recognition v3 : added a Delete All Classifiers feature in the util node. Added corresponding Flow in Starter.

### New in version 0.4.4
- New palette category for deprecated Nodes, that are being retained for backward compatibity.
- Bugfixes to Speech to Text.

### New in version 0.4.3
- New Visual Recognition V3 node to support the V3 GA API. This incorporates the features that were previously
available as part of AlchemyAPI Vision.

### New in version 0.4.2
- The transcription returned for the Speech to Text node now returns full (untruncated) transcription. The
alternatives are returned in msg.fullresult. The dialog now loads available models dynamically. This will
allow new speech models to be identified without requiring a further code change.
- The Retrieve and Rank node nows stores credentials in a configuration node, allowing the credentials to be
shared acrosss a flow with multiple Retrieve and Rank nodes.
- New Tone Analyzer V3 node to support the V3 GA API.

### New in version 0.4.1
- AlchemyAPI Image Analysis and Language nodes migrated from old Alchemy SDK to current
Watson Developer Cloud SDK for Node.js
- The dialog for the Language Translation service now loads available models dynamically. This allows
new translation models to be identified without requiring a further code change. This version
allows customised translations models to be selected.
