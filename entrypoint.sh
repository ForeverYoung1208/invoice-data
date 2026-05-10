#!/bin/bash
[ -d /tmp/.ssh ] && [ ! -d /root/.ssh ] && cp -r /tmp/.ssh /root/.ssh && chmod 700 /root/.ssh
[ -d /tmp/.pi ] && [ ! -d /root/.pi ] && cp -r /tmp/.pi /root/.pi
exec bash
