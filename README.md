# chewie-bot

## Twitch.tv Bot for musicians

---

### Dev Setup

-   In the `/server/src` folder, rename `myconfig.json` to `config.json` and update with your config details.

-   ### Secret Key

    -   This needs to be a 32 character random string, used for encryption/decryption.

-   #### Twitch

    -   You will need to setup a Twitch App at [https://dev.twitch.tv/console](https://dev.twitch.tv/console). You will then need to copy your client_id and client_secret for the app to the config.
    -   The redirect URL should be `http://localhost/api/auth/twitch/redirect` by default.
    -   For `oauth` enter an OAuth ID generated at [https://twitchapps.com/tmi/](https://twitchapps.com/tmi/)
    -   `broadcasterName` should be your Twitch user name

-   #### Youtube

    -   You can setup a Google project at [https://console.developers.google.com](https://console.developers.google.com). You will then need to enable the Youtube Data V3 API for you project, and copy the API key to the config.

-   #### Streamlabs

    -   Setup an app at [https://streamlabs.com/dashboard#/settings/api-settings](https://streamlabs.com/dashboard#/settings/api-settings) and copy the Client ID and Client Secret.
    -   The redirect URL should be `http://localhost/api/auth/streamlabs/callback` by default.

-   ### Spotify
    
    -   Setup an app at [https://developer.spotify.com/dashboard/applications](https://developer.spotify.com/dashboard/applications) and copy the Client ID and Client Secret.

-   #### Database

    -   The path is from the root directory. By default the database is `chewiebot.db` in the root directory.

-   #### Logging

    -   You can enable or disable logging on each of the systems by setting true or false.
    -   The level is the lowest level that will be output.
    -   Levels can be syslog or npm. npm may break currently though.

### Docker

-   Using docker is the recommended way to run the bot. Only Docker using WSL2 has been tested.
-   In `/client/package.json`, ensure that `proxy` is set to `http://server:8080`. This is the default, so should only have been changed if you changed it for running with NodeJS.
-   From the root repository, run `yarn --cwd server setup`. The `setup` command will install node packages for both the server and client.
-   To run the site in docker, run `docker-compose -f docker-compose.yml -f docker-compose.ng.yml up -d --build`. This will take some time the first time as it will build and start the containers using the dev docker config. The dev docker config will build images from local directories and map volumes to `/server/` and `/client/`. The `docker-compose.prod.yml` config will take images from the DockerHub repository and only map a volume for the SQLite database.
-   Open a browser and navigate to `localhost`. This may give an error due to needing to wait for the client and server to start up. You can check if the client is running by `docker-compose -f docker-compose.yml -f docker-compose.ng.yml logs ui` and checking to see if the `Client Compiled` message is visible.
-   Docker will pass the `--inspect` flag to node for node debugging the server when using `docker-compose.ng.yml`. This will map localhost:9229 to the node inspector for the server.
-   Files will be updated automatically when saved.
    -   Server uses pm2 to watch the `/server/src` folder.
    -   Client uses `react-scripts start` to watch the `/client/` folder.

### NodeJS

-   Install NodeJS from[https://nodejs.org/en/download/](https://nodejs.org/en/download/).
-   Install Redis. This requires Docker or WSL to run supported versions of Redis.
    -   Using WSL you can use `sudo apt install redis-server` to install and `sudo service redis-server restart` to ensure that it's running. Use `sudo service redis-server stop` to stop the Redis server.
-   Install Yarn from [https://yarnpkg.com/en/docs/install#windows-stable](https://yarnpkg.com/en/docs/install#windows-stable).
-   Navigate to the `/server/` folder.
-   Run `yarn setup` to install dependencies. This will setup both the server and client.
-   In `/client/package.json`, you will need to change `proxy` to `http://localhost:8080`.

#### Running locally

#### Non Debug Mode

-   `yarn start-dev:build` --- This will build the client files before starting the node server. Use this if it's the first time starting the project, or changes have been made to the client folder.
-   `yarn start-dev` --- This will start the node server without building the client files. Use this if you've already used the build variant and there has been no changes made to the client folder.

#### Debug Mode

-   `yarn start-debug:build` --- This will build the client files before starting the node server with the `--inspect` flag. Use this if it's the first time starting the project, or changes have been made to the client folder. The `--inspect` flag will allow you to attach a debugger to the process (for example, VSCodes debugger).
-   `yarn start-debug` --- This will start the node server with the `--inspect` flag without building the client files. Use this if you've already used the build variant and there has been no changes made to the client folder.

### Accessing the site

-   Open a browser to `localhost:8080`.

## Known Issues

-   Client files need rebuilding with how the workflow is currently setup. I plan on updating this at some point.

### Contributing

-   Make a new branch for the changes you want to make
-   Submit a PR from your branch when you've made and tested your changes.
