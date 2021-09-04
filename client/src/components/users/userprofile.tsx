import { Card, Typography, Grid, Avatar, Box, CardContent, createStyles, makeStyles, Theme, TableContainer, Table, TableRow, TableCell, TableBody } from "@material-ui/core";
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import Paper from "@material-ui/core/Paper";
import UserStatusLog from "./userStatusLog";
import { UserProfile } from "../common/userProfile";
import { UserContext } from "../../contexts/userContext";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    small: {
      width: theme.spacing(3),
      height: theme.spacing(3),
    },
    large: {
      width: theme.spacing(10),
      height: theme.spacing(10),
    },
    table: {
        maxWidth: 380,
    },
  }),
);

const UserProfileView: React.FC<any> = (props: any) => {
    const userContext = useContext(UserContext);
    const [fullUserProfile, setFullUserProfile] = useState<UserProfile>();

    const classes = useStyles();

    useEffect(() => {
        if (userContext.user.username) {
            axios.get(`/api/userlist/profile/${userContext.user.username}`).then((response) => {
                if (response) {
                    setFullUserProfile(response.data);
                }
            });
        }
    }, [userContext.user.username]);

    let userProfileContent;

    if (fullUserProfile) {
        const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short", weekday: "short", timeZone: fullUserProfile.timezone });

        const tryFormat = (date: any) => {
            try {
                return dateFormat.format(new Date(date));
            } catch {
                return "-";
            }
        }

        let vipDataTable;
        let vipLogTable;
        if (fullUserProfile.user.vipExpiry || fullUserProfile.user.vipPermanentRequests) {
            vipDataTable = <TableContainer component={Paper} className={classes.table}>
                <Table >
                    <TableBody>
                        <TableRow>
                            <TableCell component="th" scope="row">VIP expiry:</TableCell>
                            <TableCell align="right">{tryFormat(fullUserProfile.user.vipExpiry)} {fullUserProfile.timezone}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell component="th" scope="row">VIP permanent requests:</TableCell>
                            <TableCell align="right">{fullUserProfile.user.vipPermanentRequests}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell component="th" scope="row">Last song request:</TableCell>
                            <TableCell align="right">{fullUserProfile.user.vipLastRequest ? tryFormat(fullUserProfile.user.vipLastRequest) + " " + fullUserProfile.timezone: "(None)"}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>;
        }

        if (fullUserProfile.goldLogs.length) {
            vipLogTable = <UserStatusLog profile={fullUserProfile} />
        }

        userProfileContent = <Grid alignItems="flex-start">
            <Grid item container alignItems="center">
                <Grid item>
                    <Avatar className={classes.large} src={userContext.user.twitchUserProfile.profileImageUrl} />
                </Grid>
                <Grid item>
                    <Grid>
                        <Box ml={1}>
                            <Typography variant="h6">{userContext.user.twitchUserProfile.displayName} ({fullUserProfile.user.userLevelName})</Typography>
                        </Box>
                    </Grid>
                    <Grid>
                        <Box ml={1}>
                            <Typography>Your points: {fullUserProfile.user.points} (top {fullUserProfile.pointsRank})</Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item>
                <Box mt={1} mb={1}>
                    <Typography variant="h6">Your VIP status</Typography>
                </Box>
            </Grid>
            <Grid item>
                {vipDataTable ? vipDataTable : <Typography>You did not have VIP gold status yet.</Typography>}
            </Grid>
            {vipLogTable ? <Grid item>
                <Box mt={2} mb={1}>
                    <Typography variant="h6">VIP status log</Typography>
                </Box>
            </Grid> : undefined}
            <Grid item>
                {vipLogTable}
            </Grid>
        </Grid>;
    }

    return <Card>
        <CardContent>
            {userProfileContent}
        </CardContent>
    </Card>;
}

export default UserProfileView;
