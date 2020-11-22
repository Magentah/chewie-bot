import { Card, CardContent, Grid, Typography } from "@material-ui/core";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";
import { Button, Image } from "react-bootstrap";

const TwitchCard: React.FC<any> = (props: any) => {
    const isDev = true;
    const cssTwitchButton = {
        backgroundColor: "#9147ff",
        marginRight: "10px",
    };

    const cssStreamlabsButton = {
        backgroundColor: "#80f5d2",
    };

    const streamlabsImage = {
        width: "130px",
        padding: "6px",
    };

    const defaultUser: any = {
        streamlabsToken: null,
        username: null,
    };

    const [user, setUser] = useState(defaultUser);

    useEffect(() => {
        axios
            .get("api/isloggedin", {
                withCredentials: true,
            })
            .then((response: AxiosResponse<any>) => {
                if (response.status === 200) {
                    const userWrapper: any = { user: response.data };
                    console.log("login", userWrapper);
                    setUser(userWrapper.user);
                } else if (response.status === 403) {
                    //
                }
            })
            .catch((err: AxiosError<any>) => {
                console.log("ERR", err);
            });
    }, []);

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
                        <Button variant="light" style={cssTwitchButton} href={`/api/twitch/${user.username}/join`} >
                            <Image
                                src={"assets/glitch_logo.png"} // Must use glitch logo (see https://www.twitch.tv/p/legal/trademark/)
                                style={{ width: "30px" }}
                            />{" "}
                            <span style={{ color: "white" }}>Connect ChewieBot to Twitch</span>
                        </Button>
                        <Button variant="light" style={cssStreamlabsButton} href="/api/auth/streamlabs">
                            <Image
                                style={streamlabsImage}
                                src="https://cdn.streamlabs.com/static/imgs/logos/kevin-logo.svg"
                            />
                            <Typography component="span">Connect to Streamlabs</Typography>
                        </Button>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default TwitchCard;
