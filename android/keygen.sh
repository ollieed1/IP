#!/bin/bash
# Run this once to create a signing keystore for release builds.
# Keep keystore.jks safe — you need it to update the app in future.

keytool -genkey -v \
  -keystore keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias iptv \
  -dname "CN=IP Player, OU=App, O=Groogle, L=London, S=England, C=GB"

echo ""
echo "keystore.jks created. Set these env vars to build a release APK:"
echo "  export KEYSTORE_PATH=$(pwd)/keystore.jks"
echo "  export KEYSTORE_PASS=<your password>"
echo "  export KEY_ALIAS=iptv"
echo "  export KEY_PASS=<your password>"
