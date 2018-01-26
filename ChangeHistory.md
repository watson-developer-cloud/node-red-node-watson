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
