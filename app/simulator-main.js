'use strict';
import {config} from './config.js';
import {Device} from "./new-device.js";
import {MqttClientWrapper} from "./mqtt-wrapper.js";
import {logger} from "./logger.js";
import si from "systeminformation";
import {mqtt} from "aws-iot-device-sdk-v2";

let client = null;
let clientId = null;
let statsInterval, heartbeatInterval;

const main = async (config) => {
    config.clientId = config.clientId || "iMX8m-" + Math.floor(Math.random() * 100);
    clientId = config.clientId;
    const policyName = config.policyName;
    const publishEventsTopic = `devices/${clientId}/events`;
    const publishStatsTopic = `devices/${clientId}/stats`;
    config.logger = logger;
    const device = new Device({thingName: clientId, logger: logger, policyName: policyName});
    //These calls are idempotent.
    await device.createThing();
    await device.createIdentity();

    runSimulator(config)
        .then(async () => {
            logger.info(' [Main] Started');
            setTimeout(async () => {
                //Send first boot.
                await sendFirstBoot(publishEventsTopic, 'FirstBoot');
            }, 30 * 1000);
            heartbeatInterval = setInterval(async () => {
                //Send heartbeat.
                await sendStatistics(publishStatsTopic);
            }, 30 * 1000);
        })
        .catch(err => logger.error('[Main] ', err));
};

const runSimulator = async (config) => {
    client = new MqttClientWrapper(config);
    client.on('connected', async () => {
        await client.subscribe(`devices/${clientId}/from_cloud`, 1, onMessage);
        logger.info('[Main] OnConnected');
    });
    client.on('disconnected', async () => {
        logger.info('[Main] OnDisconnected');
        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
    });
    const result = await client.start();
    logger.info('[Main] StartResult', result);
}

const onMessage = async (topic, payload) => {
    logger.info('[Main] MessageReceived', {topic, payload: payload});
};

const sendMessage = async (topic, message) => {
    logger.info('[Main] Publishing', {topic, payload: message});
    return client.publish(topic, message,  mqtt.QoS.AtLeastOnce, false);
}

// Send network and memory statistics over MQTT.
const sendStatistics = async (publishStatsTopic) => {
    try {
        const network = await si.networkStats();
        const memory = await si.mem();
        const stats = {
            network: network && network[0] ? network[0] : undefined,
            memory: memory
        };
        await sendMessage(publishStatsTopic, stats);
    } catch (err) {
        logger.error('[Main] Error publishing stats', err);
    }
};

const sendFirstBoot = async (topic) => {
    const message = {
        deviceId: clientId,
        name: "BOOT",
        params: {}
    }
    logger.info('[Main] Boot Message', {message});
    await sendMessage(topic, clientId, message);
}

await main(config);


