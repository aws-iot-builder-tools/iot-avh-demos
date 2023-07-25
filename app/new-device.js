import {
    IoTClient,
    CreateThingCommand,
    CreateKeysAndCertificateCommand, AttachPolicyCommand, AttachThingPrincipalCommand, CreatePolicyCommand
} from "@aws-sdk/client-iot";
import fs from 'fs';
import {config} from './config.js';
const CERTIFICATE_FILE = './certificate.pem';
const PRIVATE_KEY_FILE = './private-key.pem';
const POLICY_NAME= "IoTPolicy";
const client = new IoTClient({region: config.region});

export class Device {
    constructor(options = {}) {
      this._thingName = options.thingName;
      this._logger = options.logger;
    }

    get thingName () {
        return this._thingName;
    }

    //This is an idempotent call. It does not matter that the IoT thing exists already.
    async createThing() {
        this._logger.info('[Device] Creating or Updating thing ', this.thingName);
        const command = new CreateThingCommand({thingName: this.thingName});
        return await client.send(command);
    }

    async createIdentity() {
        try {
            if (fs.existsSync(CERTIFICATE_FILE) && fs.existsSync(PRIVATE_KEY_FILE)) {
                this._logger.error('[Device] Certificate and private key files exist');
                return true;
            } else {
                this._logger.info('[Device] Creating key and cert for thing ', this.thingName);
            }
        } catch(err) {
            this._logger.error('[Device] Error checking certificate and private key files', err);
        }
        const command = new CreateKeysAndCertificateCommand({setAsActive: true});
        const response = await client.send(command);
        this._storeCertificate(response);
        try {
            await this._createIoTPolicy();
        } catch (e) {
            this._logger.error('[Device] Error creating policy', e.toString());
        }
        await this._attachPolicyToCertificate(response);
        return await this.attachCertificateToThing(response);
    }


    async _createIoTPolicy() {
        const policyDocument =
            {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Action: "iot:Connect",
                        Resource: `arn:aws:iot:${config.region}:${config.accountId}:client/\${iot:ClientId}`
                    },
                    {
                        Effect: "Allow",
                        Action: "iot:Publish",
                        Resource: `arn:aws:iot:${config.region}:${config.accountId}:topic/devices/*`
                    },
                    {
                        Effect: "Allow",
                        Action: "iot:Receive",
                        Resource: `arn:aws:iot:${config.region}:${config.accountId}:topic/devices/*`
                    },
                    {
                        Effect: "Allow",
                        Action: "iot:Subscribe",
                        Resource: `arn:aws:iot:${config.region}:${config.accountId}:topicfilter/devices/*`
                    },
                ]
            };
        const input = {
            policyName: POLICY_NAME,
            policyDocument: JSON.stringify(policyDocument),
        };
        const command = new CreatePolicyCommand(input);
        return await client.send(command);
    }

     _storeCertificate  (response) {
        fs.writeFileSync("./private-key.pem", response.keyPair.PrivateKey);
        fs.writeFileSync("./certificate.pem", response.certificatePem);
        return true;
    };

    async _attachPolicyToCertificate(certResponse) {
        //TODO: this must exist. Must create full citizen policy in CF.
        this._logger.info('[Device] Attaching policy to principal ', this.thingName);
        const command = new AttachPolicyCommand({policyName: POLICY_NAME, target: certResponse.certificateArn});
        return await client.send(command);
      }

    async attachCertificateToThing(certResponse) {
        this._logger.info('[Device] Attaching cert to thing ', this.thingName);
        const command = new AttachThingPrincipalCommand({thingName: this.thingName, principal: certResponse.certificateArn});
        return await client.send(command);
    }
}
