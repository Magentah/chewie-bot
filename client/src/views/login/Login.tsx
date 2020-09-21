import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Image } from "react-bootstrap";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
  IconButton,
  Icon,
} from "@material-ui/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTwitch,
  faYoutube,
  faPatreon,
  faDiscord,
  faSpotify,
} from "@fortawesome/free-brands-svg-icons";
import { useHistory } from "react-router-dom";
import AuthService from "../../services/authService";

type LoginProps = {};

type AffiliateLink = {
  link: string;
  logo: JSX.Element;
  color: string;
  name: string;
};

const stubLinks: Array<AffiliateLink> = [
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
    link:
      "https://open.spotify.com/artist/2dbjQX4XbIMrb5kayolqSZ?si=KsrM6Hn_SpiWj44_vPZ1kw",
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
  // { link: "https://www.patreon.com/chewiemelodies", logo: "", color: "", name: "Spotify"},
];

const useStyles = makeStyles((theme) => ({
  root: {
    textAlign: "center",
    maxWidth: 750,
  },
  card: {
    marginTop: theme.spacing(3),
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
  const history = useHistory();
  const renderLinks = (links: Array<AffiliateLink>) => {
    return links.map((link: AffiliateLink, i: number) => (
      <Grid
        item
        xs={12}
        style={{ paddingBottom: i == links.length - 1 ? 20 : 0 }}
      >
        <Button
          className={classes.button}
          style={{ backgroundColor: link.color }}
          onClick={() => {
            window.open(link.link, "_blank");
          }}
          startIcon={link.logo}
        >
          {link.name}
        </Button>
      </Grid>
    ));
  };
  const onLogin = () => {
    console.log("login");
    history.push("/");
  };
  return (
    <Container className={classes.root}>
      <Card className={classes.card}>
        <CardContent>
          <Grid spacing={3}>
            <Grid item xs={12}>
              <Image src="/chewie.jpg" />
              <Typography variant="h4">Chewie Melodies Portal</Typography>
            </Grid>
            <Grid item xs={12} className={classes.sectionRow}>
              <Typography>Log in with your</Typography>
            </Grid>
            <Grid item xs={12}>
              <Button
                className={classes.button}
                style={{ backgroundColor: "#9146ff" }}
                onClick={onLogin}
                startIcon={<FontAwesomeIcon icon={faTwitch} />}
              >
                Twitch Account
              </Button>
            </Grid>
            <Divider className={classes.sectionRow} />
            <Grid item xs={12} className={classes.sectionRow}>
              <Typography>You can also find Chewie on </Typography>
            </Grid>
            {renderLinks(stubLinks)}
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Login;
