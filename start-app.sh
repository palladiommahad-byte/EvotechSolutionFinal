#!/bin/bash
echo "Starting EvoTech Solution..."
docker-compose up -d
echo "Application started!"
echo "Opening browser..."
sleep 5
if which xdg-open > /dev/null; then
  xdg-open http://localhost
elif which gnome-open > /dev/null; then
  gnome-open http://localhost
fi
