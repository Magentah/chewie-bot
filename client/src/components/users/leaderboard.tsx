import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Image } from "react-bootstrap";
import { Card, Box, Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import useSetting from "../../hooks/setting";
import { UserContext } from "../../contexts/userContext";

type RowData = { username: string, points: number, rank: number };

const useStyles = makeStyles((theme) => ({
    flexBox: {
        borderRadius: "2.5em",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        padding: theme.spacing(1,2),
        minWidth: "2.5em",
        color: "white",
        textTransform: "uppercase",
    },
    flexBoxCurrentUser: {
        background: "transparent !important",
        boxShadow:"inset 0px 0px 0px 2px #303030",
        color: theme.palette.text.primary
    },
    flexBoxNumber: {
        padding: theme.spacing(1,1),
    },
    topUsersUsername: {
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        textAlign: "center"
    },
    prizeHeader: {
        background: "#E4E4E4",
        textTransform: "uppercase",
        textAlign: "center",
        padding: theme.spacing(1,4)
    },
    prizeNote: {
        color: "#FF213B",
        textAlign: "center",
        fontSize: "0.9em",
        marginTop: "0.5em"
    }
}));

const Leaderboard: React.FC<any> = (props: any) => {
    const [userlist, setUserlist] = useState([] as RowData[]);
    const seasonEnd = useSetting<string>("season-end");

    const classes = useStyles();
    const numberFormat = new Intl.NumberFormat();
    const rankingColors = ["#FF9B00", "#083963", "#965119", "#7ABFBC", "#4FA3A9", "#8BADDC", "#8BADDC", "#478BCA", "#5871B6", "#6353A0", "transparent" ];

    useEffect(() => {
        axios.get("/api/leaderboard").then((response) => {
            setUserlist(response.data);
        });
    }, []);

    const userContext = useContext(UserContext);

    // Generate list of all top users. Current user is displayed
    // in an outlined row for highlighting.
    // If user is not in top 10, an additional row will be added.
    let leaderboardList;
    if (userlist.length >= 3) {
        leaderboardList = <Grid xs>
            {seasonEnd ?
            <Box marginBottom={4} display="flex" justifyContent="center">
                <Box className={classes.prizeHeader}>Season ends on <span style={{ fontWeight: "bold" }}>{seasonEnd}</span></Box>
            </Box> : undefined}
            <Grid item container alignItems="flex-end" justify="center" direction="row">
                <Grid item xs={1} />
                <Grid item xs>
                    <Grid container direction="column" alignItems="center">
                        <Grid item style={{ textAlign: "center" }}>
                            <Image style={{ width: "80%" }} src={"/assets/leaderboard/2nd-Place-Dango-Leaderboard.png"} alt="2nd place" />
                        </Grid>
                        <Grid item>
                            <Typography className={classes.topUsersUsername} style={{ color: rankingColors[1] }}>{userlist[1].username}</Typography>
                        </Grid>
                        <Grid item>
                            <Typography>{numberFormat.format(userlist[1].points)} chews</Typography>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item xs>
                    <Grid container direction="column" alignItems="center">
                        <Grid item style={{ textAlign: "center" }}>
                            <Image style={{ width: "100%" }} src={"/assets/leaderboard/1st-Place-Dango-Leaderboard.png"} alt="1st place" />
                        </Grid>
                        <Grid item>
                            <Typography className={classes.topUsersUsername} style={{ color: rankingColors[0] }}>{userlist[0].username}</Typography>
                        </Grid>
                        <Grid item>
                            <Typography>{numberFormat.format(userlist[0].points)} chews</Typography>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item xs>
                    <Grid container direction="column" alignItems="center">
                        <Grid item style={{ textAlign: "center" }}>
                            <Image style={{ width: "80%" }} src={"/assets/leaderboard/3rd-Place-Dango-Leaderboard.png"} alt="3rd place" />
                        </Grid>
                        <Grid item>
                            <Typography className={classes.topUsersUsername} style={{ color: rankingColors[2] }}>{userlist[2].username}</Typography>
                        </Grid>
                        <Grid item>
                            <Typography>{numberFormat.format(userlist[2].points)} chews</Typography>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item xs={1} />
            </Grid>
            <Box marginTop={4}>
                <Grid xs={12}>
                    {userlist.slice(3).map(x => (<Grid item container spacing={2}>
                        <Grid item>
                            <Box className={x.username === userContext.user.username ? `${classes.flexBox} ${classes.flexBoxNumber} ${classes.flexBoxCurrentUser}` :`${classes.flexBox} ${classes.flexBoxNumber}`}
                                 style={{ background: rankingColors[x.rank - 1] }}>
                                {x.rank}
                            </Box>
                        </Grid>
                        <Grid item xs>
                            <Box className={x.username === userContext.user.username ? `${classes.flexBox} ${classes.flexBoxCurrentUser}` : classes.flexBox}
                                 style={{ background: rankingColors[x.rank - 1] }}>
                                <Grid container>
                                    <Grid xs item style={{ width: "80%" }}>{x.username}</Grid>
                                    <Grid item>{numberFormat.format(x.points)}</Grid>
                                </Grid>
                            </Box>
                        </Grid>
                    </Grid>))}
                </Grid>
            </Box>
            <Box marginTop={4} display="flex" justifyContent="center">
                <Grid>
                    <Box minWidth="20em" className={classes.prizeHeader} style={{ fontWeight: "bold" }}>Top 3 prizes</Box>
                    <Typography className={classes.prizeNote}>Note: All prizes get a discord color and role.</Typography>
                </Grid>
            </Box>
            <Box marginTop={2}>
                <Grid container xs justify="center" direction="row">
                    <Grid item xs={1}></Grid>
                    <Grid item xs>
                        <Grid container direction="column" alignItems="center">
                            <Grid item>
                            <Image style={{ width: "100%" }} src={"/assets/leaderboard/1st-Place-Prize-Leaderboard.png"} alt="" />
                            </Grid>
                            <Grid item>
                                <Typography className={classes.topUsersUsername} style={{ color: rankingColors[0] }}>1st Place</Typography>
                            </Grid>
                            <Grid item>
                                <Typography style={{ textAlign: "center" }}>A customized dango box delivered to you</Typography>
                            </Grid>
                            <Grid item>
                                <Typography style={{ textAlign: "center" }}>VIP gold for a month</Typography>
                            </Grid>
                            <Grid item>
                                <Typography style={{ textAlign: "center" }}>Pink diamond icon in Twitch chat for a season</Typography>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item xs>
                        <Grid container direction="column" alignItems="center">
                            <Grid item>
                                <Image style={{ width: "100%" }} src={"/assets/leaderboard/2nd-Place-Prize-Leaderboard.png"} alt="" />
                            </Grid>
                            <Grid item>
                                <Typography className={classes.topUsersUsername} style={{ color: rankingColors[0] }}>2nd Place</Typography>
                            </Grid>
                            <Grid item>
                                <Typography style={{ textAlign: "center" }}>VIP gold for a month</Typography>
                            </Grid>
                            <Grid item>
                                <Typography style={{ textAlign: "center" }}>Pink diamond icon in Twitch chat for a season</Typography>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item xs>
                        <Grid container direction="column" alignItems="center">
                            <Grid item>
                            <Image style={{ width: "100%" }} src={"/assets/leaderboard/3rd-Place-Prize-Leaderboard.png"} alt="" />
                            </Grid>
                            <Grid item>
                                <Typography className={classes.topUsersUsername} style={{ color: rankingColors[0] }}>3rd Place</Typography>
                            </Grid>
                            <Grid item>
                                <Typography style={{ textAlign: "center" }}>Pink diamond icon in Twitch chat for a season</Typography>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item xs={1}></Grid>
                </Grid>
            </Box>
        </Grid>;
    }

    return <Card><Box padding={5} justifyContent="center" display="flex">
        {leaderboardList}
    </Box></Card>;
};

export default Leaderboard;