import React, { Component } from "react";
import logo from "./logo.svg";
// import chewiesLogo from "."
import { Image, Button } from "react-bootstrap";
import "./App.css";

class App extends Component {
    public render() {
        const twitchButtonStyle = {
            backgroundColor: "#9147ff"
        };
        async function twitchRedirect() {
            const response = await fetch("/api/oauth/twitch").then(res =>
                res.json()
            );

            window.location.replace(response.url);
        }

        return (
            <div className="App">
                <header className="App-header">
                    {/* <img src={logo} className="App-logo" alt="logo" /> */}
                    <Image
                        src={"/assets/chewie_logo.jpg"}
                        alt="logo"
                        roundedCircle
                    />
                    <div style={{ marginTop: "10px" }}>
                        {" "}
                        Welcome Dango Devs!
                    </div>
                    <p>
                        Any modification to <code>{"src/client/**"}</code> can
                        be reloaded by{" "}
                        <code>{"cd src/client && yarn build"}</code>
                    </p>
                    <Button
                        variant="light"
                        style={twitchButtonStyle}
                        onClick={twitchRedirect}
                    >
                        <Image
                            src={"assets/glitch_logo.png"} // Must use glitch logo (see https://www.twitch.tv/p/legal/trademark/)
                            style={{ width: "30px" }}
                        />{" "}
                        <span style={{ color: "white" }}>
                            Connect to Twitch!
                        </span>
                    </Button>
                </header>
            </div>
        );
    }
}

export default App;
