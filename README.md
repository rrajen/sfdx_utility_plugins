# SFDX Devops Utility Plugins

A repository for Salesforce SFDX CLI plugins to aid devops activities

## Setup

### Install as plugin

```
Coming soon...
```

### Install from source

Clone this repo and run `npm install`. Then run,

```
sfdx plugins:link .
```

## Usage

```
# to show the deployed artifacts of specific deployment (the 0Af Id is a required parameter)
sfdx devops:deployment:artifacts -u YourUserAlias -i 0Afq000001HzQ1q

# to show just the summary information
sfdx devops:deployment:artifacts -u YourUserAlias -i 0Afq000001HzQ1q --summary

# to disable colors and glyphs
sfdx devops:deployment:artifacts -u YourUserAlias -i 0Afq000001HzQ1q --nocolors --noglyphs

# to get the raw JSON output use:
sfdx devops:deployment:artifacts -u YourUserAlias -i 0Afq000001HzQ1q --json
```

## Feedback

Feature requests, bug reports and pull requests are welcome!
