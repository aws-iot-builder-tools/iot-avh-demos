import {AwsIotMqttConnectionConfigBuilder} from 'aws-crt/dist/native/aws_iot.js';
import {ClientBootstrap} from 'aws-crt/dist/native/io.js';
import {MqttClient } from 'aws-crt/dist/native/mqtt.js';
import process from "node:process";
import EventEmitter from "events";
import {io} from 'aws-crt';

const CERTIFICATE_FILE = './certificate.pem';
const PRIVATE_KEY_FILE = './private-key.pem';

/**
 * MqttClient_ConfigureConnection_OnError - we should retry here too:
 * AWS_IO_SOCKET_CLOSED, AWS_ERROR_MQTT_UNEXPECTED_HANGUP and others. So weird that the client is not retrying.
 */

export class MqttClientWrapper extends EventEmitter {
    constructor(options = {}) {
        super();
        this._options = options;
        this._connected = false;
        this._clientId = this._options.clientId;
        this._verbosity = this._options.verbosity;
        this._connection = null;
        this._client = null;
        this._clientBootstrap = undefined;
        this._logger = options.logger;
        this.enableLogging(this._verbosity);
    }

    enableLogging(verbosity) {
        if (verbosity != 'none') {
            const level = parseInt(io.LogLevel[verbosity.toUpperCase()]);
            this._logger.info('Verbosity level', level);
            io.enable_logging(level);
        }
    }

    async start() {
        this._logger.info('[MqttClient_Start]', {clientId: this._clientId});
        try {
            if ((await this._createClient()) && (await this._configureConnection()) && (await this._connect())) {
                this._logger.info('[MqttClient_Start_Started]', {clientId: this._clientId});
                return true;
            } else {
                this._logger.info('[MqttClient_Start_NotStarted]', {clientId: this._clientId});
                return false;
            }
        } catch (error) {
            this._logger.error('[MqttClient_Start_Error]', error)
            return false;
        }
    }

    async _stop() {
        this._logger.info('[MqttClient_Stop]', {clientId: this._clientId});
        const result = await this._disconnect();
        this._connected = false;
        this._connection = null;
        this._client = null;
        this._clientBootstrap = undefined;
        return result;
    }

    async publish(topic, payload, qos, retain) {
        if (!this._connection) {
            this._logger.info('[MqttClient_Publish_ConnectionDoesNotExist]', {clientId: this._clientId});
            return false;
        }
        try {
            let request = await this._connection.publish(topic, payload, qos.valueOf(), retain);
            if (!request || !request.packet_id) {
                this._logger.info('[MqttClient_publish]: Packet not sent, missing packet_id.');
            }
            return true;
        } catch (error) {
            this._logger.error('[MqttClient_Publish_Error]', error.toString());
            return false;
        }
    }

    async subscribe(topic, qos, onMessage) {
        this._logger.info('[MqttClient_Subscribe]', {clientId: this._clientId, topic});
        if (!this._connection) {
            this._logger.info('[MqttClient_Subscribe_ConnectionDoesNotExist]', {clientId: this._clientId});
            return false;
        }
        try {
            const test = await this._connection.subscribe(topic, qos, onMessage);
            this._logger.info('HERE SUBSCRIBING: ', JSON.stringify(test));
            return true;
        } catch (error) {
            this._logger.error('[MqttClient_Subscribe_Error]', error);
            return false;
        }
    }

    async unsubscribe(topic) {
        this._logger.info('[MqttClient_Unsubscribe]', {clientId: this._clientId, topic});
        if (!this._connection) {
            this._logger.info('[MqttClient_ConnectionDoesNotExist]', {clientId: this._clientId});
            return false;
        }
        try {
            await this._connection.unsubscribe(topic);
            return true;
        } catch (error) {
            this._logger.error('[MqttClient_Unsubscribe_Error] ', error);
            return false;
        }
    }

    async _createClient() {
        this._logger.info('[MqttClient_CreateClient]', {clientId: this._clientId});
        if (this._client) {
            return true;
        }
        this._clientBootstrap = this._clientBootstrapFactory();
        this._client = this._clientFactory();
        this._logger.info('[MqttClient_CreateClient_Created]', {clientId: this._clientId});
        return true;
    }

