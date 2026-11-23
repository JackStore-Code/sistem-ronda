#!/bin/bash
# Kill process by PID on Windows via taskkill (git-bash mangles /FLAGS, use MSYS2_ARG_CONV_EXCL)
PID="$1"
MSYS2_ARG_CONV_EXCL='*' taskkill /PID "$PID" /F 2>&1
