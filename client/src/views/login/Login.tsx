import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library, IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faDiscord, faPatreon, faSpotify, faTwitch, faYoutube } from "@fortawesome/free-brands-svg-icons";
import { Box, Button, Card, CardContent, Divider, Grid, Typography, Theme } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import React, { useContext } from "react";
import { Image } from "react-bootstrap";
import Cookies from "js-cookie";
import { UserContext } from "../../contexts/userContext";

type LoginProps = {};

type AffiliateLink = {
    link: string;
    logo: JSX.Element;
    color: string;
    name: string;
};

// Some dependencies broken again 
// See https://github.com/FortAwesome/angular-fontawesome/issues/125
library.add(
    faPatreon as IconDefinition,
    faSpotify as IconDefinition,
    faTwitch as IconDefinition,
    faYoutube as IconDefinition,
    faDiscord as IconDefinition
);

const stubLinks: AffiliateLink[] = [
    {
        link: "https://www.twitch.tv/chewiemelodies",
        logo: <FontAwesomeIcon icon={['fab', 'twitch']} />,
        color: "#9146ff",
        name: "Twitch",
    },
    {
        link: "https://www.youtube.com/chewiemelodies",
        logo: <FontAwesomeIcon icon={['fab', 'youtube']} />,
        color: "#c4302b",
        name: "Youtube",
    },
    {
        link: "https://open.spotify.com/artist/2dbjQX4XbIMrb5kayolqSZ?si=KsrM6Hn_SpiWj44_vPZ1kw",
        logo: <FontAwesomeIcon icon={['fab', 'spotify']} />,
        color: "#1DB954",
        name: "Spotify",
    },
    {
        link: "https://www.patreon.com/chewiemelodies",
        logo: <FontAwesomeIcon icon={['fab', 'patreon']} />,
        color: "#f96854",
        name: "Patreon",
    },
    {
        link: "https://discordapp.com/invite/chewiemelodies",
        logo: <FontAwesomeIcon icon={['fab', 'discord']} />,
        color: "#7289da",
        name: "Discord",
    },
];

const useStyles = makeStyles()((theme: Theme) => ({
    card: {
        textAlign: "center",
    },
    sectionRow: {
        marginTop: theme.spacing(2),
        color: "gray",
    },
    button: {
        marginTop: theme.spacing(1),
        color: "white",
        width: 300,
    },
}));

const Login: React.FC<LoginProps> = (props: LoginProps) => {
    const { classes } = useStyles();
    const renderLinks = (links: AffiliateLink[]) => {
        return links.map((link: AffiliateLink, i: number) => (
            <Grid item xs={12} style={{ paddingBottom: i === links.length - 1 ? 20 : 0 }} key={i}>
                <Button
                    className={classes.button}
                    style={{ backgroundColor: link.color }}
                    href={link.link}
                    target="_blank"
                    startIcon={link.logo}
                >
                    {link.name}
                </Button>
            </Grid>
        ));
    };

    const userContext = useContext(UserContext);

    let authUrl = "/api/auth/twitch";
    const requireBroadcasterAuth = Cookies.get("broadcaster_user") === "1";
    if (requireBroadcasterAuth) {
        authUrl = "/api/auth/twitch/broadcaster";
    } else {
        const requireModAuth = Cookies.get("moderator_user") === "1";
        if (requireModAuth) {
            authUrl = "/api/auth/twitch/mod";
        }
    }

    let loginHeader : JSX.Element | undefined;
    let loginButton : JSX.Element | undefined;

    // Do not show login button if already logged in
    if (userContext.user.username) {
        loginHeader = loginButton = undefined;
    } else {
        loginHeader = <Grid item xs={12} className={classes.sectionRow}>
            <Typography>Log in with your</Typography>
        </Grid>;

        loginButton = <Grid item xs={12}>
            <Button
                className={classes.button}
                style={{ backgroundColor: "#9146ff" }}
                href={authUrl}
                startIcon={<FontAwesomeIcon icon={['fab', 'twitch']} />}
            >
                Twitch Account
            </Button>
        </Grid>;
    }

    return (
        <Box>
            <Card className={classes.card}>
                <CardContent>
                    <Grid>
                        <Grid item xs={12}>
                            <Image src="/assets/chewie.jpg" />
                            <Typography variant="h4">Chewie Melodies Portal</Typography>
                        </Grid>
                        {loginHeader}
                        {loginButton}
                        <Divider className={classes.sectionRow} />
                        <Grid item xs={12} className={classes.sectionRow}>
                            <Typography>You can also find Chewie on </Typography>
                        </Grid>
                        {renderLinks(stubLinks)}
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Login;
