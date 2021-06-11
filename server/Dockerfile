
# --- Base ---
FROM node:12-alpine AS base

# --- Development ---
FROM base AS globalsetup
WORKDIR /usr/src/chewiebot/server
COPY . .

# Add sqlite3 for checking db
RUN apk add --no-cache sqlite
# Install Typescript and TS-Node for dev
RUN npm install -g typescript


# --- Dependencies ---
FROM globalsetup AS dependencies

# Copy chewiebot to docker
WORKDIR /usr/src/chewiebot/server
COPY package.json .
# Install git for package installations
RUN apk add --no-cache git
# install ALL node_modules, including 'devDependencies'
RUN npm install

FROM dependencies as dev
# Start
WORKDIR /usr/src/chewiebot/server/

RUN mkdir -p images
RUN mkdir -p db

#RUN chown -R node:node .

EXPOSE 8080

USER node