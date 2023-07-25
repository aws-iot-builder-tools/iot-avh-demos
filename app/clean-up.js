import {
    IoTClient,
    DetachPolicyCommand, DeletePolicyCommand, DetachThingPrincipalCommand, ListThingPrincipalsCommand, DeleteThingCommand
} from "@aws-sdk/client-iot";
import {logger} from "../app/logger.js";
import {config} from "../app/config.js";

const client = new IoTClient({region: config.region});

const cleanUp = async () => {
    const principalsResponse = await client.send(new ListThingPrincipalsCommand({thingName: config.clientId}));
    const principals = principalsResponse?.principals;
    console.log('[CleanUp] Cleaning up resources for thing', {principals: principals});
    for (let j = 0; j < principals.length; j++) {
        console.log('[CleanUp] Detaching principal for thing', {
            thingName: config.clientId,
            principal: principals[j]
        });
        await client.send(new DetachThingPrincipalCommand({
            thingName: config.clientId,
            principal: principals[j]
        }));

        const detachPolicyResult = await client.send(new DetachPolicyCommand({
            policyName: "IoTPolicy",
            target: principals[j]
        }))
        console.log('[CleanUp] Detached policy from principal', detachPolicyResult);
    }
    console.log('[CleanUp] Deleting thing', {thingName: config.clientId});
    const deleteThingResult = await client.send(new DeleteThingCommand({thingName: config.clientId}));
    console.log('[CleanUp] Deleted thing', deleteThingResult);
    return await client.send(new DeletePolicyCommand({policyName: "IoTPolicy"}));
}

await cleanUp().then(()=> {
    logger.info('[CleanUp] Done.');
});

