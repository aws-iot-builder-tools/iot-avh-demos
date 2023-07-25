# MQTT device client
When started, this MQTT device client will:
- Connect to AWS IoT Core, create an AWS IoT thing with the name specified in config.js, if it does not exist. 
- Register the thing, store the certificate and key, only if the unique identity is not already present. 
- Connect to the AWS IoT Device Advisor endpoint, subscribe to topics, publish device stat data, for testing purposes.

_Note_ : this code is sample code and not meant to be used for production in a lift and shift manner.

## Running the device simulator 
- Connect to your AVH iMX8m where you uploaded the image at the previous step and download the app files. 
- Navigate to the `app/` directory.
- Create a `config.js` file and follow the instructions from the [config-template.js](../app/config_template.js). 
- Run `node simulator-main.js`

## Clean-up
- Navigate to the `app/` directory.
- Run `node clean-up.js`