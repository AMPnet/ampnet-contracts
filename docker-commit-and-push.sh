#!/bin/bash

version=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')

version="$(echo -e "${version}" | sed -e 's/^[[:space:]]*//')"
echo "Docker image: ampnet/crowdfunding-contracts:$version"
docker commit ampnet-ganache ampnet/crowdfunding-contracts:$version
docker tag ampnet/crowdfunding-contracts:$version ampnet/crowdfunding-contracts:latest
docker push ampnet/crowdfunding-contracts:$version
