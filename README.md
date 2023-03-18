## Debugging IoT Connectivity with Arm Virtual Hardware and AWS IoT Core Device Advisor.

This sample project shows how to build and deploy a custom firmware image to an iMX8m Arm Virtual Hardware (AVH) device, run an MQTT application which connects to AWS IoT, subscribes to IoT topics and publishes 
network and memory stats from the device. The resilience of the MQTT application implementation will be tested by running AWS IoT Device Advisor integration tests. We will be focusing on the AWS Qualification Test Suite in this readme, but
you can extend the test suites to include any of the AWS IoT Core Device Advisor available tests. More information on available test suites [here](https://docs.aws.amazon.com/iot/latest/developerguide/device-advisor-tests.html). 

Follow the steps in the 2 parts below sequentially:
1. [Part 1: Build and Upload the Yocto image for Arm Virtual Hardware (AVH) Simulator](AVH/iMX8m/README.md)

3. [Part 2: Configure Device Advisor Tests and Start your Device MQTT Client. 
](device-advisor/README.md)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

