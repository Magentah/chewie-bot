import { Card, CardContent, Grid } from "@material-ui/core";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";
import { Button, Image } from "react-bootstrap";

const TwitchCard: React.FC<any> = (props: any) => {
    const isDev = true;
    const cssTwitchButton = {
        backgroundColor: "#9147ff",
    };

    const defaultUser: any = {
        streamlabsToken: null,
        username: null,
    };

    const [user, setUser] = useState(defaultUser);

    useEffect(() => {
        axios
            .get("/api/isloggedin", {
                withCredentials: true,
            })
            .then((response: AxiosResponse<any>) => {
                if (response.status === 200) {
                    const userWrapper: any = { user: response.data };
                    console.log("login", userWrapper);
                    setUser(userWrapper);
                } else if (response.status === 403) {
                    //
                }
            })
            .catch((err: AxiosError<any>) => {
                console.log("ERR", err);
            });
    }, []);

    const message = (): JSX.Element => {
        if (user) {
            return <p>No user logged in.</p>;
        } else {
            return (
                <p>
                    Logged in to Twitch.tv {user.streamlabsToken ? "and Streamlabs" : ""} as {user.username}.
                </p>
            );
        }
    };

    const streamlabsLogin = (): any => {
        const params: AxiosRequestConfig = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "http://localhost",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE",
                "Access-Control-Allow-Headers": "X-Requested-With,content-type",
                "Access-Control-Allow-Credentials": true,
            },
            withCredentials: true,
            data: undefined,
        };
        axios.get("/api/auth/streamlabs", params);
    };

    const render = () => {
        return (
            <div className="App">
                <header className="App-header">
                    {message()}
                    <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
                        Learn React
                    </a>
                    <a class-name="App-link" href="/api/auth/twitch">
                        Connect to Twitch
                    </a>
                    <a class-name="App-link" href="/api/auth/streamlabs">
                        Connect to Streamlabs
                    </a>
                    <a class-name="App-link" href="/api/logout">
                        Logout
                    </a>
                </header>
            </div>
        );
    };

    const twitchRedirect = async () => {
        const redirectUrl = `api/auth/twitch/redirect`;
        const response = await fetch(redirectUrl).then((res) => res.json());

        window.location.replace(response.url);
    };

    const renderWelcome = () => {
        if (isDev) {
            return (
                <div>
                    <div style={{ marginTop: "10px" }}> Welcome Dango Devs!</div>
                    <p>
                        Any modification to <code>{"src/client/**"}</code> can be reloaded by{" "}
                        <code>{"cd src/client && yarn build"}</code>
                    </p>
                </div>
            );
        }
        return <p>Welome to the Dango Family! Sign in using your Twitch account</p>;
    };

    return (
        <Card>
            <CardContent style={{ textAlign: "center" }}>
                <Grid>
                    <Grid item style={{ marginBottom: "20px" }}>
                        <Image src={"/assets/chewie_logo.jpg"} alt="logo" width="25%" roundedCircle />
                    </Grid>
                    <Grid item>{renderWelcome()}</Grid>
                    <Grid item>
                        <Button variant="light" style={cssTwitchButton} onClick={twitchRedirect}>
                            <Image
                                src={"assets/glitch_logo.png"} // Must use glitch logo (see https://www.twitch.tv/p/legal/trademark/)
                                style={{ width: "30px" }}
                            />{" "}
                            <span style={{ color: "white" }}>Connect ChewieBot to Twitch</span>
                        </Button>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default TwitchCard;
