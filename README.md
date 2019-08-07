# chewie-bot

## Twitch.tv Bot for musicians

---

### Dev Setup

- Copy config.example.json to config.json and update with your config details.
  - You can get your Twitch OAuth token from [https://twitchapps.com/tmi/](https://twitchapps.com/tmi/).
  - You will need to setup a Twitch App at [https://dev.twitch.tv/console](https://dev.twitch.tv/console). You will then need to copy your client_id and client_secret for the app to the config.
  - The redirect url should be `http://localhost:3000/api/oauth/twitch/redirect` by default.
- Install nodejs if you don't already have it.
- Install Yarn from [https://yarnpkg.com/en/docs/install#windows-stable](https://yarnpkg.com/en/docs/install#windows-stable).
- Run `yarn install` to install dependencies.

### For using static React files

- Run `yarn start-static` in the root folder to build and run using static react files.

### Running locally

- Run `yarn start-dev` in the root folder to run without debugging enabled.
- Run `yarn start-debug` in the root folder to run with debugging enabled. This will allow you to attach to the nodemon process with a debugger, such as VSCode.

### Contributing

- Make a new branch for the changes you want to make
- Submit a PR from your branch when you've made and tested your changes.
