#!/bin/bash
set -e

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ..
npm i -g nodemon

# Setup environment
cp -n .env.example .env

# Run backend
cd backend
npm run dev &

# Run frontend
cd ../frontend
npm run dev &
wait