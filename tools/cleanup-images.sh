#!/bin/bash

docker images |grep '<none>' | awk '{print $3}' |xargs -I xx docker rmi xx
