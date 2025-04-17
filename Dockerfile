##<--#####################################################
##  Dockerfile shit                                     ##
#####################################################-->##
# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:18-alpine AS builder
WORKDIR /usr/src/app

## ----------[ Install deps ]---------- ##
COPY package*.json ./
RUN npm ci

## ----------[ copy TS sources & compile ]---------- ##
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

## ----------[ runtime ]---------- ##
FROM node:18-alpine AS production
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

ENV NODE_ENV=production

## ----------[ run ]---------- ##
CMD ["node", "dist/bot.js"]
