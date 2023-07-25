# MQTT device client
When started, this MQTT device client will:
- Connect to AWS IoT Core, create an AWS IoT thing with the name specified in config.js, if it does not exist. 
- Register the thing, store the certificate and key, only if the unique identity is not already present. 
- Connect to the AWS IoT Device Advisor endpoint, subscribe to topics, publish device stat data, for testing purposes.

_Note_ : this code is sample code and not meant to be used for production in a lift and shift manner.
_Note_ : You need to create an AWS IoT Policy. You can use the AWS IoT Console. Use the JSON below as the body of the IoT Policy:

`{
"Version": "2012-10-17",
"Statement": [
{
"Effect": "Allow",
"Action": "iot:Connect",
"Resource": "arn:aws:iot:<YOUR_REGION>:<YOUR_ACCOUNT>:client/${iot:Connection.Thing.ThingName}"
},
{
"Effect": "Allow",
"Action": "iot:Publish",
"Resource": "arn:aws:iot:<YOUR_REGION>:<YOUR_ACCOUNT>:topic/devices/*"
},
{
"Effect": "Allow",
"Action": "iot:Subscribe",
"Resource": "arn:aws:iot:<YOUR_REGION>:<YOUR_ACCOUNT>:topicfilter/devices/*"
},
{
"Effect": "Allow",
"Action": "iot:Receive",
"Resource": "arn:aws:iot:<YOUR_REGION>:<YOUR_ACCOUNT>:topicfilter/devices/*"
}
]
}`

## Running the device simulator 
- Connect to your AVH iMX8m where you uploaded the image at the previous step and download the app files. 
- Navigate to the `app/` directory.
- Create a `config.js` file and follow the instructions from the [config-template.js](../app/config_template.js). 
- Run `node simulator-main.js`
