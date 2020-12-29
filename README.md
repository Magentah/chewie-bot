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

### SSL and HTTPS

-   To setup HTTPS, you will need to generate a cert and key.
-   Install openssl. This can be done in a docker container or on a host machine.
-   Run the following commands. The examples are from running a shell in a docker container:

```bash
root@f6ef5d97cbf9:/# openssl genrsa -des3 -out server.key 2048

Generating RSA private key, 2048 bit long modulus
......+++++
..........+++++
e is 65537 (0x010001)
Enter pass phrase for server.key: # some cool password
Verifying - Enter pass phrase for server.key: # same as you typed

```

```bash
root@f6ef5d97cbf9:/# openssl req -new -key server.key -out server.csr

Enter pass phrase for server.key: # same password you typed
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:JP # type you like
State or Province Name (full name) [Some-State]:Tokyo # type you like
Locality Name (eg, city) []:Shibuya # type you like
Organization Name (eg, company) [Internet Widgits Pty Ltd]: # just push enter
Organizational Unit Name (eg, section) []: # just push enter
Common Name (e.g. server FQDN or YOUR name) []: # just push enter
Email Address []: # just push enter

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []: # just push enter
An optional company name []: # just push enter

```

```bash
root@f6ef5d97cbf9:/# cp server.key server.key.org
root@f6ef5d97cbf9:/# openssl rsa -in server.key.org -out server.key

Enter pass phrase for server.key.org: # same PW you typed
writing RSA key

root@f6ef5d97cbf9:/# openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt

Signature ok
subject=C = JP, ST = Tokyo, L = Shibuya, O = Internet Widgits Pty Ltd
Getting Private key

```

-   Once the key and cert are created, copy them to the host machine:

```bash
docker cp <container-id>:server.crt ./path/to/server.crt
docker cp <container-id>:server.key ./path/to/server.key
```

-   Then copy these files to the `/client/nginx/` folder. They will be copied from this folder during docker startup to enable https.
-   Update the `default.conf` file to the following:

```bash
# Close websocket connection when upgrade header set to ''
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# map to websocket port
upstream websocket {
    server backend:8001;
}

server {
    listen      8020;
    listen [::]:8020;
    server_name _;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header HOST $host;
        proxy_pass http://websocket;
    }
}


# If not using SSL and HTTPS, remove this server section.

server {
    listen 80;
    server_name _;

    return 301 https://$host$request_uri;
}

server {
    # If not using SSL and HTTPS, uncomment these:
    # listen        80;
    # listen  [::]:80;

    # If not using SSL and HTTPS, comment out the listen lines below.
    listen       443 ssl;
    listen  [::]:443 ssl;
    server_name  _;

    # If not using SSL and HTTPS, comment out the below ssl_certificate and ssl_certificate_key lines.
    ssl_certificate /etc/nginx/server.crt;
    ssl_certificate_key /etc/nginx/server.key;

    #charset koi8-r;
    #access_log  /var/log/nginx/host.access.log  main;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    location /api/ {
        proxy_set_header HOST $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://backend:8080;
    }

    location /ws/ {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header HOST $host;
        proxy_pass http://websocket;
    }

    #error_page  404              /404.html;

    # redirect server error pages to the static page /50x.html
    #
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }

    # proxy the PHP scripts to Apache listening on 127.0.0.1:80
    #
    #location ~ \.php$ {
    #    proxy_pass   http://127.0.0.1;
    #}

    # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
    #
    #location ~ \.php$ {
    #    root           html;
    #    fastcgi_pass   127.0.0.1:9000;
    #    fastcgi_index  index.php;
    #    fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
    #    include        fastcgi_params;
    #}

    # deny access to .htaccess files, if Apache's document root
    # concurs with nginx's one
    #
    #location ~ /\.ht {
    #    deny  all;
    #}
}
```

## Known Issues

-   Client files need rebuilding with how the workflow is currently setup. I plan on updating this at some point.

### Contributing

-   Make a new branch for the changes you want to make
-   Submit a PR from your branch when you've made and tested your changes.
