# Set up your test suite and run it

For executing IoT Core Device Advisor tests, we will use the AWS CLI, but also the AWS Console. The AWS Console will be used to create a test suite. 
This test suite is generally created one, and ran multiple times. 

## Pre-requisites 
- Make sure you have an AWS Account, and you can log into the AWS Console.
- Make sure your AWS CLI is configured correctly with the AWS credentials, including the AWS Region.

## Create the test suite 
Follow the instructions [here](https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-console-tutorial.html#device-advisor-console-create-suite) to create the test suite in the AWS Console.
This sample is configured to run the AWS Qualification Test Suite, but you can create other test suites if you so wish.

## Create the IAM Role 
Follow the instructions [here](https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-setting-up.html#da-iam-role) to create an AWS IAM Role which will be used as your device role. 
Copy the role ARN, because your will need it in the next steps.

## Run the test suite on the iMX8m-84 AVH device
- **First get the suite id**:

`aws iotdeviceadvisor list-suite-definitions
`
and copy the suite id. 

- **Start execution**:
```
aws iotdeviceadvisor start-suite-run \
--suite-definition-id <SUITE_ID> \
--suite-definition-version v1 \
--suite-run-configuration '{"primaryDevice":{"thingArn": "arn:aws:iot:<YOUR_REGION>:<YOUR_ACCOUNT_ID>:thing/iMX8m-84"}}'
```
- **Start your device simulator application on the AVH device.**
Follow the instructions [here](../app/README.md).

_Note_ : You need to start the simulator app immediately after the test suite run is `IN PROGRESS`. Otherwise, there will be MQTT errors. For more information, have a look at the Device Advisor [docs](https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-troubleshooting.html). 

- **Examine your test suite run results**
You can do this in the AWS Console, as instructed [here](https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-console-tutorial.html#device-advisor-console-view-logs). 

## Other useful AWS CLI commands for Device Advisor
`aws iotdeviceadvisor get-endpoint`

`aws iotdeviceadvisor create-suite-definition --suite-definition-configuration <YOUR_CONFIGURATION>`

`aws iotdeviceadvisor list-suite-definitions
`

`aws iotdeviceadvisor list-suite-runs
`

`aws iotdeviceadvisor get-suite-run  --suite-definition-id  <SUITE_ID>  --suite-run-id <SUITE_RUN_ID>
`

`aws iotdeviceadvisor get-suite-run-report  --suite-definition-id <SUITE_ID>  --suite-run-id <SUITE_RUN_ID>
`