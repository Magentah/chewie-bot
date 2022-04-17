import React, { useContext, useEffect, useState } from "react";
import { makeStyles } from "tss-react/mui";
import { AppBar, Toolbar, IconButton, Typography, Button, Theme } from "@mui/material";
import { Image } from "react-bootstrap";
import NavBarMenu from "./NavBarMenu";
import axios from "axios";
import { green, red } from "@mui/material/colors";
import { UserContext, UserLevels } from "../../contexts/userContext";

type NavBarProps = {};

const useStyles = makeStyles()((theme: Theme) => ({
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
    connectedButton: {
        // Use same color as red (we want both white)
        color: theme.palette.getContrastText(red[500]),
        backgroundColor: green[500],
        "&:hover": {
          backgroundColor: green[700],
        },
        marginRight: "12px"
    },
    disconnectedButton: {
        color: theme.palette.getContrastText(red[500]),
        backgroundColor: red[500],
        "&:hover": {
          backgroundColor: red[700],
        },
        marginRight: "12px"
    },
}));

const NavBar: React.FC<NavBarProps> = (props: NavBarProps) => {
    const [botConnected, setBotConnected] = useState(false);
    const userContext = useContext(UserContext);

    const { classes } = useStyles();
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

    useEffect(() => {
        axios.get("/api/twitch/status").then((response) => {
            if (response?.data.data.state === "OPEN") {
                setBotConnected(true);
            } else {
                setBotConnected(false);
            }
        });
    }, []);

    const connectBotButton = (userContext.user.userLevel < UserLevels.Admin) ? undefined :
        <Button className={botConnected ? classes.connectedButton: classes.disconnectedButton} onClick={connectBot} variant="contained">
            <Typography variant="caption">
                {botConnected ? "Bot is connected" : "Bot is not connected"}
            </Typography>
        </Button>;

    return (
        <AppBar position="fixed">
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
