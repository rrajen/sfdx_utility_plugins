import { flags, SfdxCommand } from '@salesforce/command';
import { query as jsonpathQuery} from 'jsonpath';

class ErrorLog {
    constructor(logData) {
        this.componentName = logData.fullName;
        this.componentType = logData.componentType;
        this.problem       = logData.problem;
        this.problemType   = logData.problemType;
        this.lineNumber    = logData.lineNumber;
        this.columnNumber  = logData.columnNumber;
    }
}

export default class Artifacts extends SfdxCommand {

    public static description = "displays the artifacts associated with a specific deployment";

    public static examples = [
`sfdx devops:deployment:artifacts -u someOrg -i DeploymentId
// displays the artifacts that were associated with a specific deployment
`
    ];

    protected static requiresUsername = true;

    protected static flagsConfig = {
        deploymentid: flags.string({ required: true, char: 'i', description: 'Deployment Identifier ex: 0Afq000001HKFDO' }),
        summary: flags.boolean({ char: 's', description: 'Display only summary information' }),
        nocolors: flags.boolean({ description: 'Don\'t colorize output'}),
        noglyphs: flags.boolean({ description: 'Don\'t use glyphs in the output'})
    };

    _printSummary(deployResult) {
        this.ux.log('****** Deployment Summary ******');
        // Summary details:
        /*
        {
          "checkOnly": true,
          "completedDate": "2021-03-15T22:57:38.000Z",
          "createdBy": "0054T000001OTRp",
          "createdByName": "Raj Rajen",
          "createdDate": "2021-03-15T22:55:21.000Z",
          "details": {
          ...
          }
          "done": true,
          "id": "0Afq000001HzQ1qCAF",
          "ignoreWarnings": false,
          "lastModifiedDate": "2021-03-15T22:57:38.000Z",
          "numberComponentErrors": 19,
          "numberComponentsDeployed": 2187,
          "numberComponentsTotal": 2206,
          "numberTestErrors": 0,
          "numberTestsCompleted": 0,
          "numberTestsTotal": 0,
          "rollbackOnError": true,
          "runTestsEnabled": false,
          "startDate": "2021-03-15T22:55:23.000Z",
          "status": "Failed",
          "success": false
        }
        */

        var createdByName            = jsonpathQuery(deployResult, '$.createdByName');
        var createdDate              = jsonpathQuery(deployResult, '$.createdDate');
        var completedDate            = jsonpathQuery(deployResult, '$.completedDate');
        var checkOnly                = jsonpathQuery(deployResult, '$.checkOnly');
        var runTestsEnabled          = jsonpathQuery(deployResult, '$.runTestsEnabled');
        var status                   = jsonpathQuery(deployResult, '$.status');
        var numberComponentsTotal    = jsonpathQuery(deployResult, '$.numberComponentsTotal');
        var numberComponentsDeployed = jsonpathQuery(deployResult, '$.numberComponentsDeployed');
        var numberComponentErrors    = jsonpathQuery(deployResult, '$.numberComponentErrors');

        this.ux.log('    Created By                 : ' + createdByName);
        this.ux.log('    Created Date               : ' + createdDate);
        this.ux.log('    Completed Date             : ' + completedDate);
        this.ux.log('    Check Only                 : ' + checkOnly);
        this.ux.log('    Run Tests Enabled          : ' + runTestsEnabled);
        this.ux.log('    Status                     : ' + status);
        this.ux.log('    Total Number of Components : ' + numberComponentsTotal);
        this.ux.log('    Success Count              : ' + numberComponentsDeployed);
        this.ux.log('    Failure Count              : ' + numberComponentErrors);
        return;
    };

    public async run(): Promise<any> {
        var GREEN_COLOR = '\x1b[32m';
        var RED_COLOR   = '\x1b[31m';
        var RESET_COLOR = '\x1b[0m';

        if (this.flags.nocolors) {
            GREEN_COLOR = '';
            RED_COLOR   = '';
            RESET_COLOR = '';
        }

        var SUCCESS_GLYPH = '\u2714 '; // extra space is intentional
        var ERROR_GLYPH   = '\u2716 '; // extra space is intentional

        if (this.flags.noglyphs) {
            SUCCESS_GLYPH = '';
            ERROR_GLYPH   = '';
        }

        const conn = await this.org.getConnection();
        const apiVersion = this.flags.apiversion || (await this.org.retrieveMaxApiVersion());

        const deployResult = await conn.metadata.checkDeployStatus(this.flags.deploymentid, true);

        if (this.flags.json) {
            this.ux.logJson(deployResult);
        } else {
            var artifacts = new Map();
            var errors = new Array();

            this.ux.log('\nDeployment Result for Id ' + this.flags.deploymentid + '\n');
            this._printSummary(deployResult);

            var successes = jsonpathQuery(deployResult, '$..componentSuccesses');
            var components = successes[0]
            if (Array.isArray(components)) {
                //this.ux.log('***** Component Successes *****')
                components.forEach( (component) => {
                    if (component.componentType) {
                        if (!artifacts.has(component.componentType)) {
                            artifacts.set(component.componentType, []);
                        }
                        artifacts.get(component.componentType).push(GREEN_COLOR + SUCCESS_GLYPH + component.fullName + RESET_COLOR);
                    }
                });
            }


            var failures = jsonpathQuery(deployResult, '$..componentFailures');
            components = failures[0]
            if (Array.isArray(components)) {
                //this.ux.log('***** Component Failures *****')
                components.forEach( (component) => {
                    var elog = new ErrorLog(component);
                    errors.push(elog);

                    if (component.componentType) {
                        if (!artifacts.has(component.componentType)) {
                            artifacts.set(component.componentType, []);
                        }
                        artifacts.get(component.componentType).push(RED_COLOR + ERROR_GLYPH + component.fullName + RESET_COLOR);
                    }
                });
            }


            if (!this.flags.summary) {
                if (artifacts.size > 0) {
                    this.ux.log('\n****** Components ******');
                }
                var sortedArtifacts = new Map([...artifacts.entries()].sort());
                for (var [key, items] of sortedArtifacts) {
                    this.ux.log(key);
                    var sortedItems = items.sort();
                    sortedItems.forEach( (item, indx) => {
                        this.ux.log('    '+item);
                    });
                }
            } else {
                this.ux.log('\n****** Components Summary ******');
                var sortedArtifacts = new Map([...artifacts.entries()].sort());
                for (var [key, items] of sortedArtifacts) {
                    this.ux.log('    ' + key + ' (' + items.length + ')');
                }
            }

            if (errors.length > 0) {
                this.ux.log('\n****** Errors ******');
                errors.forEach( (elog) =>  {
                    if (elog.lineNumber) {
                        this.ux.log(`${elog.componentType}/${elog.componentName}(${elog.lineNumber}:${elog.columnNumber}) : ${elog.problem}`);
                    } else {
                        this.ux.log(`${elog.componentType}/${elog.componentName} : ${elog.problem}`);
                    }

                });
            }
        }

        //return deployResult;
        return;
    }
}