    async _configureConnection() {
        this._logger.info('[MqttClient_ConfigureConnection]', {clientId: this._clientId});
        if (!this._client || !this._clientBootstrap) {
            return false;
        }
        if (this._connection) {
            return true;
        }
        const config = this._mqttConnectionConfigFactory();
        this._connection = this._client.new_connection(config);
        if (!this._connection) {
            this._logger.info('[MqttClient_ConfigureConnection_NotCreated]', {clientId: this._clientId});
            return false;
        }
        this._connection.on('connect', (sessionPresent) => {
            this._logger.info('[MqttClient_ConfigureConnection_OnConnect]', {clientId: this._clientId, sessionPresent});
            this._connected = true;
            this.emit('connected');
        });
        this._connection.on('disconnect', () => {
            this._logger.info('[MqttClient_ConfigureConnection_OnDisconnect]', {clientId: this._clientId});
            this._connected = false;
            this.emit('disconnected');
        });
        this._connection.on('error', (error) => {
            this._logger.info('[MqttClient_ConfigureConnection_OnError]', {
                clientId: this._clientId,
                error: error.toString()
            }); //TODO: implement retries here.
            // Example: Failed to connect: aws-c-io: AWS_IO_DNS_INVALID_NAME, Host name was invalid for dns resolution.
        });
        this._connection.on('interrupt', (error) => {
            this._logger.info('[MqttClient_ConfigureConnection_OnInterrupt]', {
                clientId: this._clientId,
                error: error.toString()
            });
            // Example: libaws-c-mqtt: AWS_ERROR_MQTT_UNEXPECTED_HANGUP, The connection was closed unexpectedly.
            // Example: libaws-c-mqtt: AWS_ERROR_MQTT_TIMEOUT, Time limit between request and response has been exceeded.
        });
        this._connection.on('resume', (returnCode, sessionPresent) => {
            this._logger.info('[MqttClient_ConfigureConnection_OnResume]', {
                clientId: this._clientId,
                returnCode,
                sessionPresent
            });
            this._connected = true;
            if (!sessionPresent && returnCode === 0) {
                this.emit('connected');
            }
        });
        this._connection.on('message', (returnCode, sessionPresent) => {
            this._logger.info('[MqttClient_ConfigureConnection_OnMessage]', {
                clientId: this._clientId,
                returnCode,
                sessionPresent
            });
        });

        const handleError = (error) => {
            if (error.toString && error.toString().includes('AWS')) {
                this._logger.error('[MqttClient_Error]', error)
            } else {
                this._logger.info('[MqttClient_Error]', error)
                throw error;
            }
        };
        process.on('[MqttClient_ConfigureConnection] UncaughtException', handleError);
        process.on('[MqttClient_ConfigureConnection] UnhandledRejection', handleError);
        this._logger.info('[MqttClient_ConfigureConnection]', {clientId: this._clientId});
        return true;
    }

    async _connect() {
        this._logger.info('[MqttClient_Connect]', {clientId: this._clientId});
        if (!this._connection) {
            return false;
        }
        if (this._connected) {
            return true;
        }
        try {
            const connectionIsNew = await this._connection.connect();
            this._logger.info('[MqttClient_Connect_Connected]', {clientId: this._clientId, connectionIsNew});
            return true;
        } catch (error) {
            this._logger.error('[MqttClient_Connect_Error]', error)
            return false;
        }
    }

    async _disconnect() {
        this._logger.info('[MqttClient_Disconnect]', {clientId: this._clientId});
        if (!this._connection) {
            return fale;
        }
        try {
            await this._connection.disconnect();
            this._logger.info('[MqttClient_Disconnect_Disconnected]', {clientId: this._clientId});
            return true;
        } catch (error) {
            this._logger.error('[MqttClient_Disconnect_Error]', error)
            return false;
        }
    }

    _mqttConnectionConfigFactory() {
        const configBuilder = AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(CERTIFICATE_FILE, PRIVATE_KEY_FILE);
        configBuilder.with_clean_session(false);
        configBuilder.with_endpoint(this._options.daEndpoint);
        configBuilder.with_client_id(this._clientId);
        configBuilder.with_keep_alive_seconds( this._options.keepAlive || 15);
        configBuilder.with_reconnect_max_sec(30);
        return configBuilder.build();
    }

    _clientBootstrapFactory() {
        return new ClientBootstrap();
    }

    _clientFactory() {
        if (!this._clientBootstrap) {
            throw new Error('clientBootstrap is not defined');
        }
        return new MqttClient(this._clientBootstrap);
    }

    get connected() {
        return this._connected;
    }
}
