import React, { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { Image } from "react-bootstrap";
import { Card, Box, Grid, Typography, Select, FormControl, InputLabel, MenuItem, Theme, Collapse, debounce } from "@mui/material";
import { makeStyles } from "tss-react/mui";
import { UserContext } from "../../contexts/userContext";
import { TransitionGroup } from 'react-transition-group';
import WebsocketService, { SocketMessageType, ISocketMessage } from "../../services/websocketService";

type RowData = { username: string, points: number, rank: number };
type SeasonData = { id: number, startDate: Date, endDate: Date, plannedEndDate: string, description: string };

const useStyles = makeStyles()((theme: Theme) => ({
    flexBox: {
        fontSize: "0.9em",
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
        background: theme.palette.action.disabledBackground,
        textTransform: "uppercase",
        textAlign: "center",
        padding: theme.spacing(1,4)
    },
    prizeNote: {
        color: "#FF213B",
        textAlign: "center",
        fontSize: "0.8em",
        marginTop: "0.5em"
    }
}));

const Leaderboard: React.FC<any> = (props: any) => {
    const [userlist, setUserlist] = useState([] as RowData[]);
    const [seasons, setSeasons] = useState([] as SeasonData[]);
    const [currentSeasonId, setCurrentSeasonId] = useState<number>(0);

    const { classes } = useStyles();
    const numberFormat = new Intl.NumberFormat();
    const rankingColors = ["#FF9B00", "#083963", "#965119", "#7ABFBC", "#4FA3A9", "#8BADDC", "#8BADDC", "#478BCA", "#5871B6", "#6353A0", "transparent" ];

    const updateLeaderboard = useCallback((seasonId: number) => {
        axios.get("/api/leaderboard/" + seasonId).then((response) => {
            setUserlist(response.data);
        });
    }, []);

    useEffect(() => updateLeaderboard(0), [updateLeaderboard]);

    useEffect(() => {
        let websocket: WebsocketService;
        // Only live update for current season.
        if (currentSeasonId === seasons[0]?.id) {
            websocket = new WebsocketService(window.location.hostname, window.location.protocol);

            // When many changes occur at once (consider bankheists, arenas etc.) avoid
            // making un anreasonably high amount of requests.
            const debouncedCallback = debounce(() => updateLeaderboard(0), 1000);
            websocket.onMessage(SocketMessageType.PointsChanged, (message: ISocketMessage) => 
            {
                debouncedCallback();
            });
        }

        return () => {
            websocket?.close();
        };
    }, [updateLeaderboard, currentSeasonId, seasons]);

    useEffect(() => {
        axios.get("/api/seasons").then((response) => {
            const seasonData = response.data as SeasonData[];
            if (seasonData.length > 0) {
                seasonData.sort((x, y) => y.id - x.id);

                const dtFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" });
                for (const season of seasonData) {
                    if (!season.endDate) {
                        season.description = `Current Season (ends on ${season.plannedEndDate})`;
                    } else {
                        season.description = `Season #${season.id} (${dtFormat.format(new Date(season.startDate))} - ${dtFormat.format(new Date(season.endDate))})`;
                    }
                }
                setSeasons(seasonData);
                setCurrentSeasonId(seasonData[0].id);
            }
        });
    }, []);

    const handleSeasonChange = (event: any) => {
        setCurrentSeasonId(event.target.value);
        updateLeaderboard(event.target.value);
    };

    const userContext = useContext(UserContext);

    // Generate list of all top users. Current user is displayed
    // in an outlined row for highlighting.
    // If user is not in top 10, an additional row will be added.
    let leaderboardList;
    if (userlist.length >= 3) {
        leaderboardList = <Grid>            
            <Grid item container alignItems="flex-end" justifyContent="center" direction="row">
                <Grid item xs={1} />
                <Grid item xs>
                    <TransitionGroup>
                        <Collapse key={`${userlist[1].username}.${userlist[1].points}`}>
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
                        </Collapse>
                    </TransitionGroup>
                </Grid>
                <Grid item xs>
                    <TransitionGroup>
                        <Collapse key={`${userlist[0].username}.${userlist[0].points}`}>
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
                        </Collapse>
                    </TransitionGroup>
                </Grid>
                <Grid item xs>
                    <TransitionGroup>
                        <Collapse key={`${userlist[2].username}.${userlist[2].points}`}>
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
                        </Collapse>
                    </TransitionGroup>
                </Grid>
                <Grid item xs={1} />
            </Grid>
            
            <Box marginTop={4}>
                <TransitionGroup>        
                    {userlist.slice(3).map(x => (
                    <Collapse key={`${x.username}.${x.points}`}>
                        <Grid container mt={0.5} mb={0.5} columnSpacing={2}>
                            <Grid item xs="auto">
                                <Box className={x.username === userContext.user.username
                                    ? `${classes.flexBox} ${classes.flexBoxNumber} ${classes.flexBoxCurrentUser}`
                                    : `${classes.flexBox} ${classes.flexBoxNumber}`}
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
                            <Box width="100%"/>
                        </Grid>                
                    </Collapse>
                    ))}
                </TransitionGroup>                
            </Box>
        </Grid>;
    }

    const rewards = leaderboardList && (seasons.length === 0 || currentSeasonId === 0 || seasons[0].id === currentSeasonId) ? <Grid>
        <Box marginTop={4} display="flex" justifyContent="center">
            <Grid>
                <Box minWidth="20em" className={classes.prizeHeader} style={{ fontWeight: "bold" }}>Top 3 prizes</Box>
                <Typography className={classes.prizeNote}>Note: All prizes get a discord color and role.</Typography>
            </Grid>
        </Box>
        <Box marginTop={2}>
            <Grid container justifyContent="center" direction="row">
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
    </Grid> : undefined;

    return <Card><Box padding={5} justifyContent="center" display="flex">
        <Grid xs item>
            {currentSeasonId ?
                <Box marginBottom={4} display="flex" justifyContent="center">
                    {seasons.length <= 1 ?
                    <Box className={classes.prizeHeader}><span style={{ fontWeight: "bold" }}>{seasons[0].description}</span></Box> :
                    <FormControl variant="standard">
                        <InputLabel id="season-label">Season</InputLabel>
                        <Select
                            labelId="season-label"
                            id="season-select"
                            value={currentSeasonId}
                            label="Season"
                            onChange={handleSeasonChange}>
                            {seasons.map(x => <MenuItem value={x.id}>{x.description}</MenuItem>)}
                        </Select>
                    </FormControl>}
                </Box> : undefined}
            {leaderboardList}
            {rewards}
        </Grid>
    </Box></Card>;
};

export default Leaderboard;