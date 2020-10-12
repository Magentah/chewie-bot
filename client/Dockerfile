FROM node:12-alpine AS base
WORKDIR /usr/src/chewiebot/client

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH
COPY package*.json ./
RUN yarn install
RUN yarn global add react-scripts


FROM base AS build
WORKDIR /usr/src/chewiebot/client
COPY . ./
COPY ./public/assets /usr/src/chewiebot/client/assets