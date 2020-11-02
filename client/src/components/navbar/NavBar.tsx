import React, { Props, useState } from "react";
import { makeStyles, fade } from "@material-ui/core/styles";
import { AppBar, Toolbar, IconButton, Badge, Typography } from "@material-ui/core";
import { Notifications, AccountBoxOutlined, LiveTv, Link, LinkOff } from "@material-ui/icons";
import NavBarMenu from "./NavBarMenu";
import axios from "axios";

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

    const classes = useStyles();
    const watchChewie = () => {
        window.open("https://www.twitch.tv/chewiemelodies", "_blank");
    };

    const connectBot = async () => {
        const response = await axios.get("/api/twitch/status");
        setBotConnected(response.data.connected === "CONNECTED");
    };

    return (
        <AppBar position="fixed" className={classes.appBar}>
            <Toolbar>
                <Typography variant="h6">Chewie Melodies</Typography>
                <div className={classes.rightMenu}>
                    <IconButton color="inherit" onClick={connectBot}>
                        {botConnected ? (
                            <Link className={classes.connectedIcon} />
                        ) : (
                            <LinkOff className={classes.notConnectedIcon} />
                        )}
                        <Typography variant="caption" className={classes.botConnectedStatusMessage}>
                            {botConnected ? "Bot is connected" : "Bot is not connected"}
                        </Typography>
                    </IconButton>
                    <IconButton
                        color="inherit"
                        className={classes.iconButton}
                        onClick={watchChewie}
                        title="Watch ChewieMelodies on Twitch!"
                    >
                        <LiveTv />
                    </IconButton>
                    <IconButton color="inherit" className={classes.iconButton}>
                        <Notifications />
                    </IconButton>
                    <IconButton color="inherit" className={classes.iconButton}>
                        <AccountBoxOutlined />
                    </IconButton>
                    <NavBarMenu />
                </div>
            </Toolbar>
        </AppBar>
    );
};

export default NavBar;
