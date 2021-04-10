import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { AppBar, Toolbar, IconButton, Typography } from "@material-ui/core";
import { Image } from "react-bootstrap";
import { Link, LinkOff } from "@material-ui/icons";
import NavBarMenu from "./NavBarMenu";
import axios from "axios";
import useUser, { UserLevels } from "../../hooks/user";

type NavBarProps = {};
const sidebarWidth = 230;
const useStyles = makeStyles((theme) => ({
    appBar: {
        width: `calc(100% - ${sidebarWidth}px)`,
        marginLeft: sidebarWidth,
        backgroundColor: "#282C34",
    },
    rightMenu: {
        marginLeft: "auto",
        marginRight: -12,
    },
    iconButton: {
        color: "white",
        "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.08)",
        },
    },
    connectedIcon: {
        color: "green",
    },
    notConnectedIcon: {
        color: "red",
    },
    botConnectedStatusMessage: {
        marginLeft: "12px",
    },
}));

const NavBar: React.FC<NavBarProps> = (props: NavBarProps) => {
    const [botConnected, setBotConnected] = useState(false);
    const [user, loadUser] = useUser();

    const classes = useStyles();
    const watchChewie = () => {
        window.open("https://www.twitch.tv/chewiemelodies", "_blank");
    };
    const openDiscord = () => {
        window.open("https://discord.gg/chewiemelodies", "_blank");
    };

    const connectBot = async () => {
        if (botConnected) {
            const result = await axios.get("/api/twitch/disconnect");
            if (result.status === 200) {
                setBotConnected(false);
            }
        } else {
            const result = await axios.get("/api/twitch/connect");
            if (result.status === 200) {
                setBotConnected(true);
            }
        }
    };

    useEffect(loadUser, []);
    useEffect(() => {
        axios.get("/api/twitch/status").then((response) => {
            if (response?.data.data.state === "OPEN") {
                setBotConnected(true);
            } else {
                setBotConnected(false);
            }
        });
    }, []);

    const connectBotButton = (user.userLevelKey < UserLevels.Broadcaster) ? undefined :
        <IconButton color="inherit" onClick={connectBot}>
            {botConnected ? (
                <Link className={classes.connectedIcon} />
            ) : (
                <LinkOff className={classes.notConnectedIcon} />
            )}
            <Typography variant="caption" className={classes.botConnectedStatusMessage}>
                {botConnected ? "Bot is connected" : "Bot is not connected"}
            </Typography>
        </IconButton>;

    return (
        <AppBar position="fixed" className={classes.appBar}>
            <Toolbar>
                <Typography variant="h6">Chewie Melodies</Typography>
                <div className={classes.rightMenu}>
                    {connectBotButton}
                    <IconButton
                        color="inherit"
                        className={classes.iconButton}
                        onClick={watchChewie}
                        title="Watch ChewieMelodies on Twitch!">
                        <Image src={"/assets/TwitchGlitchWhite.png"} alt="logo" width="22em" />
                    </IconButton>
                    <IconButton
                        color="inherit"
                        className={classes.iconButton}
                        onClick={openDiscord}
                        title="Join ChewieMelodies on Discord!">
                        <Image src={"/assets/Discord-Logo-White.png"} alt="logo" width="30em" />
                    </IconButton>
                    <NavBarMenu />
                </div>
            </Toolbar>
        </AppBar>
    );
};

export default NavBar;
