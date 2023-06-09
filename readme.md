# Term Reference Resolution Tool (TRRT)

## Overview

The **Term Ref(erence) Resolution Tool (TRRT)** takes files that contain so-called [term refs](https://essif-lab.github.io/framework/docs/tev2/terms/term-ref) and outputs a copy of these files in which these term refs are converted into so-called [renderable refs](https://essif-lab.github.io/framework/docs/tev2/terms/renderable-ref), i.e. texts that can be further processed by tools such as GitHub pages, Docusaurus, etc. The result of this is that the rendered document contains markups that help readers to quickly find more explanations of the concept or other knowledge artifact that is being referenced. There is more information about 
- the [TRRT specifications](https://essif-lab.github.io/framework/docs/tev2/spec-tools/trrt)
- [overview of the TEv2 tools](https://essif-lab.github.io/framework/docs/tev2/tev2-overview) of which the TRRT is a part.

### Who will use the TRRT?

The TRRT will be used by terminology creators and curators to generate renderable refs. It can also be used in a CI/CD pipeline, allowing for resolution as a pre-processing step before building a static site or performing other deployment activities.

### What inputs does the TRRT need?

For resolution to work, the following artifacts need to be present (see the [TEv2 architecture](https://essif-lab.github.io/framework/docs/tev2/overview/tev2-architecture) for an overview):

* The [Scope Administration File (SAF)](https://essif-lab.github.io/framework/docs/tev2/spec-files/saf);
* Access to (already existing) [MRGs](https://essif-lab.github.io/framework/docs/tev2/spec-files/mrg) (created with the [MRGTool](https://essif-lab.github.io/framework/docs/tev2/spec-tools/mrgt)) insofar as they contain terms that are to be referenced;
* The [curated texts](https://essif-lab.github.io/framework/docs/tev2/terms/curated-text) as [specified here](https://essif-lab.github.io/framework/docs/tev2/spec-files/ctext) that document the terms (or other artifacts) that are to be resolved by the TRRT.

## Installation

Install from the command line and make globally available
`npm install tno-terminology-design/trrt -g`

## Calling the Tool

The behavior of the TRRT can be configured per call e.g. by a configuration file and/or command-line parameters. The command-line syntax is as follows:

`trrt [ <paramlist> ] [ <globpattern> ]`

The TRRT takes in the following parameters:

|Flags                         |Description                                                             |Required|
|------------------------------|------------------------------------------------------------------------|:------:|
|-c, --config \<path>          |Path (including the filename) of the tool's (YAML) configuration file   |No      |
|input \<globpattern>          |Glob pattern that specifies the set of (input) files                    |No      |
|-o, --output \<dir>           |(Root) directory for output files to be written                         |Yes     |
|-s, --scopedir \<path>        |Path of the scope directory where the SAF is located                    |Yes     |
|-v, --vsntag \<vsntag>        |Default version to use when no version is set in term ref               |No      |
|-int, --interpreter \<type>   |Set interpreter to Alt syntax                                           |No      |
|-con, --converter \<type>     |Set converter to Markdown HTTP or ESIFF output                          |No      |


See [documentation](https://essif-lab.github.io/framework/docs/tev2/spec-tools/trrt) for YAML file formatting guides. You can run the test demonstration with the command:

`trrt -o __tests__/output -s src/test_files 'src/test_files/terminology/*'`
