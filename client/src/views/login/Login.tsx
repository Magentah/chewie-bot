import { faDiscord, faPatreon, faSpotify, faTwitch, faYoutube } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Card, CardContent, Divider, Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import React, { useContext } from "react";
import { Image } from "react-bootstrap";
import * as Cookie from "js-cookie";
import { UserContext } from "../../contexts/userContext";

type LoginProps = {};

type AffiliateLink = {
    link: string;
    logo: JSX.Element;
    color: string;
    name: string;
};

const stubLinks: AffiliateLink[] = [
    {
        link: "https://www.twitch.tv/chewiemelodies",
        logo: <FontAwesomeIcon icon={faTwitch} />,
        color: "#9146ff",
        name: "Twitch",
    },
    {
        link: "https://www.youtube.com/chewiemelodies",
        logo: <FontAwesomeIcon icon={faYoutube} />,
        color: "#c4302b",
        name: "Youtube",
    },
    {
        link: "https://open.spotify.com/artist/2dbjQX4XbIMrb5kayolqSZ?si=KsrM6Hn_SpiWj44_vPZ1kw",
        logo: <FontAwesomeIcon icon={faSpotify} />,
        color: "#1DB954",
        name: "Spotify",
    },
    {
        link: "https://www.patreon.com/chewiemelodies",
        logo: <FontAwesomeIcon icon={faPatreon} />,
        color: "#f96854",
        name: "Patreon",
    },
    {
        link: "https://discordapp.com/invite/chewiemelodies",
        logo: <FontAwesomeIcon icon={faDiscord} />,
        color: "#7289da",
        name: "Discord",
    },
];

const useStyles = makeStyles((theme) => ({
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
    const classes = useStyles();
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

    const requireBroadcasterAuth = Cookie.get("broadcaster_user") === "1";

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
                href={requireBroadcasterAuth ? "/api/auth/twitch/broadcaster" : "/api/auth/twitch"}
                startIcon={<FontAwesomeIcon icon={faTwitch} />}
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
