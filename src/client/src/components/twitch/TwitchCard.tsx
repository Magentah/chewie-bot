import React from "react";
import { Image, Button } from "react-bootstrap";
import { Grid, Card, CardContent, Divider } from "@material-ui/core";

const TwitchCard: React.FC<any> = (props: any) => {
  const isDev = true;
  const cssTwitchButton = {
    backgroundColor: "#9147ff",
  };

  const twitchRedirect = async () => {
    const response = await fetch("/api/oauth/twitch").then((res) => res.json());

    window.location.replace(response.url);
  };

  const renderWelcome = () => {
    if (isDev) {
      return (
        <div>
          <div style={{ marginTop: "10px" }}> Welcome Dango Devs!</div>
          <p>
            Any modification to <code>{"src/client/**"}</code> can be reloaded
            by <code>{"cd src/client && yarn build"}</code>
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
          <Grid item spacing={3} style={{ marginBottom: "20px" }}>
            <Image
              src={"/assets/chewie_logo.jpg"}
              alt="logo"
              width="25%"
              roundedCircle
            />
          </Grid>
          <Grid item spacing={3}>
            {renderWelcome()}
          </Grid>
          <Grid item spacing={3}>
            <Button
              variant="light"
              style={cssTwitchButton}
              onClick={twitchRedirect}
            >
              <Image
                src={"assets/glitch_logo.png"} // Must use glitch logo (see https://www.twitch.tv/p/legal/trademark/)
                style={{ width: "30px" }}
              />{" "}
              <span style={{ color: "white" }}>
                Connect ChewieBot to Twitch
              </span>
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default TwitchCard;
