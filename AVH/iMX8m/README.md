# Build and Upload the Yocto image for Arm Virtual Hardware (AVH) Simulator
This repository contains instructions to build a Yocto image and upload it to AVH.

**Pre-requisites:**
1. An AWS Account, AWS tokens for programmatic access.
2. An account for Arm Virtual Hardware, currently in private Beta testing.
3. A powerful EC2 instance to build the Yocto image.

**Notes**:
- The image will be initially built for iMX8m, but it is possible to extend this repo for other device available in AVH.

**Steps to build the image**
The step below will refer to steps from the [NXP Yocto Project user guide](https://www.nxp.com/docs/en/user-guide/IMX_YOCTO_PROJECT_USERS_GUIDE.pdf).
1. Launch the AWS EC instance to use for building the image. 
   **Note**: The testing for this project was done on a `c6gd.8xlarge ubuntu-jammy-22.04-arm64-server` instance.
2. Follow the steps from chapter **3.2 Host packages** in the NXP Yocto Project Guide to set up the instance.
3. Perform the following Yocto set-up steps:

```
mkdir imx-yocto-bsp
cd imx-yocto-bsp
repo init -u https://github.com/nxp-imx/imx-manifest -b imx-linux-kirkstone -m imx-5.15.71-2.2.0.xml
repo sync
DISTRO=fsl-imx-wayland MACHINE=imx8mpevk source imx-setup-release.sh -b build-dir
YOCTO_VERSION=kirkstone
git clone -b $YOCTO_VERSION https://github.com/aws/meta-aws
```
4. Add the `aws-iot-device-client` and `nodejs`packages and configurations to `imx-yocto-bsp/build-dir/conf/local.conf`:

Edit `imx-yocto-bsp/build-dir/conf/local.conf` and add:
```
IMAGE_INSTALL:append = " aws-iot-device-client nodejs"

# Configuration for aws-iot-device-client
# All samples
PACKAGECONFIG:append:pn-aws-iot-device-client = " samples"
# Pubsub sample
PACKAGECONFIG:append:pn-aws-iot-device-client = " pubsub"
# Device Defender
PACKAGECONFIG:remove:pn-aws-iot-device-client = " dd"
# Fleet management - provisioning
PACKAGECONFIG:append:pn-aws-iot-device-client = " fp"
# Fleet management - jobs
PACKAGECONFIG:append:pn-aws-iot-device-client = " jobs"
# Secure tunneling
PACKAGECONFIG:remove:pn-aws-iot-device-client = " st"
# Device shadow
PACKAGECONFIG:remove:pn-aws-iot-device-client = " ds"
# Device shadow - config shadow
PACKAGECONFIG:remove:pn-aws-iot-device-client = " dsc"
# Device shadow - named shadow
PACKAGECONFIG:remove:pn-aws-iot-device-client = " dsn"
```
5. Add the meta-aws layer:

`bitbake-layers add-layer ../sources/meta-aws/`

6. Build the image:
`bitbake imx-image-full -k > build.log 2>&1 &`

**Steps to prepare the image for AVH-iMX8m **

1. Read and understand the packaging formats supported by AVH from the [AVH Guide](https://developer.arm.com/documentation/107660/0200/Getting-started/Quickstart/Quickstart-for-iMX8m-Arm-Cortex-Complex?lang=en) https://developer.arm.com/documentation/107660/0200/Custom-Firmware/Firmware/Understanding-Firmware-on-AVH?lang=en
2. Prepare the contents of the ZIP image package, for the newly built iMX8m image:
```
cd /home/ubuntu/imx-yocto-bsp/build-dir/tmp/deploy/images/imx8mpevk
mkdir zip 
cd zip
cp ../imx8mp-evk.dtb devicetree
cp ../Image kernel
cp ../imx-image-full-imx8mpevk.wic.zst .
unzstd imx-image-full-imx8mpevk.wic.zst
mv imx-image-full-imx8mpevk.wic nand
rm imx-image-full-imx8mpevk.wic.zst
touch Info.plist
```
3. Add  meta information to the `Info.plist` file:
An example below:
```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Type</key>
    <string>iot</string>
    <key>UniqueIdentifier</key>
    <string>Yocto Linux (full)</string>
    <key>DeviceIdentifier</key>
    <string>imx8mp-evk</string>
    <key>Version</key>
    <string>2.2.11-new</string>
    <key>Build</key>
    <string>5.10.72-2.2.11_DC</string>
</dict>
</plist>
```
4. Create ZIP:

`zip -r image.zip Info.plist nand devicetree kernel`

5. Save the image locally to upload it to the AVH device (you can copy it from the EC2 instance or place it in a bucket and download it)
6. Create the iMX8m Arm Cortex device in AVH. You can follow the steps from [AVH Getting Started Guide](https://developer.arm.com/documentation/107660/0200/Getting-started/Quickstart/Quickstart-for-iMX8m-Arm-Cortex-Complex?lang=en)
On the 'Configure your Device' page, got to 'Upload your custom firmware', click 'Browse' and choose the ZIP file.
Click 'Next' and wait for your device to be configured and boot.

After the steps above are done, your AVH device is ready. 